import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, MessageSquareText, Video } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import {
  Booking,
  OpenSlot,
  Question,
  Quota,
  TUTORING_ERRORS,
  askQuestion,
  bookSlot,
  cancelBooking,
  canCancel,
  canJoin,
  groupByDay,
  listMyBookings,
  listMyQuestions,
  listOpenSlots,
  loadQuota,
  remaining,
  timeLabel,
  errorKind,
  answerHours,
  hoursLabel,
} from '../../services/tutoringService';

type Tab = 'book' | 'mine' | 'ask';

const btn = 'px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 disabled:opacity-40';
const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900';

/** Affichage pur (testable) : quota, créneaux, mes séances, questions. */
export const TutoringView: React.FC<{
  lang: PreferredLanguage;
  quota: Quota;
  tab: Tab;
  onTab: (t: Tab) => void;
  slots: OpenSlot[];
  bookings: Booking[];
  questions: Question[];
  topic: string;
  onTopic: (v: string) => void;
  onBook: (s: OpenSlot) => void;
  onCancel: (b: Booking) => void;
  qBody: string;
  qCode: string;
  onQBody: (v: string) => void;
  onQCode: (v: string) => void;
  onAsk: () => void;
  feedback: { kind: 'ok' | 'error'; text: string } | null;
  now?: Date;
}> = ({ lang, quota, tab, onTab, slots, bookings, questions, topic, onTopic, onBook, onCancel, qBody, qCode, onQBody, onQCode, onAsk, feedback, now = new Date() }) => {
  const fr = lang === 'fr';
  const left = remaining(quota);
  const delay = hoursLabel(answerHours(quota), lang);
  const tabBtn = (t: Tab, label: string, Icon: React.ElementType) => (
    <button type="button" onClick={() => onTab(t)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
  return (
    <section id="tutoring-panel" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-slate-900">{fr ? 'Aide d’un professeur' : 'Help from a teacher'}</h2>
        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${left > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {fr ? `${left} séance(s) restante(s) ce mois-ci sur ${quota.quota}` : `${left} session(s) left this month out of ${quota.quota}`}
        </span>
      </div>
      <p className="text-sm text-slate-600">
        {fr
          ? `Réserve une séance en visio, ou pose une question écrite si ta connexion est faible : un professeur te répond sous ${delay}. Les deux comptent dans le même quota.`
          : `Book a video session, or ask a written question if your connection is weak: a teacher replies within ${delay}. Both count in the same quota.`}
      </p>
      <div className="flex flex-wrap gap-2">
        {tabBtn('book', fr ? 'Réserver une séance' : 'Book a session', Video)}
        {tabBtn('mine', `${fr ? 'Mes séances' : 'My sessions'} (${bookings.length})`, CalendarClock)}
        {tabBtn('ask', fr ? 'Poser une question' : 'Ask a question', MessageSquareText)}
      </div>
      {feedback && <p role="status" className={`text-sm ${feedback.kind === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{feedback.text}</p>}

      {tab === 'book' && (
        <div className="space-y-3">
          {slots.length === 0 ? (
            <p className="text-sm text-slate-500">{fr ? 'Aucun créneau libre pour le moment. Pose plutôt une question écrite, ou reviens plus tard.' : 'No free slot right now. Ask a written question instead, or come back later.'}</p>
          ) : (
            <>
              <input className={inputCls} value={topic} maxLength={300} onChange={(e) => onTopic(e.target.value)} placeholder={fr ? 'Sujet de la séance (facultatif) : ex. les boucles en Python' : 'Session topic (optional): e.g. Python loops'} />
              {groupByDay(slots, lang).map((g) => (
                <div key={g.key} className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 capitalize">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((s) => (
                      <button key={s.id} type="button" disabled={left === 0} className={btn} onClick={() => onBook(s)} title={s.teacher_name}>
                        {timeLabel(s.starts_at, lang)} · {s.duration_min} min · {s.teacher_name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'mine' && (
        <ul className="space-y-2">
          {bookings.length === 0 && <li className="text-sm text-slate-500">{fr ? 'Aucune séance réservée.' : 'No session booked.'}</li>}
          {bookings.map((b) => (
            <li key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
              <div className="text-sm font-semibold text-slate-900 capitalize">
                {new Date(b.starts_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {timeLabel(b.starts_at, lang)} · {b.duration_min} min
              </div>
              <div className="text-xs text-slate-600">
                {b.child_name ? <span className="font-semibold text-sky-800">{fr ? `Pour ${b.child_name} (un adulte doit rester présent) · ` : `For ${b.child_name} (an adult must stay present) · `}</span> : null}
                {fr ? 'Professeur' : 'Teacher'} : {b.teacher_name}
                {b.topic ? ` · ${b.topic}` : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {canJoin(b.starts_at, b.duration_min, now) ? (
                  <a href={b.meeting_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">
                    {fr ? 'Rejoindre la séance' : 'Join the session'}
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 py-2">{fr ? 'Le bouton « Rejoindre » apparaît 10 minutes avant.' : 'The “Join” button appears 10 minutes before.'}</span>
                )}
                {canCancel(b.starts_at, now) && (
                  <button type="button" className={btn} onClick={() => onCancel(b)}>
                    {fr ? 'Annuler' : 'Cancel'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'ask' && (
        <div className="space-y-3">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              onAsk();
            }}
          >
            <textarea className={inputCls} rows={3} maxLength={2000} value={qBody} onChange={(e) => onQBody(e.target.value)} placeholder={fr ? 'Ta question : ce que tu veux faire, ce qui bloque…' : 'Your question: what you want to do, what is blocking you…'} />
            <textarea className={`${inputCls} font-mono text-xs`} rows={4} maxLength={4000} value={qCode} onChange={(e) => onQCode(e.target.value)} placeholder={fr ? 'Ton code (facultatif) : colle-le ici' : 'Your code (optional): paste it here'} />
            <button type="submit" disabled={!qBody.trim() || left === 0} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white disabled:opacity-40">
              {fr ? 'Envoyer ma question' : 'Send my question'}
            </button>
          </form>
          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm space-y-1.5">
                <p className="text-slate-900 whitespace-pre-wrap">{q.body}</p>
                {q.status === 'answered' ? (
                  <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 px-3 py-2 whitespace-pre-wrap">
                    <span className="font-bold">{fr ? 'Réponse : ' : 'Answer: '}</span>
                    {q.answer}
                  </p>
                ) : (
                  <p className="text-xs text-amber-800">{fr ? `En attente de réponse (sous ${delay}).` : `Waiting for an answer (within ${delay}).`}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

/** Panneau du tableau de bord. Caché si le script SQL n'est pas exécuté ou pour un compte enfant. */
export const TutoringPanel: React.FC<{ userId: string; lang: PreferredLanguage; hidden?: boolean }> = ({ userId, lang, hidden }) => {
  const fr = lang === 'fr';
  const [quota, setQuota] = useState<Quota | null>(null);
  const [tab, setTab] = useState<Tab>('book');
  const [slots, setSlots] = useState<OpenSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topic, setTopic] = useState('');
  const [qBody, setQBody] = useState('');
  const [qCode, setQCode] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const q = await loadQuota();
    setQuota(q);
    if (!q) return;
    const [s, b, qs] = await Promise.all([listOpenSlots().catch(() => []), listMyBookings().catch(() => []), listMyQuestions(userId).catch(() => [])]);
    setSlots(s);
    setBookings(b);
    setQuestions(qs);
  }, [userId]);

  useEffect(() => {
    if (!hidden) load();
  }, [hidden, load]);

  if (hidden || !quota) return null;

  const run = async (okText: string, fn: () => Promise<void>) => {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ kind: 'ok', text: okText });
    } catch (e) {
      const k = errorKind(e instanceof Error ? e.message : undefined);
      setFeedback({ kind: 'error', text: fr ? TUTORING_ERRORS[k].fr : TUTORING_ERRORS[k].en });
    }
    await load();
  };

  return (
    <TutoringView
      lang={lang}
      quota={quota}
      tab={tab}
      onTab={(t) => {
        setTab(t);
        setFeedback(null);
      }}
      slots={slots}
      bookings={bookings}
      questions={questions}
      topic={topic}
      onTopic={setTopic}
      qBody={qBody}
      qCode={qCode}
      onQBody={setQBody}
      onQCode={setQCode}
      feedback={feedback}
      onBook={(s) =>
        run(fr ? 'Séance réservée. Retrouve le lien dans « Mes séances ».' : 'Session booked. Find the link in “My sessions”.', async () => {
          await bookSlot(s.id, topic);
          setTopic('');
          setTab('mine');
        })
      }
      onCancel={(b) => {
        if (window.confirm(fr ? 'Annuler cette séance ?' : 'Cancel this session?')) run(fr ? 'Séance annulée.' : 'Session cancelled.', () => cancelBooking(b.id));
      }}
      onAsk={() =>
        run(fr ? `Question envoyée. Un professeur te répond sous ${hoursLabel(answerHours(quota), 'fr')}.` : `Question sent. A teacher will reply within ${hoursLabel(answerHours(quota), 'en')}.`, async () => {
          await askQuestion(qBody, qCode);
          setQBody('');
          setQCode('');
        })
      }
    />
  );
};
