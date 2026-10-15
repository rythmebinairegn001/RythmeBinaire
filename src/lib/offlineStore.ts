import type { PublicCourseItem } from '../data/coursesData';
import type { DetailedModule } from '../data/lessonsData';
import type { ExerciseTest, UserProfile } from '../types/database';

/**
 * Copie locale (sur l'appareil) de ce que le site a déjà chargé, pour lire sans connexion.
 * Aucune donnée en plus n'est téléchargée : on garde ce qui a de toute façon été reçu en ligne.
 *  - le catalogue des cours publiés + le texte de leurs leçons (public, le même pour tous) ;
 *  - les tests d'un exercice, au moment où l'élève l'ouvre ;
 *  - le profil de base de la dernière session (pour pouvoir rouvrir l'espace élève hors connexion).
 * Le stockage est IndexedDB ; si le navigateur le refuse (navigation privée…), tout continue de
 * marcher normalement, simplement sans copie locale.
 */

export interface KV {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface CatalogSnapshot {
  savedAt: string;
  courses: PublicCourseItem[];
  modules: Record<string, DetailedModule[]>;
}

export type CachedProfile = Pick<UserProfile, 'id' | 'email' | 'full_name' | 'role' | 'preferred_language' | 'created_at' | 'status'>;

const CATALOG_KEY = 'catalog';
const TESTS_PREFIX = 'tests:';
const PROFILE_KEY = 'rb_last_profile'; // localStorage : lisible tout de suite au démarrage

export function memoryBackend(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async (k) => m.get(k),
    set: async (k, v) => void m.set(k, JSON.parse(JSON.stringify(v))),
    del: async (k) => void m.delete(k),
    keys: async () => [...m.keys()],
  };
}

export function idbBackend(dbName = 'rb-offline'): KV {
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () =>
    (dbp ||= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const r = fn(db.transaction('kv', mode).objectStore('kv'));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  };
  return {
    get: (k) => run('readonly', (s) => s.get(k)),
    set: async (k, v) => void (await run('readwrite', (s) => s.put(v, k))),
    del: async (k) => void (await run('readwrite', (s) => s.delete(k))),
    keys: async () => (await run('readonly', (s) => s.getAllKeys())).map(String),
  };
}

let backend: KV | null = null;
/** Pour les tests : remplace le stockage. */
export function setBackend(b: KV | null): void {
  backend = b;
}
function kv(): KV | null {
  if (backend) return backend;
  try {
    if (typeof indexedDB === 'undefined') return null;
    backend = idbBackend();
    return backend;
  } catch {
    return null;
  }
}

async function safe<T>(fn: (b: KV) => Promise<T>, fallback: T): Promise<T> {
  const b = kv();
  if (!b) return fallback;
  try {
    return await fn(b);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------- catalogue

export const saveCatalog = (courses: PublicCourseItem[], modules: Record<string, DetailedModule[]>, now: Date = new Date()): Promise<void> =>
  safe(async (b) => b.set(CATALOG_KEY, { savedAt: now.toISOString(), courses, modules } satisfies CatalogSnapshot), undefined);

export const loadCatalog = (): Promise<CatalogSnapshot | null> =>
  safe(async (b) => {
    const v = (await b.get(CATALOG_KEY)) as CatalogSnapshot | undefined;
    return v && Array.isArray(v.courses) && v.courses.length > 0 && v.modules ? v : null;
  }, null);

// ---------------------------------------------------------------- tests d'exercices

export const saveTests = (exerciseId: string, tests: ExerciseTest[]): Promise<void> =>
  safe(async (b) => b.set(TESTS_PREFIX + exerciseId, tests), undefined);

export const loadTests = (exerciseId: string): Promise<ExerciseTest[] | null> =>
  safe(async (b) => {
    const v = (await b.get(TESTS_PREFIX + exerciseId)) as ExerciseTest[] | undefined;
    return Array.isArray(v) && v.length > 0 ? v : null;
  }, null);

// ---------------------------------------------------------------- profil (localStorage)

export function saveProfile(p: CachedProfile): void {
  try {
    const { id, email, full_name, role, preferred_language, created_at, status } = p;
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ id, email, full_name, role, preferred_language, created_at, status }));
  } catch {
    /* sans importance */
  }
}

/** Profil de la dernière session, seulement pour un compte élève (jamais l'admin hors connexion). */
export function loadProfile(): CachedProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CachedProfile;
    return p && typeof p.id === 'string' && p.role === 'eleve' ? p : null;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* sans importance */
  }
}

// ---------------------------------------------------------------- gestion

export interface OfflineInfo {
  savedAt: string | null;
  courseCount: number;
  lessonCount: number;
  testsCount: number;
  approxKb: number;
}

export async function offlineInfo(): Promise<OfflineInfo> {
  const snap = await loadCatalog();
  const keys = await safe((b) => b.keys(), [] as string[]);
  const lessonCount = snap ? Object.values(snap.modules).reduce((n, mods) => n + mods.reduce((m, x) => m + x.lessons.length, 0), 0) : 0;
  const approxKb = snap ? Math.ceil(JSON.stringify(snap).length / 1024) : 0;
  return { savedAt: snap?.savedAt ?? null, courseCount: snap?.courses.length ?? 0, lessonCount, testsCount: keys.filter((k) => k.startsWith(TESTS_PREFIX)).length, approxKb };
}

/** Efface la copie locale (catalogue, tests, profil). */
export async function clearOfflineData(): Promise<void> {
  const keys = await safe((b) => b.keys(), [] as string[]);
  for (const k of keys) await safe((b) => b.del(k), undefined);
  clearProfile();
}
