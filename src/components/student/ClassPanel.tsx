import React, { useCallback, useEffect, useState } from 'react';
import { PreferredLanguage } from '../../types/database';
import { MyClass, TeacherMessage, joinClass, leaveClass, listMyJoinedClasses, listMyMessages, markMessagesRead } from '../../services/teacherService';

interface Props {
  userId: string;
  lang: PreferredLanguage;
  /** Un compte enfant supervisé ne rejoint pas de classe seul : le panneau n'est alors pas affiché. */
  hidden?: boolean;
}

export const JOIN_ERRORS: Record<string, { fr: string; en: string }> = {
  invalid_code: { fr: "Ce code n'existe pas ou n'accepte plus d'élèves. Vérifie-le auprès de ton professeur.", en: 'This code does not exist or no longer accepts students. Check it with your teacher.' },
  child_account: { fr: 'Un compte enfant ne peut pas rejoindre une classe seul. Demande à ton parent.', en: 'A child account cannot join a class on its own. Ask your parent.' },
  own_class: { fr: 'Tu ne peux pas rejoindre ta propre classe.', en: 'You cannot join your own class.' },
  unknown: { fr: "Impossible de rejoindre la classe pour l'instant. Réessaie plus tard.", en: 'Unable to join the class right now. Try again later.' },
};

/** Affichage pur : classes rejointes, messages du professeur, saisie du code. */
export const ClassView: React.FC<{
  lang: PreferredLanguage;
  classes: MyClass[];
  messages: TeacherMessage[];
  code: string;
  onCode: (v: string) => void;
  onJoin: () => void;
  onLeave: (c: MyClass) => void;
  feedback: { kind: 'ok' | 'error'; text: string } | null;
}> = ({ lang, classes, messages, code, onCode, onJoin, onLeave, feedback }) => {
  const fr = lang === 'fr';
  const unread = messages.filter((m) => !m.read_at).length;
  const classNameOf = (id: string) => classes.find((c) => c.class_id === id)?.class_name;
  return (
    <section id="class-panel" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900">{fr ? 'Ma classe' : 'My class'}</h2>
        <p className="text-sm text-slate-600">{fr ? 'Ton professeur t’a donné un code de 6 caractères ? Saisis-le ici.' : 'Did your teacher give you a 6-character code? Enter it here.'}</p>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onJoin();
        }}
      >
        <input
          id="join-class-code"
          value={code}
          onChange={(e) => onCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="K7P4QX"
          autoComplete="off"
          className="sm:w-48 px-3 py-2 text-sm font-mono tracking-widest rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
          aria-label={fr ? 'Code de la classe' : 'Class code'}
        />
        <button type="submit" disabled={code.length !== 6} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white disabled:opacity-40">
          {fr ? 'Rejoindre' : 'Join'}
        </button>
      </form>

      {feedback && <p role="status" className={`text-sm ${feedback.kind === 'ok' ? 'text-emerald-800' : 'text-red-700'}`}>{feedback.text}</p>}

      {classes.length > 0 && (
        <ul className="space-y-2">
          {classes.map((c) => (
            <li key={c.class_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <div className="font-semibold text-slate-900 text-sm">{c.class_name}</div>
                <div className="text-xs text-slate-500">{fr ? 'Professeur' : 'Teacher'} : {c.teacher_name}</div>
              </div>
              <button type="button" className="text-xs font-semibold text-slate-600 hover:text-red-700 underline" onClick={() => onLeave(c)}>
                {fr ? 'Quitter' : 'Leave'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {messages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">
            {fr ? 'Messages de ton professeur' : 'Messages from your teacher'}
            {unread > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px]">{unread} {fr ? (unread > 1 ? 'nouveaux' : 'nouveau') : 'new'}</span>}
          </h3>
          <ul className="space-y-2">
            {messages.slice(0, 5).map((m) => (
              <li key={m.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[11px] text-emerald-800/70">
                  {classNameOf(m.class_id) ? `${classNameOf(m.class_id)} · ` : ''}
                  {new Date(m.created_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

/**
 * Panneau « Ma classe » du tableau de bord élève. Discret : s'il n'y a ni classe ni message,
 * il reste une petite carte pour saisir un code.
 */
export const ClassPanel: React.FC<Props> = ({ userId, lang, hidden }) => {
  const fr = lang === 'fr';
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [c, m] = await Promise.all([listMyJoinedClasses(), listMyMessages(userId)]);
    setClasses(c);
    setMessages(m);
    // Les messages affichés sont considérés comme lus après un court délai
    const unreadIds = m.filter((x) => !x.read_at).map((x) => x.id);
    if (unreadIds.length) setTimeout(() => markMessagesRead(unreadIds), 4000);
  }, [userId]);

  useEffect(() => {
    if (!hidden) load();
  }, [hidden, load]);

  if (hidden) return null;

  return (
    <ClassView
      lang={lang}
      classes={classes}
      messages={messages}
      code={code}
      onCode={setCode}
      feedback={feedback}
      onJoin={async () => {
        setFeedback(null);
        try {
          const r = await joinClass(code);
          setCode('');
          setFeedback({ kind: 'ok', text: fr ? `Tu as rejoint « ${r.class_name} ».` : `You joined "${r.class_name}".` });
          await load();
        } catch (e) {
          const k = e instanceof Error && JOIN_ERRORS[e.message] ? e.message : 'unknown';
          setFeedback({ kind: 'error', text: fr ? JOIN_ERRORS[k].fr : JOIN_ERRORS[k].en });
        }
      }}
      onLeave={async (c) => {
        if (!window.confirm(fr ? `Quitter la classe « ${c.class_name} » ?` : `Leave class "${c.class_name}"?`)) return;
        try {
          await leaveClass(c.class_id, userId);
          await load();
        } catch {
          setFeedback({ kind: 'error', text: fr ? JOIN_ERRORS.unknown.fr : JOIN_ERRORS.unknown.en });
        }
      }}
    />
  );
};
