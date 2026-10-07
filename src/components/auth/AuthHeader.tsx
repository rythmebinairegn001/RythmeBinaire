import React from 'react';
import { Database, Globe, Code2, ShieldCheck } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { isSupabaseConfigured } from '../../lib/supabase';

interface Props {
  currentLang: PreferredLanguage;
  onLanguageChange: (lang: PreferredLanguage) => void;
  onOpenSchemaModal: () => void;
  onOpenConfigModal: () => void;
}

export const AuthHeader: React.FC<Props> = ({
  currentLang,
  onLanguageChange,
  onOpenSchemaModal,
  onOpenConfigModal,
}) => {
  const t = getTranslation(currentLang);
  const configured = isSupabaseConfigured();

  return (
    <header className="w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-zinc-900">
                {t.brand.name}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {t.brand.badge}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden md:block">
              {t.brand.tagline}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* SQL Schema Button */}
          <button
            id="btn-open-sql-schema"
            onClick={onOpenSchemaModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition shadow-2xs"
            title="Inspect 13 tables & RLS security rules"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Schéma</span>
            <span className="sm:hidden">SQL</span>
            <span className="px-1.5 py-0.2 rounded-sm bg-emerald-600 text-white text-[10px] font-mono">
              13
            </span>
          </button>

          {/* Supabase status indicator */}
          <button
            id="btn-open-supabase-config"
            onClick={onOpenConfigModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition shadow-2xs ${
              configured
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title={configured ? 'Supabase connecté' : 'Configurer Supabase Cloud'}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {configured ? 'Supabase Cloud' : 'Supabase (Config)'}
            </span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5">
            <button
              id="btn-lang-fr"
              onClick={() => onLanguageChange('fr')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                currentLang === 'fr'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              FR
            </button>
            <button
              id="btn-lang-en"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                currentLang === 'en'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
