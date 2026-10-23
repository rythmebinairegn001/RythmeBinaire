/**
 * Comptes par numéro de téléphone (voir supabase/functions/phone-account).
 * Le numéro sert d'identifiant : on fabrique un e-mail interne « <chiffres>@tel.…invalid » qui ne reçoit jamais de courrier.
 * Le numéro n'est PAS vérifié par SMS : on ne s'en sert jamais pour envoyer un message.
 */

export const PHONE_EMAIL_DOMAIN =
  (import.meta.env?.VITE_PHONE_EMAIL_DOMAIN as string | undefined)?.trim() || 'tel.rythmebinaire.invalid';

export interface Country {
  dial: string;
  fr: string;
  en: string;
}

export const COUNTRIES: Country[] = [
  { dial: '+224', fr: 'Guinée', en: 'Guinea' },
  { dial: '+221', fr: 'Sénégal', en: 'Senegal' },
  { dial: '+223', fr: 'Mali', en: 'Mali' },
  { dial: '+225', fr: "Côte d'Ivoire", en: 'Ivory Coast' },
  { dial: '+226', fr: 'Burkina Faso', en: 'Burkina Faso' },
  { dial: '+227', fr: 'Niger', en: 'Niger' },
  { dial: '+228', fr: 'Togo', en: 'Togo' },
  { dial: '+229', fr: 'Bénin', en: 'Benin' },
  { dial: '+222', fr: 'Mauritanie', en: 'Mauritania' },
  { dial: '+232', fr: 'Sierra Leone', en: 'Sierra Leone' },
  { dial: '+231', fr: 'Liberia', en: 'Liberia' },
  { dial: '+220', fr: 'Gambie', en: 'Gambia' },
  { dial: '+245', fr: 'Guinée-Bissau', en: 'Guinea-Bissau' },
  { dial: '+237', fr: 'Cameroun', en: 'Cameroon' },
  { dial: '+241', fr: 'Gabon', en: 'Gabon' },
  { dial: '+242', fr: 'Congo', en: 'Congo' },
  { dial: '+243', fr: 'RD Congo', en: 'DR Congo' },
  { dial: '+235', fr: 'Tchad', en: 'Chad' },
  { dial: '+236', fr: 'Centrafrique', en: 'Central African Rep.' },
  { dial: '+212', fr: 'Maroc', en: 'Morocco' },
  { dial: '+213', fr: 'Algérie', en: 'Algeria' },
  { dial: '+216', fr: 'Tunisie', en: 'Tunisia' },
  { dial: '+234', fr: 'Nigeria', en: 'Nigeria' },
  { dial: '+233', fr: 'Ghana', en: 'Ghana' },
  { dial: '+254', fr: 'Kenya', en: 'Kenya' },
  { dial: '+250', fr: 'Rwanda', en: 'Rwanda' },
  { dial: '+257', fr: 'Burundi', en: 'Burundi' },
  { dial: '+253', fr: 'Djibouti', en: 'Djibouti' },
  { dial: '+261', fr: 'Madagascar', en: 'Madagascar' },
  { dial: '+230', fr: 'Maurice', en: 'Mauritius' },
  { dial: '+33', fr: 'France', en: 'France' },
  { dial: '+32', fr: 'Belgique', en: 'Belgium' },
  { dial: '+1', fr: 'Canada / États-Unis', en: 'Canada / USA' },
];

/** Pays dont les numéros s'écrivent souvent avec un 0 devant (06…, 07…) qui disparaît en format international. */
const TRUNK_ZERO = new Set(['+33', '+32', '+212', '+213', '+216', '+234', '+233', '+254', '+250', '+261']);

export const E164_RE = /^\+\d{8,15}$/;

/**
 * Indicatif + numéro saisi → format international « +224627998679 », ou null si invalide.
 * Accepte aussi un numéro déjà complet (« +224 627 99 86 79 » ou « 00224… »).
 */
export function normalizePhone(dial: string, raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^[+\d\s.()-]+$/.test(t)) return null;
  let digits = t.replace(/\D/g, '');
  let full: string;
  if (t.startsWith('+')) {
    full = `+${digits}`;
  } else if (digits.startsWith('00')) {
    full = `+${digits.slice(2)}`;
  } else {
    if (TRUNK_ZERO.has(dial) && digits.startsWith('0')) digits = digits.slice(1);
    full = `${dial}${digits}`;
  }
  return E164_RE.test(full) ? full : null;
}

/** Saisie de connexion qui ressemble à un numéro international (commence par +). */
export function isPhoneLogin(s: string): boolean {
  return /^\+\d[\d\s.-]{6,}$/.test(s.trim());
}

/** « +224 627 99 86 79 » → e-mail interne. */
export function phoneToEmail(e164: string, domain = PHONE_EMAIL_DOMAIN): string {
  return `${e164.replace(/\D/g, '')}@${domain}`;
}

/** E-mail interne → « +224… » ; null si c'est un vrai e-mail ou un identifiant enfant. */
export function emailToPhone(email: string | null | undefined, domain = PHONE_EMAIL_DOMAIN): string | null {
  const m = (email || '').toLowerCase().match(/^(\d{8,15})@(.+)$/);
  return m && m[2] === domain.toLowerCase() ? `+${m[1]}` : null;
}

/** Ce qu'on affiche comme contact d'un élève : son numéro, ou son e-mail. */
export function displayContact(email: string | null | undefined): string {
  return emailToPhone(email) ?? (email || '');
}

/** Regroupe les 12 caractères d'un code de récupération : XXXX-XXXX-XXXX. */
export function formatRecoveryCode(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return c.replace(/(.{4})(?=.)/g, '$1-');
}
