import React, { useCallback, useEffect, useState } from 'react';
import { Award, Printer } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { PublicCourseItem } from '../../data/coursesData';
import { CERT_ERRORS, Certificate, CertError, issueCertificate, listMyCertificates } from '../../services/certificateService';
import { CertificateCard } from './CertificateCard';

interface Props {
  user: UserProfile;
  lang: PreferredLanguage;
  courses: PublicCourseItem[];
  /** Cours terminés à 100 % (calculés par le tableau de bord). */
  completedCourseIds: string[];
}

/** Affichage pur : cours terminés (obtenir / voir) + certificats déjà délivrés. */
export const CertificateView: React.FC<{
  lang: PreferredLanguage;
  eligible: { id: string; title: string }[];
  certs: Certificate[];
  needsName: boolean;
  name: string;
  onName: (v: string) => void;
  onGet: (courseId: string) => void;
  selected: Certificate | null;
  onSelect: (c: Certificate | null) => void;
  error: string | null;
}> = ({ lang, eligible, certs, needsName, name, onName, onGet, selected, onSelect, error }) => {
  const fr = lang === 'fr';
  const has = (id: string) => certs.find((c) => c.course_id === id);
  if (!eligible.length && !certs.length) return null;
  return (
    <section id="certificate-panel" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
      <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
        <Award className="w-5 h-5 text-emerald-600" /> {fr ? 'Mes certificats' : 'My certificates'}
      </h2>
      {needsName && eligible.some((e) => !has(e.id)) && (
        <input
          id="cert-name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          maxLength={80}
          placeholder={fr ? 'Ton nom complet (il sera écrit sur le certificat)' : 'Your full name (it will be printed on the certificate)'}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900"
        />
      )}
      <ul className="space-y-2">
        {eligible.map((e) => {
          const c = has(e.id);
          return (
            <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">{e.title}</span>
              {c ? (
                <button type="button" className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={() => onSelect(c)}>
                  {fr ? 'Voir mon certificat' : 'View my certificate'}
                </button>
              ) : (
                <button type="button" className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 text-white" onClick={() => onGet(e.id)}>
                  {fr ? 'Obtenir mon certificat' : 'Get my certificate'}
                </button>
              )}
            </li>
          );
        })}
        {certs
          .filter((c) => !eligible.some((e) => e.id === c.course_id))
          .map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">{fr ? c.course_title_fr : c.course_title_en}</span>
              <button type="button" className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={() => onSelect(c)}>
                {fr ? 'Voir mon certificat' : 'View my certificate'}
              </button>
            </li>
          ))}
      </ul>
      {error && <p role="status" className="text-sm text-red-700">{error}</p>}
      {selected && (
        <div className="space-y-3">
          <CertificateCard cert={{ ...selected, code: selected.code }} lang={lang} />
          <div className="no-print flex gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> {fr ? 'Imprimer / enregistrer en PDF' : 'Print / save as PDF'}
            </button>
            <button type="button" className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50" onClick={() => onSelect(null)}>
              {fr ? 'Fermer' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export const CertificatePanel: React.FC<Props> = ({ user, lang, courses, completedCourseIds }) => {
  const fr = lang === 'fr';
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [name, setName] = useState(user.full_name || '');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setCerts(await listMyCertificates(user.id)), [user.id]);
  useEffect(() => {
    load();
  }, [load]);

  const eligible = completedCourseIds
    .map((id) => courses.find((c) => c.id === id))
    .filter((c): c is PublicCourseItem => !!c)
    .map((c) => ({ id: c.id, title: c.translations[lang].title }));

  return (
    <CertificateView
      lang={lang}
      eligible={eligible}
      certs={certs}
      needsName={!user.full_name?.trim()}
      name={name}
      onName={setName}
      selected={selected}
      onSelect={setSelected}
      error={error}
      onGet={async (courseId) => {
        setError(null);
        try {
          const c = await issueCertificate(courseId, name);
          await load();
          setSelected(c);
        } catch (e) {
          const k = (e instanceof Error && e.message in CERT_ERRORS ? e.message : 'unknown') as CertError;
          setError(fr ? CERT_ERRORS[k].fr : CERT_ERRORS[k].en);
        }
      }}
    />
  );
};
