import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { AgeReport, ReportAction, listAgeReports, loadRequireAge, openReports, resolveAgeReport, saveRequireAge } from '../../services/ageService';

const KIND_LABEL = {
  self_12plus: { fr: 'a coché « 12 ans ou plus »', en: 'ticked "12 or older"' },
  guardian_created: { fr: 'créé par un adulte', en: 'created by an adult' },
  unknown: { fr: 'aucune déclaration enregistrée', en: 'no declaration on record' },
} as const;

/** Affichage pur (testable). */
export const AgeReportsView: React.FC<{
  lang: PreferredLanguage;
  reports: AgeReport[] | null;
  requireAge: boolean | null;
  onToggleRequire: (v: boolean) => void;
  onAction: (r: AgeReport, a: ReportAction) => void;
}> = ({ lang, reports, requireAge, onToggleRequire, onAction }) => {
  const fr = lang === 'fr';
  if (reports === null)
    return (
      <div id="age-manager" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {fr ? "La règle des 12 ans n'est pas encore renforcée : exécute supabase/age12.sql dans Supabase (SQL Editor), puis recharge." : 'The under-12 rule is not reinforced yet: run supabase/age12.sql in Supabase (SQL Editor), then reload.'}
      </div>
    );
  return (
    <div id="age-manager" className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
        <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-600" />
          {fr ? 'Règle des 12 ans' : 'Under-12 rule'}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {fr
            ? "On ne peut pas vérifier l'âge sans demander une pièce d'identité. Deux protections : la déclaration « 12 ans ou plus » est exigée par la base, et les professeurs peuvent signaler un compte suspect."
            : 'Age cannot be verified without asking for ID. Two safeguards: the "12 or older" declaration is required by the database, and teachers can report a suspicious account.'}
        </p>
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input id="age-require" type="checkbox" className="mt-1" checked={requireAge === true} disabled={requireAge === null} onChange={(e) => onToggleRequire(e.target.checked)} />
          <span>
            {fr ? 'Exiger la déclaration à l’inscription (côté base). ' : 'Require the declaration at sign-up (database side). '}
            <span className="text-xs text-slate-500">
              {fr ? 'À allumer seulement APRÈS avoir déployé la version du site qui envoie la déclaration, sinon les inscriptions échouent.' : 'Turn on only AFTER deploying the site version that sends the declaration, otherwise sign-ups fail.'}
            </span>
          </span>
        </label>
      </div>
      <ul className="space-y-2">
        {reports.length === 0 && <li className="text-sm text-slate-500">{fr ? 'Aucun signalement.' : 'No reports.'}</li>}
        {reports.map((r) => (
          <li key={r.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-900">{r.user_name || r.user_email}</div>
                <div className="text-xs text-slate-500">{r.user_email}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${r.status === 'open' ? 'bg-amber-50 border-amber-200 text-amber-900' : r.status === 'blocked' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {r.status === 'open' ? (fr ? 'À examiner' : 'To review') : r.status === 'blocked' ? (fr ? 'Bloqué' : 'Blocked') : fr ? 'Ignoré' : 'Dismissed'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {fr ? 'Signalé par' : 'Reported by'} {r.reported_by_name || '—'}
              {r.reason ? ` : « ${r.reason} »` : ''} · {r.declared_kind ? KIND_LABEL[r.declared_kind][fr ? 'fr' : 'en'] : KIND_LABEL.unknown[fr ? 'fr' : 'en']}
            </p>
            <div className="flex flex-wrap gap-2">
              {r.status === 'open' && (
                <>
                  <button type="button" className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800" onClick={() => onAction(r, 'dismiss')}>
                    {fr ? 'Ignorer' : 'Dismiss'}
                  </button>
                  <button type="button" className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-700 text-white" onClick={() => onAction(r, 'block')}>
                    {fr ? 'Bloquer le compte' : 'Block account'}
                  </button>
                </>
              )}
              {r.status === 'blocked' && (
                <button type="button" className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800" onClick={() => onAction(r, 'unblock')}>
                  {fr ? 'Réactiver' : 'Reactivate'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const AgeReportsManager: React.FC<{ lang: PreferredLanguage }> = ({ lang }) => {
  const fr = lang === 'fr';
  const [reports, setReports] = useState<AgeReport[] | null>(null);
  const [requireAge, setRequireAge] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReports(await listAgeReports());
    setRequireAge(await loadRequireAge());
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>}
      <AgeReportsView
        lang={lang}
        reports={reports}
        requireAge={requireAge}
        onToggleRequire={async (v) => {
          setError(null);
          if (
            v &&
            !window.confirm(
              fr
                ? 'Allumer l’exigence de déclaration ? Vérifie que la version du site qui envoie la déclaration est bien déployée, sinon plus personne ne pourra s’inscrire.'
                : 'Turn on the declaration requirement? Make sure the site version that sends the declaration is deployed, otherwise nobody will be able to sign up.'
            )
          )
            return;
          try {
            await saveRequireAge(v);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
          await refresh();
        }}
        onAction={async (r, a) => {
          setError(null);
          if (a === 'block' && !window.confirm(fr ? `Bloquer ${r.user_name || r.user_email} ? La personne ne pourra plus se connecter.` : `Block ${r.user_name || r.user_email}? They will no longer be able to log in.`)) return;
          const ok = await resolveAgeReport(r.id, a);
          if (!ok) setError(fr ? 'Action impossible. Réessaie.' : 'Action failed. Try again.');
          await refresh();
        }}
      />
    </>
  );
};
