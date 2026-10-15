import React, { useState } from 'react';
import { KeyRound, Lock, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PreferredLanguage } from '../../types/database';
import {
  AccessGrant,
  AccessKind,
  AccessSettings,
  isGrantActive,
  saveAccessSettings,
  grantAccessAdmin,
  revokeAccessAdmin,
} from '../../services/accessService';

const card = 'bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-3xl';
const input =
  'w-full px-3 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500';

/** Réglages généraux : interrupteur « accès payant », leçons libres, message affiché. */
export const AccessSettingsPanel: React.FC<{
  settings: AccessSettings;
  tablesReady: boolean;
  onSaved: (s: AccessSettings) => void;
  lang: PreferredLanguage;
}> = ({ settings, tablesReady, onSaved, lang }) => {
  const fr = lang === 'fr';
  const [draft, setDraft] = useState<AccessSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (next: AccessSettings) => {
    setSaving(true);
    setMsg(null);
    try {
      await saveAccessSettings(next);
      setDraft(next);
      onSaved(next);
      setMsg({ ok: true, text: fr ? 'Réglages enregistrés.' : 'Settings saved.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = () => {
    const turningOn = !draft.paywallEnabled;
    if (turningOn) {
      const ok = window.confirm(
        fr
          ? `Activer l'accès payant ?\n\nÀ partir de maintenant, les élèves sans accès ne pourront ouvrir que les ${draft.freeLessonsPerCourse} premières leçons de chaque cours. Pense à avoir exécuté acces-serveur.sql (voir ACCES-SERVEUR-ACTIVATION.md). Tu pourras désactiver à tout moment.`
          : `Turn on paid access?\n\nFrom now on, students without access can only open the first ${draft.freeLessonsPerCourse} lessons of each course. Make sure you ran acces-serveur.sql (see ACCES-SERVEUR-ACTIVATION.md). You can turn it off at any time.`
      );
      if (!ok) return;
    }
    void save({ ...draft, paywallEnabled: turningOn });
  };

  return (
    <div id="access-settings-panel" className={`${card} p-5 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">
            {fr ? 'Accès payant' : 'Paid access'}
          </h3>
        </div>
        <button
          id="btn-toggle-paywall"
          type="button"
          onClick={toggle}
          disabled={saving || !tablesReady}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
            draft.paywallEnabled
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400'
              : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {draft.paywallEnabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>
            {draft.paywallEnabled
              ? fr ? 'Activé : cliquer pour désactiver' : 'On: click to turn off'
              : fr ? 'Désactivé (tout est ouvert) : cliquer pour activer' : 'Off (everything open): click to turn on'}
          </span>
        </button>
      </div>

      {!tablesReady && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {fr
              ? "Les tables d'accès n'existent pas encore. Exécute le fichier supabase/acces.sql dans Supabase > SQL Editor, puis recharge cette page."
              : "The access tables don't exist yet. Run the file supabase/acces.sql in Supabase > SQL Editor, then reload this page."}
          </span>
        </div>
      )}

      <p className="text-xs text-[var(--color-text-muted)]">
        {fr
          ? "Tant que c'est désactivé, rien ne change pour les élèves. Activé, seules les leçons « Découverte » restent libres ; le reste demande un accès offert ou payé. Les comptes admin ne sont jamais bloqués."
          : 'While off, nothing changes for students. When on, only the "Discovery" lessons stay free; the rest needs granted or paid access. Admin accounts are never blocked.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-[11px] font-semibold text-[var(--color-text-muted)] space-y-1">
          <span>{fr ? 'Leçons libres par cours (Découverte)' : 'Free lessons per course (Discovery)'}</span>
          <input
            id="input-free-lessons"
            type="number"
            min={0}
            max={50}
            value={draft.freeLessonsPerCourse}
            onChange={(e) =>
              setDraft({ ...draft, freeLessonsPerCourse: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
            }
            className={input}
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--color-text-muted)] space-y-1 md:col-span-1">
          <span>{fr ? "Message affiché (français)" : 'Message shown (French)'}</span>
          <textarea
            id="input-paywall-msg-fr"
            rows={3}
            value={draft.messageFr}
            onChange={(e) => setDraft({ ...draft, messageFr: e.target.value })}
            className={input}
          />
        </label>
        <label className="text-[11px] font-semibold text-[var(--color-text-muted)] space-y-1">
          <span>{fr ? 'Message affiché (anglais)' : 'Message shown (English)'}</span>
          <textarea
            id="input-paywall-msg-en"
            rows={3}
            value={draft.messageEn}
            onChange={(e) => setDraft({ ...draft, messageEn: e.target.value })}
            className={input}
          />
        </label>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)]">
        {fr
          ? "Conseil : écris dans le message comment payer (par exemple ton numéro Orange Money et ton WhatsApp)."
          : 'Tip: write in the message how to pay (for example your Orange Money number and WhatsApp).'}
      </p>

      <div className="flex items-center gap-3">
        <button
          id="btn-save-access-settings"
          type="button"
          disabled={saving || !tablesReady}
          onClick={() => void save(draft)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50"
        >
          {saving ? (fr ? 'Enregistrement…' : 'Saving…') : fr ? 'Enregistrer les réglages' : 'Save settings'}
        </button>
        {msg && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
};

/** Ligne d'accès d'un élève : état actuel + formulaire « donner l'accès ». */
export const StudentAccessControl: React.FC<{
  userId: string;
  grant: AccessGrant | null;
  tablesReady: boolean;
  lang: PreferredLanguage;
  onChanged: (grant: AccessGrant | null) => void;
}> = ({ userId, grant, tablesReady, lang, onChanged }) => {
  const fr = lang === 'fr';
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AccessKind>('granted');
  const [months, setMonths] = useState<string>('unlimited');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = isGrantActive(grant);
  const expired = !!grant && !active;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const adminId = data?.user?.id;
      if (!adminId) throw new Error(fr ? 'Reconnecte-toi en admin.' : 'Sign in as admin again.');
      const g = await grantAccessAdmin(userId, adminId, {
        kind,
        months: months === 'unlimited' ? null : Number(months),
        note,
      });
      onChanged(g);
      setOpen(false);
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm(fr ? "Retirer l'accès de cet élève ?" : "Remove this student's access?")) return;
    setBusy(true);
    setError(null);
    try {
      await revokeAccessAdmin(userId);
      onChanged(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 pt-3 border-t border-[var(--color-card-border)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <KeyRound className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          {active ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">
              {grant!.kind === 'paid' ? (fr ? 'Payé' : 'Paid') : fr ? 'Accès offert' : 'Granted access'}
              {grant!.expires_at
                ? ` · ${fr ? "jusqu'au" : 'until'} ${fmt(grant!.expires_at)}`
                : ` · ${fr ? 'sans limite' : 'no end date'}`}
            </span>
          ) : expired ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold">
              {fr ? 'Accès expiré le' : 'Access expired on'} {fmt(grant!.expires_at!)}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              {fr ? 'Pas d’accès (leçons Découverte seulement si l’accès payant est activé)' : 'No access (Discovery lessons only when paid access is on)'}
            </span>
          )}
          {grant?.note && <span className="text-[var(--color-text-muted)] italic">« {grant.note} »</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!tablesReady || busy}
            onClick={() => setOpen((v) => !v)}
            className="px-3 py-1.5 rounded-xl border border-purple-500/40 text-purple-600 dark:text-purple-400 text-xs font-bold hover:bg-purple-500/10 transition disabled:opacity-50"
          >
            {grant ? (fr ? "Modifier l'accès" : 'Edit access') : fr ? "Donner l'accès" : 'Give access'}
          </button>
          {grant && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void revoke()}
              className="px-3 py-1.5 rounded-xl border border-red-500/40 text-red-600 text-xs font-bold hover:bg-red-500/10 transition disabled:opacity-50"
            >
              {fr ? 'Retirer' : 'Remove'}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)]">
          <select value={kind} onChange={(e) => setKind(e.target.value as AccessKind)} className={input}>
            <option value="granted">{fr ? 'Offert (gratuit)' : 'Granted (free)'}</option>
            <option value="paid">{fr ? 'Payé (reçu)' : 'Paid (received)'}</option>
          </select>
          <select value={months} onChange={(e) => setMonths(e.target.value)} className={input}>
            <option value="1">{fr ? '1 mois' : '1 month'}</option>
            <option value="3">{fr ? '3 mois' : '3 months'}</option>
            <option value="12">{fr ? '1 an' : '1 year'}</option>
            <option value="unlimited">{fr ? 'Sans limite' : 'No end date'}</option>
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            placeholder={fr ? 'Note (ex : étudiant bureautique)' : 'Note (e.g. office student)'}
            className={input}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition active:scale-95 disabled:opacity-50"
          >
            {busy ? '…' : fr ? 'Valider' : 'Confirm'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
    </div>
  );
};
