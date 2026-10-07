import React, { useState } from 'react';
import { X, KeyRound, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, isSupabaseConfigured } from '../../lib/supabase';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: PreferredLanguage;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const configured = isSupabaseConfigured();
  const t = getTranslation(lang);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;
    saveSupabaseConfig(url, anonKey);
  };

  const handleClear = () => {
    clearSupabaseConfig();
  };

  return (
    <div
      id="supabase-config-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        id="supabase-config-modal-dialog"
        className="bg-white text-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                {t.configModal.title}
              </h2>
              <p className="text-xs text-zinc-500">{t.configModal.description}</p>
            </div>
          </div>
          <button
            id="btn-close-config-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium ${
              configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{configured ? t.configModal.statusConnected : t.configModal.statusDisconnected}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              {t.configModal.urlLabel}
            </label>
            <input
              id="input-supabase-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.configModal.urlPlaceholder}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-zinc-800 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              {t.configModal.anonLabel}
            </label>
            <div className="relative">
              <input
                id="input-supabase-anon-key"
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder={t.configModal.anonPlaceholder}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-zinc-800 transition"
              />
              <KeyRound className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            {t.configModal.saveNotice}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            {currentConfig.url && !currentConfig.isFromEnv ? (
              <button
                type="button"
                id="btn-clear-supabase-config"
                onClick={handleClear}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
              >
                {t.configModal.clearButton}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-cancel-supabase-config"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                id="btn-save-supabase-config"
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
              >
                {t.configModal.saveButton}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
