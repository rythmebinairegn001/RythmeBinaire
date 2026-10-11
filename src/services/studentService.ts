import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Enrollment } from '../types/database';
import { DETAILED_COURSE_MODULES, getCourseLessonsList, DetailedLesson } from '../data/lessonsData';

// Local storage key for persistent student data in dev / offline / pilot mode
const ENROLLMENTS_STORAGE_KEY = 'rythmebinaire_student_enrollments';
const COMPLETED_LESSONS_KEY = 'rythmebinaire_student_completed_lessons';

export interface StudentCourseProgress {
  courseId: string;
  progressPercent: number;
  enrolledAt: string;
  completedLessonIds: string[];
  totalLessonsCount: number;
  nextLesson: DetailedLesson | null;
}

// Helper to get local completed lessons map
function getLocalCompletedLessons(userId: string): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(`${COMPLETED_LESSONS_KEY}_${userId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLocalCompletedLessons(userId: string, data: Record<string, string[]>): void {
  try {
    localStorage.setItem(`${COMPLETED_LESSONS_KEY}_${userId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Could not save completed lessons locally', e);
  }
}

// Supprime les anciennes données fictives (inscription « démo » à 25 %) laissées par
// les versions précédentes dans le navigateur de certains comptes de test.
function purgeLegacyDemoData(userId: string): void {
  try {
    const raw = localStorage.getItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`);
    if (!raw) return;
    const list = JSON.parse(raw) as Enrollment[];
    if (!list.some((e) => e.id.startsWith('enr-demo-'))) return;
    saveLocalEnrollments(userId, list.filter((e) => !e.id.startsWith('enr-demo-')));
    const done = getLocalCompletedLessons(userId);
    const demoLessons = done['course-python-02'];
    if (demoLessons && demoLessons.length === 1 && demoLessons[0] === 'les-py-101') {
      delete done['course-python-02'];
      saveLocalCompletedLessons(userId, done);
    }
  } catch {
    // sans importance : on ignore
  }
}

// Helper to get local enrollments (vide pour un nouvel élève : aucune progression fictive)
function getLocalEnrollments(userId: string): Enrollment[] {
  try {
    purgeLegacyDemoData(userId);
    const raw = localStorage.getItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalEnrollments(userId: string, enrollments: Enrollment[]): void {
  try {
    localStorage.setItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`, JSON.stringify(enrollments));
  } catch (e) {
    console.error('Could not save enrollments locally', e);
  }
}

/**
 * Fetch all enrollments for a given student
 */
export async function getStudentEnrollments(userId: string): Promise<Enrollment[]> {
  const localList = getLocalEnrollments(userId);

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error || !data) {
      return localList;
    }

    // Fusion : inscriptions de la base + inscriptions gardées sur cet appareil
    // (les cours d'exemple ne peuvent pas être enregistrés dans la base).
    // Un nouvel élève n'a ni l'une ni l'autre : la liste reste vide.
    const remote = data as Enrollment[];
    const remoteCourseIds = new Set(remote.map((e) => e.course_id));
    return [...remote, ...localList.filter((e) => !remoteCourseIds.has(e.course_id))];
  } catch (err) {
    console.warn('Supabase enrollments fetch error, using local state:', err);
    return localList;
  }
}

/**
 * Check if a student is already enrolled in a specific course
 */
export async function isStudentEnrolled(userId: string, courseId: string): Promise<boolean> {
  const enrollments = await getStudentEnrollments(userId);
  return enrollments.some((e) => e.course_id === courseId);
}

/**
 * Enroll a student in a course
 */
export async function enrollStudentInCourse(userId: string, courseId: string): Promise<Enrollment> {
  const existing = await isStudentEnrolled(userId, courseId);
  const now = new Date().toISOString();

  if (existing) {
    const enrollments = await getStudentEnrollments(userId);
    return enrollments.find((e) => e.course_id === courseId)!;
  }

  const newEnrollment: Enrollment = {
    id: `enr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    course_id: courseId,
    progress_percent: 0,
    enrolled_at: now,
  };

  // Update local storage
  const currentLocal = getLocalEnrollments(userId);
  saveLocalEnrollments(userId, [newEnrollment, ...currentLocal]);

  // Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('enrollments').insert([
        {
          user_id: userId,
          course_id: courseId,
          progress_percent: 0,
          enrolled_at: now,
        },
      ]);
    } catch (err) {
      console.warn('Could not insert enrollment into Supabase:', err);
    }
  }

  return newEnrollment;
}

/**
 * Synchronise les leçons terminées avec Supabase (table lesson_progress).
 * - ce qui est terminé sur un autre appareil est récupéré ici ;
 * - ce qui a été terminé ici (même hors ligne) est envoyé à la base ;
 * Le navigateur garde une copie locale : l'application continue de fonctionner
 * si la connexion coupe, ou si la table n'existe pas encore (échec silencieux).
 */
export async function syncCompletedLessons(userId: string): Promise<void> {
  purgeLegacyDemoData(userId); // jamais d'envoi de données fictives vers la base
  if (!isSupabaseConfigured()) return;

  try {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('course_id, lesson_id')
      .eq('user_id', userId);

    if (error || !data) return;

    const local = getLocalCompletedLessons(userId);
    const merged: Record<string, Set<string>> = {};
    for (const [courseId, ids] of Object.entries(local)) {
      merged[courseId] = new Set(ids);
    }

    const remoteKeys = new Set<string>();
    for (const row of data as { course_id: string; lesson_id: string }[]) {
      remoteKeys.add(`${row.course_id}::${row.lesson_id}`);
      if (!merged[row.course_id]) merged[row.course_id] = new Set();
      merged[row.course_id].add(row.lesson_id);
    }

    // Envoi des leçons terminées localement et absentes de la base
    const missing: { user_id: string; course_id: string; lesson_id: string }[] = [];
    for (const [courseId, ids] of Object.entries(local)) {
      for (const lessonId of ids) {
        if (!remoteKeys.has(`${courseId}::${lessonId}`)) {
          missing.push({ user_id: userId, course_id: courseId, lesson_id: lessonId });
        }
      }
    }
    if (missing.length > 0) {
      await supabase
        .from('lesson_progress')
        .upsert(missing, { onConflict: 'user_id,course_id,lesson_id', ignoreDuplicates: true });
    }

    const result: Record<string, string[]> = {};
    for (const [courseId, ids] of Object.entries(merged)) {
      result[courseId] = Array.from(ids);
    }
    saveLocalCompletedLessons(userId, result);
  } catch (err) {
    console.warn('Progress sync skipped:', err);
  }
}

/**
 * Retrieve completed lessons for a user and course
 */
export function getCompletedLessonIds(userId: string, courseId: string): string[] {
  const map = getLocalCompletedLessons(userId);
  return map[courseId] || [];
}

/**
 * Mark a lesson as completed (or toggle) and update enrollment progress_percent
 */
export async function markLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<{ progressPercent: number; completedLessonIds: string[] }> {
  // Ensure user is enrolled
  await enrollStudentInCourse(userId, courseId);

  const map = getLocalCompletedLessons(userId);
  const currentCompleted = new Set(map[courseId] || []);
  currentCompleted.add(lessonId);

  const updatedCompletedList = Array.from(currentCompleted);
  map[courseId] = updatedCompletedList;
  saveLocalCompletedLessons(userId, map);

  // Enregistre la leçon terminée dans la base (suivie sur tous les appareils)
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('lesson_progress')
        .upsert(
          [{ user_id: userId, course_id: courseId, lesson_id: lessonId }],
          { onConflict: 'user_id,course_id,lesson_id', ignoreDuplicates: true }
        );
    } catch (err) {
      console.warn('Could not save lesson progress to Supabase:', err);
    }
  }

  // Calculate new progress percent
  const allLessons = getCourseLessonsList(courseId);
  const totalCount = allLessons.length > 0 ? allLessons.length : 1;
  const progressPercent = Math.min(100, Math.round((updatedCompletedList.length / totalCount) * 100));

  // Update in local enrollments
  const localEnrollments = getLocalEnrollments(userId);
  const target = localEnrollments.find((e) => e.course_id === courseId);
  if (target) {
    target.progress_percent = progressPercent;
    saveLocalEnrollments(userId, localEnrollments);
  }

  // Sync with Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('enrollments')
        .update({ progress_percent: progressPercent })
        .eq('user_id', userId)
        .eq('course_id', courseId);
    } catch (err) {
      console.warn('Failed to update progress in Supabase:', err);
    }
  }

  return {
    progressPercent,
    completedLessonIds: updatedCompletedList,
  };
}

/**
 * Find the next uncompleted lesson for a student in a course
 */
export function getNextUncompletedLesson(userId: string, courseId: string): DetailedLesson | null {
  const allLessons = getCourseLessonsList(courseId);
  if (allLessons.length === 0) return null;

  const completed = new Set(getCompletedLessonIds(userId, courseId));
  for (const lesson of allLessons) {
    if (!completed.has(lesson.id)) {
      return lesson;
    }
  }

  // If all completed, return the first or last lesson
  return allLessons[0] || null;
}

/**
 * Build rich overview for all student enrollments
 */
export async function getStudentCoursesProgress(userId: string): Promise<StudentCourseProgress[]> {
  // Récupère d'abord la progression faite sur d'autres appareils
  await syncCompletedLessons(userId);

  const enrollments = await getStudentEnrollments(userId);

  // Un cours avec des leçons terminées mais sans inscription connue sur cet appareil
  // (ex : progression faite ailleurs) est ajouté automatiquement.
  const known = new Set(enrollments.map((e) => e.course_id));
  const completedMap = getLocalCompletedLessons(userId);
  const derived: Enrollment[] = [];
  for (const [courseId, ids] of Object.entries(completedMap)) {
    if (ids.length === 0 || known.has(courseId)) continue;
    const total = getCourseLessonsList(courseId).length || ids.length;
    derived.push({
      id: `enr-derived-${userId}-${courseId}`,
      user_id: userId,
      course_id: courseId,
      progress_percent: Math.min(100, Math.round((ids.length / total) * 100)),
      enrolled_at: new Date().toISOString(),
    });
  }
  if (derived.length > 0) {
    saveLocalEnrollments(userId, [...derived, ...getLocalEnrollments(userId)]);
  }

  return [...enrollments, ...derived].map((enr) => {
    const completed = getCompletedLessonIds(userId, enr.course_id);
    const allLessons = getCourseLessonsList(enr.course_id);
    const nextLesson = getNextUncompletedLesson(userId, enr.course_id);

    // Le pourcentage est calculé à partir des leçons réellement terminées (toujours à jour,
    // même après une progression faite hors ligne ou sur un autre appareil).
    const progressPercent =
      allLessons.length > 0
        ? Math.min(100, Math.round((completed.length / allLessons.length) * 100))
        : enr.progress_percent;

    return {
      courseId: enr.course_id,
      progressPercent,
      enrolledAt: enr.enrolled_at,
      completedLessonIds: completed,
      totalLessonsCount: allLessons.length,
      nextLesson,
    };
  });
}
