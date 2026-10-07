export type UserRole = 'eleve' | 'admin';
export type PreferredLanguage = 'fr' | 'en';
export type CourseTrack = 'coder' | 'culture_numerique';
export type CourseStatus = 'draft' | 'published';
export type SubmissionStatus = 'pass' | 'fail' | 'error';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  preferred_language: PreferredLanguage;
  created_at: string;
  status: string;
}

export interface Course {
  id: string;
  track: CourseTrack;
  level: string;
  status: CourseStatus;
  created_at: string;
}

export interface CourseTranslation {
  id: string;
  course_id: string;
  lang: PreferredLanguage;
  title: string;
  summary: string | null;
  description: string | null;
}

export interface Module {
  id: string;
  course_id: string;
  position: number;
}

export interface ModuleTranslation {
  id: string;
  module_id: string;
  lang: PreferredLanguage;
  title: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  position: number;
}

export interface LessonTranslation {
  id: string;
  lesson_id: string;
  lang: PreferredLanguage;
  title: string;
  content: string; // Long text, simple markdown
}

export interface Exercise {
  id: string;
  lesson_id: string;
  type: string;
  language: string; // e.g. 'python', 'javascript'
  starter_code: string | null;
  config: Record<string, unknown>;
}

export interface ExerciseTranslation {
  id: string;
  exercise_id: string;
  lang: PreferredLanguage;
  instructions: string;
  hint_level_1: string | null;
  hint_level_2: string | null;
}

export interface ExerciseTest {
  id: string;
  exercise_id: string;
  input: string | null;
  expected_output: string;
  is_hidden: boolean;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  enrolled_at: string;
}

export interface ExerciseSubmission {
  id: string;
  user_id: string;
  exercise_id: string;
  code_submitted: string;
  status: SubmissionStatus; // 'pass' | 'fail' | 'error'
  execution_time_ms: number;
  created_at: string;
}

export interface AiHintRequest {
  id: string;
  user_id: string;
  exercise_id: string;
  hint_level: number;
  request_context: string | null;
  response_text: string | null;
  created_at: string;
}
