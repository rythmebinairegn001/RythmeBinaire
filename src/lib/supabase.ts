import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'rythmebinaire_supabase_url';
const STORAGE_KEY_ANON = 'rythmebinaire_supabase_anon_key';

export function getSupabaseConfig(): { url: string; anonKey: string; isFromEnv: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey && !envUrl.includes('your-project-ref')) {
    return { url: envUrl, anonKey: envKey, isFromEnv: true };
  }

  const localUrl = localStorage.getItem(STORAGE_KEY_URL)?.trim() || '';
  const localKey = localStorage.getItem(STORAGE_KEY_ANON)?.trim() || '';

  return {
    url: localUrl,
    anonKey: localKey,
    isFromEnv: false,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  // Reload window to reinitialize client
  window.location.reload();
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  window.location.reload();
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
}

// Fallback dummy client if not configured so the app doesn't crash on load
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const config = getSupabaseConfig();
  const url = isSupabaseConfigured() ? config.url : 'https://placeholder.supabase.co';
  const anonKey = isSupabaseConfigured() ? config.anonKey : 'placeholder-anon-key';

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

export const supabase = getSupabaseClient();
