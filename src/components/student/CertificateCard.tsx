import React from 'react';
import { PreferredLanguage } from '../../types/database';
import { Certificate, VerifiedCertificate, verifyUrl } from '../../services/certificateService';

/** Le certificat lui-même (imprimable). Affichage pur : même rendu pour l'élève et pour la page de vérification. */
export const CertificateCard: React.FC<{
  cert: Pick<Certificate, 'student_name' | 'course_title_fr' | 'course_title_en' | 'issued_at'> & { code: string };
  lang: PreferredLanguage;
  origin?: string;
}> = ({ cert, lang, origin }) => {
  const fr = lang === 'fr';
  const title = fr ? cert.course_title_fr : cert.course_title_en;
  const date = new Date(cert.issued_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="cert-print bg-white border-[6px] border-double border-emerald-700 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
      <p className="text-xs tracking-[0.3em] uppercase text-emerald-700 font-bold">RythmeBinaireGn</p>
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">{fr ? 'Certificat de réussite' : 'Certificate of completion'}</h2>
      <p className="text-sm text-slate-600">{fr ? 'décerné à' : 'awarded to'}</p>
      <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-800 break-words">{cert.student_name}</p>
      <p className="text-sm text-slate-600">{fr ? 'pour avoir terminé avec succès' : 'for successfully completing'}</p>
      <p className="font-display text-xl sm:text-2xl font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-600">{date}</p>
      <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
        <p>
          {fr ? 'Code de vérification' : 'Verification code'} : <span className="font-mono font-bold text-slate-900 tracking-wider">{cert.code}</span>
        </p>
        <p className="break-all">{fr ? 'Vérifier sur' : 'Verify at'} {verifyUrl(cert.code, origin)}</p>
      </div>
    </div>
  );
};

export type { VerifiedCertificate };
