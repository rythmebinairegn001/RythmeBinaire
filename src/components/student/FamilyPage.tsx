import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Baby, BarChart3, KeyRound, PauseCircle, PlayCircle, Plus, ShieldCheck, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import {
  ChildAccount,
  MIN_PASSWORD,
  checkUsername,
  listMyChildren,
  manageChild,
} from '../../services/familyService';
import { ChildReportPanel } from './ChildReportPanel';
import { ChildClassesPanel, ChildTutoringPanel } from './ChildServicesPanel';

interface Props {
  user: UserProfile;
  lang: PreferredLanguage;
  onBack: () => void;
  /** Titres des cours (id → titre) pour le rapport. */
  courseTitles?: Record<string, string>;
}

/**
 * Espace « Famille » : l'adulte crée et supervise les comptes de ses enfants.
 * Il choisit l'identifiant et le mot de passe, voit la progression, peut suspendre le compte,
 * autoriser (ou non) le tuteur IA, changer le mot de passe ou supprimer le compte.
 */
export const FamilyPage: React.FC<Props> = ({ user, lang, onBack, courseTitles = {} }) => {
  const fr = lang === 'fr';
  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id de l'enfant ou 'create'
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Formulaire de création
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [childLang, setChildLang] = useState<PreferredLanguage>(lang);
  // Changement de mot de passe : enfant en cours + valeur
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [servicesFor, setServicesFor] = useState<{ id: string; kind: 'classes' | 'tutoring' } | null>(null);
  const [pwdFor, setPwdFor] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const refresh = useCallback(async () => {
    try {
      setChildren(await listMyChildren(user.id));
      setLoadError(null);
    } catch {
      setLoadError(
        fr
          ? "L'espace Famille n'est pas encore activé sur la plateforme. Réessayez plus tard."
          : 'The Family space is not enabled on the platform yet. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  }, [user.id, fr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (key: string, okText: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      await refresh();
      setMessage({ kind: 'ok', text: okText });
      return true;
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const usernameProblem = username ? checkUsername(username) : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setMessage({ kind: 'error', text: fr ? "Indiquez le prénom de l'enfant." : "Enter the child's first name." });
    if (checkUsername(username)) {
      return setMessage({
        kind: 'error',
        text: fr
          ? "Identifiant invalide : 3 à 20 caractères, minuscules, chiffres, point, tiret ou tiret bas (sans espace ni accent)."
          : 'Invalid username: 3 to 20 characters, lowercase letters, digits, dot, dash or underscore (no spaces or accents).',
      });
    }
    if (password.length < MIN_PASSWORD) {
      return setMessage({
        kind: 'error',
        text: fr ? `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` : `The password must be at least ${MIN_PASSWORD} characters.`,
      });
    }
    const ok = await run('create', fr ? `Compte créé pour ${name.trim()}. Notez l'identifiant et le mot de passe.` : `Account created for ${name.trim()}. Write down the username and password.`, () =>
      manageChild({ action: 'create', username: username.trim().toLowerCase(), password, full_name: name.trim(), language: childLang })
    );
    if (ok) {
      setName('');
      setUsername('');
      setPassword('');
    }
  };

  const handleDelete = (c: ChildAccount) => {
    const sure = window.confirm(
      fr
        ? `Supprimer définitivement le compte de ${c.full_name} (${c.username}) et toute sa progression ? Cette action est irréversible.`
        : `Permanently delete ${c.full_name}'s account (${c.username}) and all progress? This cannot be undone.`
    );
    if (!sure) return;
    run(c.child_id, fr ? 'Compte supprimé.' : 'Account deleted.', () => manageChild({ action: 'delete', child_id: c.child_id }));
  };

  const handleResetPassword = async (c: ChildAccount) => {
    if (newPwd.length < MIN_PASSWORD) {
      return setMessage({
        kind: 'error',
        text: fr ? `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` : `The password must be at least ${MIN_PASSWORD} characters.`,
      });
    }
    const ok = await run(c.child_id, fr ? 'Mot de passe changé.' : 'Password changed.', () =>
      manageChild({ action: 'reset_password', child_id: c.child_id, password: newPwd })
    );
    if (ok) {
      setPwdFor(null);
      setNewPwd('');
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900';
  const btnCls =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition disabled:opacity-50';

  return (
    <div id="family-page" className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        {fr ? 'Retour au tableau de bord' : 'Back to dashboard'}
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Baby className="w-3.5 h-3.5" />
          {fr ? 'Famille' : 'Family'}
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {fr ? 'Comptes de vos enfants' : "Your children's accounts"}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          {fr
            ? "Cet espace est prévu pour les enfants de moins de 12 ans. Vous créez le compte de votre enfant et vous le supervisez : il se connecte avec l'identifiant et le mot de passe que vous choisissez, sans e-mail. Nous ne demandons ni son âge ni ses coordonnées. Son accès aux cours suit le vôtre."
            : 'This space is for children under 12. You create your child\'s account and supervise it: they sign in with the username and password you choose, with no email. We ask for neither their age nor contact details. Their access to courses follows yours.'}
        </p>
        <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          {fr
            ? "Le tuteur IA est désactivé par défaut pour chaque enfant : vous décidez de l'activer ou non."
            : 'The AI tutor is off by default for each child: you decide whether to turn it on.'}
        </p>
      </div>

      {message && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-xs leading-relaxed ${
            message.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {loadError ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">{loadError}</div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900">
              {fr ? 'Enfants' : 'Children'} {children.length > 0 && <span className="text-slate-400">({children.length})</span>}
            </h2>
            {loading ? (
              <p className="text-sm text-slate-500">…</p>
            ) : children.length === 0 ? (
              <p className="text-sm text-slate-500">{fr ? "Aucun enfant pour l'instant. Ajoutez-en un ci-dessous." : 'No children yet. Add one below.'}</p>
            ) : (
              children.map((c) => (
                <div key={c.child_id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{c.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {fr ? 'Identifiant' : 'Username'} : <span className="font-mono">{c.username}</span> ·{' '}
                        {fr ? `${c.lessonsCompleted} leçon(s) terminée(s)` : `${c.lessonsCompleted} lesson(s) completed`}
                      </p>
                    </div>
                    <div className="flex gap-2 text-[11px] font-bold">
                      <span className={`px-2.5 py-1 rounded-full border ${c.suspended ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                        {c.suspended ? (fr ? 'Suspendu' : 'Suspended') : fr ? 'Actif' : 'Active'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full border ${c.ai_allowed ? 'bg-violet-50 border-violet-200 text-violet-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        {c.ai_allowed ? (fr ? 'Tuteur IA activé' : 'AI tutor on') : fr ? 'Tuteur IA désactivé' : 'AI tutor off'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnCls} onClick={() => setReportFor(reportFor === c.child_id ? null : c.child_id)}>
                      <BarChart3 className="w-3.5 h-3.5" />
                      {reportFor === c.child_id ? (fr ? 'Masquer le rapport' : 'Hide report') : fr ? 'Voir le rapport' : 'View report'}
                    </button>
                    <button type="button" className={btnCls} onClick={() => setServicesFor(servicesFor?.id === c.child_id && servicesFor.kind === 'classes' ? null : { id: c.child_id, kind: 'classes' })}>
                      {fr ? 'Classes' : 'Classes'}
                    </button>
                    <button type="button" className={btnCls} onClick={() => setServicesFor(servicesFor?.id === c.child_id && servicesFor.kind === 'tutoring' ? null : { id: c.child_id, kind: 'tutoring' })}>
                      {fr ? 'Séance avec un professeur' : 'Teacher session'}
                    </button>
                    <button
                      type="button"
                      className={btnCls}
                      disabled={busy === c.child_id}
                      onClick={() =>
                        run(c.child_id, c.suspended ? (fr ? 'Compte réactivé.' : 'Account reactivated.') : fr ? 'Compte suspendu.' : 'Account suspended.', () =>
                          manageChild({ action: 'set_suspended', child_id: c.child_id, suspended: !c.suspended })
                        )
                      }
                    >
                      {c.suspended ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                      {c.suspended ? (fr ? 'Réactiver' : 'Reactivate') : fr ? 'Suspendre' : 'Suspend'}
                    </button>
                    <button
                      type="button"
                      className={btnCls}
                      disabled={busy === c.child_id}
                      onClick={() =>
                        run(c.child_id, c.ai_allowed ? (fr ? 'Tuteur IA désactivé.' : 'AI tutor turned off.') : fr ? 'Tuteur IA activé.' : 'AI tutor turned on.', () =>
                          manageChild({ action: 'set_ai', child_id: c.child_id, ai_allowed: !c.ai_allowed })
                        )
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {c.ai_allowed ? (fr ? 'Désactiver le tuteur IA' : 'Turn AI tutor off') : fr ? 'Activer le tuteur IA' : 'Turn AI tutor on'}
                    </button>
                    <button
                      type="button"
                      className={btnCls}
                      onClick={() => {
                        setPwdFor(pwdFor === c.child_id ? null : c.child_id);
                        setNewPwd('');
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {fr ? 'Changer le mot de passe' : 'Change password'}
                    </button>
                    <button type="button" className={`${btnCls} text-red-700`} disabled={busy === c.child_id} onClick={() => handleDelete(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      {fr ? 'Supprimer' : 'Delete'}
                    </button>
                  </div>

                  {servicesFor?.id === c.child_id && servicesFor.kind === 'classes' && <ChildClassesPanel childId={c.child_id} name={c.full_name} lang={lang} />}
                  {servicesFor?.id === c.child_id && servicesFor.kind === 'tutoring' && <ChildTutoringPanel childId={c.child_id} name={c.full_name} lang={lang} />}

                  {reportFor === c.child_id && <ChildReportPanel childId={c.child_id} name={c.full_name} titles={courseTitles} lang={lang} />}

                  {pwdFor === c.child_id && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        autoComplete="off"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder={fr ? `Nouveau mot de passe (${MIN_PASSWORD}+ caractères)` : `New password (${MIN_PASSWORD}+ characters)`}
                        className={`${inputCls} max-w-xs`}
                      />
                      <button type="button" className={btnCls} disabled={busy === c.child_id} onClick={() => handleResetPassword(c)}>
                        {fr ? 'Enregistrer' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              {fr ? 'Ajouter un enfant' : 'Add a child'}
            </h2>
            <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="child-name" className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Prénom' : 'First name'}</label>
                <input id="child-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
              </div>
              <div>
                <label htmlFor="child-username" className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Identifiant de connexion' : 'Login username'}</label>
                <input
                  id="child-username"
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="mariama.9"
                  required
                />
                {usernameProblem === 'format' && (
                  <p className="text-[11px] text-red-600 mt-1">
                    {fr ? 'Minuscules, chiffres, point, tiret ou tiret bas ; 3 à 20 caractères.' : 'Lowercase letters, digits, dot, dash or underscore; 3 to 20 characters.'}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="child-password" className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? 'Mot de passe' : 'Password'}</label>
                <input id="child-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" placeholder={fr ? `${MIN_PASSWORD} caractères minimum` : `${MIN_PASSWORD} characters minimum`} required />
              </div>
              <div>
                <label htmlFor="child-lang" className="block text-xs font-semibold text-slate-700 mb-1.5">{fr ? "Langue de l'enfant" : "Child's language"}</label>
                <select id="child-lang" className={inputCls} value={childLang} onChange={(e) => setChildLang(e.target.value as PreferredLanguage)}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={busy === 'create'} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  {busy === 'create' ? '…' : fr ? 'Créer le compte' : 'Create account'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
};
