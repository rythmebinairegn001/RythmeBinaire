import React from 'react';
import {
  Code2,
  Globe2,
  Sparkles,
  Bot,
  GraduationCap,
  Users2,
  ArrowRight,
  CheckCircle2,
  Layers,
  Terminal,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { PreferredLanguage, CourseTrack } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { PublicCourseItem } from '../../data/coursesData';

interface Props {
  lang: PreferredLanguage;
  onNavigate: (view: string, filter?: CourseTrack) => void;
  onSelectCourse: (course: PublicCourseItem) => void;
  featuredCourses: PublicCourseItem[];
}

export const HomePage: React.FC<Props> = ({
  lang,
  onNavigate,
  onSelectCourse,
  featuredCourses,
}) => {
  const t = getTranslation(lang);

  return (
    <div id="home-page" className="w-full space-y-16 sm:space-y-24 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-12 sm:pb-20 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Pilot Phase Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold tracking-wide shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.home.heroBadge}</span>
            </div>

            {/* Hero Main Heading with Space Grotesk */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              {t.home.heroTitlePrefix}{' '}
              <span className="text-blue-900 block mt-1">
                {t.home.heroTitleHighlight}
              </span>
            </h1>

            {/* Tagline / Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              {t.home.heroSubtitle}
            </p>

            {/* Prominent CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                id="hero-btn-register"
                type="button"
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-sm transition shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2.5"
              >
                <span>{t.home.ctaRegister}</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                id="hero-btn-catalog"
                type="button"
                onClick={() => onNavigate('catalog')}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-800 font-semibold text-sm transition border border-slate-200 flex items-center justify-center gap-2"
              >
                <span>{t.home.ctaCatalog}</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Micro value badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.home.statTracks}</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.home.statTutor}</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.home.statBilingual}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: LES DEUX PARCOURS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2.5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.home.tracksTitle}
          </h2>
          <p className="text-sm text-slate-600">
            {t.home.tracksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* TRACK 1: CODER */}
          <div
            id="card-track-coder"
            className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                  {t.home.trackCoderBadge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  {t.home.trackCoderTitle}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.home.trackCoderDesc}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                {t.home.trackCoderPoints.map((point, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                id="btn-goto-track-coder"
                onClick={() => onNavigate('catalog', 'coder')}
                className="w-full py-3.5 px-5 rounded-2xl bg-blue-50 hover:bg-blue-100/80 text-blue-900 font-semibold text-xs transition flex items-center justify-center gap-2 border border-blue-200/80"
              >
                <span>{t.home.trackCoderCta}</span>
                <ArrowRight className="w-4 h-4 text-blue-700" />
              </button>
            </div>
          </div>

          {/* TRACK 2: CULTURE NUMÉRIQUE */}
          <div
            id="card-track-culture"
            className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Globe2 className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {t.home.trackCultureBadge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  {t.home.trackCultureTitle}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.home.trackCultureDesc}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                {t.home.trackCulturePoints.map((point, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                id="btn-goto-track-culture"
                onClick={() => onNavigate('catalog', 'culture_numerique')}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 font-semibold text-xs transition flex items-center justify-center gap-2 border border-emerald-200/80"
              >
                <span>{t.home.trackCultureCta}</span>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: LES TROIS MODES D'ACCOMPAGNEMENT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2.5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.home.modesTitle}
          </h2>
          <p className="text-sm text-slate-600">
            {t.home.modesSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MODE 1: TUTEUR IA (ACTUELLEMENT DISPONIBLE) */}
          <div
            id="mode-card-ai"
            className="bg-white rounded-3xl p-7 border-2 border-emerald-500/80 shadow-md shadow-emerald-500/5 relative flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                  {t.home.modeAiStatus}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {t.home.modeAiTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t.home.modeAiDesc}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Inclus avec tous les cours</span>
            </div>
          </div>

          {/* MODE 2: COURS AVEC PROFESSEUR (À VENIR) */}
          <div
            id="mode-card-tutor"
            className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between opacity-95"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {t.home.modeTutorStatus}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {t.home.modeTutorTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {t.home.modeTutorDesc}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 text-xs text-slate-400 font-medium">
              Prochainement disponible
            </div>
          </div>

          {/* MODE 3: CLASSES COLLECTIVES (À VENIR) */}
          <div
            id="mode-card-class"
            className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between opacity-95"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Users2 className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {t.home.modeClassStatus}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {t.home.modeClassTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {t.home.modeClassDesc}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 text-xs text-slate-400 font-medium">
              Prochainement disponible
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: APERÇU DES COURS POPULAIRES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Formations phares
            </span>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Commencez votre apprentissage
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="text-xs font-semibold text-slate-900 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>Voir tout le catalogue ({featuredCourses.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredCourses.slice(0, 3).map((course) => {
            const translation = course.translations[lang] || course.translations.fr;
            const isCoder = course.track === 'coder';
            return (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course)}
                className="cursor-pointer bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isCoder
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isCoder ? t.catalog.trackCoder : t.catalog.trackCulture}
                  </span>
                  <h3 className="font-display text-base font-bold text-slate-900 line-clamp-2">
                    {translation.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {translation.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{course.modules.length} modules</span>
                  <span className="font-semibold text-slate-900">Voir détails →</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: CALL TO ACTION PILOT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.home.pilotCardTitle}</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Prêt à développer vos compétences au rythme de l'Afrique ?
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              {t.home.pilotCardDesc}
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                id="btn-pilot-register-cta"
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-100 transition shadow-md"
              >
                {t.home.pilotCardCta}
              </button>

              <button
                type="button"
                id="btn-pilot-login-cta"
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800/80 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition"
              >
                {t.nav.login}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MINIMAL PUBLIC FOOTER */}
      <footer className="border-t border-slate-200/80 pt-10 text-xs text-slate-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-slate-800">
              RythmeBinaireGn
            </span>
            <span>—</span>
            <span>{t.brand.tagline}</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="hover:text-slate-900 transition"
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="hover:text-slate-900 transition"
            >
              {t.nav.catalog}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="hover:text-slate-900 transition font-semibold text-slate-800"
            >
              {t.nav.register}
            </button>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-slate-400 text-center sm:text-left">
          Conçu pour l’Afrique de l’Ouest et tous les apprenants francophones et anglophones. Accès gratuit pendant la phase pilote.
        </p>
      </footer>
    </div>
  );
};
