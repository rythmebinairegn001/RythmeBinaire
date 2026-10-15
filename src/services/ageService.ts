import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Règle des 12 ans : signalements et interrupteur « déclaration obligatoire ».
 * Voir supabase/age12.sql. Tout est tolérant : si le script n'est pas exécuté, l'interface reste cachée.
 */

export type ReportResult = 'ok' | 'already' | 'not_allowed' | 'child_account' | 'not_found' | 'unavailable';
export type ReportAction = 'dismiss' | 'block' | 'unblock';
export type ReportStatus = 'open' | 'dismissed' | 'blocked';

export interface AgeReport {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  reported_by_name: string | null;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  declared_kind: 'self_12plus' | 'guardian_created' | 'unknown' | null;
}

const RESULTS: ReportResult[] = ['ok', 'already', 'not_allowed', 'child_account', 'not_found'];

/** Un professeur (ou l'admin) signale un compte qui semble appartenir à un enfant de moins de 12 ans. */
export async function reportUnderage(userId: string, reason: string): Promise<ReportResult> {
  if (!isSupabaseConfigured()) return 'unavailable';
  try {
    const { data, error } = await supabase.rpc('report_underage', { p_user: userId, p_reason: reason });
    if (error) return 'unavailable';
    return RESULTS.includes(data as ReportResult) ? (data as ReportResult) : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Admin : signalements (ouverts d'abord). `null` = script age12.sql pas encore exécuté. */
export async function listAgeReports(): Promise<AgeReport[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.rpc('list_age_reports');
    if (error || !Array.isArray(data)) return null;
    return data as AgeReport[];
  } catch {
    return null;
  }
}

export async function resolveAgeReport(id: string, action: ReportAction): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('resolve_age_report', { p_id: id, p_action: action });
    return !error && data === 'ok';
  } catch {
    return false;
  }
}

/** Admin : la déclaration « 12 ans ou plus » est-elle exigée par la base ? `null` = réglage absent. */
export async function loadRequireAge(): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'require_age_confirmation').maybeSingle();
    if (error || !data) return null;
    return data.value === true;
  } catch {
    return null;
  }
}

export async function saveRequireAge(on: boolean): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'require_age_confirmation', value: on, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message || 'save failed');
}

export const openReports = (rs: AgeReport[]): number => rs.filter((r) => r.status === 'open').length;
