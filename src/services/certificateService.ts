import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Certificats vérifiables (voir supabase/certificats.sql).
 * La base décide si l'élève a droit au certificat (toutes les leçons terminées) ; ce fichier ne fait que l'appeler.
 */

export interface Certificate {
  id: string;
  code: string;
  user_id: string;
  course_id: string;
  student_name: string;
  course_title_fr: string;
  course_title_en: string;
  issued_at: string;
  revoked: boolean;
}

export interface VerifiedCertificate {
  student_name: string;
  course_title_fr: string;
  course_title_en: string;
  issued_at: string;
  revoked: boolean;
}

export type CertError = 'not_finished' | 'no_content' | 'name_required' | 'not_authenticated' | 'unknown';

export const CERT_ERRORS: Record<CertError, { fr: string; en: string }> = {
  not_finished: { fr: 'Termine toutes les leçons du cours pour obtenir ton certificat.', en: 'Finish all the lessons of the course to get your certificate.' },
  no_content: { fr: "Ce cours d'exemple ne délivre pas de certificat.", en: 'This sample course does not issue a certificate.' },
  name_required: { fr: 'Écris ton nom complet pour qu’il apparaisse sur le certificat.', en: 'Enter your full name so it appears on the certificate.' },
  not_authenticated: { fr: 'Connecte-toi pour obtenir ton certificat.', en: 'Log in to get your certificate.' },
  unknown: { fr: 'Impossible de délivrer le certificat pour l’instant. Réessaie plus tard.', en: 'Unable to issue the certificate right now. Try again later.' },
};

/** Forme d'un code valide : RB- puis 8 caractères (sans 0/O/1/I). */
export const CODE_RE = /^RB-[A-HJ-NP-Z2-9]{8}$/;

/** Nettoie un code saisi à la main (espaces, minuscules, tiret manquant). */
export function normalizeCode(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.startsWith('RB') && c.length > 2 ? `RB-${c.slice(2, 10)}` : c;
}

export function verifyUrl(code: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}/?verif=${encodeURIComponent(code)}`;
}

export async function listMyCertificates(userId: string): Promise<Certificate[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data } = await supabase.from('certificates').select('*').eq('user_id', userId).order('issued_at', { ascending: false });
    return (data || []) as Certificate[];
  } catch {
    return [];
  }
}

export async function issueCertificate(courseId: string, name?: string): Promise<Certificate> {
  const { data, error } = await supabase.rpc('issue_certificate', { p_course_id: courseId, p_name: name?.trim() || null });
  if (error) {
    const m = error.message || '';
    const k = (['not_finished', 'no_content', 'name_required', 'not_authenticated'] as const).find((x) => m.includes(x)) ?? 'unknown';
    throw new Error(k);
  }
  const row = (Array.isArray(data) ? data[0] : data) as Certificate | undefined;
  if (!row) throw new Error('unknown');
  return row;
}

/** Vérification publique. null = code inconnu. */
export async function verifyCertificate(rawCode: string): Promise<VerifiedCertificate | null> {
  const code = normalizeCode(rawCode);
  if (!CODE_RE.test(code)) return null;
  const { data, error } = await supabase.rpc('verify_certificate', { p_code: code });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as VerifiedCertificate | undefined;
  return row ?? null;
}
