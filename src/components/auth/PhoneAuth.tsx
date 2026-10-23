import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Copy, Lock, Phone, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';
import { COUNTRIES, formatRecoveryCode, normalizePhone, phoneToEmail } from '../../lib/phone';
import { PreferredLanguage } from '../../types/database';
import { PHONE_MIN_PASSWORD, recoverWithPhone, signupWithPhone } from '../../services/phoneAccountService';

const inputCls =
  'w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition text-zinc-900 placeholder:text-zinc-400';
const primaryBtn =
  'w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div role="alert" className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs">
    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
    <span>{text}</span>
  </div>
);

/** Indicatif du pays + numéro. Affiche le format final utilisé comme identifiant. */
const PhoneField: React.FC<{ lang: PreferredLanguage; dial: string; onDial: (d: string) => void; value: string; onValue: (v: string) => void; id: string }> = ({ lang, dial, onDial, value, onValue, id }) => {
  const fr = lang === 'fr';
  const e164 = normalizePhone(dial, value);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-zinc-700 mb-1">
        {fr ? 'Numéro de téléphone' : 'Phone number'}
      </label>
      <div className="flex gap-2">
        <select value={dial} onChange={(e) => onDial(e.target.value)} aria-label={fr ? 'Pays' : 'Country'} className="w-36 shrink-0 px-2 py-2.5 text-sm rounded-xl border border-zinc-300 bg-white text-zinc-900">
          {COUNTRIES.map((c) => (
            <option key={c.dial} value={c.dial}>
              {fr ? c.fr : c.en} ({c.dial})
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" value={value} onChange={(e) => onValue(e.target.value)} placeholder="627 99 86 79" className={inputCls} />
          <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>
      </div>
      {e164 && (
        <p className="text-[11px] text-zinc-500 mt-1">
          {fr ? 'Ton identifiant de connexion : ' : 'Your login ID: '}
          <span className="font-mono font-semibold text-zinc-800">{e164}</span>
        </p>
      )}
    </div>
  );
};

/** Écran du code de récupération : l'élève doit le noter avant de continuer. */
export const RecoveryCodeScreen: React.FC<{ lang: PreferredLanguage; code: string; renewed?: boolean; onContinue: () => void; continueLabel: string }> = ({ lang, code, renewed, onContinue, continueLabel }) => {
  const fr = lang === 'fr';
  const [noted, setNoted] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="space-y-4" data-testid="recovery-code-screen">
      <div className="text-center">
        <h2 className="text-lg font-bold text-zinc-900">{renewed ? (fr ? 'Mot de passe changé' : 'Password changed') : fr ? 'Compte créé !' : 'Account created!'}</h2>
        <p className="text-xs text-zinc-600 mt-1">
          {fr
            ? 'Voici ton code de récupération. Il te permet de changer ton mot de passe si tu l’oublies. Il ne sera plus jamais affiché : note-le sur papier ou fais une capture d’écran.'
            : 'Here is your recovery code. It lets you reset your password if you forget it. It will never be shown again: write it down or take a screenshot.'}
        </p>
        {renewed && <p className="text-xs text-amber-700 mt-1">{fr ? 'L’ancien code ne marche plus : voici le nouveau.' : 'The old code no longer works: here is the new one.'}</p>}
      </div>
      <div className="rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 py-4 text-center">
        <p className="font-mono text-2xl font-bold tracking-widest text-emerald-900 select-all">{code}</p>
      </div>
      <button type="button" onClick={copy} className="w-full py-2.5 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 inline-flex items-center justify-center gap-2">
        <Copy className="w-3.5 h-3.5" /> {copied ? (fr ? 'Copié ✓' : 'Copied ✓') : fr ? 'Copier le code' : 'Copy code'}
      </button>
      <label className="flex items-start gap-2.5 text-xs text-zinc-700 cursor-pointer">
        <input type="checkbox" checked={noted} onChange={(e) => setNoted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600" />
        <span>{fr ? 'J’ai noté mon code de récupération.' : 'I have written down my recovery code.'}</span>
      </label>
      <button type="button" disabled={!noted} onClick={onContinue} className={primaryBtn}>
        <span>{continueLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

/** Inscription par numéro de téléphone + mot de passe (12 ans et plus). */
export const PhoneRegisterForm: React.FC<{ lang: PreferredLanguage; onDone: () => void; onGoLogin: () => void }> = ({ lang, onDone, onGoLogin }) => {
  const fr = lang === 'fr';
  const [fullName, setFullName] = useState('');
  const [dial, setDial] = useState('+224');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [prefLang, setPrefLang] = useState<PreferredLanguage>(lang);
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const e164 = normalizePhone(dial, phone);
    if (!fullName.trim()) return setError(fr ? 'Indique ton nom.' : 'Enter your name.');
    if (!e164) return setError(fr ? 'Numéro invalide. Vérifie le pays et le numéro.' : 'Invalid number. Check the country and the number.');
    if (password.length < PHONE_MIN_PASSWORD) return setError(fr ? `Mot de passe : ${PHONE_MIN_PASSWORD} caractères minimum (il n’y a pas d’e-mail pour le récupérer).` : `Password: at least ${PHONE_MIN_PASSWORD} characters (there is no email to recover it).`);
    if (password !== confirm) return setError(fr ? 'Les mots de passe ne sont pas identiques.' : 'Passwords do not match.');
    if (!adult) return setError(fr ? "Cochez la case : il faut avoir 12 ans ou plus. Pour un enfant de moins de 12 ans, un adulte crée son compte depuis « Famille »." : 'Please tick the box: you must be 12 or older. For a child under 12, an adult creates their account from "Family".');
    setLoading(true);
    try {
      const res = await signupWithPhone({ phone: e164, password, fullName: fullName.trim(), lang: prefLang });
      trackEvent('signup');
      const { data } = await supabase.auth.signInWithPassword({ email: phoneToEmail(e164), password });
      setSignedIn(!!data?.session);
      setCode(res.recovery_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : fr ? 'Une erreur est survenue.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (code)
    return <RecoveryCodeScreen lang={lang} code={code} onContinue={signedIn ? onDone : onGoLogin} continueLabel={signedIn ? (fr ? 'Commencer à apprendre' : 'Start learning') : fr ? 'Me connecter' : 'Sign in'} />;

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {error && <ErrorBox text={error} />}
      <div>
        <label htmlFor="phone-register-name" className="block text-xs font-semibold text-zinc-700 mb-1">
          {fr ? 'Nom complet' : 'Full name'}
        </label>
        <div className="relative">
          <input id="phone-register-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} autoComplete="name" className={inputCls} />
          <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>
      </div>
      <PhoneField lang={lang} dial={dial} onDial={setDial} value={phone} onValue={setPhone} id="phone-register-number" />
      <div className="grid grid-cols-2 gap-2">
        {(['fr', 'en'] as const).map((l) => (
          <button key={l} type="button" onClick={() => setPrefLang(l)} className={`p-2.5 rounded-xl border text-xs font-medium ${prefLang === l ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
            {l === 'fr' ? 'Français' : 'English'}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="phone-register-password" className="block text-xs font-semibold text-zinc-700 mb-1">
          {fr ? 'Mot de passe' : 'Password'}
        </label>
        <div className="relative">
          <input id="phone-register-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>
      </div>
      <div className="relative">
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={fr ? 'Confirmer le mot de passe' : 'Confirm password'} aria-label={fr ? 'Confirmer le mot de passe' : 'Confirm password'} className={inputCls} />
        <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
      </div>
      <label className="flex items-start gap-2.5 text-xs text-zinc-600 leading-relaxed cursor-pointer">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600" />
        <span>
          {fr
            ? "Je confirme avoir 12 ans ou plus. Pour un enfant de moins de 12 ans, un adulte crée son propre compte puis ajoute l'enfant depuis « Famille »."
            : 'I confirm I am 12 or older. For a child under 12, an adult creates their own account, then adds the child from "Family".'}
        </span>
      </label>
      <p className="text-[11px] text-zinc-500">
        {fr
          ? 'Ton numéro sert seulement d’identifiant : il n’est pas vérifié et aucun SMS n’est envoyé. Tu recevras un code de récupération à noter.'
          : 'Your number is only used as a login ID: it is not verified and no SMS is sent. You will get a recovery code to write down.'}
      </p>
      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <><span>{fr ? 'Créer mon compte' : 'Create my account'}</span><ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
};

/** Mot de passe oublié par numéro : numéro + code de récupération + nouveau mot de passe. */
export const PhoneRecoverForm: React.FC<{ lang: PreferredLanguage; onDone: () => void }> = ({ lang, onDone }) => {
  const fr = lang === 'fr';
  const [dial, setDial] = useState('+224');
  const [phone, setPhone] = useState('');
  const [codeIn, setCodeIn] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const e164 = normalizePhone(dial, phone);
    if (!e164) return setError(fr ? 'Numéro invalide. Vérifie le pays et le numéro.' : 'Invalid number. Check the country and the number.');
    if (codeIn.replace(/[^A-Za-z0-9]/g, '').length !== 12) return setError(fr ? 'Le code de récupération a 12 caractères (ex : AB3D-K7MP-Q2XZ).' : 'The recovery code has 12 characters (e.g. AB3D-K7MP-Q2XZ).');
    if (password.length < PHONE_MIN_PASSWORD) return setError(fr ? `Nouveau mot de passe : ${PHONE_MIN_PASSWORD} caractères minimum.` : `New password: at least ${PHONE_MIN_PASSWORD} characters.`);
    setLoading(true);
    try {
      const res = await recoverWithPhone({ phone: e164, code: codeIn, newPassword: password, lang });
      setFresh(res.recovery_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : fr ? 'Une erreur est survenue.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (fresh) return <RecoveryCodeScreen lang={lang} code={fresh} renewed onContinue={onDone} continueLabel={fr ? 'Me connecter' : 'Sign in'} />;

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorBox text={error} />}
      <PhoneField lang={lang} dial={dial} onDial={setDial} value={phone} onValue={setPhone} id="phone-recover-number" />
      <div>
        <label htmlFor="phone-recover-code" className="block text-xs font-semibold text-zinc-700 mb-1">
          {fr ? 'Code de récupération' : 'Recovery code'}
        </label>
        <input id="phone-recover-code" value={codeIn} onChange={(e) => setCodeIn(formatRecoveryCode(e.target.value))} placeholder="AB3D-K7MP-Q2XZ" autoComplete="off" spellCheck={false} className="w-full px-4 py-2.5 text-sm font-mono tracking-widest rounded-xl border border-zinc-300 text-zinc-900" />
      </div>
      <div>
        <label htmlFor="phone-recover-password" className="block text-xs font-semibold text-zinc-700 mb-1">
          {fr ? 'Nouveau mot de passe' : 'New password'}
        </label>
        <div className="relative">
          <input id="phone-recover-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 flex items-start gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
        {fr ? 'Tu as perdu ton code ? Contacte-nous : nous pourrons réinitialiser ton compte.' : 'Lost your code? Contact us: we can reset your account.'}
      </p>
      <button type="submit" disabled={loading} className={primaryBtn}>
        {loading ? <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <span>{fr ? 'Changer mon mot de passe' : 'Change my password'}</span>}
      </button>
    </form>
  );
};

/** Bascule « E-mail | Téléphone » (inscription et mot de passe oublié). */
export const MethodToggle: React.FC<{ lang: PreferredLanguage; value: 'email' | 'phone'; onChange: (v: 'email' | 'phone') => void }> = ({ lang, value, onChange }) => (
  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 mb-5" role="tablist">
    {(['email', 'phone'] as const).map((v) => (
      <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)} className={`py-2 rounded-lg text-xs font-semibold transition ${value === v ? 'bg-white text-emerald-800 shadow-sm' : 'text-zinc-600'}`}>
        {v === 'email' ? (lang === 'fr' ? 'Par e-mail' : 'By email') : lang === 'fr' ? 'Par téléphone' : 'By phone'}
      </button>
    ))}
  </div>
);
