import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  user: UserProfile | null;
  lang: PreferredLanguage;
  onLoginClick: () => void;
  onBackToHome: () => void;
}

export const AdminAccessDenied: React.FC<Props> = ({
  user,
  lang,
  onLoginClick,
  onBackToHome,
}) => {
  const t = getTranslation(lang);

  return (
    <div
      id="admin-access-denied-view"
      className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8"
    >
      <div className="w-full max-w-lg bg-[var(--color-card-bg)] rounded-3xl p-8 border border-[var(--color-card-border)] shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
            {t.admin.accessDeniedTitle}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
            {t.admin.accessDeniedSubtitle}
          </p>
        </div>

        {user && (
          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs text-[var(--color-text-muted)] space-y-1">
            <p>
              Connecté en tant que :{' '}
              <strong className="text-[var(--color-text-main)]">{user.email}</strong>
            </p>
            <p>
              Rôle actuel :{' '}
              <span className="font-mono uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {user.role}
              </span>
            </p>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-admin-login"
            type="button"
            onClick={onLoginClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Se connecter</span>
          </button>
        </div>

        <div>
          <button
            id="btn-admin-back-home"
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'fr' ? "Retour à l'accueil" : 'Back to home'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
