import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { computeStreak } from './progressionService';
import { Activity, activityOf, countLessons } from './teacherService';

/**
 * Rapport de progression d'un enfant pour son parent (voir supabase/parents.sql).
 * Tout est calculé à partir de données existantes : leçons terminées, exercices envoyés, indices demandés.
 */

const DAY = 86_400_000;

export interface ReportInput {
  completions: { course_id: string; lesson_id: string; completed_at: string }[];
  submissions: { status: string; created_at: string }[];
  hints: { created_at: string }[];
  /** Nombre total de leçons par cours (0 ou absent = inconnu). */
  totals: Record<string, number>;
}

export interface CourseLine {
  courseId: string;
  done: number;
  total: number;
  percent: number | null;
}

export interface ChildReport {
  lessonsTotal: number;
  lessonsWeek: number;
  /** Jours distincts avec au moins une leçon, sur les 7 derniers jours. */
  activeDays7: number;
  streak: number;
  lastActive: string | null;
  daysSince: number | null;
  activity: Activity;
  attemptsWeek: number;
  passedWeek: number;
  hintsWeek: number;
  courses: CourseLine[];
  tip: { fr: string; en: string };
}

const TIPS: Record<Activity, { fr: string; en: string }> = {
  active: { fr: 'Bon rythme cette semaine : un mot d’encouragement fait plaisir.', en: 'Good pace this week: a word of encouragement goes a long way.' },
  quiet: { fr: 'Moins d’activité ces derniers jours : proposez un petit créneau fixe (15 minutes) pour reprendre.', en: 'Less activity lately: suggest a fixed short slot (15 minutes) to get going again.' },
  inactive: { fr: 'Plus d’activité depuis longtemps : parlez-en avec lui, une leçon courte suffit pour relancer.', en: 'No activity for a long time: talk with them, one short lesson is enough to restart.' },
  never: { fr: 'Aucune leçon terminée pour l’instant : installez-vous avec lui pour la première, ça aide beaucoup.', en: 'No lesson completed yet: sit with them for the first one, it helps a lot.' },
};

export function computeChildReport(i: ReportInput, now: Date = new Date()): ChildReport {
  const week = now.getTime() - 7 * DAY;
  const inWeek = (iso: string) => new Date(iso).getTime() >= week;
  const key = (c: { course_id: string; lesson_id: string }) => `${c.course_id}::${c.lesson_id}`;

  const all = new Set(i.completions.map(key));
  const wk = new Set(i.completions.filter((c) => inWeek(c.completed_at)).map(key));
  const streak = computeStreak(i.completions.map((c) => c.completed_at), now);
  const lastActive = i.completions.reduce<string | null>((a, c) => (!a || c.completed_at > a ? c.completed_at : a), null);
  const activity = activityOf(lastActive, now);

  const byCourse = new Map<string, Set<string>>();
  for (const c of i.completions) {
    if (!byCourse.has(c.course_id)) byCourse.set(c.course_id, new Set());
    byCourse.get(c.course_id)!.add(c.lesson_id);
  }
  const courses: CourseLine[] = [...byCourse.entries()]
    .map(([courseId, set]) => {
      const total = i.totals[courseId] || 0;
      return { courseId, done: set.size, total, percent: total > 0 ? Math.min(100, Math.round((set.size / total) * 100)) : null };
    })
    .sort((a, b) => b.done - a.done || a.courseId.localeCompare(b.courseId));

  const subsWeek = i.submissions.filter((s) => inWeek(s.created_at));
  return {
    lessonsTotal: all.size,
    lessonsWeek: wk.size,
    activeDays7: streak.last7.filter(Boolean).length,
    streak: streak.current,
    lastActive,
    daysSince: lastActive ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / DAY) : null,
    activity,
    attemptsWeek: subsWeek.length,
    passedWeek: subsWeek.filter((s) => s.status === 'pass').length,
    hintsWeek: i.hints.filter((h) => inWeek(h.created_at)).length,
    courses,
    tip: TIPS[activity],
  };
}

/** Texte prêt à coller dans WhatsApp / SMS. */
export function reportToText(childName: string, r: ChildReport, titles: Record<string, string>, lang: 'fr' | 'en'): string {
  const fr = lang === 'fr';
  const date = r.lastActive ? new Date(r.lastActive).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' }) : fr ? 'aucune' : 'none';
  const lines = [
    fr ? `Rapport de ${childName} – 7 derniers jours` : `${childName}'s report – last 7 days`,
    fr ? `• Leçons terminées : ${r.lessonsWeek} (total : ${r.lessonsTotal})` : `• Lessons completed: ${r.lessonsWeek} (total: ${r.lessonsTotal})`,
    fr ? `• Jours actifs : ${r.activeDays7} sur 7` : `• Active days: ${r.activeDays7} of 7`,
    fr ? `• Exercices réussis : ${r.passedWeek} sur ${r.attemptsWeek} essais` : `• Exercises passed: ${r.passedWeek} of ${r.attemptsWeek} attempts`,
    fr ? `• Dernière activité : ${date}` : `• Last activity: ${date}`,
  ];
  for (const c of r.courses.slice(0, 3)) {
    lines.push(`• ${titles[c.courseId] || (fr ? 'Cours' : 'Course')} : ${c.percent !== null ? `${c.percent} %` : `${c.done} ${fr ? 'leçon(s)' : 'lesson(s)'}`}`);
  }
  lines.push(fr ? r.tip.fr : r.tip.en, '— RythmeBinaireGn');
  return lines.join('\n');
}

/** Lien WhatsApp avec le texte déjà écrit (le parent choisit le destinataire). */
export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Charge les données d'un enfant et calcule son rapport. */
export async function loadChildReport(childId: string, now: Date = new Date()): Promise<ChildReport> {
  if (!isSupabaseConfigured()) return computeChildReport({ completions: [], submissions: [], hints: [], totals: {} }, now);
  const { data: prog, error } = await supabase.from('lesson_progress').select('course_id, lesson_id, completed_at').eq('user_id', childId);
  if (error) throw new Error(error.message);
  const completions = (prog || []) as ReportInput['completions'];
  const since = new Date(now.getTime() - 7 * DAY).toISOString();
  let submissions: ReportInput['submissions'] = [];
  let hints: ReportInput['hints'] = [];
  try {
    const { data } = await supabase.from('exercise_submissions').select('status, created_at').eq('user_id', childId);
    submissions = ((data || []) as ReportInput['submissions']).filter((s) => s.created_at >= since);
  } catch {
    // parents.sql pas encore exécuté : on affiche le reste
  }
  try {
    const { data } = await supabase.from('ai_hint_requests').select('created_at').eq('user_id', childId);
    hints = ((data || []) as ReportInput['hints']).filter((h) => h.created_at >= since);
  } catch {
    // table absente : pas de compteur d'indices
  }
  const courseIds = [...new Set(completions.map((c) => c.course_id))];
  const totals: Record<string, number> = {};
  for (const id of courseIds) totals[id] = await countLessons([id]);
  return computeChildReport({ completions, submissions, hints, totals }, now);
}
