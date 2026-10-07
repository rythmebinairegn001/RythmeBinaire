import React, { useState } from 'react';
import { Mail, Lock, User, UserPlus, AlertCircle, ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  lang: PreferredLanguage;
  onNavigate: (view: 'login' | 'register' | 'forgot') => void;
  onRegisterSuccess: () => void;
  onBackToHome?: () => void;
}

export const RegisterForm: React.FC<Props> = ({ lang, onNavigate, onRegisterSuccess, onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredLang, setPreferredLang] = useState<PreferredLanguage>('fr'); // Default 'fr' as requested
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = getTranslation(lang);
  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg(t.auth.emailRequired);
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg(t.auth.fullNameRequired);
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t.auth.passwordLength);
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      if (!configured) {
        setErrorMsg(
          lang === 'fr'
            ? 'Supabase Cloud n’est pas encore connecté. Cliquez sur "Supabase (Config)" en haut pour configurer votre projet.'
            : 'Supabase Cloud is not configured. Click "Supabase (Config)" at the top to configure your project.'
        );
        setLoading(false);
        return;
      }

      // Sign up with Supabase Auth including user_metadata
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            preferred_language: preferredLang,
            role: 'eleve', // strictly eleve
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        setSuccessMsg(t.auth.registerSuccess);
        setTimeout(() => {
          onRegisterSuccess();
        }, 1200);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-register-card" className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-xl shadow-zinc-200/50">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mb-3 border border-emerald-100">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {t.auth.registerTitle}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t.auth.registerSubtitle}
          </p>
        </div>

        {errorMsg && (
          <div
            id="register-error-message"
            className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            id="register-success-message"
            className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label
              htmlFor="register-fullname-input"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              {t.auth.fullNameLabel}
            </label>
            <div className="relative">
              <input
                id="register-fullname-input"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.auth.fullNamePlaceholder}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="register-email-input"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              {t.auth.emailLabel}
            </label>
            <div className="relative">
              <input
                id="register-email-input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Preferred Language: FR default, EN option */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              {t.auth.preferredLangLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-select-pref-fr"
                onClick={() => setPreferredLang('fr')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                  preferredLang === 'fr'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold ring-1 ring-emerald-600'
                    : 'border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.auth.preferredLangFr}</span>
              </button>

              <button
                type="button"
                id="btn-select-pref-en"
                onClick={() => setPreferredLang('en')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                  preferredLang === 'en'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold ring-1 ring-emerald-600'
                    : 'border-zinc-200 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.auth.preferredLangEn}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {t.auth.preferredLangHelp}
            </p>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="register-password-input"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              {t.auth.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="register-password-input"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password Confirmation */}
          <div>
            <label
              htmlFor="register-password-confirm-input"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              {t.auth.passwordConfirmLabel}
            </label>
            <div className="relative">
              <input
                id="register-password-confirm-input"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={t.auth.passwordConfirmPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              id="btn-submit-register"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>{t.auth.submitRegister}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-100 text-center space-y-3">
          <p className="text-xs text-zinc-500">
            {t.auth.hasAccount}{' '}
            <button
              type="button"
              id="link-goto-login-from-register"
              onClick={() => onNavigate('login')}
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              {t.auth.submitLogin}
            </button>
          </p>

          {onBackToHome && (
            <div>
              <button
                type="button"
                id="btn-back-to-home-from-register"
                onClick={onBackToHome}
                className="text-xs text-slate-400 hover:text-slate-700 transition"
              >
                ← {lang === 'fr' ? "Retour à l'accueil" : 'Back to home'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
