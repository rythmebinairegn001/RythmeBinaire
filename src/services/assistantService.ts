import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Mansara AI intégré : appelle la fonction Supabase « assistant-chat » avec le jeton de connexion de l'élève.
 * Adresse : VITE_ASSISTANT_API_URL, ou (par défaut) la même que le tuteur avec « assistant-chat » à la place
 * de « tutor-hint » — donc rien de plus à régler sur Vercel si le tuteur est déjà branché.
 */
export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantContext {
  course?: string;
  lesson?: string;
}

export const ASSISTANT_MAX_CHARS = 1000;

export function getAssistantUrl(): string | null {
  const explicit = (import.meta.env?.VITE_ASSISTANT_API_URL as string | undefined)?.trim();
  if (explicit) return /^https:\/\/\S+$/i.test(explicit) ? explicit : null;
  const tutor = (import.meta.env?.VITE_TUTOR_API_URL as string | undefined)?.trim();
  if (tutor && /\/tutor-hint\/?$/.test(tutor)) return tutor.replace(/\/tutor-hint\/?$/, '/assistant-chat');
  return null;
}

export async function askAssistant(
  message: string,
  history: AssistantTurn[],
  context?: AssistantContext,
): Promise<{ answer: string; remaining_today: number | null }> {
  const url = getAssistantUrl();
  if (!url || !isSupabaseConfigured()) throw new Error('not_configured');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Reconnecte-toi pour parler à Mansara AI.');
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ message, history: history.slice(-6), context }),
    });
  } catch {
    throw new Error('Impossible de joindre Mansara AI. Vérifie ta connexion et réessaie.');
  }
  const payload = (await resp.json().catch(() => null)) as { answer?: string; remaining_today?: number; error?: string } | null;
  if (!resp.ok || !payload || typeof payload.answer !== 'string') {
    throw new Error(payload?.error || 'Mansara AI est momentanément indisponible.');
  }
  return { answer: payload.answer, remaining_today: typeof payload.remaining_today === 'number' ? payload.remaining_today : null };
}
