import React from 'react';
import { X, BookOpen, Clock, Layers, ShieldCheck, ArrowRight, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { PublicCourseItem } from '../../data/coursesData';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  course: PublicCourseItem | null;
  isOpen: boolean;
  onClose: () => void;
  lang: PreferredLanguage;
  onSelectRegister: () => void;
  onSelectLogin: () => void;
  isStudent?: boolean;
  onOpenStudentCourse?: (courseId: string) => void;
}

export const CourseDetailModal: React.FC<Props> = ({
  course,
  isOpen,
  onClose,
  lang,
  onSelectRegister,
  onSelectLogin,
  isStudent,
  onOpenStudentCourse,
}) => {
  const t = getTranslation(lang);

  if (!isOpen || !course) return null;

  const translation = course.translations[lang] || course.translations.fr;
  const isCoder = course.track === 'coder';

  const levelLabel =
    course.level === 'debutant'
      ? t.catalog.levelDebutant
      : course.level === 'intermediaire'
      ? t.catalog.levelIntermediaire
      : t.catalog.levelAvance;

  return (
    <div
      id="course-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="course-detail-dialog"
        className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-100 bg-slate-50/50">
          <div className="space-y-2 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  isCoder
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isCoder ? t.catalog.trackCoder : t.catalog.trackCulture}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {levelLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {course.estimated_hours}h
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {translation.title}
            </h2>
          </div>

          <button
            id="btn-close-course-detail"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
          {/* Summary & Description */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              {translation.summary}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {translation.description}
            </p>
          </div>

          {/* Pilot phase guarantee pill */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              {t.nav.pilotNotice} • Suivi avec tuteur IA interactif inclus
            </span>
          </div>

          {/* Modules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>{t.catalog.modalProgramTitle}</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {course.modules.length} {t.catalog.modulesCount}
              </span>
            </div>

            <div className="space-y-2">
              {course.modules.map((m, index) => {
                const modTitle = m.translations[lang]?.title || m.translations.fr.title;
                return (
                  <div
                    key={m.id || index}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800">
                        {modTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Leçons & code</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Access Note */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t.catalog.modalNotice}
            </p>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {isStudent && onOpenStudentCourse ? (
            <div className="w-full flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                {lang === 'fr' ? 'Connecté avec profil élève' : 'Signed in as student'}
              </span>
              <button
                type="button"
                id="btn-modal-open-student-course"
                onClick={() => {
                  onClose();
                  onOpenStudentCourse(course.id);
                }}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <span>{lang === 'fr' ? 'Accéder au cours & leçons' : 'Access course & lessons'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                id="btn-modal-login-link"
                onClick={() => {
                  onClose();
                  onSelectLogin();
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                {t.catalog.modalLoginCta}
              </button>

              <button
                type="button"
                id="btn-modal-register-cta"
                onClick={() => {
                  onClose();
                  onSelectRegister();
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <span>{t.catalog.modalRegisterCta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
