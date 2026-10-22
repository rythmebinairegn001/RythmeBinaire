import { trackInfo } from '../../lib/tracks';
import React from 'react';
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  Code2,
  Globe2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { UserProfile, PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { PublicCourseItem } from '../../data/coursesData';
import { StudentCourseProgress } from '../../services/studentService';
import { DetailedLesson } from '../../data/lessonsData';
import { ProgressionPanel } from './ProgressionPanel';
import { ClassPanel } from './ClassPanel';
import { CertificatePanel } from './CertificatePanel';
import { TutoringPanel } from './TutoringPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { OfflinePanel } from './OfflinePanel';

interface Props {
  user: UserProfile;
  lang: PreferredLanguage;
  courses: PublicCourseItem[];
  enrollmentsProgress: StudentCourseProgress[];
  onContinueCourse: (courseId: string, targetLessonId?: string) => void;
  onOpenCourse: (courseId: string) => void;
  onBrowseCatalog: () => void;
  /** Ouvre l'espace Famille. Absent pour un compte enfant (il n'a pas de Famille). */
  onOpenFamily?: () => void;
  onOpenCommunity?: () => void;
  /** Ouvre l'espace professeur. Présent seulement pour un compte professeur. */
  onOpenTeacher?: () => void;
  /** Compte enfant supervisé : pas de panneau « Ma classe ». */
  isChildAccount?: boolean;
}

export const StudentDashboard: React.FC<Props> = ({
  user,
  lang,
  courses,
  enrollmentsProgress,
  onContinueCourse,
  onOpenCourse,
  onBrowseCatalog,
  onOpenFamily,
  onOpenCommunity,
  onOpenTeacher,
  isChildAccount,
}) => {
  const t = getTranslation(lang);

  // Map enrollments with course details
  const enrolledCourses = enrollmentsProgress.map((ep) => {
    const course = courses.find((c) => c.id === ep.courseId);
    return {
      progress: ep,
      course,
    };
  }).filter((item) => item.course !== undefined);

  // Aggregate stats
  const totalEnrolled = enrolledCourses.length;
  const avgProgress = totalEnrolled > 0
    ? Math.round(enrolledCourses.reduce((acc, curr) => acc + curr.progress.progressPercent, 0) / totalEnrolled)
    : 0;
  const totalCompletedLessons = enrollmentsProgress.reduce(
    (acc, curr) => acc + curr.completedLessonIds.length,
    0
  );

  return (
    <div id="student-dashboard" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">
      {/* 1. Header / Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#BEF264]/20 text-[#070D1E] dark:text-[#BEF264] border border-[#BEF264]/40">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{t.student.roleBadge}</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • {user.email}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {t.student.welcomePrefix}, {user.full_name || 'Élève'} 👋
            </h1>

            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {t.student.dashboardSubtitle}
            </p>
          </div>

          {onOpenFamily && (
            <button
              id="btn-open-family"
              type="button"
              onClick={onOpenFamily}
              className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition border border-emerald-200"
            >
              <span>{lang === 'fr' ? 'Famille : comptes enfants' : 'Family: child accounts'}</span>
            </button>
          )}

          {onOpenCommunity && (
            <button
              id="btn-open-community"
              type="button"
              onClick={onOpenCommunity}
              className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-semibold transition border border-sky-200"
            >
              <span>{lang === 'fr' ? 'Entraide' : 'Community help'}</span>
            </button>
          )}

          {onOpenTeacher && (
            <button
              id="btn-open-teacher"
              type="button"
              onClick={onOpenTeacher}
              className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <span>{lang === 'fr' ? 'Espace professeur' : 'Teacher space'}</span>
            </button>
          )}

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[100px]">
              <span className="text-xl sm:text-2xl font-bold font-display text-slate-900 block">
                {totalEnrolled}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Cours inscrits
              </span>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[100px]">
              <span className="text-xl sm:text-2xl font-bold font-display text-slate-900 block flex items-center justify-center gap-1">
                {avgProgress}%
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Progression moy.
              </span>
            </div>

            <div className="hidden sm:block px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[100px]">
              <span className="text-xl sm:text-2xl font-bold font-display text-slate-900 block">
                {totalCompletedLessons}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Leçons validées
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1a. Notifications (cachées s'il n'y en a pas) */}
      <NotificationsPanel userId={user.id} lang={lang} hasEmail={!isChildAccount} />

      <OfflinePanel lang={lang} />

      {/* 1b. Série de jours et badges */}
      <ProgressionPanel
        userId={user.id}
        lang={lang}
        coursesCompleted={enrollmentsProgress.filter((e) => e.totalLessonsCount > 0 && e.progressPercent >= 100).length}
      />

      {/* 1b2. Certificats (cours terminés à 100 %) */}
      <CertificatePanel
        user={user}
        lang={lang}
        courses={courses}
        completedCourseIds={enrollmentsProgress.filter((e) => e.totalLessonsCount > 0 && e.progressPercent >= 100).map((e) => e.courseId)}
      />

      {/* 1b3. Aide d'un professeur (visio ou question écrite) — caché pour un compte enfant */}
      <TutoringPanel userId={user.id} lang={lang} hidden={isChildAccount} />

      {/* 1c. Ma classe (code du professeur, messages) — caché pour un compte enfant */}
      <ClassPanel userId={user.id} lang={lang} hidden={isChildAccount} />

      {/* 2. Enrolled Courses Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              {t.student.myEnrollments}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t.student.myEnrollmentsDesc}
            </p>
          </div>

          <button
            id="btn-discover-more-courses"
            type="button"
            onClick={onBrowseCatalog}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold transition border border-slate-200 active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            <span>{t.student.discoverMoreCourses}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Courses List */}
        {enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {t.student.noEnrollmentsTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                {t.student.noEnrollmentsDesc}
              </p>
            </div>
            <button
              id="btn-empty-browse-catalog"
              type="button"
              onClick={onBrowseCatalog}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition shadow-md"
            >
              <span>{t.student.browseCatalogBtn}</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enrolledCourses.map(({ course, progress }) => {
              if (!course) return null;
              const translation = course.translations[lang] || course.translations.fr;
              const tr = trackInfo(course.track);
              const TrIcon = tr.icon;
              const nextLesson = progress.nextLesson;
              const nextLessonTitle = nextLesson
                ? (nextLesson.translations[lang]?.title || nextLesson.translations.fr.title)
                : null;
              const isComplete = progress.progressPercent >= 100;

              return (
                <div
                  key={course.id}
                  id={`student-enrolled-course-${course.id}`}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    {/* Track Badge & Level */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${tr.badge}`}
                      >
                        <TrIcon className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? tr.en : tr.fr}</span>
                      </span>

                      <span className="text-xs font-semibold text-slate-500 capitalize">
                        {course.level}
                      </span>
                    </div>

                    {/* Course Title */}
                    <div className="space-y-1.5">
                      <h3
                        onClick={() => onOpenCourse(course.id)}
                        className="font-display text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-700 cursor-pointer transition leading-snug"
                      >
                        {translation.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {translation.summary}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          {t.student.courseProgress}
                        </span>
                        <span className="font-bold text-slate-900 font-display">
                          {progress.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${progress.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Next Lesson Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
                      <div className="p-1.5 rounded-xl bg-blue-50 text-blue-700 shrink-0 mt-0.5">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
                          {isComplete ? t.student.allLessonsCompleted : t.student.nextLessonLabel}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {nextLessonTitle || (isComplete ? 'Félicitations, parcours terminé !' : 'Première leçon')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenCourse(course.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                    >
                      Voir le programme
                    </button>

                    {/* Bouton "Continuer" qui amène directement à la prochaine leçon non terminée */}
                    <button
                      id={`btn-continue-course-${course.id}`}
                      type="button"
                      onClick={() => onContinueCourse(course.id, nextLesson?.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-[#BEF264]" />
                      <span>{t.student.continueBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
