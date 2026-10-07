import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  lang: PreferredLanguage;
  onNavigate: (view: 'login' | 'register' | 'forgot') => void;
  onLoginSuccess: () => void;
  onBackToHome?: () => void;
}

export const LoginForm: React.FC<Props> = ({ lang, onNavigate, onLoginSuccess, onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!password) {
      setErrorMsg(t.auth.passwordLength);
      return;
    }

    setLoading(true);

    try {
      if (!configured) {
        // If Supabase is not yet configured with real credentials, provide helpful message
        setErrorMsg(
          lang === 'fr'
            ? 'Supabase Cloud n’est pas encore connecté. Cliquez sur "Supabase (Config)" en haut à droite pour renseigner votre URL et clé anon, ou lancez votre projet.'
            : 'Supabase Cloud is not configured yet. Click "Supabase (Config)" in the top bar to provide your URL and anon key.'
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        setSuccessMsg(t.auth.loginSuccess);
        setTimeout(() => {
          onLoginSuccess();
        }, 300);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-login-card" className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-xl shadow-zinc-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mb-4 border border-emerald-100">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {t.auth.loginTitle}
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            {t.auth.loginSubtitle}
          </p>
        </div>

        {errorMsg && (
          <div
            id="login-error-message"
            className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            id="login-success-message"
            className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email-input"
              className="block text-xs font-semibold text-zinc-700 mb-1.5"
            >
              {t.auth.emailLabel}
            </label>
            <div className="relative">
              <input
                id="login-email-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password-input"
                className="block text-xs font-semibold text-zinc-700"
              >
                {t.auth.passwordLabel}
              </label>
              <button
                type="button"
                id="link-goto-forgot"
                onClick={() => onNavigate('forgot')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition"
              >
                {t.auth.forgotLink}
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password-input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-login"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span>{t.auth.submitLogin}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Student Access for Evaluation / Prototyping */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-login-demo-student"
              onClick={() => {
                // Immediate demo login
                localStorage.setItem(
                  'rythmebinaire_demo_user',
                  JSON.stringify({
                    id: 'usr-demo-eleve-amina',
                    email: 'amina.diallo@rythmebinaire.gn',
                    full_name: 'Amina Diallo',
                    role: 'eleve',
                    preferred_language: lang,
                    created_at: '2026-02-15T09:00:00Z',
                    status: 'active',
                  })
                );
                window.dispatchEvent(new Event('storage'));
                onLoginSuccess();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-800 text-xs font-semibold transition border border-slate-200/80 flex items-center justify-center gap-2"
            >
              <span>🎓</span>
              <span>
                {lang === 'fr'
                  ? 'Tester avec le compte démo élève (Amina Diallo)'
                  : 'Test with student demo account (Amina Diallo)'}
              </span>
            </button>

            <button
              type="button"
              id="btn-demo-admin-login"
              onClick={() => {
                localStorage.setItem(
                  'rythmebinaire_demo_user',
                  JSON.stringify({
                    id: 'usr-demo-admin-moussa',
                    email: 'admin@rythmebinaire.gn',
                    full_name: 'Moussa Kéita (Admin)',
                    role: 'admin',
                    preferred_language: lang,
                    created_at: '2026-01-10T08:00:00Z',
                    status: 'active',
                  })
                );
                window.dispatchEvent(new Event('storage'));
                onLoginSuccess();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 active:scale-95 text-xs font-semibold transition border border-purple-200 flex items-center justify-center gap-2"
            >
              <span>🔑</span>
              <span>
                {lang === 'fr'
                  ? 'Tester avec le compte démo admin (Moussa Kéita)'
                  : 'Test with admin demo account (Moussa Kéita)'}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 text-center space-y-3">
          <p className="text-xs text-zinc-500">
            {t.auth.noAccount}{' '}
            <button
              type="button"
              id="link-goto-register"
              onClick={() => onNavigate('register')}
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              {t.auth.registerTitle}
            </button>
          </p>

          {onBackToHome && (
            <div>
              <button
                type="button"
                id="btn-back-to-home-from-login"
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
