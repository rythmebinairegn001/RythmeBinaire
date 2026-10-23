import type { StudentRow } from './teacherService';

/**
 * Relances des élèves inactifs : on prépare le message, le professeur l'envoie lui-même dans le groupe WhatsApp de la classe.
 * Aucun numéro de téléphone n'est stocké. Fonctions pures.
 */

/** Élèves à relancer : inactifs (plus de 21 jours), calmes (8 à 21 jours) ou qui n'ont jamais commencé. */
export function studentsToRemind(rows: StudentRow[], includeQuiet = true): StudentRow[] {
  return rows.filter((r) => r.activity === 'inactive' || r.activity === 'never' || (includeQuiet && r.activity === 'quiet'));
}

/** Prénom affichable. Les comptes enfants ne sont JAMAIS nommés dans un message de groupe. */
export function publicFirstName(r: StudentRow): string | null {
  if (r.isChild) return null;
  const first = (r.name || '').trim().split(/\s+/)[0];
  if (!first || first.includes('@')) return null;
  return first;
}

export interface ReminderOptions {
  lang: 'fr' | 'en';
  className: string;
  /** Citer les prénoms (jamais ceux des enfants). */
  withNames: boolean;
  siteUrl: string;
}

export function buildReminderMessage(targets: StudentRow[], o: ReminderOptions): string {
  const names = o.withNames ? targets.map(publicFirstName).filter((n): n is string => !!n) : [];
  const shown = names.slice(0, 8);
  const more = names.length - shown.length;
  if (o.lang === 'en') {
    const who = shown.length ? `${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}: ` : '';
    return `Hello class "${o.className}" 👋\n${who}it has been a while since your last lesson on RythmeBinaireGn. Even 15 minutes today is enough to get back on track. You can do it!\n${o.siteUrl}`;
  }
  const who = shown.length ? `${shown.join(', ')}${more > 0 ? ` et ${more} autre${more > 1 ? 's' : ''}` : ''} : ` : '';
  return `Bonjour la classe « ${o.className} » 👋\n${who}cela fait un moment que vous n'avez pas fait de leçon sur RythmeBinaireGn. Même 15 minutes aujourd'hui suffisent pour reprendre le rythme. Vous pouvez le faire !\n${o.siteUrl}`;
}
