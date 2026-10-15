import { isSupabaseConfigured } from '../lib/supabase';
import { PreferredLanguage } from '../types/database';
import { INITIAL_COURSES, PublicCourseItem } from '../data/coursesData';
import { fetchCoursesFromDb, loadAndRegisterContent } from './contentService';
import { registerCourseModules } from '../data/lessonsData';
import { saveCatalog, loadCatalog } from '../lib/offlineStore';

// Cours d'exemple, utilisés uniquement tant que la base ne contient aucun cours publié
// (ou si Supabase n'est pas configuré / injoignable).
function getSampleCourses(): PublicCourseItem[] {
  try {
    const raw = localStorage.getItem('rythmebinaire_admin_courses');
    if (raw && !isSupabaseConfigured()) {
      const parsed: PublicCourseItem[] = JSON.parse(raw);
      const published = parsed.filter((c) => c.status === 'published');
      if (published.length > 0) return published;
    }
  } catch {}
  return INITIAL_COURSES;
}

/**
 * Catalogue des cours publiés.
 * Avec Supabase : les cours publiés par l'admin + leur contenu (modules, leçons, exercices).
 */
export async function fetchPublishedCourses(_lang: PreferredLanguage): Promise<PublicCourseItem[]> {
  if (!isSupabaseConfigured()) {
    return getSampleCourses();
  }

  try {
    const courses = await fetchCoursesFromDb(true);
    if (courses.length === 0) {
      // Rien de publié dans la base pour l'instant : on montre les cours d'exemple
      return getSampleCourses();
    }
    // Charge le contenu (texte) des cours pour que les pages élève le lisent depuis la base
    try {
      const modules = await loadAndRegisterContent(courses.map((c) => c.id));
      // Copie locale pour la lecture hors connexion (rien n'est retéléchargé de plus)
      void saveCatalog(courses, modules);
    } catch (err) {
      console.warn('Could not load course content from Supabase:', err);
    }
    return courses;
  } catch (err) {
    console.warn('Could not query Supabase courses, using fallback catalog:', err);
    // Pas de connexion : on reprend la dernière copie locale si elle existe
    const snap = await loadCatalog();
    if (snap) {
      for (const id of Object.keys(snap.modules)) registerCourseModules(id, snap.modules[id]);
      return snap.courses;
    }
    return getSampleCourses();
  }
}
