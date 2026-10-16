import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Résumé d'audience renvoyé par analytics_summary() (réservé à l'administrateur, vérifié côté serveur). */
export interface AudienceSummary {
  visitors_today: number; visitors_7: number; visitors_30: number; visitors_total: number;
  views_today: number; views_7: number; views_30: number;
  logins_30: number; active_7: number; active_30: number;
  users_total: number; signups_7: number; signups_30: number;
  daily: { day: string; visitors: number; views: number; signups: number }[];
  weekly_signups: { week: string; signups: number }[];
  courses: { course_id: string; starts: number; completed: number; enrolled: number }[];
  languages_users: Record<string, number>;
  languages_visitors: Record<string, number>;
  countries: Record<string, number>;
  devices: Record<string, number>;
  completion: { started: number; completed: number };
}

export type AudienceResult =
  | { status: 'ok'; data: AudienceSummary }
  | { status: 'missing' }    // analytics.sql pas encore exécuté
  | { status: 'forbidden' }  // pas administrateur
  | { status: 'error' };

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);
const rec = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') for (const [k, n] of Object.entries(v as Record<string, unknown>)) out[k] = num(n);
  return out;
};

/** Taux de cours terminés en % (cours terminés / cours commencés), ou null s'il n'y a rien à mesurer. */
export function completionRate(c: { started: number; completed: number }): number | null {
  return c.started > 0 ? Math.min(100, Math.round((c.completed / c.started) * 100)) : null;
}

export function normalizeSummary(raw: unknown): AudienceSummary {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const comp = (r.completion && typeof r.completion === 'object' ? r.completion : {}) as Record<string, unknown>;
  return {
    visitors_today: num(r.visitors_today), visitors_7: num(r.visitors_7), visitors_30: num(r.visitors_30), visitors_total: num(r.visitors_total),
    views_today: num(r.views_today), views_7: num(r.views_7), views_30: num(r.views_30),
    logins_30: num(r.logins_30), active_7: num(r.active_7), active_30: num(r.active_30),
    users_total: num(r.users_total), signups_7: num(r.signups_7), signups_30: num(r.signups_30),
    daily: arr<AudienceSummary['daily'][number]>(r.daily).map((d) => ({ day: String(d.day), visitors: num(d.visitors), views: num(d.views), signups: num(d.signups) })),
    weekly_signups: arr<AudienceSummary['weekly_signups'][number]>(r.weekly_signups).map((w) => ({ week: String(w.week), signups: num(w.signups) })),
    courses: arr<AudienceSummary['courses'][number]>(r.courses).map((c) => ({ course_id: String(c.course_id), starts: num(c.starts), completed: num(c.completed), enrolled: num(c.enrolled) })),
    languages_users: rec(r.languages_users), languages_visitors: rec(r.languages_visitors),
    countries: rec(r.countries), devices: rec(r.devices),
    completion: { started: num(comp.started), completed: num(comp.completed) },
  };
}

export async function loadAudience(): Promise<AudienceResult> {
  if (!isSupabaseConfigured()) return { status: 'missing' };
  try {
    const { data, error } = await supabase.rpc('analytics_summary');
    if (error) {
      const msg = `${error.code || ''} ${error.message || ''}`;
      if (/42501|forbidden/i.test(msg)) return { status: 'forbidden' };
      if (/42883|PGRST202|does not exist|Could not find/i.test(msg)) return { status: 'missing' };
      return { status: 'error' };
    }
    return { status: 'ok', data: normalizeSummary(data) };
  } catch {
    return { status: 'error' };
  }
}
