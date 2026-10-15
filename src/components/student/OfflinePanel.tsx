import React, { useEffect, useState } from 'react';
import { WifiOff, Download, Trash2, MonitorDown } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { OfflineInfo, clearOfflineData, offlineInfo } from '../../lib/offlineStore';
import { InstallState, installState, onInstallChange, promptInstall } from '../../lib/install';
import { isDisabled, prefetchPython, pythonReady, setEnabled, swSupported } from '../../lib/offline';

/** Bannière affichée quand l'appareil n'a plus internet (affichage pur). */
export const OfflineBannerView: React.FC<{ lang: PreferredLanguage }> = ({ lang }) => (
  <div role="status" className="bg-amber-100 text-amber-950 text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 border-b border-amber-300">
    <WifiOff className="w-4 h-4" />
    {lang === 'fr'
      ? 'Pas de connexion : tu peux relire les cours déjà ouverts. Ta progression sera enregistrée au retour d’internet.'
      : 'No connection: you can reread lessons you already opened. Your progress will be saved when you are back online.'}
  </div>
);

export const OfflineBanner: React.FC<{ lang: PreferredLanguage }> = ({ lang }) => {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online ? null : <OfflineBannerView lang={lang} />;
};

/** Affichage pur (testable). */
export const OfflineView: React.FC<{
  lang: PreferredLanguage;
  info: OfflineInfo;
  supported: boolean;
  enabled: boolean;
  pythonOk: boolean;
  progress: { done: number; total: number } | null;
  error: boolean;
  install?: InstallState;
  onInstall?: () => void;
  onPython: () => void;
  onClear: () => void;
  onToggle: (v: boolean) => void;
}> = ({ lang, info, supported, enabled, pythonOk, progress, error, install = 'unsupported', onInstall, onPython, onClear, onToggle }) => {
  const fr = lang === 'fr';
  return (
    <section id="offline-panel" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3" aria-label={fr ? 'Hors connexion' : 'Offline'}>
      <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
        <WifiOff className="w-5 h-5 text-emerald-600" />
        {fr ? 'Hors connexion' : 'Offline'}
      </h2>
      {info.lessonCount > 0 ? (
        <p className="text-sm text-slate-700">
          {fr
            ? `${info.courseCount} cours et ${info.lessonCount} leçons sont gardés sur cet appareil (≈ ${info.approxKb} Ko). Tu peux les relire sans internet.`
            : `${info.courseCount} courses and ${info.lessonCount} lessons are kept on this device (≈ ${info.approxKb} KB). You can reread them without internet.`}
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          {fr ? 'Rien n’est encore gardé. Ouvre tes cours une fois avec internet : ils resteront lisibles ensuite.' : 'Nothing saved yet. Open your courses once while online: they stay readable afterwards.'}
        </p>
      )}
      {supported && enabled && (
        <div className="flex flex-wrap items-center gap-3">
          {pythonOk ? (
            <span className="text-xs font-semibold text-emerald-700">{fr ? 'Python prêt hors connexion ✓' : 'Python ready offline ✓'}</span>
          ) : (
            <button type="button" onClick={onPython} disabled={!!progress} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-60">
              <Download className="w-3.5 h-3.5" />
              {progress
                ? `${progress.done}/${progress.total}…`
                : fr
                  ? 'Préparer Python hors connexion (≈ 10 Mo)'
                  : 'Prepare Python offline (≈ 10 MB)'}
            </button>
          )}
          {error && <span className="text-xs text-red-600">{fr ? 'Échec : réessaie avec une meilleure connexion.' : 'Failed: retry with a better connection.'}</span>}
        </div>
      )}
      {install === 'available' && (
        <button type="button" onClick={onInstall} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
          <MonitorDown className="w-3.5 h-3.5" />
          {fr ? 'Installer RythmeBinaireGn comme une appli' : 'Install RythmeBinaireGn as an app'}
        </button>
      )}
      {install === 'ios' && (
        <p className="text-xs text-slate-600">
          {fr ? 'Pour installer : bouton Partager de Safari, puis « Sur l’écran d’accueil ».' : 'To install: Safari’s Share button, then “Add to Home Screen”.'}
        </p>
      )}
      {install === 'installed' && <p className="text-xs font-semibold text-emerald-700">{fr ? 'Appli installée ✓' : 'App installed ✓'}</p>}
      {!supported && <p className="text-xs text-slate-500">{fr ? 'Ce navigateur ne permet pas d’ouvrir le site sans internet.' : 'This browser cannot open the site without internet.'}</p>}
      <div className="flex flex-wrap gap-4 pt-1 text-xs">
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1 underline text-slate-600">
          <Trash2 className="w-3 h-3" />
          {fr ? 'Effacer les données de cet appareil' : 'Clear data on this device'}
        </button>
        {supported && (
          <button type="button" onClick={() => onToggle(!enabled)} className="underline text-slate-600">
            {enabled ? (fr ? 'Désactiver le mode hors connexion' : 'Turn offline mode off') : fr ? 'Activer le mode hors connexion' : 'Turn offline mode on'}
          </button>
        )}
      </div>
    </section>
  );
};

export const OfflinePanel: React.FC<{ lang: PreferredLanguage }> = ({ lang }) => {
  const [info, setInfo] = useState<OfflineInfo>({ savedAt: null, courseCount: 0, lessonCount: 0, testsCount: 0, approxKb: 0 });
  const [pythonOk, setPythonOk] = useState(false);
  const [enabled, setEn] = useState(!isDisabled());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState(false);
  const [install, setInstall] = useState<InstallState>(installState());
  useEffect(() => onInstallChange(() => setInstall(installState())), []);

  const refresh = async () => {
    setInfo(await offlineInfo());
    setPythonOk(await pythonReady());
  };
  useEffect(() => {
    void refresh();
  }, []);

  return (
    <OfflineView
      lang={lang}
      info={info}
      supported={swSupported()}
      enabled={enabled}
      pythonOk={pythonOk}
      progress={progress}
      error={error}
      install={install}
      onInstall={() => void promptInstall()}
      onPython={async () => {
        setError(false);
        setProgress({ done: 0, total: 5 });
        const ok = await prefetchPython((done, total) => setProgress({ done, total }));
        setProgress(null);
        setError(!ok);
        await refresh();
      }}
      onClear={async () => {
        await clearOfflineData();
        await refresh();
      }}
      onToggle={async (v) => {
        await setEnabled(v);
        setEn(v);
        await refresh();
      }}
    />
  );
};
