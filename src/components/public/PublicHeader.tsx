import React from 'react';
import { Shield, User, LogOut, Sun, Moon } from 'lucide-react';
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

  const fr = currentLang === 'fr';

  const navItems = [
    { id: 'home', view: 'home', label: t.nav.home, active: currentView === 'home' },
    { id: 'catalog', view: 'catalog', label: t.nav.catalog, active: currentView === 'catalog' },
    { id: 'pricing', view: 'pricing', label: fr ? 'Tarifs' : 'Pricing', active: currentView === 'pricing' },
  ];
  const spaceActive = currentView.startsWith('student-');
  const adminActive = currentView.startsWith('admin-');

  /** Bouton clair/sombre : l'étiquette n'apparaît que sur grand écran (sur téléphone, seule l'icône reste). */
  const themeButton = (idp: string) => (
    <button
      id={`${idp}btn-header-theme-toggle`}
      type="button"
      onClick={onToggleTheme}
      className="shrink-0 flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition active:scale-95 shadow-2xs group"
      title={themeLabel}
      aria-label={themeLabel}
    >
      {isLight ? (
        <Moon className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-200 transition-colors" />
      ) : (
        <Sun className="w-3.5 h-3.5 text-[#F5C744] group-hover:text-amber-300 transition-colors" />
      )}
      <span className="hidden lg:inline text-xs font-medium">{themeLabel}</span>
    </button>
  );

  const langToggle = (idp: string) => (
    <div className="shrink-0 flex items-center rounded-xl border border-slate-700/80 bg-slate-900/80 p-0.5">
      {(['fr', 'en'] as const).map((l) => (
        <button
          key={l}
          id={`${idp}header-lang-${l}`}
          type="button"
          onClick={() => onLanguageChange(l)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
            currentLang === l ? 'bg-[#BEF264] text-[#070D1E] shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-[#070D1E] border-b border-[#1E293B] text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 md:h-20 py-2 md:py-0 flex items-center justify-between gap-2">
        {/* Left: Brand with dark navy + neon accent */}
        <div className="flex items-center gap-6 sm:gap-8 min-w-0">
          <button
            id="brand-home-link"
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 sm:gap-3 group text-left transition min-w-0"
          >
            {/* Logo officiel RythmeBinaireGn (public/logo.png, 96px, ~16 Ko) */}
            <img
              src="/logo.png"
              alt="RythmeBinaireGn"
              width={44}
              height={44}
              className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full shadow-[0_0_15px_rgba(190,242,100,0.15)] group-hover:scale-105 transition-transform"
            />

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-[#BEF264] transition-colors truncate">
                  {t.brand.name}
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#BEF264] animate-pulse" />
              </div>
              <span className="hidden sm:block text-[11px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                {t.brand.tagline}
              </span>
            </div>
          </button>

          {/* Nav links (ordinateur) */}
          <nav className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {navItems.map((n) => (
              <button
                key={n.id}
                id={`nav-link-${n.id}`}
                type="button"
                onClick={() => onNavigate(n.view)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                  n.active ? 'bg-white/10 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {n.label}
              </button>
            ))}
            <button
              id="nav-link-student-space"
              type="button"
              onClick={() => onNavigate('student-dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                spaceActive ? 'bg-[#BEF264]/20 text-[#BEF264] font-bold border border-[#BEF264]/40' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{t.nav.mySpace}</span>
              {user?.role === 'eleve' && <span className="w-1.5 h-1.5 rounded-full bg-[#BEF264]" />}
            </button>

            {user?.role === 'admin' && (
              <button
                id="nav-link-admin-space"
                type="button"
                onClick={() => onNavigate('admin-dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 ${
                  adminActive ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Administration</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Thème et langue : ici sur ordinateur, sur la 2e ligne sur téléphone */}
          <div className="hidden md:flex items-center gap-3">
            {themeButton('')}
            {langToggle('')}
          </div>

          {/* Auth State buttons */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 md:pl-2">
              <button
                id="btn-header-dashboard"
                type="button"
                onClick={() =>
                  onNavigate(user.role === 'admin' ? 'admin-dashboard' : user.role === 'eleve' ? 'student-dashboard' : 'dashboard')
                }
                className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition"
                aria-label={user.role === 'admin' ? 'Admin' : t.nav.mySpace}
              >
                {user.role === 'admin' ? <Shield className="w-4 h-4 text-purple-400" /> : <User className="w-4 h-4 text-[#BEF264]" />}
                <span className="hidden sm:inline font-semibold">
                  {user.role === 'admin' ? 'Admin' : user.role === 'eleve' ? t.nav.mySpace : user.full_name || 'Espace'}
                </span>
              </button>
              <button
                id="btn-header-logout"
                type="button"
                onClick={onLogout}
                className="p-2.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={t.common.logout}
                aria-label={t.common.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 md:pl-2">
              <button
                id="btn-header-login"
                type="button"
                onClick={() => onNavigate('login')}
                className="px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition whitespace-nowrap"
              >
                {t.nav.login}
              </button>
              <button
                id="btn-header-register"
                type="button"
                onClick={() => onNavigate('register')}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[#BEF264] hover:bg-[#d9f99d] active:scale-95 text-[#070D1E] transition shadow-[0_0_12px_rgba(190,242,100,0.2)] whitespace-nowrap"
              >
                {t.nav.register}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Téléphone : 2e ligne = menu qui défile sur le côté + langue + thème (rien ne déborde de l'écran) */}
      <div className="md:hidden border-t border-slate-800/80">
        <div className="px-3 py-2 flex items-center gap-2">
          <nav id="mobile-nav" className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((n) => (
              <button
                key={n.id}
                id={`m-nav-link-${n.id}`}
                type="button"
                onClick={() => onNavigate(n.view)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  n.active ? 'bg-white/10 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {n.label}
              </button>
            ))}
            <button
              id="m-nav-link-student-space"
              type="button"
              onClick={() => onNavigate('student-dashboard')}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                spaceActive ? 'bg-[#BEF264]/20 text-[#BEF264] font-bold border border-[#BEF264]/40' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.nav.mySpace}
            </button>
            {user?.role === 'admin' && (
              <button
                id="m-nav-link-admin-space"
                type="button"
                onClick={() => onNavigate('admin-dashboard')}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  adminActive ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
                }`}
              >
                Administration
              </button>
            )}
          </nav>
          {themeButton('m-')}
          {langToggle('m-')}
        </div>
      </div>
    </header>
  );
};
