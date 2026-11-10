import React, { useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import { Completion, loadMyCompletions, summarize } from '../../services/progressionService';

interface Props {
  userId: string;
  lang: PreferredLanguage;
  /** Nombre de cours terminés à 100 % (calculé par le tableau de bord). */
  coursesCompleted: number;
}

const DAYS_FR = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


const GOAL_OPTIONS = [1, 2, 3];
const goalKey = (userId?: string) => `rgbn-daily-goal-${userId || 'anon'}`;

/** Objectif du jour : 1, 2 ou 3 leçons. Choix gardé sur cet appareil (simple confort, rien à migrer). */
const DailyGoal: React.FC<{ completions: Completion[]; fr: boolean; now: Date; userId?: string }> = ({ completions, fr, now, userId }) => {
  const [goal, setGoal] = useState<number>(() => {
    try {
      const v = Number(window.localStorage.getItem(goalKey(userId)));
      return GOAL_OPTIONS.includes(v) ? v : 1;
    } catch {
      return 1;
    }
  });
  const today = now.toISOString().slice(0, 10);
  const doneToday = new Set(completions.filter((c) => c.completed_at.slice(0, 10) === today).map((c) => `${c.course_id}/${c.lesson_id}`)).size;
  const reached = doneToday >= goal;
  const pct = Math.min(100, Math.round((doneToday / goal) * 100));

  const choose = (g: number) => {
    setGoal(g);
    try {
      window.localStorage.setItem(goalKey(userId), String(g));
    } catch {
      // stockage indisponible : l'objectif reste valable pour cette visite
    }
  };

  return (
    <div id="daily-goal" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">
          🎯 {fr ? 'Objectif du jour' : 'Daily goal'} : {Math.min(doneToday, goal)}/{goal} {fr ? (goal > 1 ? 'leçons' : 'leçon') : goal > 1 ? 'lessons' : 'lesson'}
        </p>
        <div className="flex items-center gap-1.5" role="group" aria-label={fr ? 'Choisir mon objectif' : 'Choose my goal'}>
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => choose(g)}
              aria-pressed={goal === g}
              className={`w-8 h-8 rounded-full text-xs font-bold border transition ${goal === g ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${reached ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-600">
        {reached
          ? fr ? 'Objectif atteint, bravo ! Tu peux t’arrêter là ou continuer.' : 'Goal reached, well done! You can stop here or keep going.'
          : fr ? `Encore ${goal - doneToday} leçon${goal - doneToday > 1 ? 's' : ''} pour atteindre ton objectif. Commence petit : 1 leçon par jour, c’est déjà beaucoup.` : `${goal - doneToday} more lesson${goal - doneToday > 1 ? 's' : ''} to reach your goal. Start small: 1 lesson a day is already a lot.`}
      </p>
    </div>
  );
};

/** Série de jours + badges. Ton encourageant : jamais de culpabilisation si la série s'arrête. */
export const ProgressionPanel: React.FC<Props> = ({ userId, lang, coursesCompleted }) => {
  const [completions, setCompletions] = useState<Completion[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMyCompletions(userId).then((c) => {
      if (!cancelled) setCompletions(c);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (completions === null) return null;
  return <ProgressionView completions={completions} lang={lang} coursesCompleted={coursesCompleted} userId={userId} />;
};

/** Affichage pur (sans chargement) : facile à tester. `now` permet de figer la date dans les tests. */
export const ProgressionView: React.FC<{ completions: Completion[]; lang: PreferredLanguage; coursesCompleted: number; now?: Date; userId?: string }> = ({
  completions,
  lang,
  coursesCompleted,
  now = new Date(),
  userId,
}) => {
  const fr = lang === 'fr';
  const { streak, badges, lessonsCompleted } = summarize(completions, coursesCompleted, now);
  const earned = badges.filter((b) => b.earned);
  const next = badges.filter((b) => !b.earned).sort((a, b) => b.value / b.target - a.value / a.target)[0];
  const dayLabels = fr ? DAYS_FR : DAYS_EN;

  let message: string;
  if (lessonsCompleted === 0) message = fr ? 'Termine ta première leçon pour lancer ta série.' : 'Complete your first lesson to start your streak.';
  else if (streak.activeToday) message = fr ? 'Bravo, tu as appris aujourd’hui !' : 'Well done, you learned today!';
  else if (streak.current > 0) message = fr ? 'Une leçon aujourd’hui garde ta série vivante.' : 'One lesson today keeps your streak alive.';
  else message = fr ? 'Chaque jour est un nouveau départ : une leçon relance ta série.' : 'Every day is a fresh start: one lesson restarts your streak.';

  return (
    <section id="progression-panel" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-3xl" aria-hidden>
            🔥
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-slate-900 leading-none">
              {streak.current}{' '}
              <span className="text-sm font-semibold text-slate-500">{fr ? (streak.current > 1 ? 'jours d’affilée' : 'jour d’affilée') : streak.current > 1 ? 'days in a row' : 'day in a row'}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {fr ? 'Meilleure série' : 'Best streak'} : {streak.longest}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-1.5" aria-label={fr ? '7 derniers jours' : 'Last 7 days'}>
            {streak.last7.map((on, i) => {
              const d = new Date(now.getTime() - (6 - i) * 86_400_000);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${on ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                    {on ? '✓' : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">{dayLabels[d.getUTCDay()]}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600">{message}</p>
        </div>
      </div>

      <DailyGoal completions={completions} fr={fr} now={now} userId={userId} />

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900">
          {fr ? 'Mes badges' : 'My badges'} <span className="text-slate-400 text-sm">({earned.length}/{badges.length})</span>
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {badges.map((b) => (
            <li
              key={b.id}
              title={b.description[lang]}
              className={`rounded-2xl p-3 border text-center space-y-1 ${b.earned ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}
            >
              <div className={`text-2xl ${b.earned ? '' : 'grayscale'}`} aria-hidden>
                {b.icon}
              </div>
              <p className="text-xs font-bold text-slate-900">{b.title[lang]}</p>
              <p className="text-[10px] text-slate-500 leading-snug">{b.description[lang]}</p>
              {!b.earned && (
                <p className="text-[10px] font-semibold text-slate-500">
                  {b.value}/{b.target}
                </p>
              )}
            </li>
          ))}
        </ul>
        {next && (
          <p className="text-xs text-slate-600">
            {fr ? 'Prochain badge : ' : 'Next badge: '}
            <strong>{next.title[lang]}</strong> ({next.value}/{next.target})
          </p>
        )}
      </div>
    </section>
  );
};
