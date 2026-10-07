export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- RYTHMEBINAIREGN - SUPABASE DATABASE SCHEMA
-- E-learning bilingual platform for Code & Digital Culture (FR / EN)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOM ENUMS
-- User role: Strictly 'eleve' and 'admin' ONLY
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('eleve', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE preferred_lang AS ENUM ('fr', 'en');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE course_track AS ENUM ('coder', 'culture_numerique');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('draft', 'published');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('pass', 'fail', 'error');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. USERS TABLE
-- Maps directly to Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'eleve',
    preferred_language preferred_lang NOT NULL DEFAULT 'fr',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active'
);

-- 4. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track course_track NOT NULL,
    level TEXT NOT NULL DEFAULT 'debutant',
    status course_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COURSE TRANSLATIONS (Separate table, multiple languages, UNIQUE per parent + lang)
CREATE TABLE IF NOT EXISTS public.course_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lang preferred_lang NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    CONSTRAINT uq_course_translations_course_lang UNIQUE (course_id, lang)
);

-- 6. MODULES TABLE
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 1
);

-- 7. MODULE TRANSLATIONS
CREATE TABLE IF NOT EXISTS public.module_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    lang preferred_lang NOT NULL,
    title TEXT NOT NULL,
    CONSTRAINT uq_module_translations_module_lang UNIQUE (module_id, lang)
);

-- 8. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 1
);

-- 9. LESSON TRANSLATIONS
CREATE TABLE IF NOT EXISTS public.lesson_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    lang preferred_lang NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Texte long, markdown simple
    CONSTRAINT uq_lesson_translations_lesson_lang UNIQUE (lesson_id, lang)
);

-- 10. EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'coding',
    language TEXT NOT NULL DEFAULT 'python', -- ex: 'python', 'javascript'
    starter_code TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 11. EXERCISE TRANSLATIONS
CREATE TABLE IF NOT EXISTS public.exercise_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    lang preferred_lang NOT NULL,
    instructions TEXT NOT NULL,
    hint_level_1 TEXT,
    hint_level_2 TEXT,
    CONSTRAINT uq_exercise_translations_exercise_lang UNIQUE (exercise_id, lang)
);

-- 12. EXERCISE TESTS TABLE
CREATE TABLE IF NOT EXISTS public.exercise_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    input TEXT,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT false
);

-- 13. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_enrollments_user_course UNIQUE (user_id, course_id)
);

-- 14. EXERCISE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.exercise_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    code_submitted TEXT NOT NULL,
    status submission_status NOT NULL DEFAULT 'error',
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. AI HINT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.ai_hint_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    hint_level INTEGER NOT NULL CHECK (hint_level BETWEEN 1 AND 5),
    request_context TEXT,
    response_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ==============================================================================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Enable RLS on ALL tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hint_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- POLICIES: USERS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile or admin reads all" ON public.users;
CREATE POLICY "Users can read own profile or admin reads all"
    ON public.users FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own details" ON public.users;
CREATE POLICY "Users can update own details"
    ON public.users FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (
        -- Students cannot change their own role to admin
        (auth.uid() = id AND role = 'eleve') OR public.is_admin()
    );

DROP POLICY IF EXISTS "Users can insert own record or via trigger" ON public.users;
CREATE POLICY "Users can insert own record or via trigger"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: COURSES & CONTENT
-- Anyone/eleve can view published courses, admins can view and manage all
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view published courses"
    ON public.courses FOR SELECT
    USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to courses" ON public.courses;
CREATE POLICY "Admins have full access to courses"
    ON public.courses FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view course translations for published" ON public.course_translations;
CREATE POLICY "Anyone can view course translations for published"
    ON public.course_translations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_translations.course_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage course translations" ON public.course_translations;
CREATE POLICY "Admins manage course translations"
    ON public.course_translations FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read published modules" ON public.modules;
CREATE POLICY "Read published modules"
    ON public.modules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = modules.course_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage modules" ON public.modules;
CREATE POLICY "Admins manage modules"
    ON public.modules FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read module translations" ON public.module_translations;
CREATE POLICY "Read module translations"
    ON public.module_translations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.modules m
            JOIN public.courses c ON c.id = m.course_id
            WHERE m.id = module_translations.module_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage module translations" ON public.module_translations;
CREATE POLICY "Admins manage module translations"
    ON public.module_translations FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read published lessons" ON public.lessons;
CREATE POLICY "Read published lessons"
    ON public.lessons FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.modules m
            JOIN public.courses c ON c.id = m.course_id
            WHERE m.id = lessons.module_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage lessons" ON public.lessons;
CREATE POLICY "Admins manage lessons"
    ON public.lessons FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read lesson translations" ON public.lesson_translations;
CREATE POLICY "Read lesson translations"
    ON public.lesson_translations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            WHERE l.id = lesson_translations.lesson_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage lesson translations" ON public.lesson_translations;
CREATE POLICY "Admins manage lesson translations"
    ON public.lesson_translations FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read exercises" ON public.exercises;
CREATE POLICY "Read exercises"
    ON public.exercises FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            WHERE l.id = exercises.lesson_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage exercises" ON public.exercises;
CREATE POLICY "Admins manage exercises"
    ON public.exercises FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read exercise translations" ON public.exercise_translations;
CREATE POLICY "Read exercise translations"
    ON public.exercise_translations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.exercises e
            JOIN public.lessons l ON l.id = e.lesson_id
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            WHERE e.id = exercise_translations.exercise_id
            AND (c.status = 'published' OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage exercise translations" ON public.exercise_translations;
CREATE POLICY "Admins manage exercise translations"
    ON public.exercise_translations FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Read non-hidden tests or admin" ON public.exercise_tests;
CREATE POLICY "Read non-hidden tests or admin"
    ON public.exercise_tests FOR SELECT
    USING (is_hidden = false OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage exercise tests" ON public.exercise_tests;
CREATE POLICY "Admins manage exercise tests"
    ON public.exercise_tests FOR ALL
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: ENROLLMENTS (Eleve only reads/updates own, Admin reads/manages all)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Eleve reads own enrollments" ON public.enrollments;
CREATE POLICY "Eleve reads own enrollments"
    ON public.enrollments FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Eleve can enroll themselves" ON public.enrollments;
CREATE POLICY "Eleve can enroll themselves"
    ON public.enrollments FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Eleve can update own progress" ON public.enrollments;
CREATE POLICY "Eleve can update own progress"
    ON public.enrollments FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.enrollments;
CREATE POLICY "Admins can delete enrollments"
    ON public.enrollments FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: EXERCISE SUBMISSIONS (Eleve reads/inserts own, Admin reads/manages all)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Eleve reads own submissions" ON public.exercise_submissions;
CREATE POLICY "Eleve reads own submissions"
    ON public.exercise_submissions FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Eleve creates own submissions" ON public.exercise_submissions;
CREATE POLICY "Eleve creates own submissions"
    ON public.exercise_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage all submissions" ON public.exercise_submissions;
CREATE POLICY "Admins manage all submissions"
    ON public.exercise_submissions FOR ALL
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- POLICIES: AI HINT REQUESTS (Eleve reads/inserts own, Admin reads/manages all)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Eleve reads own hint requests" ON public.ai_hint_requests;
CREATE POLICY "Eleve reads own hint requests"
    ON public.ai_hint_requests FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Eleve creates own hint requests" ON public.ai_hint_requests;
CREATE POLICY "Eleve creates own hint requests"
    ON public.ai_hint_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage hint requests" ON public.ai_hint_requests;
CREATE POLICY "Admins manage hint requests"
    ON public.ai_hint_requests FOR ALL
    USING (public.is_admin());

-- ==============================================================================
-- AUTOMATIC USER REGISTRATION TRIGGER (auth.users -> public.users)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lang preferred_lang := 'fr';
BEGIN
    -- Check if metadata specifies preferred language ('fr' or 'en')
    IF NEW.raw_user_meta_data->>'preferred_language' = 'en' THEN
        v_lang := 'en';
    ELSE
        v_lang := 'fr';
    END IF;

    -- Automatically create user row with role 'eleve' strictly
    INSERT INTO public.users (
        id,
        email,
        full_name,
        role,
        preferred_language,
        created_at,
        status
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        NEW.raw_user_meta_data->>'full_name',
        'eleve', -- Always 'eleve' by default
        v_lang,
        now(),
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        preferred_language = EXCLUDED.preferred_language;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;
