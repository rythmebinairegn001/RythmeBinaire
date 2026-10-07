import React, { useState } from 'react';
import { Copy, Check, X, Database, ShieldCheck, Zap } from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../../lib/schema-sql';
import { PreferredLanguage } from '../../types/database';
import { getTranslation } from '../../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: PreferredLanguage;
}

export const SqlSchemaViewerModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const [copied, setCopied] = useState(false);
  const t = getTranslation(lang);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="sql-schema-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="sql-schema-modal-dialog"
        className="bg-white text-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                {t.schemaModal.title}
              </h2>
              <p className="text-xs text-zinc-500">{t.schemaModal.subtitle}</p>
            </div>
          </div>
          <button
            id="btn-close-schema-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Highlights & Security Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{t.schemaModal.rlsNotice}</span>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
              <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{t.schemaModal.triggerNotice}</span>
            </div>
          </div>

          {/* Tables summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t.schemaModal.summaryTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-zinc-700 font-mono">
              {t.schemaModal.tableList.map((tbl, i) => (
                <div key={i} className="p-2 rounded-lg bg-zinc-100/80 border border-zinc-200 truncate">
                  • {tbl}
                </div>
              ))}
            </div>
          </div>

          {/* SQL Editor Code Block */}
          <div className="relative rounded-xl border border-zinc-300 bg-zinc-950 text-zinc-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
              <span className="font-mono">rythmebinaire_schema.sql</span>
              <button
                id="btn-copy-sql-code"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-xs font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.common.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.schemaModal.copyButton}</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed text-zinc-300 selection:bg-emerald-600 selection:text-white">
              {SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <span className="text-xs text-zinc-500">
            Compatible PostgreSQL 15+ / Supabase Cloud
          </span>
          <div className="flex items-center gap-3">
            <button
              id="btn-copy-sql-modal-footer"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t.common.copied : t.schemaModal.copyButton}</span>
            </button>
            <button
              id="btn-close-sql-modal-footer"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-medium transition-colors"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
