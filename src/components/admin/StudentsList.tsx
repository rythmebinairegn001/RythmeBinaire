import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import {
  getStudentsListAdmin,
  AdminStudentItem,
} from '../../services/adminService';

interface Props {
  lang: PreferredLanguage;
}

export const StudentsList: React.FC<Props> = ({ lang }) => {
  const t = getTranslation(lang);
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudentsListAdmin();
      setStudents(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.enrollments.some((e) => e.courseTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div id="students-directory-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--color-text-main)]">
            {t.admin.studentsDirectoryTitle}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {t.admin.studentsDirectorySubtitle}
          </p>
        </div>

        {/* Read-Only MVP Notice badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Lecture seule • Rôle élève</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="input-search-students"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.admin.searchStudentPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 text-[var(--color-text-main)]"
        />
      </div>

      {/* Students Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span>Chargement de la liste des élèves...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-center space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">
            {t.admin.noStudentsFound}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Aucun compte avec le rôle 'eleve' ne correspond à votre recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((student) => {
            const formattedDate = new Date(student.created_at).toLocaleDateString(
              lang === 'fr' ? 'fr-FR' : 'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' }
            );

            return (
              <div
                key={student.id}
                id={`student-card-${student.id}`}
                className="bg-[var(--color-card-bg)] rounded-3xl border border-[var(--color-card-border)] p-5 shadow-xs transition hover:border-purple-500/40 space-y-4"
              >
                {/* Student Info Top */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-card-border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                          {student.full_name}
                        </h3>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {student.role}
                        </span>
                        <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {student.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">
                        {student.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t.admin.studentRegistrationDate} : {formattedDate}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-bg-app)] border border-[var(--color-card-border)] font-semibold">
                      Langue : {student.preferred_language.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Course Enrollments & Progress */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t.admin.studentEnrolledCourses}</span>
                  </h4>

                  {student.enrollments.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] italic">
                      {t.admin.noEnrolledCourses}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {student.enrollments.map((enr) => (
                        <div
                          key={enr.courseId}
                          className="p-3 rounded-2xl bg-[var(--color-bg-app)] border border-[var(--color-card-border)] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                              {enr.courseTitle}
                            </span>
                            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 shrink-0">
                              {enr.progressPercent}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, enr.progressPercent)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                            <span>
                              {enr.completedLessonsCount} / {enr.totalLessonsCount} leçons validées
                            </span>
                            {enr.progressPercent === 100 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Terminé</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
