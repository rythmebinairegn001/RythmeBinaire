/**
 * Calculs purs sur l'historique des quiz (aucun accès réseau : facile à tester).
 * Les données viennent de la table quiz_attempts (supabase/quiz-tentatives.sql).
 */
export interface QuizAttempt {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  course_title: string;
  lesson_title: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  wrong: { i: number; q: string }[];
  created_at: string;
}

export interface LessonSummary {
  key: string;
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  count: number;
  best: number;
  /** Tentative la plus récente */
  last: QuizAttempt;
  passed: boolean;
  /** Numéro de l'essai qui a réussi pour la première fois (null si jamais réussi) */
  passedAtTry: number | null;
  /** Toutes les tentatives, de la plus ancienne à la plus récente */
  attempts: QuizAttempt[];
}

const byDateAsc = (a: QuizAttempt, b: QuizAttempt) => a.created_at.localeCompare(b.created_at);

/** Une ligne par leçon, la plus récemment travaillée en premier. */
export function summarizeByLesson(attempts: QuizAttempt[]): LessonSummary[] {
  const groups = new Map<string, QuizAttempt[]>();
  for (const a of attempts) {
    const k = `${a.course_id}::${a.lesson_id}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  const out: LessonSummary[] = [];
  for (const [key, list] of groups) {
    const sorted = [...list].sort(byDateAsc);
    const firstPass = sorted.findIndex((a) => a.passed);
    const last = sorted[sorted.length - 1];
    out.push({
      key,
      courseId: last.course_id,
      lessonId: last.lesson_id,
      courseTitle: last.course_title,
      lessonTitle: last.lesson_title,
      count: sorted.length,
      best: Math.max(...sorted.map((a) => a.percent)),
      last,
      passed: firstPass >= 0,
      passedAtTry: firstPass >= 0 ? firstPass + 1 : null,
      attempts: sorted,
    });
  }
  return out.sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
}

/** Leçons où l'élève a échoué au moins `min` fois sans jamais réussir. */
export function stuckLessons(attempts: QuizAttempt[], min = 3): LessonSummary[] {
  return summarizeByLesson(attempts).filter((s) => !s.passed && s.count >= min);
}

export interface HardQuestion {
  courseTitle: string;
  lessonTitle: string;
  question: string;
  wrongCount: number;
  attemptCount: number;
}

/** Questions les plus souvent ratées (sur l'ensemble des tentatives données). */
export function hardQuestions(attempts: QuizAttempt[], limit = 5, minAttempts = 3): HardQuestion[] {
  const attemptsPerLesson = new Map<string, number>();
  const wrongPerQuestion = new Map<string, HardQuestion>();
  for (const a of attempts) {
    const lk = `${a.course_id}::${a.lesson_id}`;
    attemptsPerLesson.set(lk, (attemptsPerLesson.get(lk) || 0) + 1);
    for (const w of a.wrong || []) {
      const qk = `${lk}::${w.q}`;
      const cur = wrongPerQuestion.get(qk) || { courseTitle: a.course_title, lessonTitle: a.lesson_title, question: w.q, wrongCount: 0, attemptCount: 0 };
      cur.wrongCount += 1;
      wrongPerQuestion.set(qk, cur);
    }
  }
  for (const [qk, h] of wrongPerQuestion) {
    const lk = qk.split('::').slice(0, 2).join('::');
    h.attemptCount = attemptsPerLesson.get(lk) || h.wrongCount;
  }
  return [...wrongPerQuestion.values()]
    .filter((h) => h.attemptCount >= minAttempts && h.wrongCount >= 2)
    .sort((a, b) => b.wrongCount / b.attemptCount - a.wrongCount / a.attemptCount || b.wrongCount - a.wrongCount)
    .slice(0, limit);
}

export interface StudentQuizSummary {
  userId: string;
  quizzes: number;
  passedQuizzes: number;
  attempts: number;
  averagePercent: number | null;
  stuck: number;
  lastAt: string | null;
}

export function summarizeStudent(userId: string, attempts: QuizAttempt[]): StudentQuizSummary {
  const mine = attempts.filter((a) => a.user_id === userId);
  const lessons = summarizeByLesson(mine);
  return {
    userId,
    quizzes: lessons.length,
    passedQuizzes: lessons.filter((l) => l.passed).length,
    attempts: mine.length,
    averagePercent: mine.length ? Math.round(mine.reduce((s, a) => s + a.percent, 0) / mine.length) : null,
    stuck: stuckLessons(mine).length,
    lastAt: mine.reduce<string | null>((m, a) => (!m || a.created_at > m ? a.created_at : m), null),
  };
}
