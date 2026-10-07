import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Check, Globe2, BookOpen, Clock } from 'lucide-react';
import { PublicCourseItem } from '../../data/coursesData';
import { CourseTrack, CourseStatus, PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  isOpen: boolean;
  course: PublicCourseItem | null; // null means create new
  lang: PreferredLanguage;
  onClose: () => void;
  onSave: (course: PublicCourseItem) => Promise<void>;
}

export const CourseModal: React.FC<Props> = ({
  isOpen,
  course,
  lang,
  onClose,
  onSave,
}) => {
  const t = getTranslation(lang);
  const [activeTab, setActiveTab] = useState<'fr' | 'en'>('fr');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [track, setTrack] = useState<CourseTrack>('coder');
  const [level, setLevel] = useState<string>('debutant');
  const [status, setStatus] = useState<CourseStatus>('published');
  const [estimatedHours, setEstimatedHours] = useState<number>(10);

  // French translations (mandatory)
  const [titleFr, setTitleFr] = useState('');
  const [summaryFr, setSummaryFr] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');

  // English translations (optional)
  const [titleEn, setTitleEn] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');

  useEffect(() => {
    if (course) {
      setTrack(course.track);
      setLevel(course.level);
      setStatus(course.status);
      setEstimatedHours(course.estimated_hours || 10);

      setTitleFr(course.translations.fr.title || '');
      setSummaryFr(course.translations.fr.summary || '');
      setDescriptionFr(course.translations.fr.description || '');

      setTitleEn(course.translations.en?.title || '');
      setSummaryEn(course.translations.en?.summary || '');
      setDescriptionEn(course.translations.en?.description || '');
    } else {
      // Default new course
      setTrack('coder');
      setLevel('debutant');
      setStatus('published');
      setEstimatedHours(8);

      setTitleFr('');
      setSummaryFr('');
      setDescriptionFr('');

      setTitleEn('');
      setSummaryEn('');
      setDescriptionEn('');
    }
    setActiveTab('fr');
    setErrorMsg(null);
  }, [course, isOpen]);

  if (!isOpen) return null;

  // Check if EN is partially filled or completely empty
  const isEnEmpty = !titleEn.trim() && !summaryEn.trim() && !descriptionEn.trim();
  const isEnPartiallyFilled = !isEnEmpty && (!titleEn.trim() || !summaryEn.trim() || !descriptionEn.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFr.trim()) {
      setErrorMsg(lang === 'fr' ? 'Le titre en français est obligatoire.' : 'French title is mandatory.');
      setActiveTab('fr');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const courseId = course?.id || `course-${track}-${Date.now().toString(36)}`;
      const newCourse: PublicCourseItem = {
        id: courseId,
        track,
        level,
        status,
        created_at: course?.created_at || new Date().toISOString(),
        estimated_hours: Number(estimatedHours) || 8,
        translations: {
          fr: {
            title: titleFr.trim(),
            summary: summaryFr.trim(),
            description: descriptionFr.trim(),
          },
          en: {
            title: titleEn.trim(),
            summary: summaryEn.trim(),
            description: descriptionEn.trim(),
          },
        },
        modules: course?.modules || [],
      };

      await onSave(newCourse);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="course-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="course-modal-dialog"
        className="bg-[var(--color-card-bg)] text-[var(--color-text-main)] w-full max-w-3xl rounded-3xl shadow-2xl border border-[var(--color-card-border)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-card-border)] bg-[var(--color-bg-app)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {course ? t.admin.courseFormTitleEdit : t.admin.courseFormTitleNew}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {course ? `ID: ${course.id}` : 'Nouveau cours officiel'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-course-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* General Metadata Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)]">
            {/* Track */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t.admin.trackLabel}
              </label>
              <select
                id="select-course-track"
                value={track}
                onChange={(e) => setTrack(e.target.value as CourseTrack)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
              >
                <option value="coder">Coder</option>
                <option value="culture_numerique">Culture Numérique</option>
              </select>
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t.admin.levelLabel}
              </label>
              <select
                id="select-course-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
              >
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="avance">Avancé</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t.admin.statusLabel}
              </label>
              <select
                id="select-course-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CourseStatus)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
              >
                <option value="published">Publié (En ligne)</option>
                <option value="draft">Brouillon (Non visible aux élèves)</option>
              </select>
            </div>

            {/* Estimated Hours */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t.admin.hoursLabel}
              </label>
              <input
                id="input-course-hours"
                type="number"
                min={1}
                max={100}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
              />
            </div>
          </div>

          {/* Bilingual Tabs Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-card-border)] pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="tab-btn-course-fr"
                  onClick={() => setActiveTab('fr')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    activeTab === 'fr'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>🇫🇷 {t.admin.tabFr}</span>
                  {titleFr.trim() && <Check className="w-3.5 h-3.5 text-blue-200" />}
                </button>

                <button
                  type="button"
                  id="tab-btn-course-en"
                  onClick={() => setActiveTab('en')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
                    activeTab === 'en'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>🇬🇧 {t.admin.tabEn}</span>
                  {isEnEmpty ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Non traduit" />
                  ) : isEnPartiallyFilled ? (
                    <span className="w-2 h-2 rounded-full bg-orange-400" title="Partiellement traduit" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-purple-200" />
                  )}
                </button>
              </div>

              {/* Informative notice regarding publishing FR alone */}
              <span className="hidden sm:inline-block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ {t.admin.publishAloneNotice}
              </span>
            </div>

            {/* TAB CONTENT: FR (MANDATORY) */}
            {activeTab === 'fr' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)] flex items-center justify-between">
                    <span>{t.admin.fieldTitle} (FR) *</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Requis</span>
                  </label>
                  <input
                    id="input-course-title-fr"
                    type="text"
                    required
                    placeholder="Ex: Python : De la syntaxe aux algorithmes concrets"
                    value={titleFr}
                    onChange={(e) => setTitleFr(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    {t.admin.fieldSummary} (FR)
                  </label>
                  <input
                    id="input-course-summary-fr"
                    type="text"
                    placeholder="Ex: Écrivez vos premiers scripts, manipulez des données et construisez de mini-projets concrets."
                    value={summaryFr}
                    onChange={(e) => setSummaryFr(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    {t.admin.fieldDescription} (FR)
                  </label>
                  <textarea
                    id="input-course-description-fr"
                    rows={4}
                    placeholder="Description complète pour la page de détail..."
                    value={descriptionFr}
                    onChange={(e) => setDescriptionFr(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] resize-y"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: EN (OPTIONAL TRANSLATION) */}
            {activeTab === 'en' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {lang === 'fr'
                      ? "Si vous laissez ces champs vides, un badge 'Traduction EN manquante' apparaîtra dans l'administration, mais le cours reste parfaitement fonctionnel et publiable en français."
                      : "If you leave these fields empty, a 'Missing EN Translation' badge will appear in the dashboard, but the course remains fully publishable in French."}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)] flex items-center justify-between">
                    <span>{t.admin.fieldTitle} (EN)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optionnel</span>
                  </label>
                  <input
                    id="input-course-title-en"
                    type="text"
                    placeholder="e.g. Python: From syntax to concrete algorithms"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    {t.admin.fieldSummary} (EN)
                  </label>
                  <input
                    id="input-course-summary-en"
                    type="text"
                    placeholder="e.g. Write your first scripts, manipulate data, and build real-world micro-projects."
                    value={summaryEn}
                    onChange={(e) => setSummaryEn(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    {t.admin.fieldDescription} (EN)
                  </label>
                  <textarea
                    id="input-course-description-en"
                    rows={4}
                    placeholder="Detailed description for the course..."
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[var(--color-card-border)] flex items-center justify-end gap-3">
            <button
              id="btn-cancel-course-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-card-border)] text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] transition"
            >
              {t.admin.cancel}
            </button>
            <button
              id="btn-save-course-modal"
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t.admin.saveCourse}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
