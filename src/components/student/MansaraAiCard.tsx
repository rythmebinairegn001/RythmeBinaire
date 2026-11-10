import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';

/**
 * Lien vers Mansara AI (l'assistant IA d'Amadou, application séparée hébergée sur Render).
 *
 * - L'adresse est dans la variable VITE_MANSARA_URL (Vercel > Settings > Environment Variables).
 *   Si elle change un jour, on modifie seulement cette variable, pas le code.
 * - Valeur « non » (ou autre chose qu'une adresse https) : la carte disparaît.
 * - Aucune donnée de l'élève n'est envoyée dans le lien (pas de nom, pas d'e-mail) :
 *   Mansara AI a ses propres comptes, avec un code d'invitation.
 * - Caché pour un compte enfant supervisé.
 */
const DEFAULT_URL = 'https://djeli-j1af.onrender.com';

export function getMansaraUrl(): string | null {
  const raw = (import.meta.env?.VITE_MANSARA_URL as string | undefined)?.trim();
  const url = raw === undefined || raw === '' ? DEFAULT_URL : raw;
  return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
}

export const MansaraAiCard: React.FC<{ lang: PreferredLanguage; hidden?: boolean }> = ({ lang, hidden }) => {
  const url = getMansaraUrl();
  if (hidden || !url) return null;
  const fr = lang === 'fr';
  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex flex-wrap items-center justify-between gap-3"
      data-testid="mansara-card"
    >
      <div className="max-w-xl">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" /> Mansara AI
        </h3>
        <p className="text-xs text-slate-700">
          {fr
            ? 'L’assistant IA de Mansara Académie, propulsé par RythmeBinaireGn : pose tes questions, fais-toi expliquer un cours, corrige tes exercices Word, Excel ou PowerPoint.'
            : 'The AI assistant of Mansara Académie, powered by RythmeBinaireGn: ask questions, get a lesson explained, have your Word, Excel or PowerPoint exercises corrected.'}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          {fr
            ? 'Il s’ouvre dans un nouvel onglet, avec son propre compte (il te faut un code d’invitation de ton professeur). Pour les indices pendant les exercices de code, utilise le bouton « Indice » de la plateforme.'
            : 'It opens in a new tab, with its own account (you need an invitation code from your teacher). For hints during coding exercises, use the platform’s “Hint” button.'}
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
      >
        {fr ? 'Ouvrir Mansara AI' : 'Open Mansara AI'} <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </section>
  );
};
