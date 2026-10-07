import React from 'react';
import { User, LogOut, ShieldCheck, Database, Calendar, Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserProfile, PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';
import { isSupabaseConfigured } from '../../lib/supabase';

interface Props {
  user: UserProfile | null;
  email: string | null;
  lang: PreferredLanguage;
  onLogout: () => void;
  onOpenSchemaModal: () => void;
  onOpenConfigModal: () => void;
}

export const AuthWaitingScreen: React.FC<Props> = ({
  user,
  email,
  lang,
  onLogout,
  onOpenSchemaModal,
  onOpenConfigModal,
}) => {
  const t = getTranslation(lang);
  const configured = isSupabaseConfigured();

  const role = user?.role || 'eleve';
  const fullName = user?.full_name || 'Utilisateur';
  const userEmail = user?.email || email || 'utilisateur@rythmebinaire.gn';
  const preferredLang = user?.preferred_language || lang;
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div id="authenticated-waiting-screen" className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-emerald-950">
            {t.waitingScreen.welcome}, {fullName} !
          </h2>
          <p className="text-xs text-emerald-800 leading-relaxed">
            {t.waitingScreen.infoBanner}
          </p>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xl shadow-zinc-200/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  {fullName}
                </h1>
                <span
                  id="user-role-badge"
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    role === 'admin'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {role === 'admin' ? t.common.roleAdmin : t.common.roleEleve}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{userEmail}</p>
            </div>
          </div>

          <button
            type="button"
            id="btn-logout"
            onClick={onLogout}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-zinc-500" />
            <span>{t.common.logout}</span>
          </button>
        </div>

        {/* Profile Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70">
            <div className="flex items-center gap-2 text-zinc-400 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-zinc-600">
                {t.waitingScreen.role}
              </span>
            </div>
            <p className="text-sm font-bold text-zinc-900 capitalize">
              {role === 'admin' ? t.common.roleAdmin : t.common.roleEleve}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              {t.waitingScreen.roleHelp}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70">
            <div className="flex items-center gap-2 text-zinc-400 mb-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-zinc-600">
                {t.waitingScreen.preferredLanguage}
              </span>
            </div>
            <p className="text-sm font-bold text-zinc-900 uppercase">
              {preferredLang === 'fr' ? 'Français (FR)' : 'English (EN)'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
              {t.auth.preferredLangHelp}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-zinc-600">
                {t.waitingScreen.memberSince}
              </span>
            </div>
            <p className="text-sm font-bold text-zinc-900">{createdAt}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.common.activeStatus}</span>
            </div>
          </div>
        </div>

        {/* Database & Architecture Summary Section */}
        <div className="mt-6 p-5 rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {t.waitingScreen.databaseSection}
                </h3>
                <p className="text-xs text-zinc-500">
                  {configured ? t.waitingScreen.databaseConfigured : t.waitingScreen.databaseUnconfigured}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              13 tables • RLS
            </span>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            {t.waitingScreen.databaseHelp}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              id="btn-view-schema-from-waiting"
              type="button"
              onClick={onOpenSchemaModal}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-xs"
            >
              {t.waitingScreen.viewSchemaButton}
            </button>
            <button
              id="btn-open-config-from-waiting"
              type="button"
              onClick={onOpenConfigModal}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-medium transition shadow-2xs"
            >
              {t.waitingScreen.configButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
