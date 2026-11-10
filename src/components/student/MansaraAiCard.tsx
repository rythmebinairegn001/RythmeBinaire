import React, { useState } from 'react';
import { Sparkles, ExternalLink, MessageCircle } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { getAssistantUrl } from '../../services/assistantService';
import { MansaraChatDialog } from './MansaraChat';

/**
 * Mansara AI dans l'espace élève.
 *
 * - Si le chat intégré est branché (fonction Supabase « assistant-chat », voir supabase/MANSARA-CHAT-ACTIVATION.md) :
 *   bouton « Discuter avec Mansara AI » = fenêtre de discussion dans la plateforme, sans deuxième compte.
 *   Un petit lien vers l'application complète (nouvel onglet) reste disponible.
 * - Sinon : seulement le lien vers l'application complète (adresse dans VITE_MANSARA_URL).
 * - Valeur « non » dans VITE_MANSARA_URL : pas de lien vers l'application complète.
 * - Aucune donnée de l'élève n'est envoyée dans le lien. Caché pour un compte enfant supervisé.
 */
const DEFAULT_URL = 'https://djeli-j1af.onrender.com';

export function getMansaraUrl(): string | null {
  const raw = (import.meta.env?.VITE_MANSARA_URL as string | undefined)?.trim();
  const url = raw === undefined || raw === '' ? DEFAULT_URL : raw;
  return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
}

export const MansaraAiCard: React.FC<{ lang: PreferredLanguage; hidden?: boolean }> = ({ lang, hidden }) => {
  const [open, setOpen] = useState(false);
  const url = getMansaraUrl();
  const chat = getAssistantUrl() !== null;
  if (hidden || (!url && !chat)) return null;
  const fr = lang === 'fr';
  return (
    <>
      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-wrap items-center justify-between gap-3" data-testid="mansara-card">
        <div className="max-w-xl">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" /> Mansara AI
          </h3>
          <p className="text-xs text-slate-700">
            {chat
              ? fr
                ? 'Ton assistant IA, propulsé par RythmeBinaireGn : pose tes questions, fais-toi expliquer un cours plus simplement. Sans deuxième compte.'
                : 'Your AI assistant, powered by RythmeBinaireGn: ask questions, get a course explained more simply. No second account.'
              : fr
                ? 'L’assistant IA de Mansara Académie, propulsé par RythmeBinaireGn : pose tes questions, fais-toi expliquer un cours, corrige tes exercices Word, Excel ou PowerPoint.'
                : 'The AI assistant of Mansara Académie, powered by RythmeBinaireGn: ask questions, get a lesson explained, have your Word, Excel or PowerPoint exercises corrected.'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {chat
              ? fr
                ? 'Pour les indices pendant un exercice de code, utilise le bouton « Indice » de l’exercice.'
                : 'For hints during a coding exercise, use the exercise’s “Hint” button.'
              : fr
                ? 'Il s’ouvre dans un nouvel onglet, avec son propre compte (il te faut un code d’invitation de ton professeur).'
                : 'It opens in a new tab, with its own account (you need an invitation code from your teacher).'}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1.5">
          {chat && (
            <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> {fr ? 'Discuter avec Mansara AI' : 'Chat with Mansara AI'}
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={chat ? 'text-[11px] text-slate-600 underline inline-flex items-center justify-center gap-1' : 'px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1.5'}
            >
              {chat ? (fr ? 'Application complète (nouvel onglet)' : 'Full app (new tab)') : fr ? 'Ouvrir Mansara AI' : 'Open Mansara AI'} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </section>
      {open && <MansaraChatDialog lang={lang} onClose={() => setOpen(false)} externalUrl={url} />}
    </>
  );
};
