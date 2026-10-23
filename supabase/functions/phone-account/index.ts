/**
 * Comptes par numéro de téléphone — Supabase Edge Function (Deno), fichier unique.
 *
 *   signup   crée un compte élève (12 ans et plus) avec numéro + mot de passe, renvoie un code de récupération
 *   recover  change le mot de passe avec le numéro + le code de récupération (puis renvoie un NOUVEAU code)
 *
 * Pourquoi une fonction serveur : créer un compte sans e-mail réel demande la clé de service de Supabase,
 * qui ne doit JAMAIS être dans le navigateur.
 *
 * Sécurité : le numéro n'est pas vérifié par SMS. Anti-abus : 10 inscriptions par heure et par adresse réseau,
 * 5 codes faux par heure et par numéro. À la récupération, les messages d'erreur ne révèlent pas si un numéro
 * existe. Les moins de 12 ans n'utilisent JAMAIS cette fonction : leur adulte crée leur compte (manage-child).
 */

// deno-lint-ignore no-explicit-any
declare const Deno: any;

export type Lang = 'fr' | 'en';

export const E164_RE = /^\+\d{8,15}$/;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;
export const MAX_NAME = 60;
export const SIGNUPS_PER_HOUR = 10;
export const RECOVER_FAILS_PER_HOUR = 5;
// 32 caractères sans 0/O/1/I : un octet aléatoire modulo 32 ne crée aucun biais.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface Deps {
  config: { emailDomain: string; allowedOrigin: string };
  now(): number;
  randomByte(): number;
  hash(value: string): Promise<string>;
  /** Nombre d'essais de ce type pour cette clé (hachée) depuis `sinceIso`. */
  countAttempts(kind: 'signup' | 'recover_fail', keyHash: string, sinceIso: string): Promise<number>;
  addAttempt(kind: 'signup' | 'recover_fail', keyHash: string): Promise<void>;
  createAuthUser(p: { email: string; password: string; fullName: string; lang: Lang }): Promise<{ id: string } | { error: 'taken' | 'other' }>;
  deleteAuthUser(id: string): Promise<void>;
  findUserIdByEmail(email: string): Promise<string | null>;
  setPassword(id: string, password: string): Promise<void>;
  getCodeHash(userId: string): Promise<string | null>;
  saveCodeHash(userId: string, codeHash: string): Promise<void>;
  /** L'utilisateur est-il un compte enfant supervisé ? (ils ne récupèrent jamais leur compte par numéro) */
  isChildAccount(userId: string): Promise<boolean>;
}

const MSG = {
  fr: {
    badRequest: 'Demande invalide.',
    phone: "Numéro invalide. Écris-le avec l'indicatif du pays, par exemple +224 627 99 86 79.",
    password: `Mot de passe invalide : entre ${MIN_PASSWORD} et ${MAX_PASSWORD} caractères.`,
    name: 'Indique ton nom.',
    age: 'Il faut avoir 12 ans ou plus. Pour un enfant de moins de 12 ans, un adulte crée son compte depuis « Famille ».',
    taken: 'Ce numéro est déjà utilisé. Connecte-toi, ou utilise ton code de récupération si tu as oublié ton mot de passe.',
    tooMany: 'Trop d’essais. Réessaie dans une heure.',
    badCode: 'Numéro ou code de récupération incorrect.',
    server: 'Erreur du serveur. Réessaie dans un instant.',
  },
  en: {
    badRequest: 'Invalid request.',
    phone: 'Invalid number. Write it with the country code, for example +224 627 99 86 79.',
    password: `Invalid password: between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters.`,
    name: 'Enter your name.',
    age: 'You must be 12 or older. For a child under 12, an adult creates their account from "Family".',
    taken: 'This number is already in use. Sign in, or use your recovery code if you forgot your password.',
    tooMany: 'Too many attempts. Try again in an hour.',
    badCode: 'Incorrect number or recovery code.',
    server: 'Server error. Please try again in a moment.',
  },
} as const;

function cors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
function json(status: number, body: unknown, origin: string): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
}

export function phoneEmail(e164: string, domain: string): string {
  return `${e164.replace(/\D/g, '')}@${domain}`;
}

/** Code de récupération saisi à la main : majuscules, sans tirets ni espaces. */
export function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** 12 caractères groupés par 4 : XXXX-XXXX-XXXX. */
export function generateCode(randomByte: () => number): string {
  let out = '';
  for (let i = 0; i < 12; i++) out += CODE_ALPHABET[randomByte() % CODE_ALPHABET.length];
  return out.replace(/(.{4})(?=.)/g, '$1-');
}

/** Numéro envoyé par le navigateur : « +224 627 99 86 79 » → « +224627998679 » ; null si invalide. */
export function cleanPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!/^\+[\d\s.()-]+$/.test(t)) return null;
  const p = `+${t.replace(/\D/g, '')}`;
  return E164_RE.test(p) ? p : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = deps.config.allowedOrigin;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed', code: 'method' }, origin);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: MSG.fr.badRequest, code: 'bad_request' }, origin);
  }
  const lang: Lang = body?.language === 'en' ? 'en' : 'fr';
  const m = MSG[lang];
  const action = typeof body?.action === 'string' ? body.action : '';
  const hourAgo = new Date(deps.now() - 3600_000).toISOString();

  try {
    const phone = cleanPhone(body?.phone);
    if (!phone) return json(400, { error: m.phone, code: 'bad_phone' }, origin);
    const email = phoneEmail(phone, deps.config.emailDomain);
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return json(400, { error: m.password, code: 'bad_password' }, origin);

    if (action === 'signup') {
      const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, MAX_NAME) : '';
      if (!fullName) return json(400, { error: m.name, code: 'bad_name' }, origin);
      if (body.age_confirmed !== true) return json(400, { error: m.age, code: 'age_required' }, origin);

      const ip = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim();
      const ipKey = await deps.hash(`ip:${ip}`);
      if ((await deps.countAttempts('signup', ipKey, hourAgo)) >= SIGNUPS_PER_HOUR) return json(429, { error: m.tooMany, code: 'too_many' }, origin);
      await deps.addAttempt('signup', ipKey);

      const created = await deps.createAuthUser({ email, password, fullName, lang });
      if ('error' in created) {
        if (created.error === 'taken') return json(409, { error: m.taken, code: 'phone_taken' }, origin);
        return json(500, { error: m.server, code: 'server' }, origin);
      }
      const code = generateCode(deps.randomByte);
      try {
        await deps.saveCodeHash(created.id, await deps.hash(cleanCode(code)));
      } catch (e) {
        // Pas de compte sans code de récupération : on annule la création.
        await deps.deleteAuthUser(created.id).catch(() => undefined);
        throw e;
      }
      return json(200, { ok: true, recovery_code: code }, origin);
    }

    if (action === 'recover') {
      const code = typeof body.code === 'string' ? cleanCode(body.code) : '';
      const phoneKey = await deps.hash(`tel:${phone}`);
      if ((await deps.countAttempts('recover_fail', phoneKey, hourAgo)) >= RECOVER_FAILS_PER_HOUR) return json(429, { error: m.tooMany, code: 'too_many' }, origin);

      const userId = await deps.findUserIdByEmail(email);
      const stored = userId ? await deps.getCodeHash(userId) : null;
      const given = await deps.hash(code);
      const ok = !!userId && !!stored && code.length === 12 && timingSafeEqual(stored, given) && !(await deps.isChildAccount(userId));
      if (!ok) {
        await deps.addAttempt('recover_fail', phoneKey);
        return json(400, { error: m.badCode, code: 'bad_code' }, origin);
      }
      await deps.setPassword(userId as string, password);
      const fresh = generateCode(deps.randomByte);
      await deps.saveCodeHash(userId as string, await deps.hash(cleanCode(fresh)));
      return json(200, { ok: true, recovery_code: fresh }, origin);
    }

    return json(400, { error: m.badRequest, code: 'bad_request' }, origin);
  } catch {
    return json(500, { error: m.server, code: 'server' }, origin);
  }
}

export function makeDeps(): Deps {
  const env = (k: string) => Deno.env.get(k) as string | undefined;
  const url = (env('SUPABASE_URL') || '').replace(/\/$/, '');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') || '';
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const rest = (path: string, init: RequestInit = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  const authAdmin = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/auth/v1/admin/${path}`, { ...init, headers: { ...h, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const salt = env('PHONE_HASH_SALT') || serviceKey.slice(0, 16);

  return {
    config: { emailDomain: env('PHONE_EMAIL_DOMAIN') || 'tel.rythmebinaire.invalid', allowedOrigin: env('ALLOWED_ORIGIN') || '*' },
    now: () => Date.now(),
    randomByte() {
      const b = new Uint8Array(1);
      crypto.getRandomValues(b);
      return b[0];
    },
    async hash(value) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${value}`));
      return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join('');
    },
    async countAttempts(kind, keyHash, sinceIso) {
      const r = await rest(`phone_attempts?kind=eq.${kind}&key_hash=eq.${keyHash}&created_at=gt.${encodeURIComponent(sinceIso)}&select=id`, {
        headers: { Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
      });
      if (!r.ok) throw new Error('count failed');
      return Number((r.headers.get('content-range') || '').split('/')[1]) || 0;
    },
    async addAttempt(kind, keyHash) {
      await rest('phone_attempts', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ kind, key_hash: keyHash }) });
    },
    async createAuthUser({ email, password, fullName, lang }) {
      const r = await authAdmin('users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true, // aucun e-mail n'est envoyé : l'adresse est interne
          user_metadata: { full_name: fullName, preferred_language: lang, role: 'eleve', age_confirmed_12: true, signup_method: 'phone' },
        }),
      });
      if (r.ok) {
        const u = await r.json();
        return u?.id ? { id: u.id as string } : { error: 'other' };
      }
      return { error: r.status === 422 || r.status === 409 ? 'taken' : 'other' };
    },
    async deleteAuthUser(id) {
      await authAdmin(`users/${id}`, { method: 'DELETE' });
    },
    async findUserIdByEmail(email) {
      const r = await rest(`users?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
      const rows = r.ok ? ((await r.json()) as { id: string }[]) : [];
      return rows[0]?.id ?? null;
    },
    async setPassword(id, password) {
      const r = await authAdmin(`users/${id}`, { method: 'PUT', body: JSON.stringify({ password }) });
      if (!r.ok) throw new Error('password update failed');
    },
    async getCodeHash(userId) {
      const r = await rest(`phone_recovery?user_id=eq.${userId}&select=code_hash&limit=1`);
      const rows = r.ok ? ((await r.json()) as { code_hash: string }[]) : [];
      return rows[0]?.code_hash ?? null;
    },
    async saveCodeHash(userId, codeHash) {
      const r = await rest('phone_recovery?on_conflict=user_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: userId, code_hash: codeHash, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error('save code failed');
    },
    async isChildAccount(userId) {
      const r = await rest(`guardian_links?child_id=eq.${userId}&select=child_id&limit=1`);
      if (!r.ok) return false; // table absente (enfants.sql non lancé) : aucun compte enfant
      return ((await r.json()) as unknown[]).length > 0;
    },
  };
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req: Request) => handle(req, makeDeps()));
}
