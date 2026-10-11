import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PublicCourseItem, INITIAL_COURSES } from '../data/coursesData';
import { DETAILED_COURSE_MODULES, DetailedModule, DetailedLesson } from '../data/lessonsData';
import { EXERCISE_TESTS } from '../data/exerciseTestsData';
import { ExerciseTest, UserProfile } from '../types/database';

export interface AdminStudentProgress {
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
}

export interface AdminStudentItem {
  id: string;
  email: string;
  full_name: string;
  role: 'eleve';
  preferred_language: 'fr' | 'en';
  created_at: string;
  status: string;
  enrollments: AdminStudentProgress[];
}

const STORAGE_KEY_COURSES = 'rythmebinaire_admin_courses';
const STORAGE_KEY_MODULES_PREFIX = 'rythmebinaire_admin_modules_';
const STORAGE_KEY_TESTS_PREFIX = 'rythmebinaire_admin_tests_';

/**
 * Checks if a course has missing English translation (title, summary, or description)
 */
export function isCourseMissingEn(course: PublicCourseItem): boolean {
  const en = course.translations?.en;
  if (!en) return true;
  return (
    !en.title ||
    en.title.trim() === '' ||
    !en.summary ||
    en.summary.trim() === '' ||
    !en.description ||
    en.description.trim() === ''
  );
}

/**
 * Checks if a module has missing English translation
 */
export function isModuleMissingEn(module: DetailedModule): boolean {
  const en = module.translations?.en;
  return !en || !en.title || en.title.trim() === '';
}

/**
 * Checks if a lesson has missing English translation
 */
export function isLessonMissingEn(lesson: DetailedLesson): boolean {
  const en = lesson.translations?.en;
  return !en || !en.title || en.title.trim() === '' || !en.content || en.content.trim() === '';
}

/**
 * Fetch all courses (both published and drafts) for admin
 */
export async function getAllCoursesAdmin(): Promise<PublicCourseItem[]> {
  // If Supabase is configured, try fetching from database
  if (isSupabaseConfigured()) {
    try {
      const { data: coursesData, error } = await supabase
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
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && coursesData && coursesData.length > 0) {
        return coursesData.map((c: any) => {
          const transFr = c.course_translations?.find((t: any) => t.lang === 'fr');
          const transEn = c.course_translations?.find((t: any) => t.lang === 'en');
          const fallback = INITIAL_COURSES.find((ic) => ic.id === c.id);

          return {
            id: c.id,
            track: c.track || 'coder',
            level: c.level || 'debutant',
            status: c.status || 'draft',
            created_at: c.created_at || new Date().toISOString(),
            estimated_hours: fallback?.estimated_hours || 10,
            translations: {
              fr: {
                title: transFr?.title || fallback?.translations.fr.title || 'Sans titre',
                summary: transFr?.summary || fallback?.translations.fr.summary || '',
                description: transFr?.description || fallback?.translations.fr.description || '',
              },
              en: {
                title: transEn?.title || fallback?.translations.en.title || '',
                summary: transEn?.summary || fallback?.translations.en.summary || '',
                description: transEn?.description || fallback?.translations.en.description || '',
              },
            },
            modules: fallback?.modules || [],
          };
        });
      }
    } catch (err) {
      console.warn('Could not load courses from Supabase, using local fallback:', err);
    }
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COURSES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local courses:', e);
  }

  // Initialize with INITIAL_COURSES
  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(INITIAL_COURSES));
  } catch {}
  return INITIAL_COURSES;
}

/**
 * Save or update a course (admin)
 */
export async function saveCourseAdmin(course: PublicCourseItem): Promise<void> {
  // 1. Save in local storage
  const currentCourses = await getAllCoursesAdmin();
  const index = currentCourses.findIndex((c) => c.id === course.id);
  let updatedList: PublicCourseItem[];

  if (index >= 0) {
    updatedList = [...currentCourses];
    updatedList[index] = course;
  } else {
    updatedList = [course, ...currentCourses];
  }

  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedList));
  } catch (err) {
    console.warn('Storage save error:', err);
  }

  // 2. If Supabase is available, sync to DB
  if (isSupabaseConfigured()) {
    try {
      // Upsert course record
      await supabase.from('courses').upsert({
        id: course.id,
        track: course.track,
        level: course.level,
        status: course.status,
        created_at: course.created_at,
      });

      // Upsert FR translation
      if (course.translations.fr.title) {
        await supabase.from('course_translations').upsert(
          {
            course_id: course.id,
            lang: 'fr',
            title: course.translations.fr.title,
            summary: course.translations.fr.summary,
            description: course.translations.fr.description,
          },
          { onConflict: 'course_id,lang' }
        );
      }

      // Upsert EN translation if provided
      if (course.translations.en?.title?.trim()) {
        await supabase.from('course_translations').upsert(
          {
            course_id: course.id,
            lang: 'en',
            title: course.translations.en.title,
            summary: course.translations.en.summary,
            description: course.translations.en.description,
          },
          { onConflict: 'course_id,lang' }
        );
      }
    } catch (dbErr) {
      console.warn('Supabase course sync warning:', dbErr);
    }
  }
}

/**
 * Delete a course (admin)
 */
export async function deleteCourseAdmin(courseId: string): Promise<void> {
  const current = await getAllCoursesAdmin();
  const filtered = current.filter((c) => c.id !== courseId);
  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(filtered));
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('courses').delete().eq('id', courseId);
    } catch (e) {
      console.warn('Supabase course delete error:', e);
    }
  }
}

/**
 * Get modules and lessons for a specific course (admin)
 */
export async function getCourseModulesAdmin(courseId: string): Promise<DetailedModule[]> {
  // Check local storage first
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_MODULES_PREFIX}${courseId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Fallback to in-memory modules or default generated module
  const staticModules = DETAILED_COURSE_MODULES[courseId];
  if (staticModules && staticModules.length > 0) {
    try {
      localStorage.setItem(`${STORAGE_KEY_MODULES_PREFIX}${courseId}`, JSON.stringify(staticModules));
    } catch {}
    return staticModules;
  }

  // Create empty initial module if course is new
  const defaultModule: DetailedModule[] = [
    {
      id: `mod-${courseId}-1`,
      courseId,
      position: 1,
      translations: {
        fr: { title: 'Module 1 : Fondamentaux' },
        en: { title: 'Module 1: Fundamentals' },
      },
      lessons: [
        {
          id: `les-${courseId}-101`,
          moduleId: `mod-${courseId}-1`,
          courseId,
          position: 1,
          translations: {
            fr: {
              title: 'Introduction et objectifs',
              content: '### Bienvenue dans ce cours !\n\nVoici la première leçon d’introduction...',
            },
            en: {
              title: 'Introduction and Goals',
              content: '### Welcome to this course!\n\nHere is your first introduction lesson...',
            },
          },
        },
      ],
    },
  ];

  try {
    localStorage.setItem(`${STORAGE_KEY_MODULES_PREFIX}${courseId}`, JSON.stringify(defaultModule));
  } catch {}

  return defaultModule;
}

/**
 * Save modules and lessons for a course (admin)
 */
export async function saveCourseModulesAdmin(
  courseId: string,
  modules: DetailedModule[]
): Promise<void> {
  // Ensure positions are consistent 1..N
  const orderedModules = modules.map((m, mIdx) => ({
    ...m,
    position: mIdx + 1,
    lessons: m.lessons.map((l, lIdx) => ({
      ...l,
      position: lIdx + 1,
    })),
  }));

  try {
    localStorage.setItem(
      `${STORAGE_KEY_MODULES_PREFIX}${courseId}`,
      JSON.stringify(orderedModules)
    );
  } catch (e) {
    console.warn('Storage modules save error:', e);
  }

  // Also update lessonCount in courses list
  try {
    const courses = await getAllCoursesAdmin();
    const targetCourse = courses.find((c) => c.id === courseId);
    if (targetCourse) {
      targetCourse.modules = orderedModules.map((m) => ({
        id: m.id,
        position: m.position,
        lessonCount: m.lessons.length,
        translations: {
          fr: { title: m.translations.fr.title },
          en: { title: m.translations.en?.title || '' },
        },
      }));
      await saveCourseAdmin(targetCourse);
    }
  } catch {}
}

/**
 * Get tests for an exercise (admin)
 */
export async function getExerciseTestsAdmin(exerciseId: string): Promise<ExerciseTest[]> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_TESTS_PREFIX}${exerciseId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  const staticTests = EXERCISE_TESTS[exerciseId];
  if (staticTests) {
    return staticTests;
  }

  // Default test pair
  return [
    {
      id: `test-${exerciseId}-1`,
      exercise_id: exerciseId,
      input: null,
      expected_output: 'Sortie attendue',
      is_hidden: false,
    },
  ];
}

/**
 * Save tests for an exercise (admin)
 */
export async function saveExerciseTestsAdmin(
  exerciseId: string,
  tests: ExerciseTest[]
): Promise<void> {
  try {
    localStorage.setItem(`${STORAGE_KEY_TESTS_PREFIX}${exerciseId}`, JSON.stringify(tests));
  } catch (e) {
    console.warn('Storage save tests error:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      // Upsert each test
      for (const t of tests) {
        await supabase.from('exercise_tests').upsert({
          id: t.id,
          exercise_id: exerciseId,
          input: t.input,
          expected_output: t.expected_output,
          is_hidden: t.is_hidden,
        });
      }
    } catch (err) {
      console.warn('Supabase test sync warning:', err);
    }
  }
}

/**
 * Get students list (read-only for MVP)
 */
export async function getStudentsListAdmin(): Promise<AdminStudentItem[]> {
  // If Supabase is available, query real users
  if (isSupabaseConfigured()) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          preferred_language,
          created_at,
          status,
          enrollments (
            course_id,
            progress_percent,
            enrolled_at,
            courses (
              id,
              course_translations (
                lang,
                title
              )
            )
          )
        `)
        .eq('role', 'eleve')
        .order('created_at', { ascending: false });

      if (!error && users) {
        // Leçons réellement terminées par chaque élève (table lesson_progress, lisible par l'admin)
        const done = new Map<string, Set<string>>(); // "userId::courseId" -> leçons terminées
        try {
          const { data: rows } = await supabase
            .from('lesson_progress')
            .select('user_id, course_id, lesson_id')
            .in('user_id', users.map((u: any) => u.id));
          for (const r of (rows || []) as any[]) {
            const key = `${r.user_id}::${r.course_id}`;
            if (!done.has(key)) done.set(key, new Set());
            done.get(key)!.add(r.lesson_id);
          }
        } catch {
          // table pas encore créée : on affiche seulement les inscriptions
        }

        const titleOf = (courseId: string): string =>
          INITIAL_COURSES.find((c) => c.id === courseId)?.translations.fr.title || 'Cours';
        const totalOf = (courseId: string, completed: number): number =>
          Math.max(DETAILED_COURSE_MODULES[courseId]?.reduce((n, m) => n + m.lessons.length, 0) || 0, completed);

        return users.map((u: any) => {
          const enrolled = (u.enrollments || []) as any[];
          const rows = enrolled.map((e: any) => {
            const courseTitle =
              e.courses?.course_translations?.find((ct: any) => ct.lang === 'fr')?.title ||
              titleOf(e.course_id);
            const completed = done.get(`${u.id}::${e.course_id}`)?.size || 0;
            return {
              courseId: e.course_id,
              courseTitle,
              progressPercent: e.progress_percent || 0,
              completedLessonsCount: completed,
              totalLessonsCount: totalOf(e.course_id, completed),
            };
          });
          // Cours avec progression mais sans inscription en base (cours d'exemple)
          const listed = new Set(rows.map((r) => r.courseId));
          for (const [key, lessons] of done.entries()) {
            const [uid, courseId] = key.split('::');
            if (uid !== u.id || listed.has(courseId)) continue;
            const total = totalOf(courseId, lessons.size);
            rows.push({
              courseId,
              courseTitle: titleOf(courseId),
              progressPercent: total > 0 ? Math.min(100, Math.round((lessons.size / total) * 100)) : 0,
              completedLessonsCount: lessons.size,
              totalLessonsCount: total,
            });
          }
          return {
            id: u.id,
            email: u.email,
            full_name: u.full_name || 'Élève sans nom',
            role: 'eleve',
            preferred_language: u.preferred_language || 'fr',
            created_at: u.created_at,
            status: u.status || 'actif',
            enrollments: rows,
          };
        });
      }
    } catch (e) {
      console.warn('Failed querying students from Supabase:', e);
    }
  }

  // Aucun élève (ou base non connectée) : liste vide, plus de faux élèves
  return [];
}
