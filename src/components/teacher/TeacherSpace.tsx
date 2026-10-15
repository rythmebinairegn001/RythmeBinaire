import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Code2, Flag, Copy, Download, Lock, LockOpen, MessageSquare, Plus, Trash2, UserMinus, Users } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { PublicCourseItem } from '../../data/coursesData';
import { reportUnderage } from '../../services/ageService';
import { TutoringTeacherPanel } from './TutoringTeacherPanel';
import { NotificationsPanel } from '../student/NotificationsPanel';
import {
  Activity,
  ClassOverview,
  ClassStudent,
  Completion,
  StudentRow,
  TeacherClass,
  computeClassOverview,
  countLessons,
  createClass,
  deleteClass,
  listClassCourses,
  listMyClasses,
  loadClassData,
  overviewToCsv,
  removeStudent,
  StudentSubmission,
  loadStudentSubmissions,
  withExercisePrefix,
  sendMessage,
  setClassOpen,
  setCourseTracked,
} from '../../services/teacherService';

interface Props {
  user: UserProfile;
  lang: PreferredLanguage;
  courses: PublicCourseItem[];
  onBack: () => void;
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900';
const btnCls =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition disabled:opacity-50';

function fmtDate(iso: string | null, fr: boolean): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' });
}

export const ACTIVITY_LABEL: Record<Activity, { fr: string; en: string; cls: string }> = {
  active: { fr: 'Actif', en: 'Active', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  quiet: { fr: 'Calme', en: 'Quiet', cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  inactive: { fr: 'À relancer', en: 'Needs a nudge', cls: 'bg-red-50 border-red-200 text-red-700' },
  never: { fr: 'Pas commencé', en: 'Not started', cls: 'bg-slate-100 border-slate-200 text-slate-600' },
};

/** Tableau de suivi d'une classe (affichage pur, testable). */
export const OverviewTable: React.FC<{
  overview: ClassOverview;
  lang: PreferredLanguage;
  hasTracked: boolean;
  onMessage?: (s: StudentRow) => void;
  onRemove?: (s: StudentRow) => void;
  onReview?: (s: StudentRow) => void;
  onReportAge?: (s: StudentRow) => void;
}> = ({ overview, lang, hasTracked, onMessage, onRemove, onReview, onReportAge }) => {
  const fr = lang === 'fr';
  if (!overview.rows.length)
    return (
      <p className="text-sm text-slate-500">
        {fr ? 'Aucun élève pour le moment. Donne le code de la classe à tes élèves : ils le saisissent dans leur tableau de bord.' : 'No students yet. Give the class code to your students: they enter it on their dashboard.'}
      </p>
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
        {(Object.keys(overview.counts) as Activity[]).map((k) => (
          <span key={k} className={`px-2.5 py-1 rounded-full border ${ACTIVITY_LABEL[k].cls}`}>
            {fr ? ACTIVITY_LABEL[k].fr : ACTIVITY_LABEL[k].en} : {overview.counts[k]}
          </span>
        ))}
        {overview.averagePercent !== null && (
          <span className="px-2.5 py-1 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
            {fr ? 'Progression moyenne' : 'Average progress'} : {overview.averagePercent} %
          </span>
        )}
      </div>
      {!hasTracked && (
        <p className="text-xs text-slate-500">
          {fr ? 'Coche les cours à suivre ci-dessus pour voir un pourcentage de progression.' : 'Tick the courses to follow above to see a progress percentage.'}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3">{fr ? 'Élève' : 'Student'}</th>
              <th className="py-2 pr-3">{fr ? 'Leçons' : 'Lessons'}</th>
              <th className="py-2 pr-3">{fr ? 'Progression' : 'Progress'}</th>
              <th className="py-2 pr-3">{fr ? 'Dernière activité' : 'Last activity'}</th>
              <th className="py-2 pr-3">{fr ? 'État' : 'Status'}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {overview.rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-middle">
                <td className="py-2 pr-3">
                  <div className="font-semibold text-slate-900">{r.name}</div>
                  {r.isChild ? (
                    <div className="text-[11px] text-sky-700 font-semibold">{fr ? 'Compte enfant (suivi avec l’accord du parent)' : 'Child account (followed with parental consent)'}</div>
                  ) : (
                    <div className="text-[11px] text-slate-500">{r.email}</div>
                  )}
                </td>
                <td className="py-2 pr-3 tabular-nums">{r.lessonsDone}</td>
                <td className="py-2 pr-3 min-w-[110px]">
                  {r.percent === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${r.percent}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-9 text-right">{r.percent} %</span>
                    </div>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs text-slate-600">{fmtDate(r.lastActive, fr)}</td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${ACTIVITY_LABEL[r.activity].cls}`}>
                    {fr ? ACTIVITY_LABEL[r.activity].fr : ACTIVITY_LABEL[r.activity].en}
                  </span>
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {onReview && (
                    <button type="button" className={btnCls} onClick={() => onReview(r)} aria-label={fr ? 'Voir le code' : 'View code'}>
                      <Code2 className="w-3.5 h-3.5" />
                    </button>
                  )}{' '}
                  {onMessage && !r.isChild && (
                    <button type="button" className={btnCls} onClick={() => onMessage(r)} aria-label={fr ? 'Écrire' : 'Message'}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}{' '}
                  {onReportAge && !r.isChild && (
                    <button type="button" className={btnCls} onClick={() => onReportAge(r)} aria-label={fr ? 'Signaler : moins de 12 ans ?' : 'Report: under 12?'} title={fr ? 'Signaler : moins de 12 ans ?' : 'Report: under 12?'}>
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  )}{' '}
                  {onRemove && (
                    <button type="button" className={btnCls} onClick={() => onRemove(r)} aria-label={fr ? 'Retirer' : 'Remove'}>
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** Liste du code soumis par un élève (affichage pur, testable). */
export const SubmissionsView: React.FC<{
  studentName: string;
  submissions: StudentSubmission[];
  lang: PreferredLanguage;
  onComment: (s: StudentSubmission) => void;
  onClose: () => void;
}> = ({ studentName, submissions, lang, onComment, onClose }) => {
  const fr = lang === 'fr';
  const badge = {
    pass: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', fr: 'Réussi', en: 'Passed' },
    fail: { cls: 'bg-amber-50 border-amber-200 text-amber-800', fr: 'Échoué', en: 'Failed' },
    error: { cls: 'bg-red-50 border-red-200 text-red-700', fr: 'Erreur', en: 'Error' },
  } as const;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{fr ? `Code de ${studentName}` : `${studentName}'s code`}</h3>
        <button type="button" className={btnCls} onClick={onClose}>
          {fr ? 'Fermer' : 'Close'}
        </button>
      </div>
      {!submissions.length && <p className="text-sm text-slate-500">{fr ? "Cet élève n'a encore envoyé aucun code." : 'This student has not submitted any code yet.'}</p>}
      <ul className="space-y-3">
        {submissions.map((s) => (
          <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-700 font-semibold">{s.exercise_label || (fr ? 'Exercice' : 'Exercise')}</span>
              <span className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border font-bold ${badge[s.status].cls}`}>{fr ? badge[s.status].fr : badge[s.status].en}</span>
                <span className="text-slate-500">{new Date(s.created_at).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>
            <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-56">{s.code}</pre>
            <button type="button" className={btnCls} onClick={() => onComment(s)}>
              <MessageSquare className="w-3.5 h-3.5" /> {fr ? 'Commenter' : 'Comment'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Espace professeur : mes classes, code d'invitation, cours suivis, tableau de suivi, messages. */
export const TeacherSpace: React.FC<Props> = ({ user, lang, courses, onBack }) => {
  const fr = lang === 'fr';
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setClasses(await listMyClasses(user.id));
      setLoadError(null);
    } catch {
      setLoadError(fr ? "L'espace professeur n'est pas encore activé : exécute supabase/professeurs.sql dans Supabase, puis recharge." : 'The teacher space is not enabled yet: run supabase/professeurs.sql in Supabase, then reload.');
    } finally {
      setLoading(false);
    }
  }, [user.id, fr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const wrap = async (okText: string, fn: () => Promise<void>) => {
    setMessage(null);
    try {
      await fn();
      await refresh();
      if (okText) setMessage({ kind: 'ok', text: okText });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div id="teacher-space" className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
      <button type="button" onClick={onBack} className={btnCls}>
        <ArrowLeft className="w-3.5 h-3.5" /> {fr ? 'Retour' : 'Back'}
      </button>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
        <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-600" />
          {fr ? 'Espace professeur' : 'Teacher space'}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          {fr
            ? "Crée une classe, donne son code à tes élèves, puis suis leur progression et écris-leur un message d'encouragement ou de correction. Tu ne vois que les élèves de tes classes."
            : 'Create a class, give its code to your students, then follow their progress and send them an encouragement or correction message. You only see the students of your own classes.'}
        </p>
      </div>

      <NotificationsPanel userId={user.id} lang={lang} />

      <TutoringTeacherPanel user={user} lang={lang} />

      {message && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${message.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}
      {loadError && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>}

      {!loadError && (
        <form
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            wrap(fr ? 'Classe créée.' : 'Class created.', async () => {
              const c = await createClass(user.id, newName);
              setNewName('');
              setOpenId(c.id);
            });
          }}
        >
          <input id="teacher-new-class" className={inputCls} value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} placeholder={fr ? 'Nom de la classe (ex : Bureautique – groupe A)' : 'Class name (e.g. Office skills – group A)'} />
          <button type="submit" className={`${btnCls} shrink-0 justify-center`}>
            <Plus className="w-3.5 h-3.5" /> {fr ? 'Créer la classe' : 'Create class'}
          </button>
        </form>
      )}

      {loading && <p className="text-sm text-slate-500">{fr ? 'Chargement…' : 'Loading…'}</p>}
      {!loading && !loadError && classes.length === 0 && <p className="text-sm text-slate-500">{fr ? "Tu n'as pas encore de classe." : "You don't have any class yet."}</p>}

      {classes.map((c) => (
        <ClassCard
          key={c.id}
          cls={c}
          user={user}
          lang={lang}
          courses={courses}
          open={openId === c.id}
          onToggle={() => setOpenId(openId === c.id ? null : c.id)}
          onToggleOpenCode={() => wrap('', () => setClassOpen(c.id, !c.open))}
          onDelete={() => {
            if (window.confirm(fr ? `Supprimer la classe « ${c.name} » ? Les élèves ne sont pas supprimés.` : `Delete class "${c.name}"? Students are not deleted.`)) wrap(fr ? 'Classe supprimée.' : 'Class deleted.', () => deleteClass(c.id));
          }}
        />
      ))}
    </div>
  );
};

const ClassCard: React.FC<{
  cls: TeacherClass;
  user: UserProfile;
  lang: PreferredLanguage;
  courses: PublicCourseItem[];
  open: boolean;
  onToggle: () => void;
  onToggleOpenCode: () => void;
  onDelete: () => void;
}> = ({ cls, user, lang, courses, open, onToggle, onToggleOpenCode, onDelete }) => {
  const fr = lang === 'fr';
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [tracked, setTracked] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [writingTo, setWritingTo] = useState<StudentRow | null>(null);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [reviewing, setReviewing] = useState<{ row: StudentRow; subs: StudentSubmission[] } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [d, t] = await Promise.all([loadClassData(cls.id), listClassCourses(cls.id)]);
      setStudents(d.students);
      setCompletions(d.completions);
      setTracked(t);
      setTotal(await countLessons(t));
    } catch (e) {
      setNote({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [cls.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const overview = useMemo(() => computeClassOverview(students, completions, tracked, total), [students, completions, tracked, total]);

  const act = async (okText: string, fn: () => Promise<void>) => {
    setNote(null);
    try {
      await fn();
      if (okText) setNote({ kind: 'ok', text: okText });
      await load();
    } catch (e) {
      setNote({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cls.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* copie non disponible : le code reste affiché */
    }
  };

  const exportCsv = () => {
    const blob = new Blob([overviewToCsv(overview.rows, lang)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cls.name.replace(/[^\w-]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 flex flex-wrap items-center gap-3 justify-between">
        <button type="button" onClick={onToggle} className="text-left">
          <h2 className="font-display text-lg font-bold text-slate-900">{cls.name}</h2>
          <p className="text-xs text-slate-500">{open ? (fr ? 'Cliquer pour replier' : 'Click to collapse') : fr ? 'Cliquer pour ouvrir le suivi' : 'Click to open the follow-up'}</p>
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest px-3 py-1 rounded-xl bg-slate-900 text-white" aria-label={fr ? 'Code de la classe' : 'Class code'}>
            {cls.join_code}
          </span>
          <button type="button" className={btnCls} onClick={copyCode}>
            <Copy className="w-3.5 h-3.5" /> {copied ? (fr ? 'Copié' : 'Copied') : fr ? 'Copier' : 'Copy'}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnCls} onClick={onToggleOpenCode}>
              {cls.open ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
              {cls.open ? (fr ? 'Fermer le code (plus de nouveaux élèves)' : 'Close the code (no new students)') : fr ? 'Rouvrir le code' : 'Reopen the code'}
            </button>
            <button type="button" className={btnCls} onClick={exportCsv} disabled={!overview.rows.length}>
              <Download className="w-3.5 h-3.5" /> {fr ? 'Exporter (Excel)' : 'Export (Excel)'}
            </button>
            <button type="button" className={`${btnCls} text-red-700`} onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" /> {fr ? 'Supprimer la classe' : 'Delete class'}
            </button>
          </div>
          {!cls.open && <p className="text-xs text-amber-700">{fr ? 'Le code est fermé : personne ne peut plus rejoindre cette classe.' : 'The code is closed: nobody can join this class any more.'}</p>}

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">{fr ? 'Cours suivis par la classe' : 'Courses followed by the class'}</h3>
            <div className="flex flex-wrap gap-2">
              {courses.map((co) => {
                const on = tracked.includes(co.id);
                return (
                  <label key={co.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${on ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <input type="checkbox" checked={on} onChange={(e) => act('', () => setCourseTracked(cls.id, co.id, e.target.checked))} />
                    {co.translations[lang].title}
                  </label>
                );
              })}
            </div>
          </div>

          {note && <div role="status" className={`rounded-xl border px-3 py-2 text-xs ${note.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>{note.text}</div>}
          {busy && !students.length ? (
            <p className="text-sm text-slate-500">{fr ? 'Chargement…' : 'Loading…'}</p>
          ) : (
            <OverviewTable
              overview={overview}
              lang={lang}
              hasTracked={tracked.length > 0}
              onReview={(s) =>
                act('', async () => {
                  setReviewing({ row: s, subs: await loadStudentSubmissions(s.id) });
                })
              }
              onMessage={(s) => {
                setWritingTo(s);
                setDraft('');
              }}
              onReportAge={(s) => {
                if (!window.confirm(fr ? `Signaler ${s.name} à l'administrateur comme possiblement âgé(e) de moins de 12 ans ? Il examinera le compte.` : `Report ${s.name} to the administrator as possibly under 12? They will review the account.`)) return;
                void (async () => {
                  const r = await reportUnderage(s.id, fr ? 'Signalé par le professeur (semble avoir moins de 12 ans)' : 'Reported by teacher (seems under 12)');
                  const msg: Record<string, string> = {
                    ok: fr ? 'Signalement envoyé à l’administrateur.' : 'Report sent to the administrator.',
                    already: fr ? 'Déjà signalé : en attente d’examen.' : 'Already reported: awaiting review.',
                    child_account: fr ? 'C’est un compte enfant supervisé par un adulte : rien à signaler.' : 'This is a supervised child account: nothing to report.',
                  };
                  setNote({ kind: r === 'ok' || r === 'already' || r === 'child_account' ? 'ok' : 'error', text: msg[r] ?? (fr ? 'Signalement impossible pour le moment.' : 'Report not possible right now.') });
                })();
              }}
              onRemove={(s) => {
                if (window.confirm(fr ? `Retirer ${s.name} de la classe ?` : `Remove ${s.name} from the class?`)) act(fr ? 'Élève retiré.' : 'Student removed.', () => removeStudent(cls.id, s.id));
              }}
            />
          )}

          {reviewing && (
            <SubmissionsView
              studentName={reviewing.row.name}
              submissions={reviewing.subs}
              lang={lang}
              onClose={() => setReviewing(null)}
              onComment={(sub) => {
                setWritingTo(reviewing.row);
                setDraft(withExercisePrefix(sub.exercise_label));
              }}
            />
          )}

          {writingTo && (
            <form
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                act(fr ? 'Message envoyé.' : 'Message sent.', async () => {
                  await sendMessage(cls.id, user.id, writingTo.id, draft);
                  setWritingTo(null);
                  setDraft('');
                });
              }}
            >
              <label className="text-xs font-bold text-slate-800" htmlFor={`msg-${cls.id}`}>
                {fr ? `Message pour ${writingTo.name}` : `Message for ${writingTo.name}`}
              </label>
              <textarea id={`msg-${cls.id}`} className={inputCls} rows={3} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={fr ? 'Ex : Bon début ! Reprends la leçon 3, tu y es presque.' : 'E.g. Good start! Go back to lesson 3, you are almost there.'} />
              <div className="flex gap-2">
                <button type="submit" className={btnCls}>
                  {fr ? 'Envoyer' : 'Send'}
                </button>
                <button type="button" className={btnCls} onClick={() => setWritingTo(null)}>
                  {fr ? 'Annuler' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
};
