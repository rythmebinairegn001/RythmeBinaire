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

// Helper to get local enrollments
function getLocalEnrollments(userId: string): Enrollment[] {
  try {
    const raw = localStorage.getItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`);
    if (!raw) {
      // Default demo enrollment on python course for initial experience
      const defaultEnrollment: Enrollment = {
        id: `enr-demo-${userId}-course-python-02`,
        user_id: userId,
        course_id: 'course-python-02',
        progress_percent: 25,
        enrolled_at: new Date().toISOString(),
      };
      const initial = [defaultEnrollment];
      localStorage.setItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`, JSON.stringify(initial));
      // Set first lesson completed
      saveLocalCompletedLessons(userId, {
        'course-python-02': ['les-py-101'],
      });
      return initial;
    }
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

    if (error || !data || data.length === 0) {
      return localList;
    }

    return data as Enrollment[];
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
  const enrollments = await getStudentEnrollments(userId);

  return enrollments.map((enr) => {
    const completed = getCompletedLessonIds(userId, enr.course_id);
    const allLessons = getCourseLessonsList(enr.course_id);
    const nextLesson = getNextUncompletedLesson(userId, enr.course_id);

    return {
      courseId: enr.course_id,
      progressPercent: enr.progress_percent,
      enrolledAt: enr.enrolled_at,
      completedLessonIds: completed,
      totalLessonsCount: allLessons.length,
      nextLesson,
    };
  });
}
