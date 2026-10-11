import React, { useState, useEffect } from 'react';
import {
  Shield,
  BookOpen,
  Users,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  FileEdit,
  ArrowRight,
} from 'lucide-react';
import { PublicCourseItem } from '../../data/coursesData';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import {
  getAllCoursesAdmin,
  saveCourseAdmin,
  deleteCourseAdmin,
  isCourseMissingEn,
} from '../../services/adminService';
import { CourseModal } from './CourseModal';
import { ModulesManager } from './ModulesManager';
import { StudentsList } from './StudentsList';
import { AdminAccessDenied } from './AdminAccessDenied';

interface Props {
  user: UserProfile | null;
  lang: PreferredLanguage;
  onNavigate: (view: string, id?: string) => void;
  onLoginClick: () => void;
  onBackToHome: () => void;
}

export const AdminDashboard: React.FC<Props> = ({
  user,
  lang,
  onNavigate,
  onLoginClick,
  onBackToHome,
}) => {
  const t = getTranslation(lang);

  // Check admin role
  const isAdmin = user?.role === 'admin';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'courses' | 'students'>('courses');

  // Courses state
  const [courses, setCourses] = useState<PublicCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [trackFilter, setTrackFilter] = useState<'all' | 'coder' | 'culture_numerique'>('all');

  // Modals & Sub-views
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<PublicCourseItem | null>(null);

  // Managing modules for a selected course
  const [selectedCourseForModules, setSelectedCourseForModules] =
    useState<PublicCourseItem | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadCourses();
    }
  }, [isAdmin]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await getAllCoursesAdmin();
      setCourses(data);
    } finally {
      setLoading(false);
    }
  };

  // If not admin, show dedicated access denied screen
  if (!isAdmin) {
    return (
      <AdminAccessDenied
        user={user}
        lang={lang}
        onLoginClick={onLoginClick}
        onBackToHome={onBackToHome}
      />
    );
  }

  // If currently managing modules of a course, show ModulesManager view
  if (selectedCourseForModules) {
    return (
      <div id="admin-modules-container" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModulesManager
          course={selectedCourseForModules}
          lang={lang}
          onBack={() => {
            setSelectedCourseForModules(null);
            loadCourses();
          }}
          onCourseUpdated={() => loadCourses()}
        />
      </div>
    );
  }

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    const titleMatch =
      c.translations.fr.title.toLowerCase().includes(q) ||
      (c.translations.en?.title || '').toLowerCase().includes(q);

    if (q && !titleMatch) return false;

    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Track filter
    if (trackFilter !== 'all' && c.track !== trackFilter) return false;

    return true;
  });

  const publishedCount = courses.filter((c) => c.status === 'published').length;
  const draftCount = courses.filter((c) => c.status === 'draft').length;
  const missingEnCount = courses.filter((c) => isCourseMissingEn(c)).length;

  const handleSaveCourse = async (newOrUpdated: PublicCourseItem) => {
    await saveCourseAdmin(newOrUpdated);
    await loadCourses();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce cours ? Cette action est irréversible.')) {
      await deleteCourseAdmin(courseId);
      await loadCourses();
    }
  };

  return (
    <div id="admin-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-[var(--color-card-bg)] rounded-3xl border border-[var(--color-card-border)] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>PORTAIL ADMINISTRATEUR RYTHMEBINAIRE</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-main)]">
            {t.admin.title}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xl">
            {t.admin.subtitle}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 self-stretch sm:self-auto">
          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-center">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {publishedCount}
            </span>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Publiés</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-center">
            <span className="text-xl font-bold text-slate-700 dark:text-slate-300 font-mono">
              {draftCount}
            </span>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Brouillons</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] text-center">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {missingEnCount}
            </span>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Sans EN</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Courses vs Students) */}
      <div className="flex items-center gap-2 border-b border-[var(--color-card-border)] pb-2">
        <button
          type="button"
          id="tab-admin-courses"
          onClick={() => setActiveTab('courses')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-[var(--color-card-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-card-border)]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{t.admin.tabCourses}</span>
          <span className="px-2 py-0.2 rounded-full text-xs bg-purple-500/30 text-white">
            {courses.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-admin-students"
          onClick={() => setActiveTab('students')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'students'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-[var(--color-card-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-card-border)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.admin.tabStudents}</span>
        </button>
      </div>

      {/* TAB 1: COURSES MANAGEMENT */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Action Bar (Search, Filters, New Course Button) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-courses"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.admin.searchCourse}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 text-[var(--color-text-main)]"
                />
              </div>

              {/* Status Filter */}
              <select
                id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-2xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-[var(--color-text-main)]"
              >
                <option value="all">{t.admin.allStatuses}</option>
                <option value="published">{t.admin.statusPublished}</option>
                <option value="draft">{t.admin.statusDraft}</option>
              </select>

              {/* Track Filter */}
              <select
                id="select-track-filter"
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-2xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-[var(--color-text-main)]"
              >
                <option value="all">{t.admin.allTracks}</option>
                <option value="coder">Coder</option>
                <option value="culture_numerique">Culture Numérique</option>
              </select>
            </div>

            {/* Create New Course Button */}
            <button
              id="btn-create-course"
              type="button"
              onClick={() => {
                setEditingCourse(null);
                setCourseModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t.admin.newCourseBtn}</span>
            </button>
          </div>

          {/* Courses Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span>Chargement du catalogue...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                Aucun cours ne correspond aux critères
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Modifiez vos filtres ou créez un nouveau cours pour enrichir le catalogue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCourses.map((course) => {
                const missingEn = isCourseMissingEn(course);
                const totalLessons = course.modules?.reduce((acc, m) => acc + m.lessonCount, 0) || 0;

                return (
                  <div
                    key={course.id}
                    id={`admin-course-row-${course.id}`}
                    className="bg-[var(--color-card-bg)] rounded-3xl border border-[var(--color-card-border)] p-5 shadow-xs hover:border-purple-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Metadata & Titles */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            course.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {course.status === 'published' ? t.admin.statusPublished : t.admin.statusDraft}
                        </span>

                        {/* Track Badge */}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {course.track === 'coder' ? 'Coder' : 'Culture Numérique'}
                        </span>

                        {/* Level */}
                        <span className="text-[10px] font-medium text-[var(--color-text-muted)] capitalize">
                          {course.level}
                        </span>

                        {/* English missing or complete badge */}
                        {missingEn ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            title="Titre, résumé ou description non renseigné en anglais"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>{t.admin.missingEnBadge}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>{t.admin.completeEnBadge}</span>
                          </span>
                        )}
                      </div>

                      {/* Main Title & Bilingual details */}
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-main)] truncate">
                          {course.translations.fr.title}
                        </h2>
                        {course.translations.en?.title && (
                          <p className="text-xs text-[var(--color-text-muted)] italic truncate">
                            🇬🇧 {course.translations.en.title}
                          </p>
                        )}
                        <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1">
                          {course.translations.fr.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>
                            {course.modules?.length || 0} modules • {totalLessons} leçons
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{course.estimated_hours}h</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                      {/* Manage Modules & Lessons */}
                      <button
                        type="button"
                        id={`btn-manage-modules-${course.id}`}
                        onClick={() => setSelectedCourseForModules(course)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition border border-purple-200 dark:border-purple-800 active:scale-95"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{t.admin.modulesBtn}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {/* Edit Course Meta */}
                      <button
                        type="button"
                        id={`btn-edit-course-${course.id}`}
                        onClick={() => {
                          setEditingCourse(course);
                          setCourseModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] hover:bg-[var(--color-card-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
                        title={t.admin.editCourseBtn}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Course */}
                      <button
                        type="button"
                        id={`btn-delete-course-${course.id}`}
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-2 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] hover:bg-red-500/10 text-red-500 transition"
                        title={t.admin.deleteCourseBtn}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENTS DIRECTORY (MVP READ-ONLY) */}
      {activeTab === 'students' && <StudentsList lang={lang} />}

      {/* COURSE EDIT / CREATE MODAL */}
      <CourseModal
        isOpen={courseModalOpen}
        course={editingCourse}
        lang={lang}
        onClose={() => {
          setCourseModalOpen(false);
          setEditingCourse(null);
        }}
        onSave={handleSaveCourse}
      />
    </div>
  );
};
