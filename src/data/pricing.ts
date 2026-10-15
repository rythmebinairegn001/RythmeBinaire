/**
 * Tarifs et contact : UN SEUL endroit à modifier pour changer ce qui est affiché sur le site.
 * (Prix proposés par Amadou le 14 octobre 2026, à tester avec les premiers clients.)
 */
export const PRICING = {
  currency: 'GNF',
  individualPerMonth: 50000,
  schoolPerStudentPerMonth: 25000,
  schoolMinStudents: 20,
};

export const CONTACT = {
  email: 'rythmebinairegn001@gmail.com',
  phone: '+224 627 99 86 79',
  /** Numéro WhatsApp sans le + (pour le lien wa.me) */
  whatsapp: '224627998679',
};

export const LEGAL_UPDATED = { fr: '14 octobre 2026', en: 'October 14, 2026' };

/** « 50 000 GNF » */
export function gnf(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${PRICING.currency}`;
}

/**
 * Prix par pays (V3). Montants PROPOSÉS, arrondis à partir du prix guinéen (≈ 50 000 GNF ≈ 6 USD) avec des taux
 * approximatifs : à vérifier et à ajuster par Amadou avant l'ouverture du paiement dans un pays.
 * Aucune conversion automatique : un prix affiché est un prix fixe (pas de surprise liée au taux de change).
 * Pour ajouter un pays : une ligne ci-dessous, rien d'autre.
 */
export interface CountryPrice {
  code: string;
  fr: string;
  en: string;
  currency: string;
  individualPerMonth: number;
  schoolPerStudentPerMonth: number;
}
export const COUNTRY_PRICES: CountryPrice[] = [
  { code: 'GN', fr: 'Guinée', en: 'Guinea', currency: 'GNF', individualPerMonth: 50000, schoolPerStudentPerMonth: 25000 },
  { code: 'SN', fr: 'Sénégal', en: 'Senegal', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'CI', fr: "Côte d'Ivoire", en: 'Ivory Coast', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'ML', fr: 'Mali', en: 'Mali', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'BF', fr: 'Burkina Faso', en: 'Burkina Faso', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'BJ', fr: 'Bénin', en: 'Benin', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'TG', fr: 'Togo', en: 'Togo', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'NE', fr: 'Niger', en: 'Niger', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'CM', fr: 'Cameroun', en: 'Cameroon', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'GA', fr: 'Gabon', en: 'Gabon', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'CG', fr: 'Congo', en: 'Congo', currency: 'FCFA', individualPerMonth: 3500, schoolPerStudentPerMonth: 1750 },
  { code: 'MA', fr: 'Maroc', en: 'Morocco', currency: 'MAD', individualPerMonth: 60, schoolPerStudentPerMonth: 30 },
  { code: 'NG', fr: 'Nigeria', en: 'Nigeria', currency: 'NGN', individualPerMonth: 8500, schoolPerStudentPerMonth: 4250 },
  { code: 'GH', fr: 'Ghana', en: 'Ghana', currency: 'GHS', individualPerMonth: 65, schoolPerStudentPerMonth: 32 },
  { code: 'KE', fr: 'Kenya', en: 'Kenya', currency: 'KES', individualPerMonth: 750, schoolPerStudentPerMonth: 375 },
  { code: 'XX', fr: 'Autre pays', en: 'Other country', currency: 'USD', individualPerMonth: 6, schoolPerStudentPerMonth: 3 },
];
export const DEFAULT_COUNTRY = 'GN';

export function getCountryPrice(code: string | null | undefined): CountryPrice {
  return COUNTRY_PRICES.find((c) => c.code === (code || '').toUpperCase()) || COUNTRY_PRICES[0];
}

/** Devine le pays depuis la langue du navigateur (ex. « fr-SN » → SN). Retourne le pays par défaut si inconnu. Ce n'est qu'une suggestion : l'élève peut changer. */
export function guessCountry(locales: readonly string[] | undefined): string {
  for (const l of locales || []) {
    const m = /[-_]([A-Za-z]{2})$/.exec(l || '');
    if (m && COUNTRY_PRICES.some((c) => c.code === m[1].toUpperCase() && c.code !== 'XX')) return m[1].toUpperCase();
  }
  return DEFAULT_COUNTRY;
}

/** « 3 500 FCFA », « 6 USD » */
export function formatMoney(n: number, currency: string): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${currency}`;
}

const COUNTRY_KEY = 'rythmebinaire_country';
export function loadCountry(): string {
  try {
    const saved = localStorage.getItem(COUNTRY_KEY);
    if (saved && COUNTRY_PRICES.some((c) => c.code === saved)) return saved;
  } catch { /* stockage indisponible */ }
  return guessCountry(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []);
}
export function saveCountry(code: string): void {
  try { localStorage.setItem(COUNTRY_KEY, code); } catch { /* ignoré */ }
}
