import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { loadQuizAttempts } from '../../services/quizAttemptService';
import { QuizAttempt, hardQuestions, stuckLessons, summarizeByLesson, summarizeStudent } from '../../services/quizAttemptStats';

const dateFmt = (iso: string, fr: boolean) =>
  new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Historique des quiz d'une personne : une ligne par leçon, détail des essais en dépliant. */
export const QuizHistoryView: React.FC<{ attempts: QuizAttempt[]; lang: PreferredLanguage }> = ({ attempts, lang }) => {
  const fr = lang === 'fr';
  const lessons = useMemo(() => summarizeByLesson(attempts), [attempts]);
  if (!lessons.length) {
    return <p className="text-xs text-slate-500">{fr ? 'Aucun quiz passé pour le moment.' : 'No quiz taken yet.'}</p>;
  }
  return (
    <ul className="space-y-2" data-testid="quiz-history">
      {lessons.map((l) => (
        <li key={l.key} className="rounded-xl border border-slate-200 bg-white">
          <details>
            <summary className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 cursor-pointer text-xs">
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 truncate">{l.lessonTitle || l.lessonId}</span>
                <span className="block text-[11px] text-slate-500 truncate">{l.courseTitle}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-slate-600">
                  {l.count} {fr ? (l.count > 1 ? 'essais' : 'essai') : l.count > 1 ? 'tries' : 'try'} · {fr ? 'meilleur' : 'best'} {l.best} %
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${l.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  {l.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {l.passed ? (fr ? `réussi au ${l.passedAtTry}${l.passedAtTry === 1 ? 'er' : 'e'} essai` : `passed on try ${l.passedAtTry}`) : fr ? 'pas encore réussi' : 'not passed yet'}
                </span>
              </span>
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100">
              {[...l.attempts].reverse().map((a, idx) => (
                <div key={a.id} className="text-xs text-slate-700">
                  <div className="flex justify-between gap-2">
                    <span>
                      {fr ? 'Essai' : 'Try'} {l.attempts.length - idx} · {dateFmt(a.created_at, fr)}
                    </span>
                    <span className={a.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                      {a.score}/{a.total} ({a.percent} %)
                    </span>
                  </div>
                  {a.wrong?.length > 0 && (
                    <ul className="list-disc pl-5 text-[11px] text-slate-500">
                      {a.wrong.map((w) => (
                        <li key={w.i}>{w.q}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
};

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; attempts: QuizAttempt[] };

function useAttempts(userIds: string[]): LoadState {
  const key = userIds.join(',');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadQuizAttempts(key ? key.split(',') : [])
      .then((attempts) => !cancelled && setState({ status: 'ok', attempts }))
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}

/** Historique d'un élève (utilisé pour l'élève lui-même et pour le parent). */
export const QuizHistoryPanel: React.FC<{ userId: string; lang: PreferredLanguage; title?: string }> = ({ userId, lang, title }) => {
  const fr = lang === 'fr';
  const state = useAttempts([userId]);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-slate-900">{title ?? (fr ? 'Historique des quiz' : 'Quiz history')}</h3>
      {state.status === 'loading' && <p className="text-xs text-slate-500">{fr ? 'Chargement…' : 'Loading…'}</p>}
      {state.status === 'error' && <p className="text-xs text-amber-800">{fr ? 'Historique indisponible pour le moment.' : 'History unavailable right now.'}</p>}
      {state.status === 'ok' && <QuizHistoryView attempts={state.attempts} lang={lang} />}
    </section>
  );
};

/** Vue professeur : élèves en difficulté, questions les plus ratées, détail par élève. */
export const ClassQuizPanel: React.FC<{ students: { id: string; name: string }[]; lang: PreferredLanguage }> = ({ students, lang }) => {
  const fr = lang === 'fr';
  const ids = useMemo(() => students.map((s) => s.id), [students]);
  const state = useAttempts(ids);
  if (!students.length) return null;
  return (
    <section className="space-y-3" data-testid="class-quiz">
      <h3 className="text-sm font-bold text-slate-900">{fr ? 'Quiz de la classe' : 'Class quizzes'}</h3>
      {state.status === 'loading' && <p className="text-xs text-slate-500">{fr ? 'Chargement…' : 'Loading…'}</p>}
      {state.status === 'error' && <p className="text-xs text-amber-800">{fr ? 'Historique indisponible (script quiz-tentatives.sql lancé ?).' : 'History unavailable (was quiz-tentatives.sql run?).'}</p>}
      {state.status === 'ok' && <ClassQuizView students={students} attempts={state.attempts} lang={lang} />}
    </section>
  );
};

export const ClassQuizView: React.FC<{ students: { id: string; name: string }[]; attempts: QuizAttempt[]; lang: PreferredLanguage }> = ({ students, attempts, lang }) => {
  const fr = lang === 'fr';
  if (!attempts.length) return <p className="text-xs text-slate-500">{fr ? 'Aucun quiz passé dans cette classe pour le moment.' : 'No quiz taken in this class yet.'}</p>;
  const hard = hardQuestions(attempts);
  const rows = students.map((s) => ({ s, sum: summarizeStudent(s.id, attempts), stuck: stuckLessons(attempts.filter((a) => a.user_id === s.id)) }));
  const struggling = rows.filter((r) => r.stuck.length > 0);
  return (
    <div className="space-y-4">
      {struggling.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
          <p className="text-xs font-bold text-amber-900">{fr ? 'Élèves bloqués (3 échecs ou plus sur le même quiz)' : 'Stuck students (3+ failed tries on the same quiz)'}</p>
          <ul className="text-xs text-amber-900 space-y-0.5">
            {struggling.map((r) =>
              r.stuck.map((l) => (
                <li key={`${r.s.id}-${l.key}`}>
                  <span className="font-semibold">{r.s.name}</span> — {l.lessonTitle || l.lessonId} ({l.count} {fr ? 'essais' : 'tries'}, {fr ? 'meilleur' : 'best'} {l.best} %)
                </li>
              )),
            )}
          </ul>
        </div>
      )}
      {hard.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
          <p className="text-xs font-bold text-slate-900">{fr ? 'Questions les plus ratées (à réexpliquer)' : 'Most missed questions (worth re-explaining)'}</p>
          <ul className="text-xs text-slate-700 space-y-1">
            {hard.map((h, i) => (
              <li key={i}>
                <span className="font-semibold">{h.question}</span>
                <span className="block text-[11px] text-slate-500">
                  {h.lessonTitle} — {fr ? 'ratée' : 'missed'} {h.wrongCount}/{h.attemptCount} {fr ? 'fois' : 'times'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map(({ s, sum }) => (
          <li key={s.id} className="rounded-xl border border-slate-200 bg-slate-50">
            <details>
              <summary className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 cursor-pointer text-xs">
                <span className="font-semibold text-slate-900">{s.name}</span>
                <span className="text-slate-600">
                  {sum.attempts === 0
                    ? fr ? 'aucun quiz' : 'no quiz'
                    : fr
                      ? `${sum.passedQuizzes}/${sum.quizzes} quiz réussis · ${sum.attempts} essais · moyenne ${sum.averagePercent} %`
                      : `${sum.passedQuizzes}/${sum.quizzes} quizzes passed · ${sum.attempts} tries · average ${sum.averagePercent}%`}
                </span>
              </summary>
              <div className="px-3 pb-3 pt-1">
                <QuizHistoryView attempts={attempts.filter((a) => a.user_id === s.id)} lang={lang} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Carte repliée « Mes quiz » du tableau de bord : ne charge l'historique qu'à l'ouverture (économise les données). */
export const MyQuizzesCard: React.FC<{ userId: string; lang: PreferredLanguage }> = ({ userId, lang }) => {
  const fr = lang === 'fr';
  const [open, setOpen] = useState(false);
  return (
    <details
      className="rounded-2xl border border-slate-200 bg-white p-4"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm font-bold text-slate-900">{fr ? 'Mes quiz : essais et scores' : 'My quizzes: tries and scores'}</summary>
      <div className="pt-3">{open && <QuizHistoryPanel userId={userId} lang={lang} title={fr ? 'Tes derniers quiz' : 'Your latest quizzes'} />}</div>
    </details>
  );
};
