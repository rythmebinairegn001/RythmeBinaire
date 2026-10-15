/**
 * Envoi des notifications par e-mail — Supabase Edge Function (Deno), fichier unique.
 *
 * Appelée toutes les 5 minutes par la planification de Supabase (Cron) avec l'en-tête x-cron-secret.
 * À chaque appel :
 *   1. crée les rappels de séances qui commencent dans moins de 2 h (queue_session_reminders) ;
 *   2. envoie par e-mail les notifications des 2 derniers jours pas encore envoyées.
 * Jamais d'e-mail vers : un compte enfant (adresse interne en .invalid), une personne qui a coupé les e-mails.
 * Sans clé d'envoi (RESEND_API_KEY), rien n'est envoyé ni marqué : les notifications restent dans le site.
 */

// deno-lint-ignore no-explicit-any
declare const Deno: any;

export interface Pending {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
}
export interface Recipient {
  id: string;
  email: string | null;
  emailOptOut: boolean;
}
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}
export interface Deps {
  config: { cronSecret: string; apiKey: string; from: string; siteUrl: string; batch: number };
  queueReminders(): Promise<number>;
  fetchPending(limit: number): Promise<Pending[]>;
  getRecipients(userIds: string[]): Promise<Recipient[]>;
  send(mail: Mail): Promise<boolean>;
  markEmailed(ids: string[]): Promise<void>;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Adresse utilisable pour un vrai e-mail ? (les comptes enfants ont une adresse interne en .invalid) */
export function isDeliverable(email: string | null | undefined): email is string {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/\.invalid$/i.test(email);
}

export function buildMail(to: string, n: Pending, siteUrl: string): Mail {
  const body = (n.body || '').trim();
  const text = `${body ? body + '\n\n' : ''}${siteUrl}`;
  const html = `<p><strong>${escapeHtml(n.title)}</strong></p>${body ? `<p style="white-space:pre-wrap">${escapeHtml(body)}</p>` : ''}<p><a href="${escapeHtml(siteUrl)}">RythmeBinaireGn</a></p>`;
  return { to, subject: n.title, text, html };
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const { cronSecret, apiKey, from, siteUrl, batch } = deps.config;
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) return json(401, { error: 'unauthorized' });

  let reminders = 0;
  try {
    reminders = await deps.queueReminders();
  } catch {
    // les rappels ne doivent jamais bloquer l'envoi des autres e-mails
  }

  if (!apiKey || !from) return json(200, { reminders, sent: 0, skipped: 'no_api_key' });

  const pending = await deps.fetchPending(batch);
  if (!pending.length) return json(200, { reminders, sent: 0 });
  const recipients = new Map((await deps.getRecipients([...new Set(pending.map((p) => p.user_id))])).map((r) => [r.id, r]));

  const done: string[] = [];
  let sent = 0;
  for (const n of pending) {
    const r = recipients.get(n.user_id);
    if (!r || r.emailOptOut || !isDeliverable(r.email)) {
      done.push(n.id); // rien à envoyer : on ne réessaie pas
      continue;
    }
    let ok = false;
    try {
      ok = await deps.send(buildMail(r.email, n, siteUrl));
    } catch {
      ok = false;
    }
    if (ok) {
      done.push(n.id);
      sent++;
    } // sinon : on réessaiera au prochain passage
  }
  if (done.length) await deps.markEmailed(done);
  return json(200, { reminders, sent, skipped_or_failed: pending.length - sent });
}

export function makeDeps(): Deps {
  const env = (k: string) => Deno.env.get(k) as string | undefined;
  const url = (env('SUPABASE_URL') || '').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || '';
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = (path: string, init: RequestInit = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  const apiKey = env('RESEND_API_KEY') || '';
  const from = env('MAIL_FROM') || '';

  return {
    config: { cronSecret: env('CRON_SECRET') || '', apiKey, from, siteUrl: env('SITE_URL') || '', batch: 50 },
    async queueReminders() {
      const r = await fetch(`${url}/rest/v1/rpc/queue_session_reminders`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) throw new Error('reminders failed');
      return Number(await r.json()) || 0;
    },
    async fetchPending(limit) {
      const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
      const r = await rest(`notifications?emailed_at=is.null&created_at=gt.${encodeURIComponent(since)}&select=id,user_id,title,body&order=created_at.asc&limit=${limit}`);
      if (!r.ok) throw new Error('fetch failed');
      return (await r.json()) as Pending[];
    },
    async getRecipients(ids) {
      const list = ids.map((i) => `"${i}"`).join(',');
      const [u, p] = await Promise.all([rest(`users?id=in.(${list})&select=id,email`), rest(`notification_prefs?user_id=in.(${list})&select=user_id,email`)]);
      const users = u.ok ? ((await u.json()) as { id: string; email: string | null }[]) : [];
      const prefs = new Map((p.ok ? ((await p.json()) as { user_id: string; email: boolean }[]) : []).map((x) => [x.user_id, x.email]));
      return users.map((x) => ({ id: x.id, email: x.email, emailOptOut: prefs.get(x.id) === false }));
    },
    async send(mail) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      });
      return r.ok;
    },
    async markEmailed(ids) {
      const r = await rest(`notifications?id=in.(${ids.map((i) => `"${i}"`).join(',')})`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ emailed_at: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error('mark failed');
    },
  };
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req: Request) => handle(req, makeDeps()));
}
