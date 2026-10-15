import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Entraide (questions / réponses en texte). Voir supabase/entraide.sql.
 * Tout est tolérant : si le script n'est pas exécuté, `forumStatus()` renvoie 'unavailable' et l'interface reste cachée.
 * Les validateurs ci-dessous reprennent les règles de la base pour prévenir l'élève AVANT l'envoi.
 */

export type ForumStatus = 'ok' | 'child_account' | 'muted' | 'not_authenticated' | 'unavailable';
export type ForumError = 'link' | 'personal_info' | 'empty' | 'rate_limited' | 'muted' | 'child_account' | 'not_found' | 'not_allowed' | 'unavailable';

export interface ForumQuestion {
  id: string; title: string; excerpt: string; author_name: string; author_is_teacher: boolean;
  course_id: string | null; lang: 'fr' | 'en'; created_at: string; answer_count: number; solved: boolean; mine: boolean;
}
export interface ForumPost {
  id: string; kind: 'question' | 'answer'; title: string | null; body: string; author_name: string; author_is_teacher: boolean;
  course_id: string | null; lang: 'fr' | 'en'; accepted: boolean; created_at: string; mine: boolean;
}
export interface ForumAdminPost {
  id: string; kind: 'question' | 'answer'; title: string | null; body: string; author_id: string; author_name: string; author_email: string;
  status: 'visible' | 'hidden'; hidden_by: 'auto' | 'admin' | 'author' | null; report_count: number; reasons: string | null;
  created_at: string; author_muted: boolean;
}

export const FORUM_LIMITS = { titleMin: 5, titleMax: 120, bodyMin: 2, bodyMax: 2000, pageSize: 20 };

export const FORUM_ERRORS: Record<ForumError, { fr: string; en: string }> = {
  link: { fr: 'Les liens ne sont pas autorisés. Décris plutôt avec tes mots.', en: 'Links are not allowed. Describe it in your own words.' },
  personal_info: { fr: "N'écris pas d'e-mail ni de numéro de téléphone : pour ta sécurité, reste sur le site.", en: 'Do not write e-mails or phone numbers: for your safety, stay on the site.' },
  empty: { fr: 'Le titre (5 caractères minimum) ou le message est trop court.', en: 'The title (5 characters minimum) or message is too short.' },
  rate_limited: { fr: "Tu as atteint la limite d'aujourd'hui (5 questions, 30 réponses). Reviens demain.", en: "You reached today's limit (5 questions, 30 answers). Come back tomorrow." },
  muted: { fr: "Tu ne peux plus écrire dans l'entraide (décision de l'administrateur).", en: 'You can no longer write in the community (administrator decision).' },
  child_account: { fr: "L'entraide n'est pas disponible pour les comptes enfants.", en: 'The community is not available for child accounts.' },
  not_found: { fr: "Ce message n'existe plus.", en: 'This message no longer exists.' },
  not_allowed: { fr: 'Action non autorisée.', en: 'Action not allowed.' },
  unavailable: { fr: "Entraide indisponible pour l'instant. Réessaie plus tard.", en: 'Community unavailable right now. Try again later.' },
};

/** Même logique que forum_check_text côté base. Retourne l'erreur ou null. */
export function validateText(text: string, min = FORUM_LIMITS.bodyMin): ForumError | null {
  const t = (text || '').trim();
  if (t.length < min) return 'empty';
  if (/(https?:\/\/|www\.)/i.test(t)) return 'link';
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(t)) return 'personal_info';
  if (/\d[\d\s.\-]{7,}\d/.test(t)) return 'personal_info';
  return null;
}
export function validateQuestion(title: string, body: string): ForumError | null {
  return validateText(title, FORUM_LIMITS.titleMin) || validateText(body);
}

function mapError(message: string | undefined): ForumError {
  const m = (message || '').toLowerCase();
  for (const k of ['link', 'personal_info', 'empty', 'rate_limited', 'muted', 'child_account', 'not_found', 'not_allowed'] as ForumError[]) {
    if (m.includes(k)) return k;
  }
  return 'unavailable';
}

type Result<T> = { ok: true; data: T } | { ok: false; error: ForumError };
async function call<T>(fn: string, args: Record<string, unknown>): Promise<Result<T>> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'unavailable' };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, error: mapError(error.message) };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export async function forumStatus(): Promise<ForumStatus> {
  const r = await call<string>('forum_status', {});
  if (!r.ok) return 'unavailable';
  return ['ok', 'child_account', 'muted', 'not_authenticated'].includes(r.data) ? (r.data as ForumStatus) : 'unavailable';
}

export async function listQuestions(opts: { lang?: 'fr' | 'en' | null; course?: string | null; unsolved?: boolean; offset?: number } = {}): Promise<Result<ForumQuestion[]>> {
  const r = await call<ForumQuestion[]>('forum_list', {
    p_lang: opts.lang || null, p_course: opts.course || null, p_unsolved: !!opts.unsolved, p_limit: FORUM_LIMITS.pageSize, p_offset: opts.offset || 0,
  });
  return r.ok && !Array.isArray(r.data) ? { ok: false, error: 'unavailable' } : r;
}
export async function getThread(id: string): Promise<Result<ForumPost[]>> {
  const r = await call<ForumPost[]>('forum_thread', { p_question: id });
  return r.ok && !Array.isArray(r.data) ? { ok: false, error: 'unavailable' } : r;
}
export async function askQuestion(title: string, body: string, course: string | null, lang: 'fr' | 'en'): Promise<Result<string>> {
  const bad = validateQuestion(title, body);
  if (bad) return { ok: false, error: bad };
  return call<string>('forum_ask', { p_title: title, p_body: body, p_course: course, p_lang: lang });
}
export async function answerQuestion(questionId: string, body: string): Promise<Result<string>> {
  const bad = validateText(body);
  if (bad) return { ok: false, error: bad };
  return call<string>('forum_answer', { p_question: questionId, p_body: body });
}
export async function acceptAnswer(answerId: string, value = true): Promise<Result<null>> {
  return call<null>('forum_accept', { p_answer: answerId, p_value: value });
}
export async function removeOwnPost(id: string): Promise<Result<null>> {
  return call<null>('forum_remove_own', { p_post: id });
}
export async function reportPost(id: string, reason: string): Promise<'ok' | 'already' | 'own_post' | 'not_found' | 'unavailable'> {
  const r = await call<string>('forum_report', { p_post: id, p_reason: reason });
  if (!r.ok) return 'unavailable';
  return ['ok', 'already', 'own_post', 'not_found'].includes(r.data) ? (r.data as 'ok') : 'unavailable';
}

// ---- Admin ----
/** `null` = script entraide.sql pas exécuté (ou accès refusé). */
export async function adminListPosts(onlyFlagged = true): Promise<ForumAdminPost[] | null> {
  const r = await call<ForumAdminPost[]>('forum_admin_list', { p_only_flagged: onlyFlagged });
  return r.ok && Array.isArray(r.data) ? r.data : null;
}
export async function adminAction(id: string, action: 'hide' | 'restore' | 'delete'): Promise<boolean> {
  const r = await call<string>('forum_admin_action', { p_post: id, p_action: action });
  return r.ok && r.data === 'ok';
}
export async function adminMute(userId: string, muted: boolean, reason = ''): Promise<boolean> {
  const r = await call<string>('forum_admin_mute', { p_user: userId, p_muted: muted, p_reason: reason });
  return r.ok && r.data === 'ok';
}
