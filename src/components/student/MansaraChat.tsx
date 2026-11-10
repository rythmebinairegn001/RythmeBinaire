import React, { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, X, Send } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { ASSISTANT_MAX_CHARS, AssistantContext, AssistantTurn, askAssistant } from '../../services/assistantService';

/**
 * Fenêtre de discussion avec Mansara AI, à l'intérieur de la plateforme (pas de deuxième compte).
 * - La discussion reste en mémoire dans cette fenêtre : rien n'est gardé dans le navigateur.
 * - Les limites, la protection des comptes enfants et la clé de l'IA sont gérées par le serveur.
 */
export const MansaraChatDialog: React.FC<{
  lang: PreferredLanguage;
  onClose: () => void;
  context?: AssistantContext;
  /** Adresse de l'application Mansara AI complète (facultatif) : lien discret en bas. */
  externalUrl?: string | null;
}> = ({ lang, onClose, context, externalUrl }) => {
  const fr = lang === 'fr';
  const [msgs, setMsgs] = useState<AssistantTurn[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [msgs, sending]);

  const starters = context?.lesson
    ? fr
      ? ['Explique-moi cette leçon plus simplement.', 'Donne-moi un exemple concret avec une boutique.', 'Pose-moi 3 questions pour vérifier que j’ai compris.']
      : ['Explain this lesson more simply.', 'Give me a concrete example with a shop.', 'Ask me 3 questions to check that I understood.']
    : fr
      ? ['Explique-moi simplement ce qu’est une boucle en Python.', 'Comment bien réviser quand la connexion est faible ?', 'C’est quoi l’intelligence artificielle ?']
      : ['Explain simply what a loop is in Python.', 'How can I study well when the connection is weak?', 'What is artificial intelligence?'];

  const send = async (raw?: string) => {
    const message = (raw ?? text).trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    const history = msgs;
    setMsgs([...history, { role: 'user', content: message }]);
    setText('');
    try {
      const r = await askAssistant(message, history, context);
      setMsgs((prev) => [...prev, { role: 'assistant', content: r.answer }]);
      setRemaining(r.remaining_today);
    } catch (e) {
      // Le message n'est pas parti (ou n'a pas reçu de réponse) : on le remet dans la zone de saisie.
      setMsgs(history);
      setText(message);
      setError(e instanceof Error && e.message !== 'not_configured' ? e.message : fr ? 'Mansara AI n’est pas encore activé.' : 'Mansara AI is not enabled yet.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Mansara AI" data-testid="mansara-chat">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" /> Mansara AI
            </h2>
            <p className="text-xs text-slate-600">
              {context?.lesson ? (fr ? `Leçon : ${context.lesson}` : `Lesson: ${context.lesson}`) : fr ? 'Propulsée par RythmeBinaireGn' : 'Powered by RythmeBinaireGn'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={fr ? 'Fermer' : 'Close'} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 min-h-[280px] max-h-[55vh] overflow-y-auto" aria-live="polite">
          {msgs.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                {fr
                  ? 'Bonjour ! Je suis Mansara AI. Pose-moi une question sur ton cours, la programmation, Word, Excel ou le numérique. Je t’explique, mais je ne fais pas tes exercices à ta place.'
                  : 'Hello! I am Mansara AI. Ask me a question about your course, programming, Word, Excel or digital skills. I explain, but I do not do your exercises for you.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-900 hover:bg-slate-100 text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[90%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
              {m.role === 'user' ? (
                <div className="px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap bg-emerald-50 border border-emerald-200 text-slate-900">{m.content}</div>
              ) : (
                <div className="px-3 py-2 rounded-2xl text-sm break-words bg-slate-100 border border-slate-200 text-slate-900 space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:bg-[#0f172a] [&_pre]:text-[#e2e8f0] [&_pre_code]:text-[#e2e8f0] [&_pre_code]:bg-transparent [&_code]:text-[13px]">
                  <Markdown>{m.content}</Markdown>
                </div>
              )}
            </div>
          ))}
          {sending && <p className="text-xs text-slate-600">{fr ? 'Mansara AI réfléchit…' : 'Mansara AI is thinking…'}</p>}
          <div ref={bottom} />
        </div>

        {error && (
          <p role="alert" className="px-4 pb-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <form
          className="p-3 border-t border-slate-200 flex gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            ref={input}
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value.slice(0, ASSISTANT_MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={fr ? 'Écris ta question… (Entrée pour envoyer)' : 'Write your question… (Enter to send)'}
            aria-label={fr ? 'Ta question' : 'Your question'}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 resize-none"
          />
          <button type="submit" disabled={!text.trim() || sending} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> {fr ? 'Envoyer' : 'Send'}
          </button>
        </form>

        <p className="px-4 pb-3 text-[11px] text-slate-600">
          {fr
            ? 'Mansara AI peut se tromper : vérifie les informations importantes. N’écris jamais ton mot de passe, ton numéro ou tes infos bancaires.'
            : 'Mansara AI can make mistakes: check important information. Never type your password, phone number or bank details.'}
          {remaining !== null && <span> {fr ? `Messages restants aujourd’hui : ${remaining}.` : `Messages left today: ${remaining}.`}</span>}
          {externalUrl && (
            <>
              {' '}
              <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {fr ? 'Ouvrir l’application Mansara AI complète' : 'Open the full Mansara AI app'}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
