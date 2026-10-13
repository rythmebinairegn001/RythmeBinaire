import { isSupabaseConfigured } from '../lib/supabase';
import { PreferredLanguage } from '../types/database';
import { INITIAL_COURSES, PublicCourseItem } from '../data/coursesData';
import { fetchCoursesFromDb, loadAndRegisterContent } from './contentService';

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
      await loadAndRegisterContent(courses.map((c) => c.id));
    } catch (err) {
      console.warn('Could not load course content from Supabase:', err);
    }
    return courses;
  } catch (err) {
    console.warn('Could not query Supabase courses, using fallback catalog:', err);
    return getSampleCourses();
  }
}
