import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { PublicCourseItem } from '../../data/coursesData';
import { LearningPath, LearningPathInput, deletePath, listPaths, savePath } from '../../services/pathService';

const EMPTY: LearningPathInput = { title_fr: '', title_en: '', summary_fr: '', summary_en: '', course_ids: [], position: 0, published: false };
const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900';
const btnCls = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 disabled:opacity-50';

/** Admin : créer des parcours (suites de cours dans l'ordre) et les publier. */
export const PathsManager: React.FC<{ lang: PreferredLanguage; courses: PublicCourseItem[] }> = ({ lang, courses }) => {
  const fr = lang === 'fr';
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<LearningPathInput>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPaths(await listPaths(false));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.translations[lang]?.title || id;
  const set = <K extends keyof LearningPathInput>(k: K, v: LearningPathInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCourse = (id: string) => set('course_ids', form.course_ids.includes(id) ? form.course_ids.filter((x) => x !== id) : [...form.course_ids, id]);
  const move = (i: number, d: -1 | 1) => {
    const a = [...form.course_ids];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set('course_ids', a);
  };

  const submit = async () => {
    if (!form.title_fr.trim() || !form.title_en.trim()) return setMsg(fr ? 'Le titre est obligatoire en français ET en anglais.' : 'The title is required in French AND English.');
    if (form.course_ids.length < 2) return setMsg(fr ? 'Choisis au moins 2 cours.' : 'Pick at least 2 courses.');
    setBusy(true);
    try {
      await savePath(formFor === 'new' ? null : formFor, form);
      setFormFor(null);
      setMsg(null);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">{fr ? 'Parcours guidés' : 'Guided paths'}</h2>
          <p className="text-xs text-slate-600">{fr ? 'Une suite de cours avec un certificat à la fin.' : 'A series of courses with a certificate at the end.'}</p>
        </div>
        <button type="button" className={btnCls} onClick={() => { setForm({ ...EMPTY, position: paths.length }); setFormFor('new'); setMsg(null); }}>
          <Plus className="w-3.5 h-3.5" /> {fr ? 'Nouveau parcours' : 'New path'}
        </button>
      </div>
      {loadError && (
        <p className="text-sm text-red-700">
          {fr ? 'Impossible de charger les parcours. As-tu lancé le script parcours.sql ? ' : 'Could not load paths. Did you run parcours.sql? '}({loadError})
        </p>
      )}
      {msg && <p role="status" className="text-sm text-red-700">{msg}</p>}

      {formFor && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Titre (FR)" value={form.title_fr} onChange={(e) => set('title_fr', e.target.value)} />
            <input className={inputCls} placeholder="Title (EN)" value={form.title_en} onChange={(e) => set('title_en', e.target.value)} />
            <textarea className={inputCls} rows={2} placeholder="Résumé (FR)" value={form.summary_fr} onChange={(e) => set('summary_fr', e.target.value)} />
            <textarea className={inputCls} rows={2} placeholder="Summary (EN)" value={form.summary_en} onChange={(e) => set('summary_en', e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">{fr ? 'Cours disponibles (coche pour ajouter)' : 'Available courses (tick to add)'}</p>
              <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs text-slate-800">
                    <input type="checkbox" checked={form.course_ids.includes(c.id)} onChange={() => toggleCourse(c.id)} />
                    {c.translations[lang]?.title || c.translations.fr.title}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">{fr ? 'Ordre du parcours' : 'Path order'}</p>
              <ol className="space-y-1">
                {form.course_ids.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
                    <span className="font-bold">{i + 1}.</span>
                    <span className="flex-1">{courseTitle(id)}</span>
                    <button type="button" aria-label="up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" aria-label="down" onClick={() => move(i, 1)} disabled={i === form.course_ids.length - 1}><ArrowDown className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-800">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
            {fr ? 'Publié (visible par les élèves et sur le site)' : 'Published (visible to students and on the site)'}
          </label>
          <div className="flex gap-2">
            <button type="button" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50" disabled={busy} onClick={submit}>
              {fr ? 'Enregistrer' : 'Save'}
            </button>
            <button type="button" className={btnCls} onClick={() => setFormFor(null)}>{fr ? 'Annuler' : 'Cancel'}</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {paths.map((p) => (
          <li key={p.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {fr ? p.title_fr : p.title_en}{' '}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {p.published ? (fr ? 'Publié' : 'Published') : fr ? 'Brouillon' : 'Draft'}
                </span>
              </p>
              <p className="text-xs text-slate-600">{p.course_ids.map(courseTitle).join(' → ')}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnCls} onClick={() => { const { id: _id, ...rest } = p; setForm(rest); setFormFor(p.id); setMsg(null); }}>{fr ? 'Modifier' : 'Edit'}</button>
              <button
                type="button"
                className={btnCls}
                aria-label={fr ? 'Supprimer' : 'Delete'}
                onClick={async () => {
                  if (!window.confirm(fr ? 'Supprimer ce parcours ? (les certificats déjà délivrés restent valables)' : 'Delete this path? (issued certificates stay valid)')) return;
                  try { await deletePath(p.id); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
        {!paths.length && !loadError && <li className="text-xs text-slate-500">{fr ? 'Aucun parcours pour le moment.' : 'No paths yet.'}</li>}
      </ul>
    </section>
  );
};
