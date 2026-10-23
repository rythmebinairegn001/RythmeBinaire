import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Chat de classe (voir supabase/chat-classes.sql). Tout passe par des fonctions serveur. */

export interface ChatRoom {
  class_id: string;
  class_name: string;
  teacher_name: string;
  is_teacher: boolean;
  member_count: number;
  last_at: string | null;
}

export interface ChatMessage {
  id: string;
  author_id: string;
  author_name: string;
  is_teacher: boolean;
  body: string;
  created_at: string;
  mine: boolean;
  reports: number;
  author_muted: boolean;
}

export type ChatError = 'not_allowed' | 'muted' | 'empty' | 'link' | 'personal_info' | 'rate_limited' | 'not_found' | 'own_message' | 'unavailable';

export const CHAT_ERRORS: Record<ChatError, { fr: string; en: string }> = {
  not_allowed: { fr: "Tu n'as pas accès à ce salon.", en: 'You do not have access to this room.' },
  muted: { fr: 'Ton professeur a mis ton micro en sourdine : tu peux lire mais pas écrire.', en: 'Your teacher muted you: you can read but not write.' },
  empty: { fr: 'Écris un message (1000 caractères maximum).', en: 'Write a message (1000 characters max).' },
  link: { fr: 'Les liens ne sont pas autorisés dans le chat.', en: 'Links are not allowed in the chat.' },
  personal_info: { fr: "Pas d'e-mail ni de numéro de téléphone dans le chat (pour ta sécurité).", en: 'No email or phone number in the chat (for your safety).' },
  rate_limited: { fr: 'Tu écris trop vite. Attends un peu.', en: 'You are writing too fast. Wait a moment.' },
  not_found: { fr: 'Ce message n’existe plus.', en: 'This message no longer exists.' },
  own_message: { fr: 'Tu ne peux pas signaler ton propre message.', en: 'You cannot report your own message.' },
  unavailable: { fr: 'Chat indisponible pour le moment. Réessaie plus tard.', en: 'Chat unavailable right now. Try again later.' },
};

export const CHAT_MAX_LENGTH = 1000;
export const CHAT_POLL_MS = 8000;

export function toChatError(message: string | undefined): ChatError {
  const m = message || '';
  return (Object.keys(CHAT_ERRORS) as ChatError[]).find((k) => k !== 'unavailable' && m.includes(k)) ?? 'unavailable';
}

/** Ajoute les nouveaux messages à la liste (sans doublon, ordre par date). Fonction pure. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (!incoming.length) return current;
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-200);
}

/** Un salon a-t-il du nouveau depuis ma dernière visite ? (hors mes propres messages : on ne le sait pas ici, c'est un simple repère) */
export function hasNew(room: ChatRoom, seenAt: string | null): boolean {
  return !!room.last_at && (!seenAt || room.last_at > seenAt);
}

const SEEN_KEY = 'rb_chat_seen';
export function loadSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
export function markSeen(classId: string, at: string): void {
  try {
    const s = loadSeen();
    s[classId] = at;
    localStorage.setItem(SEEN_KEY, JSON.stringify(s));
  } catch {
    /* sans stockage, le repère « nouveau » reste simplement affiché */
  }
}

export async function listRooms(): Promise<ChatRoom[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.rpc('class_chat_summary');
  if (error) return null;
  return (data || []) as ChatRoom[];
}

export async function listMessages(classId: string, since: string | null): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('class_chat_list', { p_class: classId, p_since: since });
  if (error) throw new Error(error.message);
  return (data || []) as ChatMessage[];
}

async function call(fn: string, args: Record<string, unknown>): Promise<ChatError | null> {
  const { error } = await supabase.rpc(fn, args);
  return error ? toChatError(error.message) : null;
}

export const postMessage = (classId: string, body: string) => call('class_chat_post', { p_class: classId, p_body: body });
export const deleteMessage = (id: string) => call('class_chat_delete', { p_message: id });
export const reportMessage = (id: string) => call('class_chat_report', { p_message: id });
export const muteMember = (classId: string, studentId: string, muted: boolean) => call('class_chat_mute', { p_class: classId, p_student: studentId, p_muted: muted });
