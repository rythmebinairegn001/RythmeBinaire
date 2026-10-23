import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Certificate } from './certificateService';

/** Parcours guidés (voir supabase/parcours.sql) : une suite ordonnée de cours avec un certificat final. */
export interface LearningPath {
  id: string;
  title_fr: string;
  title_en: string;
  summary_fr: string;
  summary_en: string;
  course_ids: string[];
  position: number;
  published: boolean;
}

export type LearningPathInput = Omit<LearningPath, 'id'>;

export const pathCertKey = (pathId: string) => `path:${pathId}`;

export interface PathCourseState {
  courseId: string;
  percent: number;
  done: boolean;
}

export interface PathProgress {
  steps: PathCourseState[];
  doneCount: number;
  total: number;
  percent: number;
  complete: boolean;
  /** Premier cours pas encore terminé (celui à reprendre). */
  nextCourseId: string | null;
}

/** Calcul pur de la progression d'un élève dans un parcours (percent par cours, 0..100). */
export function pathProgress(path: Pick<LearningPath, 'course_ids'>, percentByCourse: Record<string, number>): PathProgress {
  const steps = path.course_ids.map((courseId) => {
    const percent = Math.max(0, Math.min(100, Math.round(percentByCourse[courseId] ?? 0)));
    return { courseId, percent, done: percent >= 100 };
  });
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = total ? Math.round(steps.reduce((a, s) => a + s.percent, 0) / total) : 0;
  return { steps, doneCount, total, percent, complete: total > 0 && doneCount === total, nextCourseId: steps.find((s) => !s.done)?.courseId ?? null };
}

export async function listPaths(publishedOnly: boolean): Promise<LearningPath[]> {
  if (!isSupabaseConfigured()) return [];
  let q = supabase.from('learning_paths').select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
  if (publishedOnly) q = q.eq('published', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as LearningPath[];
}

export async function savePath(id: string | null, input: LearningPathInput): Promise<void> {
  const res = id ? await supabase.from('learning_paths').update(input).eq('id', id) : await supabase.from('learning_paths').insert(input);
  if (res.error) throw new Error(res.error.message);
}

export async function deletePath(id: string): Promise<void> {
  const { error } = await supabase.from('learning_paths').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function issuePathCertificate(pathId: string, name?: string): Promise<Certificate> {
  const { data, error } = await supabase.rpc('issue_path_certificate', { p_path_id: pathId, p_name: name?.trim() || null });
  if (error) {
    const m = error.message || '';
    const k = (['not_finished', 'no_content', 'name_required', 'not_authenticated'] as const).find((x) => m.includes(x)) ?? 'unknown';
    throw new Error(k);
  }
  const row = (Array.isArray(data) ? data[0] : data) as Certificate | undefined;
  if (!row) throw new Error('unknown');
  return row;
}
