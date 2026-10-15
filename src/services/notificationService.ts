import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Notifications (voir supabase/notifications.sql). Elles sont créées par la base (déclencheurs) ;
 * ici on les lit, on les marque comme lues et on gère la préférence « recevoir aussi par e-mail ».
 */

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

export function unreadCount(list: Pick<AppNotification, 'read_at'>[]): number {
  return list.filter((n) => !n.read_at).length;
}

/** « il y a 5 min », « hier », « 12 oct. » — court, sans bibliothèque. */
export function timeAgo(iso: string, lang: 'fr' | 'en', now: Date = new Date()): string {
  const fr = lang === 'fr';
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return fr ? "à l'instant" : 'just now';
  if (min < 60) return fr ? `il y a ${min} min` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return fr ? `il y a ${h} h` : `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return fr ? 'hier' : 'yesterday';
  if (d < 7) return fr ? `il y a ${d} jours` : `${d} days ago`;
  return new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
}

/** Les 20 dernières notifications. Renvoie null si le script SQL n'est pas encore exécuté (le panneau reste caché). */
export async function listMyNotifications(userId: string): Promise<AppNotification[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, kind, title, body, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return null;
    return (data || []) as AppNotification[];
  } catch {
    return null;
  }
}

export async function markRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
  if (error) throw new Error(error.message);
}

/** Recevoir aussi par e-mail ? (oui par défaut) */
export async function loadEmailPref(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('notification_prefs').select('email').eq('user_id', userId).maybeSingle();
    return (data as { email: boolean } | null)?.email !== false;
  } catch {
    return true;
  }
}

export async function setEmailPref(userId: string, email: boolean): Promise<void> {
  const { error } = await supabase.from('notification_prefs').upsert({ user_id: userId, email }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
