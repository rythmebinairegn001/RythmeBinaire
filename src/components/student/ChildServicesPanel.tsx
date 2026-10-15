import React, { useCallback, useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import { ChildClass, ClassPreview, CHILD_CLASS_ERRORS, childClassErrorKind, isClassCode, joinClassForChild, listChildClasses, previewClass, removeChildFromClass } from '../../services/familyService';
import {
  Booking,
  OpenSlot,
  Quota,
  TUTORING_ERRORS,
  bookSlotForChild,
  cancelBooking,
  canCancel,
  canJoin,
  errorKind,
  groupByDay,
  listMyBookings,
  listOpenSlots,
  loadChildQuota,
  remaining,
  timeLabel,
} from '../../services/tutoringService';

const btn = 'px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 disabled:opacity-40';
const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900';

// ================================================================ Classes

/** Affichage pur (testable). */
export const ChildClassesView: React.FC<{
  lang: PreferredLanguage;
  childName: string;
  classes: ChildClass[];
  code: string;
  onCode: (v: string) => void;
  preview: ClassPreview | null;
  onPreview: () => void;
  consent: boolean;
  onConsent: (v: boolean) => void;
  onJoin: () => void;
  onRemove: (c: ChildClass) => void;
  feedback: { kind: 'ok' | 'error'; text: string } | null;
}> = ({ lang, childName, classes, code, onCode, preview, onPreview, consent, onConsent, onJoin, onRemove, feedback }) => {
  const fr = lang === 'fr';
  return (
    <div id="child-classes" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <h4 className="font-bold text-sm text-slate-900">{fr ? `Classes de ${childName}` : `${childName}'s classes`}</h4>
      <p className="text-xs text-slate-600 leading-relaxed">
        {fr
          ? 'Un professeur peut suivre ton enfant dans sa classe. Il verra son prénom, ses leçons terminées et son code d’exercices, jamais son identifiant de connexion, et ne peut pas lui écrire directement. Tu peux retirer ton enfant à tout moment.'
          : 'A teacher can follow your child in their class. They will see the first name, completed lessons and exercise code, never the login username, and cannot message the child directly. You can remove your child at any time.'}
      </p>
      <ul className="space-y-1.5">
        {classes.length === 0 && <li className="text-xs text-slate-500">{fr ? 'Aucune classe pour le moment.' : 'No class yet.'}</li>}
        {classes.map((c) => (
          <li key={c.class_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span>
              <span className="font-semibold text-slate-900">{c.class_name}</span> · {fr ? 'Professeur' : 'Teacher'} : {c.teacher_name}
            </span>
            <button type="button" className={btn} onClick={() => onRemove(c)}>
              {fr ? 'Retirer mon enfant' : 'Remove my child'}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (preview) onJoin();
          else onPreview();
        }}
      >
        <div className="flex gap-2">
          <input className={`${inputCls} uppercase tracking-widest`} value={code} maxLength={6} onChange={(e) => onCode(e.target.value.toUpperCase())} placeholder={fr ? 'Code de la classe (6 caractères)' : 'Class code (6 characters)'} />
          {!preview && (
            <button type="submit" className={btn} disabled={!isClassCode(code)}>
              {fr ? 'Vérifier' : 'Check'}
            </button>
          )}
        </div>
        {preview && (
          <div className="space-y-2">
            <p className="text-sm text-slate-900">
              {fr ? 'Classe' : 'Class'} <strong>{preview.class_name}</strong> · {fr ? 'Professeur' : 'Teacher'} <strong>{preview.teacher_name}</strong>
            </p>
            <label className="flex items-start gap-2 text-xs text-slate-800">
              <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
              <span>
                {fr
                  ? `J’autorise ${preview.teacher_name} à suivre la progression de ${childName} dans cette classe.`
                  : `I allow ${preview.teacher_name} to follow ${childName}'s progress in this class.`}
              </span>
            </label>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white disabled:opacity-40" disabled={!consent}>
              {fr ? 'Inscrire mon enfant' : 'Enrol my child'}
            </button>
          </div>
        )}
      </form>
      {feedback && <p role="status" className={`text-xs ${feedback.kind === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{feedback.text}</p>}
    </div>
  );
};

export const ChildClassesPanel: React.FC<{ childId: string; name: string; lang: PreferredLanguage }> = ({ childId, name, lang }) => {
  const fr = lang === 'fr';
  const [classes, setClasses] = useState<ChildClass[] | null>(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<ClassPreview | null>(null);
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => setClasses(await listChildClasses(childId)), [childId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (classes === null)
    return <p className="text-xs text-amber-800">{fr ? 'Les classes pour enfants ne sont pas encore activées (script enfants-v2.sql).' : 'Classes for children are not enabled yet (enfants-v2.sql script).'}</p>;

  return (
    <ChildClassesView
      lang={lang}
      childName={name}
      classes={classes}
      code={code}
      onCode={(v) => {
        setCode(v);
        setPreview(null);
        setConsent(false);
        setFeedback(null);
      }}
      preview={preview}
      onPreview={async () => {
        const p = await previewClass(code);
        setPreview(p);
        setFeedback(p ? null : { kind: 'error', text: fr ? CHILD_CLASS_ERRORS.invalid_code.fr : CHILD_CLASS_ERRORS.invalid_code.en });
      }}
      consent={consent}
      onConsent={setConsent}
      onJoin={async () => {
        try {
          const r = await joinClassForChild(code, childId);
          setFeedback({ kind: 'ok', text: fr ? `${name} est inscrit(e) dans « ${r.class_name} ».` : `${name} is enrolled in “${r.class_name}”.` });
          setCode('');
          setPreview(null);
          setConsent(false);
        } catch (e) {
          const k = childClassErrorKind(e instanceof Error ? e.message : undefined);
          setFeedback({ kind: 'error', text: fr ? CHILD_CLASS_ERRORS[k].fr : CHILD_CLASS_ERRORS[k].en });
        }
        await load();
      }}
      onRemove={async (c) => {
        if (!window.confirm(fr ? `Retirer ${name} de la classe « ${c.class_name} » ?` : `Remove ${name} from “${c.class_name}”?`)) return;
        try {
          await removeChildFromClass(c.class_id, childId);
          setFeedback({ kind: 'ok', text: fr ? 'Enfant retiré de la classe.' : 'Child removed from the class.' });
        } catch (e) {
          const k = childClassErrorKind(e instanceof Error ? e.message : undefined);
          setFeedback({ kind: 'error', text: fr ? CHILD_CLASS_ERRORS[k].fr : CHILD_CLASS_ERRORS[k].en });
        }
        await load();
      }}
      feedback={feedback}
    />
  );
};

// ================================================================ Tête-à-tête

/** Affichage pur (testable). */
export const ChildTutoringView: React.FC<{
  lang: PreferredLanguage;
  childName: string;
  quota: Quota;
  slots: OpenSlot[];
  bookings: Booking[];
  present: boolean;
  onPresent: (v: boolean) => void;
  topic: string;
  onTopic: (v: string) => void;
  onBook: (s: OpenSlot) => void;
  onCancel: (b: Booking) => void;
  feedback: { kind: 'ok' | 'error'; text: string } | null;
  now?: Date;
}> = ({ lang, childName, quota, slots, bookings, present, onPresent, topic, onTopic, onBook, onCancel, feedback, now = new Date() }) => {
  const fr = lang === 'fr';
  const left = remaining(quota);
  return (
    <div id="child-tutoring" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-sm text-slate-900">{fr ? `Séance avec un professeur pour ${childName}` : `Teacher session for ${childName}`}</h4>
        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${left > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {fr ? `${left} séance(s) restante(s) ce mois-ci sur ${quota.quota}` : `${left} session(s) left this month out of ${quota.quota}`}
        </span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        {fr
          ? 'Tu réserves, et c’est toi qui reçois le lien de la séance. Un adulte doit rester présent pendant toute la visio. Le professeur voit le prénom de l’enfant et ton e-mail.'
          : 'You book, and you receive the session link. An adult must stay present for the whole video call. The teacher sees the child’s first name and your e-mail.'}
      </p>
      {feedback && <p role="status" className={`text-xs ${feedback.kind === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{feedback.text}</p>}

      {bookings.length > 0 && (
        <ul className="space-y-1.5">
          {bookings.map((b) => (
            <li key={b.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900 capitalize">
                {new Date(b.starts_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {timeLabel(b.starts_at, lang)} · {b.duration_min} min · {b.teacher_name}
              </div>
              <div className="flex flex-wrap gap-2">
                {canJoin(b.starts_at, b.duration_min, now) ? (
                  <a href={b.meeting_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white">
                    {fr ? 'Rejoindre la séance' : 'Join the session'}
                  </a>
                ) : (
                  <span className="text-slate-500 py-2">{fr ? 'Le bouton « Rejoindre » apparaît 10 minutes avant.' : 'The “Join” button appears 10 minutes before.'}</span>
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

      {slots.length === 0 ? (
        <p className="text-xs text-slate-500">{fr ? 'Aucun créneau libre pour le moment.' : 'No free slot right now.'}</p>
      ) : (
        <div className="space-y-2">
          <input className={inputCls} value={topic} maxLength={300} onChange={(e) => onTopic(e.target.value)} placeholder={fr ? 'Sujet (facultatif)' : 'Topic (optional)'} />
          <label className="flex items-start gap-2 text-xs text-slate-800">
            <input type="checkbox" className="mt-0.5" checked={present} onChange={(e) => onPresent(e.target.checked)} />
            <span>{fr ? 'Je serai présent(e) pendant toute la séance.' : 'I will be present for the whole session.'}</span>
          </label>
          {groupByDay(slots, lang).map((g) => (
            <div key={g.key} className="space-y-1">
              <p className="text-xs font-bold text-slate-700 capitalize">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((s) => (
                  <button key={s.id} type="button" disabled={left === 0 || !present} className={btn} onClick={() => onBook(s)}>
                    {timeLabel(s.starts_at, lang)} · {s.duration_min} min · {s.teacher_name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChildTutoringPanel: React.FC<{ childId: string; name: string; lang: PreferredLanguage }> = ({ childId, name, lang }) => {
  const fr = lang === 'fr';
  const [quota, setQuota] = useState<Quota | null | undefined>(undefined);
  const [slots, setSlots] = useState<OpenSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [present, setPresent] = useState(false);
  const [topic, setTopic] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const q = await loadChildQuota(childId);
    setQuota(q);
    if (!q) return;
    const [s, b] = await Promise.all([listOpenSlots().catch(() => []), listMyBookings().catch(() => [])]);
    setSlots(s);
    setBookings(b.filter((x) => x.child_id === childId));
  }, [childId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (quota === undefined) return null;
  if (quota === null)
    return <p className="text-xs text-amber-800">{fr ? 'Les séances pour enfants ne sont pas encore activées (scripts tutorat.sql et enfants-v2.sql).' : 'Sessions for children are not enabled yet (tutorat.sql and enfants-v2.sql scripts).'}</p>;

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
    <ChildTutoringView
      lang={lang}
      childName={name}
      quota={quota}
      slots={slots}
      bookings={bookings}
      present={present}
      onPresent={setPresent}
      topic={topic}
      onTopic={setTopic}
      feedback={feedback}
      onBook={(s) =>
        run(fr ? 'Séance réservée. Le lien apparaît ici.' : 'Session booked. The link appears here.', async () => {
          await bookSlotForChild(s.id, childId, present, topic);
          setTopic('');
        })
      }
      onCancel={(b) => {
        if (window.confirm(fr ? 'Annuler cette séance ?' : 'Cancel this session?')) void run(fr ? 'Séance annulée.' : 'Session cancelled.', () => cancelBooking(b.id));
      }}
    />
  );
};
