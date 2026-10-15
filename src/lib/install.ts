/**
 * Installer le site comme une appli (icône sur le bureau, fenêtre à part, ouverture rapide).
 * Chrome / Edge : l'événement « beforeinstallprompt » permet un bouton « Installer ».
 * Safari (Mac, iPhone) : pas de bouton possible, on explique le geste (Partager > Sur l'écran d'accueil).
 */

export interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = 'installed' | 'available' | 'ios' | 'unsupported';

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Appli déjà installée (ouverte en fenêtre autonome) ? */
export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export function isIosLike(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent, platform = typeof navigator === 'undefined' ? '' : navigator.platform, touch = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints): boolean {
  return /iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && touch > 1);
}

export function installState(): InstallState {
  if (isStandalone()) return 'installed';
  if (deferred) return 'available';
  if (isIosLike()) return 'ios';
  return 'unsupported';
}

/** À appeler une fois au démarrage. */
export function initInstall(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  try {
    await deferred.prompt();
    const r = await deferred.userChoice;
    deferred = null;
    notify();
    return r.outcome === 'accepted';
  } catch {
    return false;
  }
}
