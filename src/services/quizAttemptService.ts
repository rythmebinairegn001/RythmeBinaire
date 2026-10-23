import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { QuizAttempt } from './quizAttemptStats';

export type { QuizAttempt } from './quizAttemptStats';

export interface NewQuizAttempt {
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  score: number;
  total: number;
  passed: boolean;
  wrong: { i: number; q: string }[];
}

/**
 * Enregistre une tentative de quiz. Ne casse jamais le quiz : hors connexion, non connecté,
 * ou script quiz-tentatives.sql pas encore lancé → on ignore silencieusement.
 */
export async function recordQuizAttempt(a: NewQuizAttempt): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    await supabase.from('quiz_attempts').insert({
      user_id: uid,
      course_id: a.courseId,
      lesson_id: a.lessonId,
      course_title: a.courseTitle.slice(0, 200),
      lesson_title: a.lessonTitle.slice(0, 200),
      score: a.score,
      total: a.total,
      percent: Math.round((a.score / a.total) * 100),
      passed: a.passed,
      wrong: a.wrong.slice(0, 100).map((w) => ({ i: w.i, q: w.q.slice(0, 300) })),
    });
  } catch {
    /* suivi facultatif */
  }
}

/** Tentatives d'un ou plusieurs élèves (la base ne renvoie que ce que l'utilisateur a le droit de voir). */
export async function loadQuizAttempts(userIds: string[]): Promise<QuizAttempt[]> {
  if (!isSupabaseConfigured() || userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, user_id, course_id, lesson_id, course_title, lesson_title, score, total, percent, passed, wrong, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data || []) as QuizAttempt[];
}

// ---------------------------------------------------------------- Révision espacée (supabase/revision.sql)
import type { QuizReviewRow } from './quizReviewStats';

export async function loadQuizReviews(userId: string): Promise<QuizReviewRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('quiz_reviews')
    .select('course_id, lesson_id, q_index, correct, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data || []) as QuizReviewRow[];
}

/** Enregistre les réponses d'une séance de révision (silencieux en cas de souci). */
export async function recordQuizReviews(rows: { courseId: string; lessonId: string; qIndex: number; correct: boolean }[]): Promise<void> {
  try {
    if (!isSupabaseConfigured() || rows.length === 0) return;
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    await supabase.from('quiz_reviews').insert(rows.map((r) => ({ user_id: uid, course_id: r.courseId, lesson_id: r.lessonId, q_index: r.qIndex, correct: r.correct })));
  } catch {
    /* suivi facultatif */
  }
}
