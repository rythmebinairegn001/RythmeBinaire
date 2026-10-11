import React from 'react';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  user: UserProfile | null;
  lang: PreferredLanguage;
  onLoginClick: () => void;
  onBackToHome: () => void;
}

export const StudentAccessDenied: React.FC<Props> = ({
  user,
  lang,
  onLoginClick,
  onBackToHome,
}) => {
  const t = getTranslation(lang);

  return (
    <div id="student-access-denied" className="w-full max-w-lg mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          {t.student.accessDeniedTitle}
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {t.student.accessDeniedDesc}
          {user && (
            <span className="block mt-2 font-medium text-slate-500">
              Votre rôle actuel : <span className="font-mono font-bold text-slate-800">{user.role}</span>
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          id="btn-access-denied-login"
          type="button"
          onClick={onLoginClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition shadow-sm"
        >
          <LogIn className="w-4 h-4 text-[#BEF264]" />
          <span>{t.student.loginAsStudent}</span>
        </button>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onBackToHome}
          className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à l'accueil</span>
        </button>
      </div>
    </div>
  );
};
