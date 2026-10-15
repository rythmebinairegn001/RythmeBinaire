import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Accès payant / accès offert.
 *
 * Principe :
 *  - Un interrupteur général « accès payant » (app_settings.paywall_enabled), ÉTEINT par défaut.
 *    Tant qu'il est éteint, rien ne change pour les élèves : tout reste ouvert.
 *  - Quand il est allumé, seules les N premières leçons de chaque cours restent libres (« Découverte »).
 *    Au-delà, il faut un accès actif : offert par l'admin ou marqué payé.
 *  - En cas d'erreur de lecture (table absente, réseau), on laisse TOUT OUVERT : mieux vaut
 *    laisser passer un élève que bloquer par erreur quelqu'un qui a payé.
 *
 * Protection côté base : `supabase/acces-serveur.sql` fait respecter la même règle par la base
 * (le texte des leçons verrouillées n'est alors plus envoyé au navigateur). Sans ce script, le
 * verrouillage reste dans l'application seulement et un élève très technique pourrait le contourner.
 */

export type AccessKind = 'granted' | 'paid';

export interface AccessSettings {
  paywallEnabled: boolean;
  freeLessonsPerCourse: number;
  messageFr: string;
  messageEn: string;
}

export interface AccessGrant {
  user_id: string;
  kind: AccessKind;
  note: string | null;
  expires_at: string | null;
  granted_by?: string | null;
  created_at: string;
}

export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  paywallEnabled: false,
  freeLessonsPerCourse: 2,
  messageFr:
    "Cette leçon fait partie de l'accès complet. Contacte RythmeBinaireGn pour activer ton accès.",
  messageEn:
    'This lesson is part of full access. Contact RythmeBinaireGn to activate your access.',
};

/** Ajoute des mois à une date (en UTC) et renvoie une date ISO ; null = accès sans fin. */
export function grantExpiry(months: number | null, now: Date = new Date()): string | null {
  if (months === null) return null;
  const d = new Date(now.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

export function isGrantActive(grant: AccessGrant | null | undefined, now: Date = new Date()): boolean {
  if (!grant) return false;
  if (!grant.expires_at) return true;
  return new Date(grant.expires_at).getTime() > now.getTime();
}

/** Une leçon est verrouillée si l'accès payant est allumé, qu'elle dépasse les leçons libres, et qu'il n'y a pas d'accès actif. */
export function isLessonLocked(
  settings: AccessSettings,
  grant: AccessGrant | null | undefined,
  lessonIndex: number,
  now: Date = new Date()
): boolean {
  if (!settings.paywallEnabled) return false;
  if (lessonIndex < settings.freeLessonsPerCourse) return false;
  return !isGrantActive(grant, now);
}

function settingsFromRows(rows: { key: string; value: unknown }[]): AccessSettings {
  const s: AccessSettings = { ...DEFAULT_ACCESS_SETTINGS };
  for (const r of rows) {
    if (r.key === 'paywall_enabled') s.paywallEnabled = r.value === true;
    else if (r.key === 'free_lessons_per_course') {
      const n = Number(r.value);
      if (Number.isFinite(n) && n >= 0) s.freeLessonsPerCourse = Math.floor(n);
    } else if (r.key === 'paywall_message_fr' && typeof r.value === 'string' && r.value.trim()) s.messageFr = r.value;
    else if (r.key === 'paywall_message_en' && typeof r.value === 'string' && r.value.trim()) s.messageEn = r.value;
  }
  return s;
}

/** Réglages d'accès. `ok` = false si la table n'existe pas encore (il faut lancer supabase/acces.sql). */
export async function loadAccessSettings(): Promise<{ settings: AccessSettings; ok: boolean }> {
  if (!isSupabaseConfigured()) return { settings: DEFAULT_ACCESS_SETTINGS, ok: false };
  try {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error || !data) return { settings: DEFAULT_ACCESS_SETTINGS, ok: false };
    return { settings: settingsFromRows(data as { key: string; value: unknown }[]), ok: true };
  } catch {
    return { settings: DEFAULT_ACCESS_SETTINGS, ok: false };
  }
}

export async function saveAccessSettings(s: AccessSettings): Promise<void> {
  const now = new Date().toISOString();
  const rows = [
    { key: 'paywall_enabled', value: s.paywallEnabled, updated_at: now },
    { key: 'free_lessons_per_course', value: s.freeLessonsPerCourse, updated_at: now },
    { key: 'paywall_message_fr', value: s.messageFr, updated_at: now },
    { key: 'paywall_message_en', value: s.messageEn, updated_at: now },
  ];
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw new Error(error.message || "Impossible d'enregistrer les réglages d'accès.");
}

/** Accès de l'élève connecté (pour le verrouillage côté élève). Toute erreur = pas de blocage. */
export async function loadMyAccess(
  userId: string
): Promise<{ settings: AccessSettings; grant: AccessGrant | null }> {
  const { settings } = await loadAccessSettings();
  if (!settings.paywallEnabled) return { settings, grant: null };
  try {
    const { data, error } = await supabase.from('access_grants').select('*').eq('user_id', userId).maybeSingle();
    if (error) return { settings: { ...settings, paywallEnabled: false }, grant: null };
    if (data) return { settings, grant: data as AccessGrant };
    // Élève d'une école : l'accès suit le paiement de l'école (voir supabase/ecoles.sql).
    try {
      const sp = await supabase.rpc('my_school_paid_until');
      if (!sp.error && typeof sp.data === 'string') {
        return { settings, grant: { user_id: userId, kind: 'paid', note: 'école', expires_at: sp.data, created_at: '' } };
      }
    } catch {
      // fonction absente : ecoles.sql pas encore exécuté
    }
    // Compte enfant : il bénéficie de l'accès de l'adulte responsable (voir supabase/enfants.sql).
    const link = await supabase.from('guardian_links').select('guardian_id').eq('child_id', userId).maybeSingle();
    if (link.data?.guardian_id) {
      const g = await supabase.from('access_grants').select('*').eq('user_id', link.data.guardian_id).maybeSingle();
      if (!g.error && g.data) return { settings, grant: g.data as AccessGrant };
    }
    return { settings, grant: null };
  } catch {
    return { settings: { ...settings, paywallEnabled: false }, grant: null };
  }
}

/** Tous les accès accordés, par élève (admin). */
export async function listGrantsAdmin(): Promise<Record<string, AccessGrant>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data, error } = await supabase.from('access_grants').select('*');
    if (error || !data) return {};
    const out: Record<string, AccessGrant> = {};
    for (const g of data as AccessGrant[]) out[g.user_id] = g;
    return out;
  } catch {
    return {};
  }
}

export async function grantAccessAdmin(
  userId: string,
  adminId: string,
  opts: { kind: AccessKind; months: number | null; note: string }
): Promise<AccessGrant> {
  const row: AccessGrant = {
    user_id: userId,
    kind: opts.kind,
    note: opts.note.trim() || null,
    expires_at: grantExpiry(opts.months),
    granted_by: adminId,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('access_grants').upsert([row], { onConflict: 'user_id' });
  if (error) throw new Error(error.message || "Impossible d'enregistrer l'accès.");
  return row;
}

export async function revokeAccessAdmin(userId: string): Promise<void> {
  const { error } = await supabase.from('access_grants').delete().eq('user_id', userId);
  if (error) throw new Error(error.message || "Impossible de retirer l'accès.");
}
