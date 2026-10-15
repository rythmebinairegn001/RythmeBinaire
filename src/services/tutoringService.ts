import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Cours en tête-à-tête (voir supabase/tutorat.sql).
 * Deux formes avec un quota mensuel commun : séance en visio (lien externe du professeur)
 * ou question écrite (alternative sans vidéo pour les connexions faibles, réponse sous 24 h par défaut).
 * Les règles (quota, délai, lien caché) sont appliquées par la base ; ici on appelle et on présente.
 */

export interface Quota {
  quota: number;
  used: number;
  /** Délai de réponse promis aux questions écrites, en heures (24 par défaut, réglable). */
  answer_hours?: number;
}

export const DEFAULT_ANSWER_HOURS = 24;

export function answerHours(q: Pick<Quota, 'answer_hours'> | null | undefined): number {
  const h = Number(q?.answer_hours);
  return Number.isFinite(h) && h >= 1 ? h : DEFAULT_ANSWER_HOURS;
}

/** Une question ouverte depuis plus longtemps que le délai promis est « en retard ». */
export function isOverdue(createdAt: string, hours: number, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() > hours * 3_600_000;
}

/** « 24 h » ou « 2 jours » (lisible pour un élève). */
export function hoursLabel(hours: number, lang: 'fr' | 'en'): string {
  if (hours >= 48 && hours % 24 === 0) return lang === 'fr' ? `${hours / 24} jours` : `${hours / 24} days`;
  return `${hours} h`;
}
export interface OpenSlot {
  id: string;
  teacher_name: string;
  starts_at: string;
  duration_min: number;
}
export interface Booking extends OpenSlot {
  meeting_url: string;
  topic: string | null;
  /** Séance réservée par ce parent pour son enfant (supabase/enfants-v2.sql). */
  child_name?: string | null;
  child_id?: string | null;
}
export interface TeacherSlot {
  id: string;
  starts_at: string;
  duration_min: number;
  meeting_url: string;
  status: 'open' | 'booked' | 'cancelled';
  topic: string | null;
  student_name: string | null;
  student_email: string | null;
  is_child?: boolean;
}
export interface Question {
  id: string;
  body: string;
  code: string | null;
  status: 'open' | 'answered';
  answer: string | null;
  created_at: string;
}
export interface TeacherQuestion extends Question {
  student_name: string;
}

export type TutoringError = 'quota_reached' | 'child_account' | 'slot_unavailable' | 'too_late' | 'not_found' | 'not_authenticated' | 'not_teacher' | 'empty_answer' | 'presence_required' | 'not_guardian' | 'child_suspended' | 'unknown';

export const TUTORING_ERRORS: Record<TutoringError, { fr: string; en: string }> = {
  quota_reached: { fr: 'Tu as utilisé toutes tes séances ce mois-ci. Le quota revient le 1er du mois prochain.', en: 'You have used all your sessions this month. The quota resets on the 1st of next month.' },
  child_account: { fr: 'Un compte enfant ne peut pas réserver seul. Demande à ton parent.', en: 'A child account cannot book on its own. Ask your parent.' },
  slot_unavailable: { fr: "Ce créneau n'est plus disponible. Choisis-en un autre.", en: 'This slot is no longer available. Pick another one.' },
  too_late: { fr: 'Il est trop tard pour annuler (moins de 12 h avant la séance).', en: 'It is too late to cancel (less than 12 h before the session).' },
  not_found: { fr: 'Élément introuvable ou déjà traité.', en: 'Not found or already handled.' },
  not_authenticated: { fr: 'Connecte-toi pour continuer.', en: 'Log in to continue.' },
  not_teacher: { fr: "Cet espace est réservé aux professeurs.", en: 'This area is for teachers only.' },
  empty_answer: { fr: 'Écris ta réponse avant d’envoyer.', en: 'Write your answer before sending.' },
  presence_required: { fr: 'Pour un enfant, un adulte doit rester présent pendant la séance : coche la case pour confirmer.', en: 'For a child, an adult must stay present during the session: tick the box to confirm.' },
  not_guardian: { fr: 'Tu n’es pas l’adulte responsable de ce compte enfant.', en: 'You are not the responsible adult for this child account.' },
  child_suspended: { fr: 'Ce compte enfant est suspendu : réactive-le d’abord.', en: 'This child account is suspended: reactivate it first.' },
  unknown: { fr: 'Une erreur est survenue. Réessaie dans un instant.', en: 'Something went wrong. Try again in a moment.' },
};

const KNOWN = Object.keys(TUTORING_ERRORS) as TutoringError[];
/** Traduit le message d'erreur de la base en code connu. */
export function errorKind(message: string | undefined): TutoringError {
  const m = message || '';
  return KNOWN.find((k) => k !== 'unknown' && m.includes(k)) ?? 'unknown';
}

// ---------------------------------------------------------------- Règles pures (testables)

const MIN = 60_000;
const HOUR = 3_600_000;

/** Séances restantes ce mois-ci (jamais négatif). */
export function remaining(q: Quota): number {
  return Math.max(0, q.quota - q.used);
}

/** On peut annuler jusqu'à 12 h avant le début. */
export function canCancel(startsAt: string, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() - now.getTime() > 12 * HOUR;
}

/** Le bouton « Rejoindre » apparaît 10 min avant et reste jusqu'à 15 min après la fin prévue. */
export function canJoin(startsAt: string, durationMin: number, now: Date = new Date()): boolean {
  const start = new Date(startsAt).getTime();
  const t = now.getTime();
  return t >= start - 10 * MIN && t <= start + durationMin * MIN + 15 * MIN;
}

export type SlotInputError = 'too_soon' | 'url_invalid' | 'duration' | 'date_invalid';

/** Un lien de visio doit être en https (Meet, Zoom, WhatsApp…). */
export function isValidMeetingUrl(url: string): boolean {
  const u = url.trim();
  if (u.length > 300 || !/^https:\/\//i.test(u)) return false;
  try {
    return !!new URL(u).hostname.includes('.');
  } catch {
    return false;
  }
}

export function validateSlotInput(i: { startsAtIso: string; durationMin: number; meetingUrl: string }, now: Date = new Date()): SlotInputError | null {
  const t = new Date(i.startsAtIso).getTime();
  if (Number.isNaN(t)) return 'date_invalid';
  if (t < now.getTime() + 2 * HOUR) return 'too_soon';
  if (![15, 30, 45, 60].includes(i.durationMin)) return 'duration';
  if (!isValidMeetingUrl(i.meetingUrl)) return 'url_invalid';
  return null;
}

export const SLOT_INPUT_ERRORS: Record<SlotInputError, { fr: string; en: string }> = {
  too_soon: { fr: 'Le créneau doit commencer dans plus de 2 heures.', en: 'The slot must start in more than 2 hours.' },
  url_invalid: { fr: 'Le lien de visio doit commencer par https:// (Meet, Zoom, WhatsApp…).', en: 'The meeting link must start with https:// (Meet, Zoom, WhatsApp…).' },
  duration: { fr: 'Durée non valide.', en: 'Invalid duration.' },
  date_invalid: { fr: 'Date non valide.', en: 'Invalid date.' },
};

/** Regroupe des créneaux par jour (heure locale), du plus proche au plus lointain. */
export function groupByDay<T extends { starts_at: string }>(items: T[], lang: 'fr' | 'en'): { key: string; label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const d = new Date(it.starts_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return [...map.entries()].map(([key, list]) => ({
    key,
    label: new Date(list[0].starts_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    items: list,
  }));
}

export function timeLabel(iso: string, lang: 'fr' | 'en'): string {
  return new Date(iso).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------- Élève

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(errorKind(error.message));
  return data as T;
}

/** Quota du mois. Renvoie null si le script SQL n'est pas encore exécuté (la fonctionnalité reste cachée). */
export async function loadQuota(): Promise<Quota | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.rpc('tutoring_quota');
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as Quota | undefined;
    return row ? { quota: Number(row.quota), used: Number(row.used), answer_hours: answerHours(row) } : null;
  } catch {
    return null;
  }
}

export const listOpenSlots = async (): Promise<OpenSlot[]> => ((await rpc<OpenSlot[]>('open_slots')) || []);
export const listMyBookings = async (): Promise<Booking[]> => ((await rpc<Booking[]>('my_bookings')) || []);
/** Quota mensuel d'UN enfant (chaque enfant a le sien). null = script enfants-v2.sql pas exécuté. */
export async function loadChildQuota(childId: string): Promise<Quota | null> {
  try {
    const { data, error } = await supabase.rpc('child_tutoring_quota', { p_child: childId });
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as Quota | undefined;
    return row ? { quota: Number(row.quota), used: Number(row.used), answer_hours: answerHours(row) } : null;
  } catch {
    return null;
  }
}
export const bookSlotForChild = async (slotId: string, childId: string, parentPresent: boolean, topic?: string): Promise<void> => {
  await rpc('book_slot_for_child', { p_slot_id: slotId, p_child: childId, p_present: parentPresent, p_topic: topic?.trim() || null });
};
export const bookSlot = async (slotId: string, topic?: string): Promise<void> => {
  await rpc('book_slot', { p_slot_id: slotId, p_topic: topic?.trim() || null });
};
export const cancelBooking = async (slotId: string): Promise<void> => {
  await rpc('cancel_booking', { p_slot_id: slotId });
};
export const askQuestion = async (body: string, code?: string): Promise<void> => {
  if (!body.trim()) throw new Error('unknown');
  await rpc('ask_question', { p_body: body.trim(), p_code: code?.trim() || null });
};

export async function listMyQuestions(studentId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('tutoring_questions')
    .select('id, body, code, status, answer, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(errorKind(error.message));
  return (data || []) as Question[];
}

// ---------------------------------------------------------------- Professeur

export const listTeacherSlots = async (): Promise<TeacherSlot[]> => ((await rpc<TeacherSlot[]>('teacher_slots')) || []);
export const listTeacherQuestions = async (): Promise<TeacherQuestion[]> => ((await rpc<TeacherQuestion[]>('teacher_questions')) || []);
export const answerQuestion = async (id: string, answer: string): Promise<void> => {
  await rpc('answer_question', { p_id: id, p_answer: answer });
};

export async function createSlot(teacherId: string, i: { startsAtIso: string; durationMin: number; meetingUrl: string }, now: Date = new Date()): Promise<void> {
  const bad = validateSlotInput(i, now);
  if (bad) throw new Error(bad);
  const { error } = await supabase.from('tutoring_slots').insert({
    teacher_id: teacherId,
    starts_at: new Date(i.startsAtIso).toISOString(),
    duration_min: i.durationMin,
    meeting_url: i.meetingUrl.trim(),
  });
  if (error) throw new Error(errorKind(error.message));
}

/** Annule un créneau (libre ou réservé) : il disparaît des listes et le quota de l'élève est rendu. */
export async function cancelSlot(slotId: string): Promise<void> {
  const { error } = await supabase.from('tutoring_slots').update({ status: 'cancelled', booked_by: null }).eq('id', slotId);
  if (error) throw new Error(errorKind(error.message));
}
