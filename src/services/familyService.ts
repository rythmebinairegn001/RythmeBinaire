import { supabase, isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';

/**
 * Comptes enfants supervisés par un adulte.
 *
 * Règle : un enfant n'a jamais de compte libre. L'adulte crée le compte (identifiant + mot de passe
 * qu'il choisit) depuis son espace « Famille ». Tout se fait via la fonction serveur « manage-child »
 * (supabase/functions/manage-child) : la clé secrète n'est jamais dans le navigateur.
 * Le navigateur ne peut que LIRE les liens (voir supabase/enfants.sql).
 */

export const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,19}$/;
export const MIN_PASSWORD = 8;

/** Domaine réservé (jamais de courrier réel) utilisé pour fabriquer l'e-mail interne d'un enfant. */
export const CHILD_EMAIL_DOMAIN =
  (import.meta.env?.VITE_CHILD_EMAIL_DOMAIN as string | undefined)?.trim() || 'enfants.rythmebinaire.invalid';

/** « Mariama.9 » → e-mail interne utilisé pour la connexion. Un vrai e-mail (avec @) reste inchangé. */
export function loginIdentifierToEmail(identifier: string, domain = CHILD_EMAIL_DOMAIN): string {
  const v = identifier.trim();
  if (v.includes('@')) return v;
  return `${v.toLowerCase()}@${domain}`;
}

export type UsernameProblem = 'empty' | 'format';
export function checkUsername(raw: string): UsernameProblem | null {
  const v = raw.trim().toLowerCase();
  if (!v) return 'empty';
  return USERNAME_RE.test(v) ? null : 'format';
}

export interface ChildAccount {
  child_id: string;
  username: string;
  full_name: string;
  ai_allowed: boolean;
  suspended: boolean;
  created_at: string;
  lessonsCompleted: number;
}

export interface GuardianLink {
  child_id: string;
  guardian_id: string;
  username: string;
  ai_allowed: boolean;
  suspended: boolean;
}

/** Cet utilisateur est-il un compte enfant ? (null = non). Ne bloque jamais en cas d'erreur. */
export async function loadMyChildLink(userId: string): Promise<GuardianLink | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('guardian_links').select('*').eq('child_id', userId).maybeSingle();
    if (error) return null;
    return (data as GuardianLink | null) ?? null;
  } catch {
    return null;
  }
}

/** Les enfants de cet adulte, avec leur nom et leur nombre de leçons terminées. */
export async function listMyChildren(guardianId: string): Promise<ChildAccount[]> {
  if (!isSupabaseConfigured()) return [];
  const { data: links, error } = await supabase
    .from('guardian_links')
    .select('*')
    .eq('guardian_id', guardianId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (links || []) as (GuardianLink & { created_at: string })[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.child_id);
  const [{ data: users }, { data: progress }] = await Promise.all([
    supabase.from('users').select('id, full_name').in('id', ids),
    supabase.from('lesson_progress').select('user_id').in('user_id', ids),
  ]);
  const names = new Map<string, string>((users || []).map((u: any) => [u.id, u.full_name || '']));
  const counts = new Map<string, number>();
  for (const p of (progress || []) as { user_id: string }[]) counts.set(p.user_id, (counts.get(p.user_id) || 0) + 1);
  return rows.map((r) => ({
    child_id: r.child_id,
    username: r.username,
    full_name: names.get(r.child_id) || r.username,
    ai_allowed: r.ai_allowed,
    suspended: r.suspended,
    created_at: r.created_at,
    lessonsCompleted: counts.get(r.child_id) || 0,
  }));
}

type ManageBody =
  | { action: 'create'; username: string; password: string; full_name: string; language: 'fr' | 'en' }
  | { action: 'reset_password'; child_id: string; password: string }
  | { action: 'set_suspended'; child_id: string; suspended: boolean }
  | { action: 'set_ai'; child_id: string; ai_allowed: boolean }
  | { action: 'delete'; child_id: string };

/** Appelle la fonction serveur. Lance une Error avec un message lisible par l'adulte. */
export async function manageChild(body: ManageBody): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase n’est pas configuré.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Reconnecte-toi puis réessaie.');
  const { url } = getSupabaseConfig();
  let resp: Response;
  try {
    resp = await fetch(`${url.replace(/\/$/, '')}/functions/v1/manage-child`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifie ta connexion et réessaie.');
  }
  const payload = (await resp.json().catch(() => null)) as { error?: string } | null;
  if (!resp.ok) {
    if (resp.status === 404 && !payload) throw new Error('La gestion des comptes enfants n’est pas encore activée sur la plateforme.');
    throw new Error(payload?.error || 'Une erreur est survenue. Réessaie dans un instant.');
  }
}

// ---------------------------------------------------------------- Classes d'un enfant (supabase/enfants-v2.sql)

export interface ClassPreview {
  class_name: string;
  teacher_name: string;
}
export interface ChildClass {
  class_id: string;
  class_name: string;
  teacher_name: string;
  joined_at: string;
}
export type ChildClassError = 'invalid_code' | 'not_guardian' | 'child_suspended' | 'own_class' | 'unavailable';

export const CHILD_CLASS_ERRORS: Record<ChildClassError, { fr: string; en: string }> = {
  invalid_code: { fr: 'Code inconnu ou classe fermée. Vérifie le code auprès du professeur.', en: 'Unknown code or closed class. Check the code with the teacher.' },
  not_guardian: { fr: 'Tu n’es pas l’adulte responsable de cet enfant.', en: 'You are not the responsible adult for this child.' },
  child_suspended: { fr: 'Ce compte enfant est suspendu : réactive-le d’abord.', en: 'This child account is suspended: reactivate it first.' },
  own_class: { fr: 'Un professeur ne peut pas rejoindre sa propre classe.', en: 'A teacher cannot join their own class.' },
  unavailable: { fr: 'Cette fonction n’est pas encore activée sur le site.', en: 'This feature is not enabled on the site yet.' },
};

export function childClassErrorKind(message: string | undefined): ChildClassError {
  const m = message || '';
  const hit = (['invalid_code', 'not_guardian', 'child_suspended', 'own_class'] as const).find((k) => m.includes(k));
  return hit ?? 'unavailable';
}

export const normalizeClassCode = (raw: string): string => raw.trim().toUpperCase();
export const isClassCode = (raw: string): boolean => /^[A-Z0-9]{6}$/.test(normalizeClassCode(raw));

/** Ce que le parent voit avant d'accepter : nom de la classe et du professeur. null = code inconnu / fonction absente. */
export async function previewClass(code: string): Promise<ClassPreview | null> {
  if (!isSupabaseConfigured() || !isClassCode(code)) return null;
  try {
    const { data, error } = await supabase.rpc('class_preview', { p_code: normalizeClassCode(code) });
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as ClassPreview | undefined;
    return row?.class_name ? row : null;
  } catch {
    return null;
  }
}

export async function joinClassForChild(code: string, childId: string): Promise<{ class_name: string }> {
  if (!isClassCode(code)) throw new Error('invalid_code' satisfies ChildClassError);
  const { data, error } = await supabase.rpc('join_class_for_child', { p_code: normalizeClassCode(code), p_child: childId });
  if (error) throw new Error(childClassErrorKind(error.message));
  const row = (Array.isArray(data) ? data[0] : data) as { class_name: string } | undefined;
  if (!row) throw new Error('invalid_code' satisfies ChildClassError);
  return row;
}

/** Classes de l'enfant. null = script absent. */
export async function listChildClasses(childId: string): Promise<ChildClass[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.rpc('child_classes', { p_child: childId });
    if (error || !Array.isArray(data)) return null;
    return data as ChildClass[];
  } catch {
    return null;
  }
}

export async function removeChildFromClass(classId: string, childId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_child_from_class', { p_class: classId, p_child: childId });
  if (error) throw new Error(childClassErrorKind(error.message));
}
