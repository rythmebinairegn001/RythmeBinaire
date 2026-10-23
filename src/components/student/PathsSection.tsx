import React, { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle2, Map as MapIcon, Printer } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { PublicCourseItem } from '../../data/coursesData';
import { CERT_ERRORS, Certificate, CertError, listMyCertificates } from '../../services/certificateService';
import { LearningPath, issuePathCertificate, listPaths, pathCertKey, pathProgress } from '../../services/pathService';
import { CertificateCard } from './CertificateCard';

interface Props {
  lang: PreferredLanguage;
  courses: PublicCourseItem[];
  /** Pourcentage terminé par cours (élève connecté). Absent sur le site public. */
  percentByCourse?: Record<string, number>;
  /** Élève connecté : permet d'obtenir le certificat de parcours. */
  user?: UserProfile;
  onOpenCourse: (courseId: string) => void;
  /** Titre plus grand sur la page publique. */
  publicPage?: boolean;
}

/** Parcours guidés : suite de cours avec progression et certificat final. Caché s'il n'y a aucun parcours publié (ou si le script n'est pas lancé). */
export const PathsSection: React.FC<Props> = ({ lang, courses, percentByCourse, user, onOpenCourse, publicPage }) => {
  const fr = lang === 'fr';
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [name, setName] = useState(user?.full_name || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listPaths(true)
      .then((p) => alive && setPaths(p))
      .catch(() => alive && setPaths([]));
    return () => {
      alive = false;
    };
  }, []);

  const loadCerts = useCallback(async () => {
    if (user) setCerts(await listMyCertificates(user.id));
  }, [user]);
  useEffect(() => {
    void loadCerts();
  }, [loadCerts]);

  const byId = new Map(courses.map((c) => [c.id, c]));
  const visible = paths.filter((p) => p.course_ids.some((id) => byId.has(id)));
  if (!visible.length) return null;

  return (
    <section id="paths-section" className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 ${publicPage ? 'max-w-7xl mx-auto' : ''}`}>
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-indigo-600" /> {fr ? 'Parcours guidés' : 'Guided paths'}
        </h2>
        <p className="text-xs text-slate-600">
          {fr ? 'Une suite de cours dans le bon ordre, avec un certificat à la fin.' : 'A series of courses in the right order, with a certificate at the end.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((p) => {
          const prog = pathProgress(p, percentByCourse || {});
          const cert = certs.find((c) => c.course_id === pathCertKey(p.id));
          return (
            <article key={p.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <h3 className="font-bold text-slate-900">{fr ? p.title_fr : p.title_en}</h3>
                <p className="text-xs text-slate-600">{fr ? p.summary_fr : p.summary_en}</p>
              </div>
              {percentByCourse && (
                <div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={prog.percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-indigo-600" style={{ width: `${prog.percent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {prog.doneCount}/{prog.total} {fr ? 'cours terminés' : 'courses done'} · {prog.percent}%
                  </p>
                </div>
              )}
              <ol className="space-y-1.5">
                {prog.steps.map((s, i) => {
                  const c = byId.get(s.courseId);
                  if (!c) return null;
                  return (
                    <li key={s.courseId}>
                      <button
                        type="button"
                        onClick={() => onOpenCourse(s.courseId)}
                        className="w-full flex items-center gap-2 text-left rounded-xl bg-white border border-slate-200 hover:border-indigo-300 px-3 py-2 text-xs"
                      >
                        <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${s.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                        </span>
                        <span className="font-semibold text-slate-900 flex-1">{c.translations[lang]?.title || c.translations.fr.title}</span>
                        {percentByCourse && !s.done && s.percent > 0 && <span className="text-slate-500">{s.percent}%</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {user &&
                (cert ? (
                  <button type="button" onClick={() => setSelected(cert)} className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white inline-flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> {fr ? 'Voir mon certificat de parcours' : 'View my path certificate'}
                  </button>
                ) : prog.complete ? (
                  <div className="space-y-2">
                    {!user.full_name?.trim() && (
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={80}
                        placeholder={fr ? 'Ton nom complet (écrit sur le certificat)' : 'Your full name (printed on the certificate)'}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900"
                      />
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 text-white inline-flex items-center gap-1.5"
                      onClick={async () => {
                        setError(null);
                        try {
                          const c = await issuePathCertificate(p.id, name);
                          await loadCerts();
                          setSelected(c);
                        } catch (e) {
                          const k = (e instanceof Error && e.message in CERT_ERRORS ? e.message : 'unknown') as CertError;
                          setError(fr ? CERT_ERRORS[k].fr : CERT_ERRORS[k].en);
                        }
                      }}
                    >
                      <Award className="w-3.5 h-3.5" /> {fr ? 'Obtenir mon certificat de parcours' : 'Get my path certificate'}
                    </button>
                  </div>
                ) : null)}
            </article>
          );
        })}
      </div>
      {error && <p role="status" className="text-sm text-red-700">{error}</p>}
      {selected && (
        <div className="space-y-3">
          <CertificateCard cert={selected} lang={lang} />
          <div className="no-print flex gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> {fr ? 'Imprimer / enregistrer en PDF' : 'Print / save as PDF'}
            </button>
            <button type="button" className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50" onClick={() => setSelected(null)}>
              {fr ? 'Fermer' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
