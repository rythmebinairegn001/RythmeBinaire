import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Code2,
  Sparkles,
} from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { PublicCourseItem } from '../../data/coursesData';
import { DetailedLesson, getCourseLessonsList } from '../../data/lessonsData';
import { StudentCourseProgress } from '../../services/studentService';

interface Props {
  course: PublicCourseItem;
  lesson: DetailedLesson;
  user: UserProfile;
  lang: PreferredLanguage;
  progress: StudentCourseProgress | null;
  onBackToCourse: () => void;
  onNavigateLesson: (courseId: string, lessonId: string) => void;
  onMarkCompleted: (courseId: string, lessonId: string) => Promise<void>;
  onOpenExercise?: (courseId: string, lessonId: string) => void;
}

export const StudentLessonPage: React.FC<Props> = ({
  course,
  lesson,
  lang,
  progress,
  onBackToCourse,
  onNavigateLesson,
  onMarkCompleted,
  onOpenExercise,
}) => {
  const t = getTranslation(lang);
  const [marking, setMarking] = useState(false);

  // Content translation with automatic fallback to FR
  const translation = lesson.translations[lang] || lesson.translations.fr;
  const courseTranslation = course.translations[lang] || course.translations.fr;

  const isCompleted = progress?.completedLessonIds.includes(lesson.id) ?? false;

  // Retrieve sequential lessons
  const allCourseLessons = getCourseLessonsList(course.id);
  const currentIndex = allCourseLessons.findIndex((l) => l.id === lesson.id);

  const prevLesson = currentIndex > 0 ? allCourseLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allCourseLessons.length - 1
      ? allCourseLessons[currentIndex + 1]
      : null;

  const handleToggleComplete = async () => {
    try {
      setMarking(true);
      await onMarkCompleted(course.id, lesson.id);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      id="student-lesson-page"
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="btn-back-to-course-from-lesson"
          type="button"
          onClick={onBackToCourse}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {t.student.backToCourse} : {courseTranslation.title}
          </span>
        </button>

        {/* Lesson counter badge */}
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-[var(--color-text-muted)]">
          Leçon {currentIndex + 1} / {allCourseLessons.length}
        </span>
      </div>

      {/* Main Lesson Reader Card */}
      <article className="bg-[var(--color-card-bg)] rounded-3xl border border-[var(--color-card-border)] shadow-sm overflow-hidden">
        {/* Lesson Header */}
        <div className="p-6 sm:p-8 bg-[var(--color-bg-app)]/60 border-b border-[var(--color-card-border)] space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-[var(--color-accent-blue)] border border-blue-500/20">
              Module {lesson.moduleId.split('-').pop()} • Leçon {lesson.position}
            </span>

            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>{t.student.lessonStatusCompleted}</span>
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-main)] leading-snug">
            {translation.title}
          </h1>
        </div>

        {/* Lesson Formatted Markdown Content */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="markdown-content text-[var(--color-text-main)] leading-relaxed text-sm sm:text-base space-y-4">
            <Markdown>{translation.content}</Markdown>
          </div>

          {/* If lesson has code exercise, prompt action */}
          {lesson.exercise && (
            <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                  <Code2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>
                    {t.student.exerciseNoticeTitle} ({lesson.exercise.language.toUpperCase()})
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-900 dark:text-amber-300">
                  Pratique
                </span>
              </div>

              <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                {lesson.exercise.instructions[lang] || lesson.exercise.instructions.fr}
              </p>

              {/* Bouton "Faire l'exercice" */}
              <div className="pt-2">
                <button
                  id="btn-do-exercise"
                  type="button"
                  onClick={() => onOpenExercise && onOpenExercise(course.id, lesson.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>{t.student.doExerciseBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-5 sm:p-6 bg-[var(--color-bg-app)]/50 border-t border-[var(--color-card-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Mark as completed Button */}
          <button
            id="btn-mark-lesson-completed"
            type="button"
            disabled={marking}
            onClick={handleToggleComplete}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50 ${
              isCompleted
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? t.student.completedMarked : t.student.markAsCompleted}</span>
          </button>

          {/* Navigation Previous / Next Lesson */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <button
              id="btn-prev-lesson"
              type="button"
              disabled={!prevLesson}
              onClick={() => prevLesson && onNavigateLesson(course.id, prevLesson.id)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] text-xs font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t.student.prevLesson}</span>
            </button>

            <button
              id="btn-next-lesson"
              type="button"
              disabled={!nextLesson}
              onClick={() => nextLesson && onNavigateLesson(course.id, nextLesson.id)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] text-xs font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-app)] disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <span>{t.student.nextLesson}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};
