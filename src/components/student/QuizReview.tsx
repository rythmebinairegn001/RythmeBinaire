import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrainCircuit, CheckCircle2, X, XCircle } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { getCourseLessonsList } from '../../data/lessonsData';
import { QuizQuestion, correctSet, isQuestionCorrect, parseQuiz } from '../../data/quiz';
import { loadQuizAttempts, loadQuizReviews, recordQuizReviews } from '../../services/quizAttemptService';
import { ReviewItem, ReviewState, computeReviewState, pickSession } from '../../services/quizReviewStats';

interface SessionQuestion {
  item: ReviewItem;
  q: QuizQuestion;
}

/** Retrouve la question dans le contenu du cours (dans la langue de l'élève, sinon en français). */
function resolveQuestions(items: ReviewItem[], lang: PreferredLanguage): SessionQuestion[] {
  const out: SessionQuestion[] = [];
  for (const item of items) {
    const lesson = getCourseLessonsList(item.courseId).find((l) => l.id === item.lessonId);
    const ins = lesson?.exercise?.instructions;
    const quiz = parseQuiz(ins?.[lang]) ?? parseQuiz(ins?.fr);
    const q = quiz?.questions[item.qIndex];
    if (q) out.push({ item, q });
  }
  return out;
}

const T = {
  fr: {
    title: 'Révision du jour',
    intro: 'Ces questions, tu les avais ratées. Les refaire quelques jours plus tard aide vraiment à retenir.',
    check: 'Corriger',
    left: (n: number) => `Il reste ${n} question${n > 1 ? 's' : ''} sans réponse`,
    score: (c: number, t: number) => `${c} bonne${c > 1 ? 's' : ''} réponse${c > 1 ? 's' : ''} sur ${t}`,
    done: 'Terminer',
    good: 'Bonne réponse',
    bad: 'Pas tout à fait',
    answerWas: 'Bonne réponse :',
    lesson: 'Leçon',
    laterOk: 'Les questions réussies reviendront plus tard, de plus en plus espacées.',
    laterKo: 'Les questions ratées reviendront bientôt.',
    close: 'Fermer',
  },
  en: {
    title: 'Today’s review',
    intro: 'You missed these questions before. Redoing them a few days later really helps you remember.',
    check: 'Check',
    left: (n: number) => `${n} question${n > 1 ? 's' : ''} left unanswered`,
    score: (c: number, t: number) => `${c} correct answer${c > 1 ? 's' : ''} out of ${t}`,
    done: 'Finish',
    good: 'Correct',
    bad: 'Not quite',
    answerWas: 'Correct answer:',
    lesson: 'Lesson',
    laterOk: 'Questions you got right will come back later, more and more spaced out.',
    laterKo: 'Questions you missed will come back soon.',
    close: 'Close',
  },
};

/** Séance de révision : quelques questions, correction, puis enregistrement des réponses. */
export const QuizReviewSession: React.FC<{ questions: SessionQuestion[]; lang: PreferredLanguage; onClose: (changed: boolean) => void }> = ({ questions, lang, onClose }) => {
  const t = T[lang === 'en' ? 'en' : 'fr'];
  const [picks, setPicks] = useState<number[][]>(() => questions.map(() => []));
  const [checked, setChecked] = useState(false);
  const answered = picks.filter((p) => p.length > 0).length;
  const missing = questions.length - answered;
  const results = questions.map((sq, i) => isQuestionCorrect(sq.q, picks[i] || []));
  const correct = results.filter(Boolean).length;

  const toggle = (qi: number, oi: number, multi: boolean) => {
    if (checked) return;
    setPicks((prev) => prev.map((p, i) => (i !== qi ? p : multi ? (p.includes(oi) ? p.filter((x) => x !== oi) : [...p, oi]) : [oi])));
  };

  const check = () => {
    if (missing > 0) return;
    setChecked(true);
    void recordQuizReviews(questions.map((sq, i) => ({ courseId: sq.item.courseId, lessonId: sq.item.lessonId, qIndex: sq.item.qIndex, correct: results[i] })));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={t.title}>
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600" /> {t.title}
            </h2>
            <p className="text-xs text-slate-600">{t.intro}</p>
          </div>
          <button type="button" onClick={() => onClose(checked)} aria-label={t.close} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {questions.map((sq, qi) => {
          const multi = correctSet(sq.q).length > 1;
          const want = correctSet(sq.q);
          const mine = picks[qi] || [];
          const lessonTitle = sq.item.lessonTitle;
          return (
            <section key={sq.item.key} className={`rounded-2xl border p-4 space-y-2.5 ${checked ? (results[qi] ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}>
              <p className="text-[11px] text-slate-400">
                {t.lesson} : {lessonTitle}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {qi + 1}. {sq.q.q}
              </p>
              <div className="space-y-2" role={multi ? 'group' : 'radiogroup'}>
                {sq.q.options.map((opt, oi) => {
                  const selected = mine.includes(oi);
                  let tone = selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50';
                  if (checked) tone = want.includes(oi) ? 'border-emerald-400 bg-emerald-50' : selected ? 'border-rose-400 bg-rose-50' : 'border-slate-200 opacity-70';
                  return (
                    <label key={oi} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer ${tone}`}>
                      <input type={multi ? 'checkbox' : 'radio'} name={`rev-${qi}`} checked={selected} disabled={checked} onChange={() => toggle(qi, oi, multi)} className="mt-1" />
                      <span className="text-slate-800">{opt}</span>
                    </label>
                  );
                })}
              </div>
              {checked && (
                <div className={`text-xs rounded-xl px-3 py-2 ${results[qi] ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  <p className="font-semibold flex items-center gap-1">
                    {results[qi] ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {results[qi] ? t.good : t.bad}
                  </p>
                  {!results[qi] && (
                    <p className="mt-0.5">
                      {t.answerWas} {want.map((i) => sq.q.options[i]).join(' · ')}
                    </p>
                  )}
                  {sq.q.explain && <p className="mt-0.5">{sq.q.explain}</p>}
                </div>
              )}
            </section>
          );
        })}

        {!checked ? (
          <div className="space-y-1.5">
            <button type="button" onClick={check} disabled={missing > 0} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40">
              {t.check}
            </button>
            {missing > 0 && <p className="text-xs text-slate-500">{t.left(missing)}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-2">
            <p className="text-sm font-bold text-slate-900">{t.score(correct, questions.length)}</p>
            <p className="text-xs text-slate-700">{correct > 0 ? t.laterOk : ''} {correct < questions.length ? t.laterKo : ''}</p>
            <button type="button" onClick={() => onClose(true)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold">
              {t.done}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

type Load = { status: 'loading' } | { status: 'off' } | { status: 'ok'; state: ReviewState };

/** Carte « À réviser » du tableau de bord. Invisible tant que l'élève n'a raté aucune question (ou si le script n'est pas lancé). */
export const ReviewCard: React.FC<{ userId: string; lang: PreferredLanguage }> = ({ userId, lang }) => {
  const fr = lang === 'fr';
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [session, setSession] = useState<SessionQuestion[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [attempts, reviews] = await Promise.all([loadQuizAttempts([userId]), loadQuizReviews(userId).catch(() => [])]);
      setLoad({ status: 'ok', state: computeReviewState(attempts, reviews) });
    } catch {
      setLoad({ status: 'off' });
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const state = load.status === 'ok' ? load.state : null;
  const next = useMemo(() => {
    if (!state) return null;
    const upcoming = state.items.find((i) => !i.due);
    return upcoming ? Math.max(1, Math.ceil((upcoming.dueAt - Date.now()) / 86_400_000)) : null;
  }, [state]);

  if (!state || (state.learningCount === 0 && state.masteredCount === 0)) return null;

  const start = () => {
    const qs = resolveQuestions(pickSession(state), lang);
    if (qs.length) setSession(qs);
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 flex flex-wrap items-center justify-between gap-3" data-testid="review-card">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-indigo-600" /> {fr ? 'À réviser' : 'To review'}
        </h3>
        <p className="text-xs text-slate-700">
          {state.dueCount > 0
            ? fr
              ? `${state.dueCount} question${state.dueCount > 1 ? 's' : ''} à refaire aujourd’hui (celles que tu avais ratées).`
              : `${state.dueCount} question${state.dueCount > 1 ? 's' : ''} to redo today (the ones you missed).`
            : next
              ? fr ? `Rien à réviser aujourd’hui. Prochaine révision dans ${next} jour${next > 1 ? 's' : ''}.` : `Nothing to review today. Next review in ${next} day${next > 1 ? 's' : ''}.`
              : fr ? 'Rien à réviser pour le moment.' : 'Nothing to review right now.'}
          {state.masteredCount > 0 && <span className="text-slate-500"> · {fr ? `${state.masteredCount} acquise${state.masteredCount > 1 ? 's' : ''}` : `${state.masteredCount} mastered`}</span>}
        </p>
      </div>
      <button type="button" onClick={start} disabled={state.dueCount === 0} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">
        {fr ? 'Réviser maintenant' : 'Review now'}
      </button>
      {session && (
        <QuizReviewSession
          questions={session}
          lang={lang}
          onClose={(changed) => {
            setSession(null);
            if (changed) void refresh();
          }}
        />
      )}
    </section>
  );
};
