import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Code2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  BookOpen,
  FileText,
} from 'lucide-react';
import { DetailedModule, DetailedLesson } from '../../data/lessonsData';
import { PublicCourseItem } from '../../data/coursesData';
import { ExerciseTest, PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import {
  getCourseModulesAdmin,
  saveCourseModulesAdmin,
  isModuleMissingEn,
  isLessonMissingEn,
} from '../../services/adminService';
import { ExerciseModal } from './ExerciseModal';

interface Props {
  course: PublicCourseItem;
  lang: PreferredLanguage;
  onBack: () => void;
  onCourseUpdated?: () => void;
}

export const ModulesManager: React.FC<Props> = ({
  course,
  lang,
  onBack,
  onCourseUpdated,
}) => {
  const t = getTranslation(lang);
  const [modules, setModules] = useState<DetailedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Module modal edit state
  const [editingModule, setEditingModule] = useState<{
    id: string | null; // null = create new
    titleFr: string;
    titleEn: string;
  } | null>(null);
  const [moduleModalTab, setModuleModalTab] = useState<'fr' | 'en'>('fr');

  // Lesson modal edit state
  const [editingLesson, setEditingLesson] = useState<{
    moduleId: string;
    lessonId: string | null; // null = create new
    titleFr: string;
    titleEn: string;
    contentFr: string;
    contentEn: string;
    position: number;
    exercise?: DetailedLesson['exercise'];
  } | null>(null);
  const [lessonModalTab, setLessonModalTab] = useState<'fr' | 'en'>('fr');

  // Exercise modal state
  const [exerciseModalLesson, setExerciseModalLesson] = useState<DetailedLesson | null>(null);

  useEffect(() => {
    loadModules();
  }, [course.id]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await getCourseModulesAdmin(course.id);
      setModules(data);
    } finally {
      setLoading(false);
    }
  };

  // Renvoie null si tout est enregistré, sinon le message d'erreur (affiché à l'admin)
  const handleSaveModules = async (updated: DetailedModule[]): Promise<string | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveCourseModulesAdmin(course.id, updated);
      setModules(updated);
      setNotice('Modifications enregistrées');
      setTimeout(() => setNotice(null), 3000);
      if (onCourseUpdated) onCourseUpdated();
      return null;
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "L'enregistrement a échoué.";
      setSaveError(msg);
      return msg;
    } finally {
      setSaving(false);
    }
  };

  // Reorder modules
  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const copy = [...modules];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    handleSaveModules(copy);
  };

  // Delete module
  const handleDeleteModule = (moduleId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce module et toutes ses leçons ?')) return;
    const filtered = modules.filter((m) => m.id !== moduleId);
    handleSaveModules(filtered);
  };

  // Reorder lessons
  const handleMoveLesson = (moduleId: string, lessonIndex: number, direction: 'up' | 'down') => {
    const mIdx = modules.findIndex((m) => m.id === moduleId);
    if (mIdx === -1) return;

    const module = modules[mIdx];
    const targetIdx = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIdx < 0 || targetIdx >= module.lessons.length) return;

    const lessonsCopy = [...module.lessons];
    const temp = lessonsCopy[lessonIndex];
    lessonsCopy[lessonIndex] = lessonsCopy[targetIdx];
    lessonsCopy[targetIdx] = temp;

    const copyModules = [...modules];
    copyModules[mIdx] = {
      ...module,
      lessons: lessonsCopy,
    };

    handleSaveModules(copyModules);
  };

  // Delete lesson
  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    if (!window.confirm('Supprimer cette leçon ?')) return;
    const mIdx = modules.findIndex((m) => m.id === moduleId);
    if (mIdx === -1) return;

    const copyModules = [...modules];
    copyModules[mIdx] = {
      ...copyModules[mIdx],
      lessons: copyModules[mIdx].lessons.filter((l) => l.id !== lessonId),
    };

    handleSaveModules(copyModules);
  };

  // Save module title (FR / EN)
  const handleSaveModuleModal = () => {
    if (!editingModule || !editingModule.titleFr.trim()) return;

    if (editingModule.id) {
      // Edit existing
      const updated = modules.map((m) => {
        if (m.id === editingModule.id) {
          return {
            ...m,
            translations: {
              fr: { title: editingModule.titleFr.trim() },
              en: { title: editingModule.titleEn.trim() },
            },
          };
        }
        return m;
      });
      handleSaveModules(updated);
    } else {
      // Create new
      const newModule: DetailedModule = {
        id: `mod-${course.id}-${Date.now().toString(36)}`,
        courseId: course.id,
        position: modules.length + 1,
        translations: {
          fr: { title: editingModule.titleFr.trim() },
          en: { title: editingModule.titleEn.trim() },
        },
        lessons: [],
      };
      handleSaveModules([...modules, newModule]);
    }

    setEditingModule(null);
  };

  // Save lesson (FR / EN title & content)
  const handleSaveLessonModal = () => {
    if (!editingLesson || !editingLesson.titleFr.trim()) return;

    const mIdx = modules.findIndex((m) => m.id === editingLesson.moduleId);
    if (mIdx === -1) return;

    const copyModules = [...modules];
    const targetModule = copyModules[mIdx];

    if (editingLesson.lessonId) {
      // Edit existing lesson
      targetModule.lessons = targetModule.lessons.map((l) => {
        if (l.id === editingLesson.lessonId) {
          return {
            ...l,
            translations: {
              fr: {
                title: editingLesson.titleFr.trim(),
                content: editingLesson.contentFr.trim(),
              },
              en: {
                title: editingLesson.titleEn.trim(),
                content: editingLesson.contentEn.trim(),
              },
            },
          };
        }
        return l;
      });
    } else {
      // Create new lesson
      const newLesson: DetailedLesson = {
        id: `les-${course.id}-${Date.now().toString(36)}`,
        moduleId: editingLesson.moduleId,
        courseId: course.id,
        position: targetModule.lessons.length + 1,
        translations: {
          fr: {
            title: editingLesson.titleFr.trim(),
            content: editingLesson.contentFr.trim(),
          },
          en: {
            title: editingLesson.titleEn.trim(),
            content: editingLesson.contentEn.trim(),
          },
        },
      };
      targetModule.lessons.push(newLesson);
    }

    handleSaveModules(copyModules);
    setEditingLesson(null);
  };

  // Update exercise for lesson
  const handleSaveExerciseForLesson = async (
    updatedExercise: DetailedLesson['exercise'] | undefined,
    _updatedTests: ExerciseTest[]
  ) => {
    if (!exerciseModalLesson) return;

    const updated = modules.map((m) => {
      return {
        ...m,
        lessons: m.lessons.map((l) => {
          if (l.id === exerciseModalLesson.id) {
            return {
              ...l,
              exercise: updatedExercise,
            };
          }
          return l;
        }),
      };
    });

    const err = await handleSaveModules(updated);
    if (err) throw new Error(err);
    setExerciseModalLesson(null);
  };

  return (
    <div id="modules-manager-view" className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-card-border)]">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-courses"
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {course.track}
              </span>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[var(--color-text-main)]">
                {course.translations[lang]?.title || course.translations.fr.title}
              </h1>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {t.admin.modulesTitle} • {modules.length} modules,{' '}
              {modules.reduce((acc, m) => acc + m.lessons.length, 0)} leçons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-red-600 dark:text-red-400 font-semibold max-w-xs">
              ⚠ {saveError}
            </span>
          )}
          {notice && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
              ✓ {notice}
            </span>
          )}
          <button
            id="btn-add-module"
            type="button"
            onClick={() => {
              setEditingModule({
                id: null,
                titleFr: '',
                titleEn: '',
              });
              setModuleModalTab('fr');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.admin.addModuleBtn}</span>
          </button>
        </div>
      </div>

      {/* Modules List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span>Chargement des modules...</span>
        </div>
      ) : modules.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">
            Aucun module dans ce cours
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
            Commencez par créer le premier module pour structurer l'apprentissage.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {modules.map((module, mIdx) => {
            const moduleMissingEn = isModuleMissingEn(module);

            return (
              <div
                key={module.id}
                id={`module-card-${module.id}`}
                className="bg-[var(--color-card-bg)] rounded-3xl border border-[var(--color-card-border)] shadow-xs overflow-hidden"
              >
                {/* Module Header Bar */}
                <div className="p-4 sm:p-5 bg-[var(--color-bg-app)]/70 border-b border-[var(--color-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        Module {mIdx + 1}
                      </span>

                      {moduleMissingEn ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {t.admin.missingEnBadge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {t.admin.completeEnBadge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-main)]">
                      {module.translations.fr.title}
                    </h3>
                    {module.translations.en?.title && (
                      <p className="text-xs text-[var(--color-text-muted)] italic">
                        🇬🇧 {module.translations.en.title}
                      </p>
                    )}
                  </div>

                  {/* Module Action Controls */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {/* Move up */}
                    <button
                      type="button"
                      disabled={mIdx === 0}
                      onClick={() => handleMoveModule(mIdx, 'up')}
                      className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] disabled:opacity-30 transition"
                      title={t.admin.moveUp}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move down */}
                    <button
                      type="button"
                      disabled={mIdx === modules.length - 1}
                      onClick={() => handleMoveModule(mIdx, 'down')}
                      className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] disabled:opacity-30 transition"
                      title={t.admin.moveDown}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit module */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingModule({
                          id: module.id,
                          titleFr: module.translations.fr.title,
                          titleEn: module.translations.en?.title || '',
                        });
                        setModuleModalTab('fr');
                      }}
                      className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
                      title={t.admin.editModuleBtn}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete module */}
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(module.id)}
                      className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-red-500/10 text-red-500 transition"
                      title={t.admin.deleteModuleBtn}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Add lesson button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLesson({
                          moduleId: module.id,
                          lessonId: null,
                          titleFr: '',
                          titleEn: '',
                          contentFr: '',
                          contentEn: '',
                          position: module.lessons.length + 1,
                        });
                        setLessonModalTab('fr');
                      }}
                      className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.admin.addLessonBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Lessons in this Module */}
                <div className="p-4 sm:p-5 space-y-3">
                  {module.lessons.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] italic py-2">
                      Aucune leçon dans ce module. Cliquez sur "Ajouter une leçon".
                    </p>
                  ) : (
                    module.lessons.map((lesson, lIdx) => {
                      const lessonMissingEn = isLessonMissingEn(lesson);

                      return (
                        <div
                          key={lesson.id}
                          id={`lesson-row-${lesson.id}`}
                          className="p-3.5 rounded-2xl bg-[var(--color-bg-app)]/50 border border-[var(--color-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[var(--color-text-muted)]">
                                {mIdx + 1}.{lIdx + 1}
                              </span>
                              <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-text-main)]">
                                {lesson.translations.fr.title}
                              </h4>

                              {lessonMissingEn ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  EN manquant
                                </span>
                              ) : null}

                              {lesson.exercise ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                  <Code2 className="w-3 h-3" />
                                  <span>{lesson.exercise.language}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">
                                  Théorie
                                </span>
                              )}
                            </div>

                            {lesson.translations.en?.title && (
                              <p className="text-[11px] text-[var(--color-text-muted)] italic ml-5">
                                🇬🇧 {lesson.translations.en.title}
                              </p>
                            )}
                          </div>

                          {/* Lesson Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {/* Manage Exercise button */}
                            <button
                              type="button"
                              id={`btn-manage-exercise-${lesson.id}`}
                              onClick={() => setExerciseModalLesson(lesson)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                lesson.exercise
                                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                  : 'bg-[var(--color-card-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-card-border)]'
                              }`}
                            >
                              <Code2 className="w-3.5 h-3.5" />
                              <span>{lesson.exercise ? 'Modifier exercice' : 'Ajouter exercice'}</span>
                            </button>

                            {/* Move up */}
                            <button
                              type="button"
                              disabled={lIdx === 0}
                              onClick={() => handleMoveLesson(module.id, lIdx, 'up')}
                              className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] disabled:opacity-30 transition"
                              title={t.admin.moveUp}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move down */}
                            <button
                              type="button"
                              disabled={lIdx === module.lessons.length - 1}
                              onClick={() => handleMoveLesson(module.id, lIdx, 'down')}
                              className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] disabled:opacity-30 transition"
                              title={t.admin.moveDown}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit lesson */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLesson({
                                  moduleId: module.id,
                                  lessonId: lesson.id,
                                  titleFr: lesson.translations.fr.title,
                                  titleEn: lesson.translations.en?.title || '',
                                  contentFr: lesson.translations.fr.content || '',
                                  contentEn: lesson.translations.en?.content || '',
                                  position: lesson.position,
                                  exercise: lesson.exercise,
                                });
                                setLessonModalTab('fr');
                              }}
                              className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
                              title={t.admin.editLessonBtn}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete lesson */}
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                              className="p-1.5 rounded-lg border border-[var(--color-card-border)] hover:bg-red-500/10 text-red-500 transition"
                              title={t.admin.deleteLessonBtn}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: EDIT / CREATE MODULE */}
      {editingModule && (
        <div
          id="module-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setEditingModule(null)}
        >
          <div
            id="module-modal-dialog"
            className="bg-[var(--color-card-bg)] text-[var(--color-text-main)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--color-card-border)] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-card-border)] pb-3">
              <h3 className="text-base font-bold">
                {editingModule.id ? t.admin.editModuleBtn : t.admin.addModuleBtn}
              </h3>
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--color-text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FR / EN Tabs */}
            <div className="flex items-center gap-2 border-b border-[var(--color-card-border)] pb-2">
              <button
                type="button"
                onClick={() => setModuleModalTab('fr')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  moduleModalTab === 'fr'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)]'
                }`}
              >
                🇫🇷 {t.admin.tabFr}
              </button>
              <button
                type="button"
                onClick={() => setModuleModalTab('en')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  moduleModalTab === 'en'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)]'
                }`}
              >
                🇬🇧 {t.admin.tabEn}
              </button>
            </div>

            {moduleModalTab === 'fr' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-main)]">
                  Titre du module (FR) *
                </label>
                <input
                  type="text"
                  required
                  value={editingModule.titleFr}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, titleFr: e.target.value })
                  }
                  placeholder="Ex: Module 1 : Variables et Conditions"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-main)]">
                  Module Title (EN) - Optionnel
                </label>
                <input
                  type="text"
                  value={editingModule.titleEn}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, titleEn: e.target.value })
                  }
                  placeholder="e.g. Module 1: Variables and Conditions"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-card-border)]">
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="px-3.5 py-2 rounded-xl border border-[var(--color-card-border)] text-xs font-semibold"
              >
                {t.admin.cancel}
              </button>
              <button
                type="button"
                disabled={!editingModule.titleFr.trim()}
                onClick={handleSaveModuleModal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-40"
              >
                Enregistrer le module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CREATE LESSON */}
      {editingLesson && (
        <div
          id="lesson-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setEditingLesson(null)}
        >
          <div
            id="lesson-modal-dialog"
            className="bg-[var(--color-card-bg)] text-[var(--color-text-main)] w-full max-w-2xl rounded-3xl shadow-2xl border border-[var(--color-card-border)] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-card-border)] pb-3">
              <h3 className="text-base font-bold">
                {editingLesson.lessonId ? t.admin.editLessonBtn : t.admin.addLessonBtn}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--color-text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FR / EN Tabs */}
            <div className="flex items-center gap-2 border-b border-[var(--color-card-border)] pb-2">
              <button
                type="button"
                onClick={() => setLessonModalTab('fr')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lessonModalTab === 'fr'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)]'
                }`}
              >
                🇫🇷 {t.admin.tabFr}
              </button>
              <button
                type="button"
                onClick={() => setLessonModalTab('en')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  lessonModalTab === 'en'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)]'
                }`}
              >
                🇬🇧 {t.admin.tabEn}
              </button>
            </div>

            {lessonModalTab === 'fr' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    Titre de la leçon (FR) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLesson.titleFr}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, titleFr: e.target.value })
                    }
                    placeholder="Ex: Introduction aux boucles for"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    Contenu pédagogique (Markdown / FR)
                  </label>
                  <textarea
                    rows={8}
                    value={editingLesson.contentFr}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, contentFr: e.target.value })
                    }
                    placeholder="### Objectifs de la leçon&#10;&#10;Explications détaillées..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] resize-y"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    Lesson Title (EN) - Optionnel
                  </label>
                  <input
                    type="text"
                    value={editingLesson.titleEn}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, titleEn: e.target.value })
                    }
                    placeholder="e.g. Introduction to for loops"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-main)]">
                    Educational Content (Markdown / EN)
                  </label>
                  <textarea
                    rows={8}
                    value={editingLesson.contentEn}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, contentEn: e.target.value })
                    }
                    placeholder="### Lesson Goals&#10;&#10;Detailed explanations..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-card-border)]">
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="px-3.5 py-2 rounded-xl border border-[var(--color-card-border)] text-xs font-semibold"
              >
                {t.admin.cancel}
              </button>
              <button
                type="button"
                disabled={!editingLesson.titleFr.trim()}
                onClick={handleSaveLessonModal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-40"
              >
                Enregistrer la leçon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXERCISE CONFIG MODAL */}
      <ExerciseModal
        isOpen={Boolean(exerciseModalLesson)}
        lesson={exerciseModalLesson}
        lang={lang}
        onClose={() => setExerciseModalLesson(null)}
        onSaveExercise={handleSaveExerciseForLesson}
      />
    </div>
  );
};
