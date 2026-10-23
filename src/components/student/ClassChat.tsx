import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, MessageSquare, Trash2, VolumeX, X } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import {
  CHAT_ERRORS,
  CHAT_MAX_LENGTH,
  CHAT_POLL_MS,
  ChatMessage,
  ChatRoom,
  deleteMessage,
  hasNew,
  listMessages,
  listRooms,
  loadSeen,
  markSeen,
  mergeMessages,
  muteMember,
  postMessage,
  reportMessage,
} from '../../services/chatService';

const hhmm = (iso: string, fr: boolean) => new Date(iso).toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

/** Fenêtre de messages d'un salon. Interroge le serveur toutes les 8 s tant que l'onglet est visible (léger pour les connexions faibles). */
const Room: React.FC<{ room: ChatRoom; lang: PreferredLanguage; onSeen: () => void }> = ({ room, lang, onSeen }) => {
  const fr = lang === 'fr';
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const polls = useRef(0);
  const msgsRef = useRef<ChatMessage[]>([]);
  msgsRef.current = msgs;
  const bottom = useRef<HTMLDivElement>(null);

  const refresh = useCallback(
    async (full: boolean) => {
      try {
        const cur = msgsRef.current;
        const since = full || !cur.length ? null : cur[cur.length - 1].created_at;
        const got = await listMessages(room.class_id, since);
        setMsgs((prev) => (since === null ? got : mergeMessages(prev, got)));
        setOffline(false);
      } catch {
        setOffline(true);
      }
    },
    [room.class_id],
  );

  useEffect(() => {
    setMsgs([]);
    polls.current = 0;
    void refresh(true);
    const t = setInterval(() => {
      if (document.hidden) return;
      polls.current += 1;
      void refresh(polls.current % 6 === 0);
    }, CHAT_POLL_MS);
    return () => clearInterval(t);
  }, [room.class_id, refresh]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
    if (msgs.length) {
      markSeen(room.class_id, msgs[msgs.length - 1].created_at);
      onSeen();
    }
  }, [msgs, room.class_id, onSeen]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setNote(null);
    const err = await postMessage(room.class_id, body);
    setSending(false);
    if (err) return setNote(fr ? CHAT_ERRORS[err].fr : CHAT_ERRORS[err].en);
    setText('');
    void refresh(false);
  };

  const act = async (p: Promise<unknown>, ok?: string) => {
    const err = (await p) as keyof typeof CHAT_ERRORS | null;
    setNote(err ? (fr ? CHAT_ERRORS[err].fr : CHAT_ERRORS[err].en) : ok || null);
    void refresh(true);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm font-bold text-slate-900">{room.class_name}</p>
        <p className="text-xs text-slate-500">
          {room.member_count} {fr ? 'élèves' : 'students'} · {room.is_teacher ? (fr ? 'Tu es le professeur' : 'You are the teacher') : room.teacher_name}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[55vh]" aria-live="polite">
        {!msgs.length && <p className="text-sm text-slate-500 text-center pt-8">{fr ? 'Aucun message. Écris le premier !' : 'No messages yet. Write the first one!'}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[85%] ${m.mine ? 'ml-auto' : ''}`}>
            <p className={`text-[11px] text-slate-500 mb-0.5 ${m.mine ? 'text-right' : ''}`}>
              {m.mine ? (fr ? 'Moi' : 'Me') : m.author_name}
              {m.is_teacher && <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">{fr ? 'Prof' : 'Teacher'}</span>}
              {' · '}
              {hhmm(m.created_at, fr)}
              {m.reports > 0 && room.is_teacher && <span className="ml-1 text-red-600 font-semibold">⚑ {m.reports}</span>}
            </p>
            <div className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${m.is_teacher ? 'bg-indigo-50 border border-indigo-200 text-indigo-950' : m.mine ? 'bg-emerald-50 border border-emerald-200 text-slate-900' : 'bg-slate-100 border border-slate-200 text-slate-900'}`}>{m.body}</div>
            <div className={`flex gap-2 mt-0.5 text-[11px] text-slate-400 ${m.mine ? 'justify-end' : ''}`}>
              {!m.mine && (
                <button type="button" className="inline-flex items-center gap-1 hover:text-red-600" onClick={() => act(reportMessage(m.id), fr ? 'Message signalé. Merci.' : 'Message reported. Thanks.')} aria-label={fr ? 'Signaler' : 'Report'}>
                  <Flag className="w-3 h-3" /> {fr ? 'Signaler' : 'Report'}
                </button>
              )}
              {(m.mine || room.is_teacher) && (
                <button type="button" className="inline-flex items-center gap-1 hover:text-red-600" onClick={() => act(deleteMessage(m.id))} aria-label={fr ? 'Supprimer' : 'Delete'}>
                  <Trash2 className="w-3 h-3" /> {fr ? 'Supprimer' : 'Delete'}
                </button>
              )}
              {room.is_teacher && !m.mine && !m.is_teacher && (
                <button type="button" className="inline-flex items-center gap-1 hover:text-amber-700" onClick={() => act(muteMember(room.class_id, m.author_id, !m.author_muted), m.author_muted ? (fr ? 'Sourdine retirée.' : 'Unmuted.') : fr ? 'Élève en sourdine.' : 'Student muted.')}>
                  <VolumeX className="w-3 h-3" /> {m.author_muted ? (fr ? 'Rétablir' : 'Unmute') : fr ? 'Sourdine' : 'Mute'}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {offline && <p className="px-4 text-xs text-amber-700">{fr ? 'Connexion instable : les messages se mettront à jour dès que possible.' : 'Unstable connection: messages will update as soon as possible.'}</p>}
      {note && <p role="status" className="px-4 pt-1 text-xs text-slate-700">{note}</p>}
      <form
        className="p-3 border-t border-slate-200 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, CHAT_MAX_LENGTH))}
          placeholder={fr ? 'Écris ton message…' : 'Write your message…'}
          aria-label={fr ? 'Message' : 'Message'}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900"
        />
        <button type="submit" disabled={!text.trim() || sending} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-40">
          {fr ? 'Envoyer' : 'Send'}
        </button>
      </form>
    </div>
  );
};

/** Fenêtre du chat : liste des classes à gauche, messages à droite. */
export const ChatDialog: React.FC<{ rooms: ChatRoom[]; lang: PreferredLanguage; onClose: () => void; initialClassId?: string }> = ({ rooms, lang, onClose, initialClassId }) => {
  const fr = lang === 'fr';
  const [activeId, setActiveId] = useState(initialClassId && rooms.some((r) => r.class_id === initialClassId) ? initialClassId : rooms[0]?.class_id);
  const [seen, setSeen] = useState(loadSeen());
  const active = rooms.find((r) => r.class_id === activeId);
  const onSeen = useCallback(() => setSeen(loadSeen()), []);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label={fr ? 'Chat de classe' : 'Class chat'}>
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" /> {fr ? 'Chat de classe' : 'Class chat'}
          </h2>
          <button type="button" onClick={onClose} aria-label={fr ? 'Fermer' : 'Close'} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row">
          <nav className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50 py-2 flex sm:block overflow-x-auto" aria-label={fr ? 'Mes classes' : 'My classes'}>
            {rooms.map((r) => (
              <button
                key={r.class_id}
                type="button"
                onClick={() => setActiveId(r.class_id)}
                className={`w-full text-left px-4 py-2.5 shrink-0 ${r.class_id === activeId ? 'bg-indigo-50 text-indigo-900' : 'text-slate-900 hover:bg-slate-100'}`}
              >
                <span className="block text-sm font-semibold">{r.class_name}</span>
                <span className="block text-xs text-slate-500">
                  {r.is_teacher ? (fr ? 'Ma classe' : 'My class') : r.teacher_name}
                  {r.class_id !== activeId && hasNew(r, seen[r.class_id] ?? null) && <span className="ml-1.5 text-indigo-700 font-semibold">● {fr ? 'nouveau' : 'new'}</span>}
                </span>
              </button>
            ))}
          </nav>
          {active && <Room key={active.class_id} room={active} lang={lang} onSeen={onSeen} />}
        </div>
      </div>
    </div>
  );
};

/** Bouton d'accès au chat (tableau de bord élève, espace professeur). Caché s'il n'y a aucune classe ou si le script n'est pas lancé. */
export const ChatEntry: React.FC<{ lang: PreferredLanguage; hidden?: boolean }> = ({ lang, hidden }) => {
  const fr = lang === 'fr';
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(loadSeen());
  useEffect(() => {
    if (hidden) return;
    let alive = true;
    listRooms().then((r) => alive && setRooms(r));
    return () => {
      alive = false;
    };
  }, [hidden, open]);
  useEffect(() => {
    if (!open) setSeen(loadSeen());
  }, [open]);
  if (hidden || !rooms || rooms.length === 0) return null;
  const news = rooms.filter((r) => hasNew(r, seen[r.class_id] ?? null)).length;
  return (
    <>
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 flex flex-wrap items-center justify-between gap-3" data-testid="chat-entry">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" /> {fr ? 'Chat de classe' : 'Class chat'}
          </h3>
          <p className="text-xs text-slate-700">
            {news > 0 ? (fr ? `Nouveaux messages dans ${news} classe${news > 1 ? 's' : ''}.` : `New messages in ${news} class${news > 1 ? 'es' : ''}.`) : fr ? 'Discute avec ton professeur et ta classe.' : 'Chat with your teacher and class.'}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
          {fr ? 'Ouvrir le chat' : 'Open chat'}
        </button>
      </section>
      {open && <ChatDialog rooms={rooms} lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
};
