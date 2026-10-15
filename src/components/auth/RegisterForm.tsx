import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, User, UserPlus, AlertCircle, ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  lang: PreferredLanguage;
  onNavigate: (view: 'login' | 'register' | 'forgot') => void;
  onRegisterSuccess: () => void;
  /** Appelé quand l'élève est connecté automatiquement après confirmation de l'e-mail */
  onAuthenticated?: () => void;
  onBackToHome?: () => void;
}

export const RegisterForm: React.FC<Props> = ({ lang, onNavigate, onRegisterSuccess, onAuthenticated, onBackToHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredLang, setPreferredLang] = useState<PreferredLanguage>('fr'); // Default 'fr' as requested
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = getTranslation(lang);
  const configured = isSupabaseConfigured();

  // --- Attente de la confirmation par e-mail (connexion automatique) ---
  // Le mot de passe reste uniquement en mémoire, jamais stocké sur l'appareil.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [waitExpired, setWaitExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pendingPasswordRef = useRef('');
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const expiredRef = useRef(false);

  const fr = lang === 'fr';
  const goAuthenticated = onAuthenticated ?? onRegisterSuccess;

  // Essaie de se connecter : réussit seulement une fois l'e-mail confirmé (depuis n'importe quel appareil)
  const tryAutoLogin = useCallback(
    async (manual: boolean) => {
      if (!pendingEmail || checkingRef.current) return;
      if (!manual && expiredRef.current) return;
      const now = Date.now();
      if (!manual && now - lastCheckRef.current < 8000) return; // évite de surcharger le serveur
      lastCheckRef.current = now;
      checkingRef.current = true;
      try {
        const { data } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: pendingPasswordRef.current,
        });
        if (data?.session) {
          pendingPasswordRef.current = '';
          goAuthenticated();
        } else if (manual) {
          setInfoMsg(
            fr
              ? "Pas encore confirmé. Ouvrez l'e-mail, cliquez sur le bouton, puis revenez ici."
              : 'Not confirmed yet. Open the email, click the button, then come back here.'
          );
        }
      } catch {
        // erreur réseau : on réessaiera automatiquement
      } finally {
        checkingRef.current = false;
      }
    },
    [pendingEmail, goAuthenticated, fr]
  );

  useEffect(() => {
    if (!pendingEmail) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > 10 * 60 * 1000) {
        expiredRef.current = true;
        setWaitExpired(true);
        window.clearInterval(timer);
        return;
      }
      if (document.visibilityState === 'visible') void tryAutoLogin(false);
    }, 20000);
    const onBack = () => {
      if (document.visibilityState === 'visible') void tryAutoLogin(false);
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
    };
  }, [pendingEmail, tryAutoLogin]);

  // Compte à rebours avant de pouvoir renvoyer l'e-mail
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  // Efface le mot de passe de la mémoire quand on quitte la page
  useEffect(() => {
    return () => {
      pendingPasswordRef.current = '';
    };
  }, []);

  const handleResend = async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    setErrorMsg(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setErrorMsg(error.message);
    } else {
      setInfoMsg(
        fr
          ? 'E-mail renvoyé. Pensez à vérifier vos spams.'
          : 'Email sent again. Remember to check your spam folder.'
      );
      setResendCooldown(60);
    }
  };

  const handleUseOtherEmail = () => {
    pendingPasswordRef.current = '';
    expiredRef.current = false;
    setPendingEmail(null);
    setWaitExpired(false);
    setInfoMsg(null);
    setErrorMsg(null);
  };

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

    if (!adultConfirmed) {
      setErrorMsg(
        fr
          ? "Cochez la case : il faut avoir 12 ans ou plus pour créer un compte ici. Pour un enfant de moins de 12 ans, un adulte crée d'abord son propre compte, puis ajoute l'enfant depuis « Famille »."
          : 'Please tick the box: you must be 12 or older to create an account here. For a child under 12, an adult creates their own account first, then adds the child from "Family".'
      );
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
          // Le lien de l'e-mail ramène l'élève sur ce site (adresse à autoriser dans Supabase)
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            preferred_language: preferredLang,
            role: 'eleve', // strictly eleve
            // Déclaration « 12 ans ou plus » (exigée par la base si supabase/age12.sql est actif)
            age_confirmed_12: true,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        // Confirmation par e-mail désactivée dans Supabase : l'élève est déjà connecté
        setSuccessMsg(t.auth.loginSuccess);
        setTimeout(() => {
          goAuthenticated();
        }, 300);
      } else if (data?.user && data.user.identities && data.user.identities.length === 0) {
        // Supabase renvoie un faux utilisateur quand l'adresse existe déjà
        setErrorMsg(
          fr
            ? 'Cette adresse e-mail est déjà utilisée. Connectez-vous, ou utilisez « Mot de passe oublié ».'
            : 'This email address is already in use. Sign in, or use "Forgot password".'
        );
      } else if (data?.user) {
        // Compte créé, en attente du clic sur le bouton dans l'e-mail
        pendingPasswordRef.current = password;
        expiredRef.current = false;
        setWaitExpired(false);
        setInfoMsg(null);
        setPendingEmail(email.trim());
        setPassword('');
        setPasswordConfirm('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error;
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <div id="auth-register-pending" className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-xl shadow-zinc-200/50 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mb-4 border border-emerald-100">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {fr ? 'Vérifiez votre boîte e-mail' : 'Check your inbox'}
          </h1>
          <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
            {fr ? 'Nous avons envoyé un e-mail à ' : 'We sent an email to '}
            <span className="font-semibold text-zinc-900 break-all">{pendingEmail}</span>.{' '}
            {fr
              ? "Cliquez sur le bouton dans l'e-mail, depuis n'importe quel appareil : cette page se connectera automatiquement."
              : 'Click the button in the email, from any device: this page will sign you in automatically.'}
          </p>

          {!waitExpired ? (
            <div className="mt-5 flex items-center justify-center gap-2.5 text-xs text-zinc-500">
              <span className="inline-block animate-spin w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
              <span>{fr ? 'En attente de votre confirmation…' : 'Waiting for your confirmation…'}</span>
            </div>
          ) : (
            <p className="mt-5 text-xs text-amber-700">
              {fr
                ? "Toujours en attente ? Si vous avez confirmé, cliquez sur « J'ai confirmé mon e-mail » ci-dessous."
                : 'Still waiting? If you confirmed, click "I confirmed my email" below.'}
            </p>
          )}

          {errorMsg && (
            <div className="mt-5 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {infoMsg && (
            <div className="mt-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              id="btn-register-confirmed"
              onClick={() => void tryAutoLogin(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition shadow-md shadow-emerald-600/20"
            >
              {fr ? "J'ai confirmé mon e-mail" : 'I confirmed my email'}
            </button>
            <button
              type="button"
              id="btn-register-resend"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full py-3 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? fr
                  ? `Renvoyer l'e-mail (${resendCooldown} s)`
                  : `Resend email (${resendCooldown} s)`
                : fr
                  ? "Renvoyer l'e-mail"
                  : 'Resend email'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-zinc-100 space-y-2">
            <p className="text-[11px] text-zinc-400">
              {fr
                ? "Vous ne voyez rien ? Regardez dans vos spams ou courriers indésirables."
                : "Can't see it? Check your spam or junk folder."}
            </p>
            <button
              type="button"
              id="btn-register-other-email"
              onClick={handleUseOtherEmail}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              {fr ? "Utiliser une autre adresse e-mail" : 'Use another email address'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          <label className="flex items-start gap-2.5 text-xs text-zinc-600 leading-relaxed cursor-pointer">
            <input
              id="chk-adult-confirm"
              type="checkbox"
              checked={adultConfirmed}
              onChange={(e) => setAdultConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              {fr
                ? "Je confirme avoir 12 ans ou plus. Pour un enfant de moins de 12 ans, un adulte crée son propre compte puis ajoute l'enfant depuis « Famille »."
                : 'I confirm I am 12 or older. For a child under 12, an adult creates their own account, then adds the child from "Family".'}
            </span>
          </label>

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
