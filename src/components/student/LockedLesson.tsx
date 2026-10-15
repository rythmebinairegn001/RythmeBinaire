import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { AccessSettings } from '../../services/accessService';

interface Props {
  lang: PreferredLanguage;
  settings: AccessSettings;
  onBack: () => void;
}

/** Écran affiché quand une leçon demande un accès que l'élève n'a pas encore. */
export const LockedLesson: React.FC<Props> = ({ lang, settings, onBack }) => {
  const fr = lang === 'fr';
  const message = fr ? settings.messageFr : settings.messageEn;
  return (
    <div id="locked-lesson" className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)]">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text-main)]">
          {fr ? 'Cette leçon demande un accès complet' : 'This lesson needs full access'}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-line">{message}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {fr
            ? `Les ${settings.freeLessonsPerCourse} premières leçons de chaque cours restent libres.`
            : `The first ${settings.freeLessonsPerCourse} lessons of every course stay free.`}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold transition active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{fr ? 'Retour au cours' : 'Back to course'}</span>
        </button>
      </div>
    </div>
  );
};
