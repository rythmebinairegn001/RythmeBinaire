import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  lang: PreferredLanguage;
  onSuccess: () => void;
}

export const ResetPasswordForm: React.FC<Props> = ({ lang, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = getTranslation(lang);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg(t.auth.resetSuccess);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-reset-card" className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-xl shadow-zinc-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mb-4 border border-emerald-100">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {t.auth.resetTitle}
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            {t.auth.resetSubtitle}
          </p>
        </div>

        {errorMsg && (
          <div
            id="reset-error-message"
            className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            id="reset-success-message"
            className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-password-input"
              className="block text-xs font-semibold text-zinc-700 mb-1.5"
            >
              {t.auth.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="reset-password-input"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-password-confirm-input"
              className="block text-xs font-semibold text-zinc-700 mb-1.5"
            >
              {t.auth.passwordConfirmLabel}
            </label>
            <div className="relative">
              <input
                id="reset-password-confirm-input"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={t.auth.passwordConfirmPlaceholder}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-reset"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span>{t.auth.submitReset}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
