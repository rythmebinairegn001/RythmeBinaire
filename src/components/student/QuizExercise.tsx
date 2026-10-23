import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, RotateCcw, XCircle } from 'lucide-react';
import { DetailedLesson } from '../../data/lessonsData';
import { PublicCourseItem } from '../../data/coursesData';
import { PreferredLanguage } from '../../types/database';
import { DEFAULT_PASS_PERCENT, correctSet, isQuestionCorrect, parseQuiz, scoreQuiz } from '../../data/quiz';
import { recordQuizAttempt } from '../../services/quizAttemptService';

interface Props {
  course: PublicCourseItem;
  lesson: DetailedLesson;
  lang: PreferredLanguage;
  onBackToLesson: () => void;
  onLessonCompleted?: (courseId: string, lessonId: string) => void;
  onNextLesson?: () => void;
}

const L = {
  fr: {
    title: 'Quiz de la leçon',
    back: 'Revenir à la leçon',
    one: 'Une seule bonne réponse',
    many: 'Plusieurs bonnes réponses possibles',
    check: 'Corriger mes réponses',
    left: (n: number) => `Il reste ${n} question${n > 1 ? 's' : ''} sans réponse`,
    score: (c: number, t: number) => `${c} bonne${c > 1 ? 's' : ''} réponse${c > 1 ? 's' : ''} sur ${t}`,
    passed: 'Bravo, leçon validée ! 🎉',
    failed: (p: number) => `Il faut au moins ${p} % pour valider. Relis la leçon puis réessaie.`,
    retry: 'Réessayer',
    next: 'Passer à la leçon suivante',
    good: 'Bonne réponse',
    bad: 'Pas tout à fait',
    answerWas: 'Bonne réponse :',
    invalid: 'Ce quiz est mal configuré. Préviens ton professeur ou l’administrateur.',
  },
  en: {
    title: 'Lesson quiz',
    back: 'Back to the lesson',
    one: 'Only one correct answer',
    many: 'Several correct answers possible',
    check: 'Check my answers',
    left: (n: number) => `${n} question${n > 1 ? 's' : ''} left unanswered`,
    score: (c: number, t: number) => `${c} correct answer${c > 1 ? 's' : ''} out of ${t}`,
    passed: 'Well done, lesson completed! 🎉',
    failed: (p: number) => `You need at least ${p}% to pass. Re-read the lesson and try again.`,
    retry: 'Try again',
    next: 'Go to the next lesson',
    good: 'Correct',
    bad: 'Not quite',
    answerWas: 'Correct answer:',
    invalid: 'This quiz is not set up correctly. Tell your teacher or the administrator.',
  },
};

export const QuizExercise: React.FC<Props> = ({ course, lesson, lang, onBackToLesson, onLessonCompleted, onNextLesson }) => {
  const t = L[lang === 'en' ? 'en' : 'fr'];
  const exercise = lesson.exercise;
  const raw = exercise?.instructions?.[lang] || exercise?.instructions?.fr;
  // Si la version anglaise n'existe pas ou est illisible, on retombe sur le français
  const quiz = useMemo(() => parseQuiz(raw) ?? parseQuiz(exercise?.instructions?.fr), [raw, exercise]);
  const [picks, setPicks] = useState<number[][]>([]);
  const [checked, setChecked] = useState(false);

  const lessonTitle = (lesson.translations[lang] || lesson.translations.fr).title;
  const courseTitle = (course.translations[lang] || course.translations.fr).title;

  if (!quiz) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <p className="text-sm text-[var(--color-text-main)]">{t.invalid}</p>
        <button type="button" onClick={onBackToLesson} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
          {t.back}
        </button>
      </div>
    );
  }

  const passPercent = quiz.pass_percent ?? DEFAULT_PASS_PERCENT;
  const answered = quiz.questions.filter((_, i) => (picks[i] || []).length > 0).length;
  const missing = quiz.questions.length - answered;
  const score = checked ? scoreQuiz(quiz, picks) : null;

  const toggle = (qi: number, oi: number, multi: boolean) => {
    if (checked) return;
    setPicks((prev) => {
      const next = prev.map((p) => [...p]);
      while (next.length < quiz.questions.length) next.push([]);
      const cur = next[qi] || [];
      next[qi] = multi ? (cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi]) : [oi];
      return next;
    });
  };

  const handleCheck = () => {
    if (missing > 0) return;
    const s = scoreQuiz(quiz, picks);
    setChecked(true);
    // Historique pour l'élève, le professeur et le parent (silencieux en cas de souci)
    void recordQuizAttempt({
      courseId: course.id,
      lessonId: lesson.id,
      courseTitle,
      lessonTitle,
      score: s.correct,
      total: s.total,
      passed: s.passed,
      wrong: quiz.questions.flatMap((q, i) => (isQuestionCorrect(q, picks[i] || []) ? [] : [{ i, q: q.q }])),
    });
    if (s.passed && onLessonCompleted) onLessonCompleted(course.id, lesson.id);
  };

  const handleRetry = () => {
    setPicks([]);
    setChecked(false);
  };

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 space-y-5">
      <div className="space-y-1">
        <button type="button" onClick={onBackToLesson} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
        </button>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{courseTitle}</p>
        <h1 className="text-lg font-bold text-[var(--color-text-main)]">
          {t.title} — {lessonTitle}
        </h1>
      </div>

      {quiz.questions.map((q, qi) => {
        const multi = correctSet(q).length > 1;
        const mine = picks[qi] || [];
        const ok = checked && isQuestionCorrect(q, mine);
        const want = correctSet(q);
        return (
          <section
            key={qi}
            className={`rounded-2xl border p-4 space-y-3 bg-white ${
              checked ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'
            }`}
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">
                {qi + 1}. {q.q}
              </p>
              <p className="text-[11px] text-slate-400">{multi ? t.many : t.one}</p>
            </div>
            <div className="space-y-2" role={multi ? 'group' : 'radiogroup'} aria-label={q.q}>
              {q.options.map((opt, oi) => {
                const selected = mine.includes(oi);
                const isRight = want.includes(oi);
                let tone = selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50';
                if (checked) tone = isRight ? 'border-emerald-400 bg-emerald-50' : selected ? 'border-rose-400 bg-rose-50' : 'border-slate-200 opacity-70';
                return (
                  <label key={oi} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer ${tone}`}>
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`q-${qi}`}
                      checked={selected}
                      disabled={checked}
                      onChange={() => toggle(qi, oi, multi)}
                      className="mt-1"
                    />
                    <span className="text-slate-800">{opt}</span>
                  </label>
                );
              })}
            </div>
            {checked && (
              <div className={`text-xs rounded-xl px-3 py-2 ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                <p className="font-semibold flex items-center gap-1">
                  {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {ok ? t.good : t.bad}
                </p>
                {!ok && (
                  <p className="mt-0.5">
                    {t.answerWas} {want.map((i) => q.options[i]).join(' · ')}
                  </p>
                )}
                {q.explain && <p className="mt-0.5">{q.explain}</p>}
              </div>
            )}
          </section>
        );
      })}

      {!checked ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={missing > 0}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            {t.check}
          </button>
          {missing > 0 && <p className="text-xs text-slate-500">{t.left(missing)}</p>}
        </div>
      ) : (
        score && (
          <div className={`rounded-2xl border p-4 space-y-3 ${score.passed ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
            <p className="text-sm font-bold text-slate-900">
              {t.score(score.correct, score.total)} ({score.percent} %)
            </p>
            <p className="text-sm text-slate-700">{score.passed ? t.passed : t.failed(passPercent)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleRetry} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold">
                <RotateCcw className="w-3.5 h-3.5" /> {t.retry}
              </button>
              {score.passed && onNextLesson && (
                <button type="button" onClick={onNextLesson} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
                  {t.next} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};
