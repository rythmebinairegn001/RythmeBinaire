import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Code2,
  Globe2,
} from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { PublicCourseItem } from '../../data/coursesData';
import { DETAILED_COURSE_MODULES } from '../../data/lessonsData';
import { StudentCourseProgress } from '../../services/studentService';

interface Props {
  course: PublicCourseItem;
  user: UserProfile;
  lang: PreferredLanguage;
  progress: StudentCourseProgress | null;
  onBack: () => void;
  onEnroll: (courseId: string) => Promise<void>;
  onSelectLesson: (courseId: string, lessonId: string) => void;
  onOpenExercise?: (courseId: string, lessonId: string) => void;
}

export const StudentCoursePage: React.FC<Props> = ({
  course,
  lang,
  progress,
  onBack,
  onEnroll,
  onSelectLesson,
  onOpenExercise,
}) => {
  const t = getTranslation(lang);
  const [enrolling, setEnrolling] = useState(false);

  const translation = course.translations[lang] || course.translations.fr;
  const isEnrolled = !!progress;
  const isCoder = course.track === 'coder';

  const completedLessonIds = new Set(progress?.completedLessonIds || []);
  const rawModules = DETAILED_COURSE_MODULES[course.id] || [];
  // Sort modules by position
  const sortedModules = [...rawModules].sort((a, b) => a.position - b.position);

  // Total lessons count
  const allLessons = sortedModules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedLessonIds.has(l.id)).length;
  const progressPercent = isEnrolled
    ? (progress?.progressPercent ?? Math.round((completedCount / (totalLessons || 1)) * 100))
    : 0;

  const handleEnrollClick = async () => {
    try {
      setEnrolling(true);
      await onEnroll(course.id);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div id="student-course-page" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        id="btn-back-from-course"
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.student.backToDashboard}</span>
      </button>

      {/* Course Overview Card */}
      <div className="bg-[var(--color-card-bg)] rounded-3xl p-6 sm:p-8 border border-[var(--color-card-border)] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isCoder
                    ? 'bg-blue-500/10 text-[var(--color-accent-blue)] border border-blue-500/20'
                    : 'bg-emerald-500/10 text-[var(--color-accent-green)] border border-emerald-500/20'
                }`}
              >
                {isCoder ? <Code2 className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                <span>{isCoder ? 'Coder' : 'Culture Numérique'}</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-app)] text-[var(--color-text-muted)] border border-[var(--color-card-border)] capitalize">
                {course.level}
              </span>

              {isEnrolled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{t.student.enrolledBadge}</span>
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-main)] leading-snug">
              {translation.title}
            </h1>

            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              {translation.description || translation.summary}
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-[var(--color-text-muted)] font-medium">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>{sortedModules.length} modules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>{totalLessons} leçons</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>~{course.estimated_hours}h d’apprentissage</span>
              </div>
            </div>
          </div>

          {/* Action / Enrollment Box */}
          <div className="w-full md:w-72 shrink-0 p-5 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] space-y-4">
            {isEnrolled ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-muted)] font-medium">
                    {t.student.courseProgress}
                  </span>
                  <span className="font-bold text-[var(--color-text-main)] font-display">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)] block text-center font-medium">
                  {completedCount} sur {totalLessons} leçons terminées
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Inscrivez-vous gratuitement pour débloquer le suivi de vos leçons et le tuteur IA.
                </p>
                <button
                  id="btn-course-enroll-now"
                  type="button"
                  disabled={enrolling}
                  onClick={handleEnrollClick}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#BEF264]" />
                  <span>{enrolling ? 'Inscription...' : t.student.enrollCourseBtn}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modules and Lessons Ordered List */}
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)]">
            {t.student.modulesAndLessons}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Progressez à votre rythme à travers le programme officiel RythmeBinaireGn.
          </p>
        </div>

        <div className="space-y-4">
          {sortedModules.map((module) => {
            const moduleTrans = module.translations[lang] || module.translations.fr;
            const sortedLessons = [...module.lessons].sort((a, b) => a.position - b.position);

            return (
              <div
                key={module.id}
                id={`course-module-card-${module.id}`}
                className="bg-[var(--color-card-bg)] rounded-3xl border border-[var(--color-card-border)] overflow-hidden shadow-2xs"
              >
                {/* Module Header */}
                <div className="p-4 sm:p-5 bg-[var(--color-bg-app)]/60 border-b border-[var(--color-card-border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-mono font-bold flex items-center justify-center text-[var(--color-text-main)]">
                      {module.position}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-[var(--color-text-main)]">
                      {moduleTrans.title}
                    </h3>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] font-medium">
                    {sortedLessons.length} leçons
                  </span>
                </div>

                {/* Lessons in this module, ordered by position */}
                <div className="divide-y divide-[var(--color-card-border)]">
                  {sortedLessons.map((lesson) => {
                    const lessonTrans = lesson.translations[lang] || lesson.translations.fr;
                    const isCompleted = completedLessonIds.has(lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        id={`course-lesson-row-${lesson.id}`}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--color-bg-app)]/50 transition cursor-pointer group"
                        onClick={() => onSelectLesson(course.id, lesson.id)}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Visual completion indicator */}
                          <div className="shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-semibold text-[var(--color-text-muted)]">
                                {module.position}.{lesson.position}
                              </span>
                              {lesson.exercise && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {t.student.lessonHasExercise}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-accent-blue)] transition truncate">
                              {lessonTrans.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {lesson.exercise && onOpenExercise && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenExercise(course.id, lesson.id);
                              }}
                              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 transition"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>{t.student.doExerciseBtn}</span>
                            </button>
                          )}

                          <span
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-[var(--color-bg-app)] text-[var(--color-text-muted)] border border-[var(--color-card-border)]'
                            }`}
                          >
                            {isCompleted ? t.student.lessonStatusCompleted : t.student.lessonStatusPending}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[var(--color-text-main)] group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
