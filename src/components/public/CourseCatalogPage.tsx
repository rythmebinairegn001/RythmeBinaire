import React, { useState, useMemo } from 'react';
import { Search, Filter, BookOpen, Clock, Layers, ArrowRight } from 'lucide-react';
import { TRACKS, trackInfo } from '../../lib/tracks';
import { PublicCourseItem } from '../../data/coursesData';
import { PreferredLanguage, CourseTrack } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  courses: PublicCourseItem[];
  lang: PreferredLanguage;
  onSelectCourse: (course: PublicCourseItem) => void;
  initialTrackFilter?: CourseTrack | 'all';
}

export const CourseCatalogPage: React.FC<Props> = ({
  courses,
  lang,
  onSelectCourse,
  initialTrackFilter = 'all',
}) => {
  const t = getTranslation(lang);

  const [selectedTrack, setSelectedTrack] = useState<CourseTrack | 'all'>(initialTrackFilter);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Track filter
      if (selectedTrack !== 'all' && course.track !== selectedTrack) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'all' && course.level !== selectedLevel) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const translation = course.translations[lang] || course.translations.fr;
        const matchesTitle = translation.title.toLowerCase().includes(query);
        const matchesSummary = translation.summary.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSummary) {
          return false;
        }
      }
      return true;
    });
  }, [courses, selectedTrack, selectedLevel, searchQuery, lang]);

  return (
    <div id="course-catalog-page" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Catalog Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          {t.catalog.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {t.catalog.subtitle}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
            <input
              id="catalog-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.catalog.searchPlaceholder}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>

          {/* Track Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60">
            <button
              id="filter-track-all"
              type="button"
              onClick={() => setSelectedTrack('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedTrack === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.catalog.allTracks}
            </button>
            {TRACKS.map((tr) => {
              const Icon = tr.icon;
              return (
                <button
                  key={tr.id}
                  id={`filter-track-${tr.id}`}
                  type="button"
                  onClick={() => setSelectedTrack(tr.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedTrack === tr.id ? tr.pillActive : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? tr.en : tr.fr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium pl-1">
            Niveau :
          </span>
          {[
            { id: 'all', label: t.catalog.allLevels },
            { id: 'debutant', label: t.catalog.levelDebutant },
            { id: 'intermediaire', label: t.catalog.levelIntermediaire },
            { id: 'avance', label: t.catalog.levelAvance },
          ].map((lvl) => (
            <button
              key={lvl.id}
              id={`filter-level-${lvl.id}`}
              type="button"
              onClick={() => setSelectedLevel(lvl.id)}
              className={`px-3 py-1 rounded-xl text-xs transition border ${
                selectedLevel === lvl.id
                  ? 'border-slate-800 bg-slate-900 text-white font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lvl.label}
            </button>
          ))}

          <span className="ml-auto text-xs text-slate-400 font-medium pr-1">
            {filteredCourses.length} {filteredCourses.length > 1 ? 'cours disponibles' : 'cours disponible'}
          </span>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">{t.catalog.noResults}</p>
          <button
            type="button"
            onClick={() => {
              setSelectedTrack('all');
              setSelectedLevel('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Réinitialiser tous les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const translation = course.translations[lang] || course.translations.fr;
            const tr = trackInfo(course.track);
            const TrIcon = tr.icon;
            const levelLabel =
              course.level === 'debutant'
                ? t.catalog.levelDebutant
                : course.level === 'intermediaire'
                ? t.catalog.levelIntermediaire
                : t.catalog.levelAvance;

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                onClick={() => onSelectCourse(course)}
                className="group cursor-pointer bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Badges row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${tr.badge}`}
                    >
                      <TrIcon className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? tr.en : tr.fr}</span>
                    </span>

                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                      {levelLabel}
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <div className="space-y-2">
                    <h2 className="font-display text-lg font-bold text-slate-900 group-hover:text-blue-700 transition leading-snug">
                      {translation.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {translation.summary}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{course.modules.length} {t.catalog.modulesCount}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{course.estimated_hours}h</span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900 group-hover:text-blue-600 transition">
                    <span>{t.catalog.viewDetails}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
