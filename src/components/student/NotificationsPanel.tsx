import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { PreferredLanguage } from '../../types/database';
import { AppNotification, listMyNotifications, loadEmailPref, markRead, setEmailPref, timeAgo, unreadCount } from '../../services/notificationService';

/** Affichage pur (testable). */
export const NotificationsView: React.FC<{
  lang: PreferredLanguage;
  items: AppNotification[];
  emailOn: boolean;
  canEmail: boolean;
  onMarkAll: () => void;
  onToggleEmail: (v: boolean) => void;
  now?: Date;
}> = ({ lang, items, emailOn, canEmail, onMarkAll, onToggleEmail, now = new Date() }) => {
  const fr = lang === 'fr';
  const unread = unreadCount(items);
  return (
    <section id="notifications-panel" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3" aria-label="Notifications">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Notifications
          {unread > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px]">{unread}</span>}
        </h2>
        {unread > 0 && (
          <button type="button" className="text-xs font-semibold underline text-slate-600" onClick={onMarkAll}>
            {fr ? 'Tout marquer comme lu' : 'Mark all as read'}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.slice(0, 6).map((n) => (
          <li key={n.id} className={`rounded-xl border px-3 py-2 text-sm ${n.read_at ? 'bg-white border-slate-200 text-slate-600' : 'bg-emerald-50 border-emerald-200 text-emerald-950'}`}>
            <div className="flex justify-between gap-3">
              <span className="font-semibold">{n.title}</span>
              <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(n.created_at, lang, now)}</span>
            </div>
            {n.body && <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">{n.body}</p>}
          </li>
        ))}
      </ul>
      {canEmail && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={emailOn} onChange={(e) => onToggleEmail(e.target.checked)} />
          {fr ? 'Recevoir aussi mes notifications par e-mail' : 'Also receive my notifications by e-mail'}
        </label>
      )}
    </section>
  );
};

/**
 * Panneau de notifications du tableau de bord. Caché s'il n'y a rien à montrer ou si le script SQL
 * n'est pas exécuté. Se met à jour toutes les 2 minutes (léger) et au retour sur l'onglet.
 */
export const NotificationsPanel: React.FC<{ userId: string; lang: PreferredLanguage; hasEmail?: boolean }> = ({ userId, lang, hasEmail = true }) => {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [emailOn, setEmailOn] = useState(true);

  const load = useCallback(async () => setItems(await listMyNotifications(userId)), [userId]);

  useEffect(() => {
    load();
    loadEmailPref(userId).then(setEmailOn);
    const timer = setInterval(load, 120_000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, load]);

  if (!items || items.length === 0) return null;
  return (
    <NotificationsView
      lang={lang}
      items={items}
      emailOn={emailOn}
      canEmail={hasEmail}
      onMarkAll={async () => {
        const ids = items.filter((n) => !n.read_at).map((n) => n.id);
        try {
          await markRead(ids);
        } catch {
          /* pas grave : on réessaiera au prochain clic */
        }
        await load();
      }}
      onToggleEmail={async (v) => {
        setEmailOn(v);
        try {
          await setEmailPref(userId, v);
        } catch {
          setEmailOn(!v);
        }
      }}
    />
  );
};
