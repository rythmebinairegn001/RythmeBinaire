import { PYODIDE_BASE } from '../services/codeRunner';

/**
 * Hors connexion : enregistrement du « service worker » (public/sw.js) avec un interrupteur de secours.
 *  - ouvrir le site avec ?nosw=1 désinstalle le service worker et vide ses caches ;
 *  - l'élève peut aussi le désactiver dans « Hors connexion » (mémorisé dans localStorage).
 */
const DISABLE_KEY = 'rb_offline_disabled';
export const PYODIDE_FILES = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'].map((f) => PYODIDE_BASE + f);

export const swSupported = (): boolean => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';

export function isDisabled(): boolean {
  try {
    return localStorage.getItem(DISABLE_KEY) === '1';
  } catch {
    return false;
  }
}

export async function uninstall(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('rb-')).map((n) => caches.delete(n)));
  } catch {
    /* sans importance */
  }
}

/** À appeler une fois au démarrage. Ne lève jamais d'erreur. */
export async function initOffline(): Promise<void> {
  if (!swSupported()) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('nosw') === '1') {
      localStorage.setItem(DISABLE_KEY, '1');
      await uninstall();
      return;
    }
    if (isDisabled()) {
      await uninstall();
      return;
    }
    if (import.meta.env.PROD) await navigator.serviceWorker.register('/sw.js');
  } catch {
    /* le site marche très bien sans */
  }
}

export async function setEnabled(on: boolean): Promise<void> {
  try {
    if (on) {
      localStorage.removeItem(DISABLE_KEY);
      if (swSupported()) await navigator.serviceWorker.register('/sw.js');
    } else {
      localStorage.setItem(DISABLE_KEY, '1');
      await uninstall();
    }
  } catch {
    /* sans importance */
  }
}

/** Télécharge le moteur Python (~10 Mo) pour pouvoir exécuter du Python hors connexion. */
export async function prefetchPython(onProgress: (done: number, total: number) => void): Promise<boolean> {
  if (!swSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const target = reg.active;
  if (!target) return false;
  return new Promise<boolean>((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'progress') onProgress(d.done, d.total);
      else if (d.type === 'done') resolve(true);
      else if (d.type === 'error') resolve(false);
    };
    target.postMessage({ type: 'PREFETCH', urls: PYODIDE_FILES }, [ch.port2]);
  });
}

export async function pythonReady(): Promise<boolean> {
  if (!swSupported()) return false;
  try {
    const c = await caches.open('rb-pyodide-v1');
    const hits = await Promise.all(PYODIDE_FILES.map((u) => c.match(u)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

export const isOnline = (): boolean => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);
