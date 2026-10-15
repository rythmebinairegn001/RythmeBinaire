import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_COURSES } from '../data/coursesData';

/**
 * Statistiques pour l'administrateur : élèves, activité, accès, écoles et argent encaissé.
 * Tout est calculé à partir des tables existantes (lecture seule). Une table absente
 * (ex : écoles.sql pas encore exécuté) donne simplement 0, jamais une erreur.
 */

export interface StatsInput {
  users: { id: string; role: string; created_at: string }[];
  completions: { user_id: string; course_id: string; completed_at: string }[];
  hints: { created_at: string }[];
  grants: { kind: string; expires_at: string | null }[];
  schools: { seats: number; price_per_student_gnf: number; paid_until: string | null }[];
  payments: { amount_gnf: number; paid_at: string }[];
}

export interface AdminStats {
  students: { total: number; new7: number; new30: number };
  activity: { active7: number; active30: number; lessons7: number; lessonsTotal: number; hints30: number };
  /** Leçons terminées par jour, 14 derniers jours (du plus ancien à aujourd'hui). */
  daily: { day: string; count: number }[];
  topCourses: { courseId: string; count: number }[];
  access: { granted: number; paid: number };
  schools: { total: number; paid: number; expired: number; unpaid: number; monthlyRecurringGnf: number };
  revenue: { totalGnf: number; last30Gnf: number };
}

const DAY = 86_400_000;
const isoDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function computeStats(i: StatsInput, now: Date = new Date()): AdminStats {
  const t = now.getTime();
  const since = (days: number) => t - days * DAY;
  const students = i.users.filter((u) => u.role === 'eleve');

  const done7 = i.completions.filter((c) => new Date(c.completed_at).getTime() >= since(7));
  const done30 = i.completions.filter((c) => new Date(c.completed_at).getTime() >= since(30));

  const perDay = new Map<string, number>();
  for (const c of i.completions) perDay.set(isoDay(c.completed_at), (perDay.get(isoDay(c.completed_at)) || 0) + 1);
  const daily = Array.from({ length: 14 }, (_, k) => {
    const day = isoDay(new Date(t - (13 - k) * DAY));
    return { day, count: perDay.get(day) || 0 };
  });

  const byCourse = new Map<string, number>();
  for (const c of i.completions) byCourse.set(c.course_id, (byCourse.get(c.course_id) || 0) + 1);
  const topCourses = [...byCourse.entries()]
    .map(([courseId, count]) => ({ courseId, count }))
    .sort((a, b) => b.count - a.count || a.courseId.localeCompare(b.courseId))
    .slice(0, 5);

  const activeGrants = i.grants.filter((g) => !g.expires_at || new Date(g.expires_at).getTime() > t);

  const status = (s: { paid_until: string | null }) => (!s.paid_until ? 'unpaid' : new Date(s.paid_until).getTime() > t ? 'paid' : 'expired');
  const paidSchools = i.schools.filter((s) => status(s) === 'paid');

  return {
    students: {
      total: students.length,
      new7: students.filter((u) => new Date(u.created_at).getTime() >= since(7)).length,
      new30: students.filter((u) => new Date(u.created_at).getTime() >= since(30)).length,
    },
    activity: {
      active7: new Set(done7.map((c) => c.user_id)).size,
      active30: new Set(done30.map((c) => c.user_id)).size,
      lessons7: done7.length,
      lessonsTotal: i.completions.length,
      hints30: i.hints.filter((h) => new Date(h.created_at).getTime() >= since(30)).length,
    },
    daily,
    topCourses,
    access: {
      granted: activeGrants.filter((g) => g.kind === 'granted').length,
      paid: activeGrants.filter((g) => g.kind === 'paid').length,
    },
    schools: {
      total: i.schools.length,
      paid: paidSchools.length,
      expired: i.schools.filter((s) => status(s) === 'expired').length,
      unpaid: i.schools.filter((s) => status(s) === 'unpaid').length,
      monthlyRecurringGnf: paidSchools.reduce((a, s) => a + s.seats * s.price_per_student_gnf, 0),
    },
    revenue: {
      totalGnf: i.payments.reduce((a, p) => a + p.amount_gnf, 0),
      last30Gnf: i.payments.filter((p) => new Date(p.paid_at).getTime() >= since(30)).reduce((a, p) => a + p.amount_gnf, 0),
    },
  };
}

/** Nom lisible d'un cours à partir de son identifiant (cours d'exemple connus), sinon l'identifiant. */
export function courseLabel(courseId: string, lang: 'fr' | 'en'): string {
  const c = INITIAL_COURSES.find((x) => x.id === courseId);
  return c?.translations[lang]?.title || c?.translations.fr.title || courseId;
}

async function rows<T>(table: string, columns: string): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(table).select(columns);
    if (error || !data) return [];
    return data as T[];
  } catch {
    return [];
  }
}

export async function loadAdminStats(now: Date = new Date()): Promise<AdminStats> {
  if (!isSupabaseConfigured()) return computeStats({ users: [], completions: [], hints: [], grants: [], schools: [], payments: [] }, now);
  const [users, completions, hints, grants, schools, payments] = await Promise.all([
    rows<StatsInput['users'][number]>('users', 'id, role, created_at'),
    rows<StatsInput['completions'][number]>('lesson_progress', 'user_id, course_id, completed_at'),
    rows<StatsInput['hints'][number]>('ai_hint_requests', 'created_at'),
    rows<StatsInput['grants'][number]>('access_grants', 'kind, expires_at'),
    rows<StatsInput['schools'][number]>('schools', 'seats, price_per_student_gnf, paid_until'),
    rows<StatsInput['payments'][number]>('school_payments', 'amount_gnf, paid_at'),
  ]);
  return computeStats({ users, completions, hints, grants, schools, payments }, now);
}
