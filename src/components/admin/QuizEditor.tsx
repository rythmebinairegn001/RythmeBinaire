import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { QuizDraftQuestion, emptyDraftQuestion } from '../../data/quiz';

interface Props {
  value: QuizDraftQuestion[];
  onChange: (next: QuizDraftQuestion[]) => void;
  accent?: 'amber' | 'purple';
}

const field = 'w-full px-3 py-2 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs focus:outline-none focus:ring-2';

/** Éditeur visuel de quiz : une carte par question, cases à cocher pour la ou les bonnes réponses. */
export const QuizEditor: React.FC<Props> = ({ value, onChange, accent = 'amber' }) => {
  const ring = accent === 'purple' ? 'focus:ring-purple-500' : 'focus:ring-amber-500';
  const update = (i: number, patch: Partial<QuizDraftQuestion>) => onChange(value.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const setOption = (qi: number, oi: number, text: string) => {
    const q = value[qi];
    update(qi, { options: q.options.map((o, k) => (k === oi ? text : o)) });
  };
  const toggleAnswer = (qi: number, oi: number) => {
    const q = value[qi];
    const has = q.answer.includes(oi);
    update(qi, { answer: has ? q.answer.filter((a) => a !== oi) : [...q.answer, oi].sort((a, b) => a - b) });
  };
  const addOption = (qi: number) => {
    const q = value[qi];
    if (q.options.length >= 6) return;
    update(qi, { options: [...q.options, ''] });
  };
  const removeOption = (qi: number, oi: number) => {
    const q = value[qi];
    if (q.options.length <= 2) return;
    update(qi, {
      options: q.options.filter((_, k) => k !== oi),
      answer: q.answer.filter((a) => a !== oi).map((a) => (a > oi ? a - 1 : a)),
    });
  };

  return (
    <div className="space-y-4">
      {value.map((q, qi) => (
        <div key={qi} className="p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] space-y-3" data-testid={`quiz-q-${qi}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)]">Question {qi + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(qi, -1)} disabled={qi === 0} className="p-1 rounded-lg hover:bg-slate-500/10 disabled:opacity-30" title="Monter">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => move(qi, 1)} disabled={qi === value.length - 1} className="p-1 rounded-lg hover:bg-slate-500/10 disabled:opacity-30" title="Descendre">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== qi))} className="p-1 rounded-lg text-red-500 hover:bg-red-500/10" title="Supprimer la question">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <input type="text" value={q.q} onChange={(e) => update(qi, { q: e.target.value })} placeholder="Énoncé de la question" aria-label={`Question ${qi + 1}`} className={`${field} ${ring} font-medium`} />

          <div className="space-y-2">
            <p className="text-[11px] text-[var(--color-text-muted)]">Coche la ou les bonnes réponses (plusieurs cases = l’élève devra toutes les cocher).</p>
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="checkbox" checked={q.answer.includes(oi)} onChange={() => toggleAnswer(qi, oi)} aria-label={`Bonne réponse ${oi + 1}`} className="w-4 h-4 rounded cursor-pointer" />
                <input type="text" value={o} onChange={(e) => setOption(qi, oi, e.target.value)} placeholder={`Réponse ${oi + 1}`} aria-label={`Réponse ${oi + 1} de la question ${qi + 1}`} className={`${field} ${ring}`} />
                <button type="button" onClick={() => removeOption(qi, oi)} disabled={q.options.length <= 2} className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-30" title="Retirer cette réponse">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {q.options.length < 6 && (
              <button type="button" onClick={() => addOption(qi)} className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Ajouter une réponse
              </button>
            )}
          </div>

          <input type="text" value={q.explain} onChange={(e) => update(qi, { explain: e.target.value })} placeholder="Explication affichée après la correction (facultatif)" aria-label={`Explication ${qi + 1}`} className={`${field} ${ring}`} />
        </div>
      ))}

      <button type="button" onClick={() => onChange([...value, emptyDraftQuestion()])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 active:scale-95">
        <Plus className="w-3.5 h-3.5" /> Ajouter une question
      </button>
    </div>
  );
};
