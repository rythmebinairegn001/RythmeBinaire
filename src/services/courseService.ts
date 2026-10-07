import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PreferredLanguage } from '../types/database';
import { INITIAL_COURSES, PublicCourseItem } from '../data/coursesData';

function getLocalOrInitialCourses(): PublicCourseItem[] {
  try {
    const raw = localStorage.getItem('rythmebinaire_admin_courses');
    if (raw) {
      const parsed: PublicCourseItem[] = JSON.parse(raw);
      return parsed.filter((c) => c.status === 'published');
    }
  } catch {}
  return INITIAL_COURSES;
}

export async function fetchPublishedCourses(lang: PreferredLanguage): Promise<PublicCourseItem[]> {
  if (!isSupabaseConfigured()) {
    return getLocalOrInitialCourses();
  }

  try {
    // Attempt fetch from Supabase
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        track,
        level,
        status,
        created_at,
        course_translations (
          lang,
          title,
          summary,
          description
        ),
        modules (
          id,
          position,
          module_translations (
            lang,
            title
          )
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    if (coursesError || !coursesData || coursesData.length === 0) {
      // Supabase is empty or query failed; fallback to local/initial catalog
      return getLocalOrInitialCourses();
    }

    // Map Supabase rows to PublicCourseItem
    const mapped: PublicCourseItem[] = coursesData.map((c: any) => {
      const transFr = c.course_translations?.find((t: any) => t.lang === 'fr');
      const transEn = c.course_translations?.find((t: any) => t.lang === 'en');

      const fallbackFr = INITIAL_COURSES.find((ic) => ic.id === c.id)?.translations.fr;
      const fallbackEn = INITIAL_COURSES.find((ic) => ic.id === c.id)?.translations.en;

      const mods = (c.modules || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((m: any) => {
          const mFr = m.module_translations?.find((mt: any) => mt.lang === 'fr');
          const mEn = m.module_translations?.find((mt: any) => mt.lang === 'en');
          return {
            id: m.id,
            position: m.position,
            lessonCount: 4,
            translations: {
              fr: { title: mFr?.title || 'Module' },
              en: { title: mEn?.title || 'Module' },
            },
          };
        });

      return {
        id: c.id,
        track: c.track,
        level: c.level,
        status: c.status,
        created_at: c.created_at,
        estimated_hours: 10,
        translations: {
          fr: {
            title: transFr?.title || fallbackFr?.title || 'Cours sans titre',
            summary: transFr?.summary || fallbackFr?.summary || '',
            description: transFr?.description || fallbackFr?.description || '',
          },
          en: {
            title: transEn?.title || fallbackEn?.title || transFr?.title || 'Untitled Course',
            summary: transEn?.summary || fallbackEn?.summary || transFr?.summary || '',
            description: transEn?.description || fallbackEn?.description || transFr?.description || '',
          },
        },
        modules: mods.length > 0 ? mods : (INITIAL_COURSES.find((ic) => ic.id === c.id)?.modules || []),
      };
    });

    return mapped;
  } catch (err) {
    console.warn('Could not query Supabase courses, using fallback catalog:', err);
    return INITIAL_COURSES;
  }
}
