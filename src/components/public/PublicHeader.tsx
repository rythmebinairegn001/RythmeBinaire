import React from 'react';
import { Terminal, Shield, User, LogOut, Sun, Moon } from 'lucide-react';
import { PreferredLanguage, UserProfile } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { ThemeMode } from '../../lib/theme';

interface Props {
  currentView: string;
  onNavigate: (view: string) => void;
  currentLang: PreferredLanguage;
  onLanguageChange: (lang: PreferredLanguage) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: UserProfile | null;
  onLogout: () => void;
  onOpenSchemaModal: () => void;
  onOpenConfigModal: () => void;
}

export const PublicHeader: React.FC<Props> = ({
  currentView,
  onNavigate,
  currentLang,
  onLanguageChange,
  theme,
  onToggleTheme,
  user,
  onLogout,
  onOpenSchemaModal,
  onOpenConfigModal,
}) => {
  const t = getTranslation(currentLang);
  const isLight = theme === 'light';
  // Upcoming action label: "Mode sombre" when light, "Mode clair" when dark
  const themeLabel = isLight ? t.theme.switchToDark : t.theme.switchToLight;

  return (
    <header className="sticky top-0 z-50 w-full bg-[#070D1E] border-b border-[#1E293B] text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Brand with dark navy + neon accent */}
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            id="brand-home-link"
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group text-left transition"
          >
            {/* Logo box with neon yellow/lime accent on dark navy */}
            <div className="w-11 h-11 rounded-2xl bg-[#0F1B3B] border border-[#BEF264]/40 flex items-center justify-center text-[#BEF264] shadow-[0_0_15px_rgba(190,242,100,0.15)] group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-[#BEF264] transition-colors">
                  {t.brand.name}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#BEF264] animate-pulse" />
              </div>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                {t.brand.tagline}
              </span>
            </div>
          </button>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              id="nav-link-home"
              type="button"
              onClick={() => onNavigate('home')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                currentView === 'home'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.nav.home}
            </button>
            <button
              id="nav-link-catalog"
              type="button"
              onClick={() => onNavigate('catalog')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                currentView === 'catalog'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.nav.catalog}
            </button>
            <button
              id="nav-link-student-space"
              type="button"
              onClick={() => onNavigate('student-dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                currentView.startsWith('student-')
                  ? 'bg-[#BEF264]/20 text-[#BEF264] font-bold border border-[#BEF264]/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{t.nav.mySpace}</span>
              {user?.role === 'eleve' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#BEF264]" />
              )}
            </button>

            {user?.role === 'admin' && (
              <button
                id="nav-link-admin-space"
                type="button"
                onClick={() => onNavigate('admin-dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                  currentView.startsWith('admin-')
                    ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                    : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Administration</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Button (Light / Dark) with Sun/Moon icon & upcoming action label */}
          <button
            id="btn-header-theme-toggle"
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition active:scale-95 shadow-2xs group"
            title={themeLabel}
            aria-label={themeLabel}
          >
            {isLight ? (
              <Moon className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-200 transition-colors" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#F5C744] group-hover:text-amber-300 transition-colors" />
            )}
            <span className="text-[11px] sm:text-xs font-medium">
              {themeLabel}
            </span>
          </button>

          {/* Bilingual Toggle (FR / EN) */}
          <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-900/80 p-0.5">
            <button
              id="header-lang-fr"
              type="button"
              onClick={() => onLanguageChange('fr')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                currentLang === 'fr'
                  ? 'bg-[#BEF264] text-[#070D1E] shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              id="header-lang-en"
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                currentLang === 'en'
                  ? 'bg-[#BEF264] text-[#070D1E] shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Auth State buttons */}
          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <button
                id="btn-header-dashboard"
                type="button"
                onClick={() =>
                  onNavigate(
                    user.role === 'admin'
                      ? 'admin-dashboard'
                      : user.role === 'eleve'
                      ? 'student-dashboard'
                      : 'dashboard'
                  )
                }
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition"
              >
                {user.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#BEF264]" />
                )}
                <span className="hidden sm:inline font-semibold">
                  {user.role === 'admin'
                    ? 'Admin'
                    : user.role === 'eleve'
                    ? 'Mon espace'
                    : user.full_name || 'Espace'}
                </span>
              </button>
              <button
                id="btn-header-logout"
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={t.common.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1 sm:pl-2">
              <button
                id="btn-header-login"
                type="button"
                onClick={() => onNavigate('login')}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition"
              >
                {t.nav.login}
              </button>
              <button
                id="btn-header-register"
                type="button"
                onClick={() => onNavigate('register')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#BEF264] hover:bg-[#d9f99d] active:scale-95 text-[#070D1E] transition shadow-[0_0_12px_rgba(190,242,100,0.2)]"
              >
                {t.nav.register}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
