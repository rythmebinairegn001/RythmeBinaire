import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Statistiques d'audience ANONYMES (voir supabase/analytics.sql).
 *
 * Ce qui est envoyé : un numéro de visiteur aléatoire (créé dans ce navigateur), un numéro de session,
 * le type d'événement, le NOM de la page (jamais l'adresse complète), l'identifiant d'un cours,
 * la langue, un pays estimé par le fuseau horaire, « connecté ou non » et « mobile ou ordinateur ».
 * Ce qui n'est JAMAIS envoyé : nom, e-mail, téléphone, identifiant du compte, adresse IP, codes des liens.
 *
 * Inactif : en local (localhost), en mode développement, si le navigateur demande « Do Not Track »,
 * et sur les appareils exclus avec ?notrack=1 (pour ne pas compter l'administrateur lui-même).
 * Toute erreur est silencieuse : le suivi ne doit jamais gêner le site.
 */
export type AnalyticsEvent = 'page_view' | 'signup' | 'login' | 'course_start' | 'course_complete';

const VID_KEY = 'rb_vid';
const SID_KEY = 'rb_sid';
const OPTOUT_KEY = 'rb_notrack';

let ctx: { lang: 'fr' | 'en'; loggedIn: boolean } = { lang: 'fr', loggedIn: false };
let lastView = '';

/** Appelé par l'application quand la langue ou l'état de connexion change. */
export function setAnalyticsContext(next: Partial<typeof ctx>): void {
  ctx = { ...ctx, ...next };
}

/** Pays estimé d'après le fuseau horaire du navigateur (aucune adresse IP). 'XX' n'est jamais envoyé. */
const TZ_COUNTRY: Record<string, string> = {
  'Africa/Conakry': 'GN', 'Africa/Dakar': 'SN', 'Africa/Abidjan': 'CI', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF',
  'Africa/Porto-Novo': 'BJ', 'Africa/Lome': 'TG', 'Africa/Niamey': 'NE', 'Africa/Douala': 'CM', 'Africa/Libreville': 'GA',
  'Africa/Brazzaville': 'CG', 'Africa/Casablanca': 'MA', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE',
  'Africa/Freetown': 'SL', 'Africa/Monrovia': 'LR', 'Africa/Banjul': 'GM', 'Africa/Bissau': 'GW', 'Africa/Nouakchott': 'MR',
  'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN', 'Africa/Cairo': 'EG', 'Africa/Kinshasa': 'CD', 'Africa/Lubumbashi': 'CD',
  'Africa/Ndjamena': 'TD', 'Africa/Bangui': 'CF', 'Africa/Kigali': 'RW', 'Africa/Bujumbura': 'BI', 'Africa/Kampala': 'UG',
  'Africa/Dar_es_Salaam': 'TZ', 'Africa/Addis_Ababa': 'ET', 'Africa/Johannesburg': 'ZA', 'Africa/Luanda': 'AO',
  'Indian/Antananarivo': 'MG', 'Europe/Paris': 'FR', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'America/Toronto': 'CA',
  'America/Montreal': 'CA', 'America/New_York': 'US', 'Europe/London': 'GB',
};

export function estimateCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (tz && TZ_COUNTRY[tz]) || null;
  } catch {
    return null;
  }
}

function randomId(): string {
  try {
    const a = new Uint8Array(12);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'x1x1x1';
  }
}

function stored(storage: 'local' | 'session', key: string): string {
  try {
    const s = storage === 'local' ? localStorage : sessionStorage;
    let v = s.getItem(key);
    if (!v) {
      v = randomId();
      s.setItem(key, v);
    }
    return v;
  } catch {
    return randomId(); // stockage bloqué : identifiant jetable pour cette page seulement
  }
}

/** Vrai quand le suivi est coupé. */
export function isTrackingDisabled(): boolean {
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '' || host.endsWith('.local')) return true;
    if (import.meta.env?.DEV) return true;
    if (navigator.doNotTrack === '1') return true;
    const q = new URLSearchParams(window.location.search).get('notrack');
    if (q === '1') localStorage.setItem(OPTOUT_KEY, '1');
    if (q === '0') localStorage.removeItem(OPTOUT_KEY);
    if (localStorage.getItem(OPTOUT_KEY) === '1') return true;
    if (!navigator.onLine) return true;
    return false;
  } catch {
    return true;
  }
}

function send(event: AnalyticsEvent, view: string | null, courseId: string | null): void {
  try {
    if (isTrackingDisabled() || !isSupabaseConfigured()) return;
    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    void Promise.resolve(
      supabase.rpc('track_event', {
        p_vid: stored('local', VID_KEY),
        p_sid: stored('session', SID_KEY),
        p_event: event,
        p_view: view,
        p_course_id: courseId,
        p_lang: ctx.lang,
        p_country: estimateCountry(),
        p_logged_in: ctx.loggedIn,
        p_device: device,
      })
    ).catch(() => undefined);
  } catch {
    /* le suivi ne doit jamais faire planter le site */
  }
}

/** Page vue (changement d'écran de l'application). Deux fois la même page de suite n'est comptée qu'une fois. */
export function trackPageView(view: string): void {
  const v = String(view || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
  if (!v || v === lastView) return;
  lastView = v;
  send('page_view', v, null);
}

/** Événement clé : inscription, connexion, début ou fin d'un cours. */
export function trackEvent(event: Exclude<AnalyticsEvent, 'page_view'>, courseId?: string): void {
  const c = courseId && /^[A-Za-z0-9_-]{1,64}$/.test(courseId) ? courseId : null;
  send(event, null, c);
}
