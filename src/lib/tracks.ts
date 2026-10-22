import { Code2, Globe2, FileSpreadsheet, Terminal } from 'lucide-react';
import type { CourseTrack } from '../types/database';

/**
 * Catégories (« parcours ») des cours. Pour en ajouter une : l'ajouter ici,
 * dans le type CourseTrack (types/database.ts) et dans l'énumération SQL (supabase/categories.sql).
 */
export interface TrackInfo {
  id: CourseTrack;
  fr: string;
  en: string;
  icon: typeof Code2;
  /** Pastille claire (site public, tableau de bord) */
  badge: string;
  /** Pastille sur fond du thème (page de cours élève) */
  badgeTheme: string;
  /** Bouton de filtre actif (catalogue) */
  pillActive: string;
}

export const TRACKS: TrackInfo[] = [
  {
    id: 'coder', fr: 'Coder', en: 'Coding', icon: Code2,
    badge: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    badgeTheme: 'bg-blue-500/10 text-[var(--color-accent-blue)] border border-blue-500/20',
    pillActive: 'bg-blue-600 text-white shadow-xs font-bold',
  },
  {
    id: 'programmation', fr: 'Programmation', en: 'Programming', icon: Terminal,
    badge: 'bg-violet-50 text-violet-700 border border-violet-200/80',
    badgeTheme: 'bg-violet-500/10 text-violet-600 border border-violet-500/20',
    pillActive: 'bg-violet-600 text-white shadow-xs font-bold',
  },
  {
    id: 'bureautique', fr: 'Bureautique', en: 'Office skills', icon: FileSpreadsheet,
    badge: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    badgeTheme: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    pillActive: 'bg-amber-600 text-white shadow-xs font-bold',
  },
  {
    id: 'culture_numerique', fr: 'Culture numérique', en: 'Digital culture', icon: Globe2,
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    badgeTheme: 'bg-emerald-500/10 text-[var(--color-accent-green)] border border-emerald-500/20',
    pillActive: 'bg-emerald-600 text-white shadow-xs font-bold',
  },
];

export function trackInfo(id: string | undefined | null): TrackInfo {
  return TRACKS.find((t) => t.id === id) || TRACKS[0];
}

export function trackLabel(id: string | undefined | null, lang: string): string {
  const t = trackInfo(id);
  return lang === 'en' ? t.en : t.fr;
}
