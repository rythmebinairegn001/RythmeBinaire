/**
 * Comptes enfants supervisés — Supabase Edge Function (Deno), fichier unique.
 *
 * Seul un adulte connecté (qui n'est pas lui-même un compte enfant) peut :
 *   create         créer le compte d'un enfant (identifiant + mot de passe choisis par l'adulte)
 *   reset_password changer le mot de passe d'un de SES enfants
 *   set_suspended  suspendre / réactiver l'accès d'un de SES enfants
 *   set_ai         autoriser / interdire le tuteur IA pour un de SES enfants
 *   delete         supprimer le compte d'un de SES enfants (définitif)
 *
 * Pourquoi une fonction serveur : créer un compte sans e-mail demande la clé de service
 * de Supabase, qui ne doit JAMAIS être dans le navigateur. Le navigateur ne fait que demander ;
 * le serveur vérifie qui demande et que l'enfant appartient bien à cet adulte.
 *
 * Données minimales : on ne demande NI âge, NI e-mail, NI téléphone pour l'enfant.
 * L'e-mail interne est fabriqué (identifiant@domaine réservé) et ne reçoit jamais de courrier.
 */

// deno-lint-ignore no-explicit-any
declare const Deno: any;

export type Lang = 'fr' | 'en';

export const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,19}$/;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;
export const MAX_NAME = 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Link {
  child_id: string;
  guardian_id: string;
  username: string;
  ai_allowed: boolean;
  suspended: boolean;
}

export interface Deps {
  config: { childLimit: number; emailDomain: string; allowedOrigin: string };
  getUser(token: string): Promise<{ id: string } | null>;
  getUserLang(userId: string): Promise<Lang>;
  /** Le lien où cet utilisateur est l'ENFANT (null si c'est un adulte). */
  getLinkAsChild(userId: string): Promise<Link | null>;
  getLink(childId: string): Promise<Link | null>;
  countChildren(guardianId: string): Promise<number>;
  usernameTaken(username: string): Promise<boolean>;
  createAuthUser(p: { email: string; password: string; fullName: string; lang: Lang }): Promise<{ id: string } | { error: string }>;
  insertLink(row: Link): Promise<void>;
  updateAuthUser(id: string, patch: { password?: string; banned?: boolean }): Promise<void>;
  updateLink(childId: string, patch: Partial<Pick<Link, 'ai_allowed' | 'suspended'>>): Promise<void>;
  deleteAuthUser(id: string): Promise<void>;
}

const MSG = {
  fr: {
    unauthorized: 'Connecte-toi pour continuer.',
    badRequest: 'Demande invalide.',
    childForbidden: "Un compte enfant ne peut pas gérer d'autres comptes.",
    limit: (n: number) => `Tu as atteint la limite de ${n} comptes enfants. Contacte-nous si tu en as besoin de plus.`,
    username: "Identifiant invalide : 3 à 20 caractères, en minuscules, chiffres, point, tiret ou tiret bas (sans espace ni accent).",
    password: `Mot de passe invalide : entre ${MIN_PASSWORD} et ${MAX_PASSWORD} caractères.`,
    name: 'Indique le prénom de l’enfant.',
    taken: 'Cet identifiant est déjà pris. Essaie-en un autre.',
    notYours: 'Ce compte enfant est introuvable.',
    server: 'Erreur du serveur. Réessaie dans un instant.',
  },
  en: {
    unauthorized: 'Please sign in to continue.',
    badRequest: 'Invalid request.',
    childForbidden: 'A child account cannot manage other accounts.',
    limit: (n: number) => `You have reached the limit of ${n} child accounts. Contact us if you need more.`,
    username: 'Invalid username: 3 to 20 characters, lowercase letters, digits, dot, dash or underscore (no spaces or accents).',
    password: `Invalid password: between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters.`,
    name: "Enter the child's first name.",
    taken: 'This username is already taken. Try another one.',
    notYours: 'Child account not found.',
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

export function childEmail(username: string, domain: string): string {
  return `${username}@${domain}`;
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = deps.config.allowedOrigin;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed', code: 'method' }, origin);

  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const caller = token ? await deps.getUser(token).catch(() => null) : null;
  if (!caller) return json(401, { error: MSG.fr.unauthorized, code: 'unauthorized' }, origin);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: MSG.fr.badRequest, code: 'bad_request' }, origin);
  }
  const action = typeof body?.action === 'string' ? body.action : '';
  const lang = await deps.getUserLang(caller.id).catch(() => 'fr' as Lang);
  const m = MSG[lang];

  try {
    // Un compte enfant ne peut jamais gérer d'autres comptes.
    if (await deps.getLinkAsChild(caller.id)) return json(403, { error: m.childForbidden, code: 'child_forbidden' }, origin);

    if (action === 'create') {
      const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, MAX_NAME) : '';
      const childLang: Lang = body.language === 'en' ? 'en' : 'fr';
      if (!USERNAME_RE.test(username)) return json(400, { error: m.username, code: 'bad_username' }, origin);
      if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return json(400, { error: m.password, code: 'bad_password' }, origin);
      if (!fullName) return json(400, { error: m.name, code: 'bad_name' }, origin);

      if ((await deps.countChildren(caller.id)) >= deps.config.childLimit)
        return json(409, { error: m.limit(deps.config.childLimit), code: 'limit' }, origin);
      if (await deps.usernameTaken(username)) return json(409, { error: m.taken, code: 'username_taken' }, origin);

      const created = await deps.createAuthUser({
        email: childEmail(username, deps.config.emailDomain),
        password,
        fullName,
        lang: childLang,
      });
      if ('error' in created) return json(409, { error: m.taken, code: 'username_taken' }, origin);

      const link: Link = { child_id: created.id, guardian_id: caller.id, username, ai_allowed: false, suspended: false };
      try {
        await deps.insertLink(link);
      } catch (e) {
        // Pas de compte « orphelin » sans adulte responsable : on annule la création.
        await deps.deleteAuthUser(created.id).catch(() => undefined);
        throw e;
      }
      return json(200, { ok: true, child: { ...link, full_name: fullName } }, origin);
    }

    // Les autres actions concernent un enfant EXISTANT qui doit appartenir à cet adulte.
    const childId = typeof body.child_id === 'string' ? body.child_id : '';
    if (!UUID_RE.test(childId)) return json(400, { error: m.badRequest, code: 'bad_request' }, origin);
    const link = await deps.getLink(childId);
    if (!link || link.guardian_id !== caller.id) return json(404, { error: m.notYours, code: 'not_found' }, origin);

    if (action === 'reset_password') {
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return json(400, { error: m.password, code: 'bad_password' }, origin);
      await deps.updateAuthUser(childId, { password });
      return json(200, { ok: true }, origin);
    }
    if (action === 'set_suspended') {
      if (typeof body.suspended !== 'boolean') return json(400, { error: m.badRequest, code: 'bad_request' }, origin);
      await deps.updateAuthUser(childId, { banned: body.suspended });
      await deps.updateLink(childId, { suspended: body.suspended });
      return json(200, { ok: true }, origin);
    }
    if (action === 'set_ai') {
      if (typeof body.ai_allowed !== 'boolean') return json(400, { error: m.badRequest, code: 'bad_request' }, origin);
      await deps.updateLink(childId, { ai_allowed: body.ai_allowed });
      return json(200, { ok: true }, origin);
    }
    if (action === 'delete') {
      await deps.deleteAuthUser(childId);
      return json(200, { ok: true }, origin);
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
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  const authAdmin = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/auth/v1/admin/${path}`, { ...init, headers: { ...h, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const firstLink = async (query: string): Promise<Link | null> => {
    const r = await rest(`guardian_links?${query}&select=child_id,guardian_id,username,ai_allowed,suspended&limit=1`);
    if (!r.ok) throw new Error('link fetch failed');
    const rows = await r.json();
    return rows?.[0] ?? null;
  };

  return {
    config: {
      childLimit: Number(env('CHILD_LIMIT') || 5),
      emailDomain: env('CHILD_EMAIL_DOMAIN') || 'enfants.rythmebinaire.invalid',
      allowedOrigin: env('ALLOWED_ORIGIN') || '*',
    },
    async getUser(token) {
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const u = await r.json();
      return u?.id ? { id: u.id as string } : null;
    },
    async getUserLang(userId) {
      const r = await rest(`users?id=eq.${userId}&select=preferred_language`);
      const rows = r.ok ? await r.json() : [];
      return rows?.[0]?.preferred_language === 'en' ? 'en' : 'fr';
    },
    getLinkAsChild: (userId) => firstLink(`child_id=eq.${userId}`),
    getLink: (childId) => firstLink(`child_id=eq.${childId}`),
    async countChildren(guardianId) {
      const r = await rest(`guardian_links?guardian_id=eq.${guardianId}&select=child_id`, {
        headers: { Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
      });
      if (!r.ok) throw new Error('count failed');
      return Number((r.headers.get('content-range') || '').split('/')[1]) || 0;
    },
    async usernameTaken(username) {
      const r = await rest(`guardian_links?username=eq.${encodeURIComponent(username)}&select=child_id&limit=1`);
      if (!r.ok) throw new Error('username check failed');
      return ((await r.json()) as unknown[]).length > 0;
    },
    async createAuthUser({ email, password, fullName, lang }) {
      const r = await authAdmin('users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true, // aucun e-mail n'est envoyé
          user_metadata: { full_name: fullName, preferred_language: lang, is_child: true },
        }),
      });
      if (!r.ok) return { error: `auth ${r.status}` };
      const u = await r.json();
      return u?.id ? { id: u.id as string } : { error: 'no id' };
    },
    async insertLink(row) {
      const r = await rest('guardian_links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      if (!r.ok) throw new Error('insert link failed');
    },
    async updateAuthUser(id, patch) {
      const body: Record<string, unknown> = {};
      if (patch.password !== undefined) body.password = patch.password;
      if (patch.banned !== undefined) body.ban_duration = patch.banned ? '876000h' : 'none';
      const r = await authAdmin(`users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      if (!r.ok) throw new Error('auth update failed');
    },
    async updateLink(childId, patch) {
      const r = await rest(`guardian_links?child_id=eq.${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error('link update failed');
    },
    async deleteAuthUser(id) {
      const r = await authAdmin(`users/${id}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 404) throw new Error('auth delete failed');
    },
  };
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req: Request) => handle(req, makeDeps()));
}
