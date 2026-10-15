import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { VerifiedCertificate, normalizeCode, verifyCertificate } from '../../services/certificateService';
import { CertificateCard } from '../student/CertificateCard';

/** Page publique : vérifier un certificat à partir de son code (sans compte). */
export const VerifyCertificatePage: React.FC<{ lang: PreferredLanguage; initialCode?: string }> = ({ lang, initialCode }) => {
  const fr = lang === 'fr';
  const [code, setCode] = useState(initialCode || '');
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'error'>('idle');
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);

  const run = async (raw: string) => {
    setState('loading');
    try {
      const r = await verifyCertificate(raw);
      setCert(r);
      setState(r ? 'found' : 'notfound');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (initialCode) run(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="verify-page" className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-slate-900">{fr ? 'Vérifier un certificat' : 'Verify a certificate'}</h1>
        <p className="text-sm text-slate-600">{fr ? 'Saisis le code écrit sur le certificat (ex : RB-7KQ4M2XD).' : 'Enter the code printed on the certificate (e.g. RB-7KQ4M2XD).'}</p>
      </div>
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(code);
        }}
      >
        <input id="verify-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="RB-XXXXXXXX" autoComplete="off" className="w-full px-3 py-2 text-sm font-mono tracking-wider rounded-xl border border-slate-300 bg-white text-slate-900" />
        <button type="submit" disabled={!code.trim()} className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white disabled:opacity-40">
          {fr ? 'Vérifier' : 'Verify'}
        </button>
      </form>

      {state === 'loading' && <p className="text-sm text-slate-500">{fr ? 'Vérification…' : 'Checking…'}</p>}
      {state === 'error' && <p className="text-sm text-amber-800">{fr ? 'Vérification impossible pour le moment. Réessaie plus tard.' : 'Unable to verify right now. Try again later.'}</p>}
      {state === 'notfound' && (
        <div role="status" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
          <ShieldX className="w-5 h-5 shrink-0" />
          <span>{fr ? 'Aucun certificat ne correspond à ce code. Vérifie les caractères ou contacte la personne qui te l’a montré.' : 'No certificate matches this code. Check the characters or contact the person who showed it to you.'}</span>
        </div>
      )}
      {state === 'found' && cert && (
        <div className="space-y-4">
          {cert.revoked ? (
            <div role="status" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <ShieldX className="w-5 h-5 shrink-0" />
              <span>{fr ? 'Ce certificat a été annulé par RythmeBinaireGn.' : 'This certificate has been revoked by RythmeBinaireGn.'}</span>
            </div>
          ) : (
            <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{fr ? 'Certificat authentique, délivré par RythmeBinaireGn.' : 'Authentic certificate, issued by RythmeBinaireGn.'}</span>
            </div>
          )}
          <CertificateCard cert={{ ...cert, code: normalizeCode(code) }} lang={lang} />
        </div>
      )}
    </div>
  );
};
