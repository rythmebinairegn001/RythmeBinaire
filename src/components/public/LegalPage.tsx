import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { getLegalDoc } from '../../data/legalContent';

interface Props {
  kind: 'terms' | 'privacy';
  lang: PreferredLanguage;
  onNavigate: (view: string) => void;
}

/** Conditions d'utilisation / Politique de confidentialité (texte dans data/legalContent.ts). */
export const LegalPage: React.FC<Props> = ({ kind, lang, onNavigate }) => {
  const doc = getLegalDoc(kind, lang);
  const other = kind === 'terms' ? 'privacy' : 'terms';
  const otherLabel = getLegalDoc(other, lang).title;
  return (
    <div id={`legal-${kind}`} className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <button type="button" onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        {lang === 'fr' ? "Retour à l'accueil" : 'Back to home'}
      </button>
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">{doc.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{doc.intro}</p>
      </header>
      {doc.sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="font-display text-lg font-bold text-slate-900">{s.title}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p} className="text-sm text-slate-700 leading-relaxed">{p}</p>
          ))}
          {s.bullets && (
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="pt-4 border-t border-slate-200 text-xs text-slate-500">
        <button type="button" className="underline hover:text-slate-900" onClick={() => onNavigate(other)}>
          {otherLabel}
        </button>
      </p>
    </div>
  );
};
