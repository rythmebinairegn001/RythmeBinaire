import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Progression : série de jours (« streak ») et badges.
 * Tout est CALCULÉ à partir des leçons terminées (table lesson_progress, avec leur date) :
 * aucune nouvelle table, rien à migrer, et les anciennes leçons comptent déjà.
 * Les jours sont comptés en UTC (c'est l'heure de la Guinée).
 */

export interface Completion {
  course_id: string;
  lesson_id: string;
  completed_at: string;
}

const DAY_MS = 86_400_000;
const dayKey = (d: Date | string): string => new Date(d).toISOString().slice(0, 10);
const dayNumber = (key: string): number => Math.floor(Date.parse(key + 'T00:00:00Z') / DAY_MS);

export interface Streak {
  /** Série en cours (jours consécutifs avec au moins une leçon). Reste vivante jusqu'à la fin de « demain ». */
  current: number;
  longest: number;
  /** Une leçon a déjà été terminée aujourd'hui. */
  activeToday: boolean;
  /** Les 7 derniers jours (du plus ancien à aujourd'hui) : true = au moins une leçon ce jour-là. */
  last7: boolean[];
}

export function computeStreak(dates: string[], now: Date = new Date()): Streak {
  const days = Array.from(new Set(dates.map(dayKey))).map(dayNumber).sort((a, b) => a - b);
  const today = dayNumber(dayKey(now));
  const set = new Set(days);

  let longest = 0;
  let run = 0;
  let prev = -Infinity;
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }

  // Série en cours : on part d'aujourd'hui, ou d'hier si rien n'a encore été fait aujourd'hui.
  const activeToday = set.has(today);
  let cursor = activeToday ? today : today - 1;
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor--;
  }

  const last7 = Array.from({ length: 7 }, (_, i) => set.has(today - 6 + i));
  return { current, longest, activeToday, last7 };
}

export interface BadgeStats {
  lessonsCompleted: number;
  longestStreak: number;
  coursesCompleted: number;
}

export interface Badge {
  id: string;
  icon: string;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  target: number;
  value: number;
  earned: boolean;
}

interface BadgeDef {
  id: string;
  icon: string;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  target: number;
  stat: keyof BadgeStats;
}

const DEFS: BadgeDef[] = [
  { id: 'lessons-1', icon: '🌱', stat: 'lessonsCompleted', target: 1, title: { fr: 'Premier pas', en: 'First step' }, description: { fr: 'Terminer ta première leçon', en: 'Complete your first lesson' } },
  { id: 'lessons-5', icon: '📘', stat: 'lessonsCompleted', target: 5, title: { fr: 'En route', en: 'On your way' }, description: { fr: 'Terminer 5 leçons', en: 'Complete 5 lessons' } },
  { id: 'lessons-10', icon: '🚀', stat: 'lessonsCompleted', target: 10, title: { fr: 'Décollage', en: 'Lift-off' }, description: { fr: 'Terminer 10 leçons', en: 'Complete 10 lessons' } },
  { id: 'lessons-25', icon: '⚡', stat: 'lessonsCompleted', target: 25, title: { fr: 'Passionné', en: 'Enthusiast' }, description: { fr: 'Terminer 25 leçons', en: 'Complete 25 lessons' } },
  { id: 'lessons-50', icon: '🏆', stat: 'lessonsCompleted', target: 50, title: { fr: 'Pro du rythme', en: 'Rhythm pro' }, description: { fr: 'Terminer 50 leçons', en: 'Complete 50 lessons' } },
  { id: 'streak-3', icon: '🔥', stat: 'longestStreak', target: 3, title: { fr: 'Régulier', en: 'Steady' }, description: { fr: '3 jours d’affilée avec une leçon', en: '3 days in a row with a lesson' } },
  { id: 'streak-7', icon: '🌟', stat: 'longestStreak', target: 7, title: { fr: 'Une semaine !', en: 'A full week!' }, description: { fr: '7 jours d’affilée avec une leçon', en: '7 days in a row with a lesson' } },
  { id: 'streak-30', icon: '👑', stat: 'longestStreak', target: 30, title: { fr: 'Inarrêtable', en: 'Unstoppable' }, description: { fr: '30 jours d’affilée avec une leçon', en: '30 days in a row with a lesson' } },
  { id: 'course-1', icon: '🎓', stat: 'coursesCompleted', target: 1, title: { fr: 'Cours terminé', en: 'Course completed' }, description: { fr: 'Terminer un cours en entier', en: 'Finish a whole course' } },
  { id: 'course-3', icon: '🧠', stat: 'coursesCompleted', target: 3, title: { fr: 'Esprit curieux', en: 'Curious mind' }, description: { fr: 'Terminer 3 cours', en: 'Finish 3 courses' } },
];

export function computeBadges(stats: BadgeStats): Badge[] {
  return DEFS.map((d) => {
    const value = stats[d.stat];
    return { id: d.id, icon: d.icon, title: d.title, description: d.description, target: d.target, value: Math.min(value, d.target), earned: value >= d.target };
  });
}

/** Leçons terminées par l'élève (avec date). Renvoie [] si la base n'est pas disponible. */
export async function loadMyCompletions(userId: string): Promise<Completion[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('course_id, lesson_id, completed_at')
      .eq('user_id', userId);
    if (error || !data) return [];
    return data as Completion[];
  } catch {
    return [];
  }
}

export function summarize(completions: Completion[], coursesCompleted: number, now: Date = new Date()) {
  const lessons = new Set(completions.map((c) => `${c.course_id}/${c.lesson_id}`));
  const streak = computeStreak(completions.map((c) => c.completed_at), now);
  const badges = computeBadges({ lessonsCompleted: lessons.size, longestStreak: streak.longest, coursesCompleted });
  return { lessonsCompleted: lessons.size, streak, badges };
}
