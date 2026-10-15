import React, { useCallback, useEffect, useState } from 'react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import {
  SLOT_INPUT_ERRORS,
  SlotInputError,
  TUTORING_ERRORS,
  TeacherQuestion,
  TeacherSlot,
  answerQuestion,
  cancelSlot,
  createSlot,
  errorKind,
  answerHours,
  hoursLabel,
  isOverdue,
  loadQuota,
  groupByDay,
  listTeacherQuestions,
  listTeacherSlots,
  timeLabel,
} from '../../services/tutoringService';

const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 disabled:opacity-40';
const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900';

/** Affichage pur : mes créneaux (libres / réservés) et les questions des élèves. */
export const TutoringTeacherView: React.FC<{
  lang: PreferredLanguage;
  slots: TeacherSlot[];
  questions: TeacherQuestion[];
  onCancelSlot: (s: TeacherSlot) => void;
  answers: Record<string, string>;
  onAnswer: (id: string, v: string) => void;
  onSendAnswer: (q: TeacherQuestion) => void;
  /** Délai de réponse promis (heures). */
  hours?: number;
  now?: Date;
}> = ({ lang, slots, questions, onCancelSlot, answers, onAnswer, onSendAnswer, hours = 24, now = new Date() }) => {
  const fr = lang === 'fr';
  const open = questions.filter((q) => q.status === 'open');
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900">{fr ? 'Mes créneaux' : 'My slots'}</h3>
        {slots.length === 0 && <p className="text-sm text-slate-500">{fr ? 'Aucun créneau à venir.' : 'No upcoming slot.'}</p>}
        {groupByDay(slots, lang).map((g) => (
          <div key={g.key} className="space-y-1.5">
            <p className="text-xs font-bold text-slate-700 capitalize">{g.label}</p>
            <ul className="space-y-1.5">
              {g.items.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-900">
                    {timeLabel(s.starts_at, lang)} · {s.duration_min} min
                  </span>
                  <span className={s.status === 'booked' ? 'text-emerald-800 font-semibold' : 'text-slate-500'}>
                    {s.status === 'booked'
                      ? s.is_child
                        ? `${fr ? 'Enfant' : 'Child'} : ${s.student_name} — ${fr ? 'un parent sera présent' : 'a parent will be present'}${s.student_email ? ` (${fr ? 'contact parent' : 'parent contact'} : ${s.student_email})` : ''}${s.topic ? ` — ${s.topic}` : ''}`
                        : `${fr ? 'Réservé par' : 'Booked by'} ${s.student_name}${s.student_email ? ` (${s.student_email})` : ''}${s.topic ? ` — ${s.topic}` : ''}`
                      : fr ? 'Libre' : 'Free'}
                  </span>
                  <button type="button" className={btn} onClick={() => onCancelSlot(s)}>
                    {fr ? 'Annuler' : 'Cancel'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900">
          {fr ? 'Questions des élèves' : 'Student questions'}
          {open.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px]">{open.length}</span>}
        </h3>
        {questions.length === 0 && <p className="text-sm text-slate-500">{fr ? 'Aucune question.' : 'No questions.'}</p>}
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-sm">
            <p className="text-xs text-slate-500">
              {q.student_name} · {new Date(q.created_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' })}
              {q.status === 'open' && isOverdue(q.created_at, hours, now) && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{fr ? `En retard (promis sous ${hoursLabel(hours, 'fr')})` : `Overdue (promised within ${hoursLabel(hours, 'en')})`}</span>
              )}
            </p>
            <p className="whitespace-pre-wrap text-slate-900">{q.body}</p>
            {q.code && <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-48">{q.code}</pre>}
            {q.status === 'answered' ? (
              <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-950 whitespace-pre-wrap">{q.answer}</p>
            ) : (
              <div className="space-y-2">
                <textarea className={inputCls} rows={3} maxLength={4000} value={answers[q.id] || ''} onChange={(e) => onAnswer(q.id, e.target.value)} placeholder={fr ? 'Ta réponse…' : 'Your answer…'} />
                <button type="button" className={btn} disabled={!(answers[q.id] || '').trim()} onClick={() => onSendAnswer(q)}>
                  {fr ? 'Envoyer la réponse' : 'Send answer'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Section « Tête-à-tête » de l'espace professeur : publier des créneaux, répondre aux questions. */
export const TutoringTeacherPanel: React.FC<{ user: UserProfile; lang: PreferredLanguage }> = ({ user, lang }) => {
  const fr = lang === 'fr';
  const [slots, setSlots] = useState<TeacherSlot[]>([]);
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  const [available, setAvailable] = useState(true);
  const [hours, setHours] = useState(24);
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(30);
  const [url, setUrl] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, q] = await Promise.all([listTeacherSlots(), listTeacherQuestions()]);
      setSlots(s);
      setQuestions(q);
      setAvailable(true);
      setHours(answerHours(await loadQuota()));
    } catch {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!available) return null;

  const run = async (okText: string, fn: () => Promise<void>) => {
    setNote(null);
    try {
      await fn();
      setNote({ kind: 'ok', text: okText });
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      const msg = m in SLOT_INPUT_ERRORS ? SLOT_INPUT_ERRORS[m as SlotInputError] : TUTORING_ERRORS[errorKind(m)];
      setNote({ kind: 'error', text: fr ? msg.fr : msg.en });
    }
    await load();
  };

  return (
    <section id="tutoring-teacher" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900">{fr ? 'Tête-à-tête' : 'One-to-one'}</h2>
        <p className="text-sm text-slate-600">
          {fr
            ? `Publie des créneaux avec ton lien de visio (Meet, Zoom, appel WhatsApp…). Seul l’élève qui réserve voit le lien. Réponds aussi aux questions écrites sous ${hoursLabel(hours, 'fr')}.`
            : `Publish slots with your meeting link (Meet, Zoom, WhatsApp call…). Only the student who books sees the link. Also answer written questions within ${hoursLabel(hours, 'en')}.`}
        </p>
      </div>
      <form
        className="grid gap-2 sm:grid-cols-[1fr_110px_1.4fr_auto] items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(fr ? 'Créneau publié.' : 'Slot published.', async () => {
            await createSlot(user.id, { startsAtIso: when ? new Date(when).toISOString() : '', durationMin: duration, meetingUrl: url });
            setWhen('');
          });
        }}
      >
        <label className="text-xs font-semibold text-slate-700 space-y-1">
          {fr ? 'Date et heure' : 'Date and time'}
          <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-700 space-y-1">
          {fr ? 'Durée' : 'Length'}
          <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[15, 30, 45, 60].map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 space-y-1">
          {fr ? 'Lien de visio (https://…)' : 'Meeting link (https://…)'}
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/…" />
        </label>
        <button type="submit" className={btn} disabled={!when || !url.trim()}>
          {fr ? 'Publier' : 'Publish'}
        </button>
      </form>
      {note && <p role="status" className={`text-sm ${note.kind === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{note.text}</p>}
      <TutoringTeacherView
        lang={lang}
        slots={slots}
        questions={questions}
        hours={hours}
        answers={answers}
        onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
        onCancelSlot={(s) => {
          const msg = s.status === 'booked' ? (fr ? `Ce créneau est réservé par ${s.student_name}. Annuler quand même ? Préviens l’élève (${s.student_email || ''}).` : `This slot is booked by ${s.student_name}. Cancel anyway? Let the student know (${s.student_email || ''}).`) : fr ? 'Supprimer ce créneau ?' : 'Delete this slot?';
          if (window.confirm(msg)) run(fr ? 'Créneau annulé.' : 'Slot cancelled.', () => cancelSlot(s.id));
        }}
        onSendAnswer={(q) =>
          run(fr ? 'Réponse envoyée.' : 'Answer sent.', async () => {
            await answerQuestion(q.id, answers[q.id] || '');
            setAnswers((a) => ({ ...a, [q.id]: '' }));
          })
        }
      />
    </section>
  );
};
