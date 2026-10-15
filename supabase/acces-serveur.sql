-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS acces.sql (et idéalement après
-- ecoles.sql, enfants.sql et professeurs.sql, mais ce n'est pas obligatoire).
--
-- But : faire respecter l'accès payant par la BASE DE DONNÉES, et plus seulement par le site.
-- Sans ce script, un élève technique pourrait lire les leçons verrouillées depuis son navigateur.
--
-- Tant que l'interrupteur « accès payant » est ÉTEINT (réglage par défaut), ce script ne change
-- RIEN : toutes les leçons restent lisibles. Il ne se met en route que quand tu allumes l'interrupteur.
--
-- Ce qui est protégé : le texte des leçons, les exercices, leurs consignes/indices et leurs tests.
-- Ce qui reste visible : la liste des cours et des modules, et l'existence des leçons.
-- Une leçon verrouillée apparaît donc comme « Leçon N », sans contenu.
--
-- Sécurité en cas d'erreur : si la vérification échoue, la leçon reste ouverte
-- (même principe que sur le site : on ne bloque jamais par erreur quelqu'un qui a payé).

CREATE OR REPLACE FUNCTION public.can_read_lesson(p_lesson UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_on      BOOLEAN;
    v_free    INTEGER;
    v_course  UUID;
    v_idx     INTEGER;
    v_until   TIMESTAMPTZ;
    v_guard   UUID;
    v_ok      BOOLEAN;
BEGIN
    -- 1. Interrupteur éteint (ou absent) : tout est ouvert
    SELECT (value = 'true'::jsonb) INTO v_on FROM app_settings WHERE key = 'paywall_enabled';
    IF NOT COALESCE(v_on, false) THEN RETURN true; END IF;

    -- 2. Rang de la leçon dans son cours (même ordre que sur le site : module puis leçon)
    SELECT m.course_id INTO v_course
    FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = p_lesson;
    IF v_course IS NULL THEN RETURN false; END IF;

    SELECT COUNT(*) INTO v_idx
    FROM lessons l2 JOIN modules m2 ON m2.id = l2.module_id,
         (SELECT m.position AS mp, l.position AS lp, l.id AS lid
            FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = p_lesson) me
    WHERE m2.course_id = v_course
      AND (m2.position, l2.position, l2.id) < (me.mp, me.lp, me.lid);

    SELECT COALESCE((SELECT value FROM app_settings WHERE key = 'free_lessons_per_course')::text::integer, 2)
      INTO v_free;
    IF v_idx < v_free THEN RETURN true; END IF;

    -- 3. Au-delà des leçons libres : il faut être connecté
    IF v_uid IS NULL THEN RETURN false; END IF;

    -- 4. Admin, professeur
    IF public.is_admin() THEN RETURN true; END IF;
    IF to_regclass('public.teachers') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = $1)' INTO v_ok USING v_uid;
        IF v_ok THEN RETURN true; END IF;
    END IF;

    -- 5. Accès offert ou payé, encore valable
    IF EXISTS (SELECT 1 FROM access_grants WHERE user_id = v_uid AND (expires_at IS NULL OR expires_at > now())) THEN
        RETURN true;
    END IF;

    -- 6. Élève d'une école dont le paiement est à jour
    IF to_regprocedure('public.my_school_paid_until()') IS NOT NULL THEN
        EXECUTE 'SELECT public.my_school_paid_until()' INTO v_until;
        IF v_until IS NOT NULL AND v_until > now() THEN RETURN true; END IF;
    END IF;

    -- 7. Compte enfant : il profite de l'accès de l'adulte responsable
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT guardian_id FROM public.guardian_links WHERE child_id = $1' INTO v_guard USING v_uid;
        IF v_guard IS NOT NULL AND EXISTS (
            SELECT 1 FROM access_grants WHERE user_id = v_guard AND (expires_at IS NULL OR expires_at > now())
        ) THEN RETURN true; END IF;
    END IF;

    RETURN false;
EXCEPTION WHEN OTHERS THEN
    RETURN true; -- en cas d'erreur, on ne bloque pas
END
$$;
REVOKE ALL ON FUNCTION public.can_read_lesson(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_lesson(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Règles de lecture : même condition qu'avant (cours publié, ou admin) ET leçon accessible.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read lesson translations" ON public.lesson_translations;
CREATE POLICY "Read lesson translations"
    ON public.lesson_translations FOR SELECT
    USING (
        public.is_admin()
        OR (
            EXISTS (
                SELECT 1 FROM public.lessons l
                JOIN public.modules m ON m.id = l.module_id
                JOIN public.courses c ON c.id = m.course_id
                WHERE l.id = lesson_translations.lesson_id AND c.status = 'published'
            )
            AND public.can_read_lesson(lesson_translations.lesson_id)
        )
    );

DROP POLICY IF EXISTS "Read exercises" ON public.exercises;
CREATE POLICY "Read exercises"
    ON public.exercises FOR SELECT
    USING (
        public.is_admin()
        OR (
            EXISTS (
                SELECT 1 FROM public.lessons l
                JOIN public.modules m ON m.id = l.module_id
                JOIN public.courses c ON c.id = m.course_id
                WHERE l.id = exercises.lesson_id AND c.status = 'published'
            )
            AND public.can_read_lesson(exercises.lesson_id)
        )
    );

DROP POLICY IF EXISTS "Read exercise translations" ON public.exercise_translations;
CREATE POLICY "Read exercise translations"
    ON public.exercise_translations FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.exercises e
            JOIN public.lessons l ON l.id = e.lesson_id
            JOIN public.modules m ON m.id = l.module_id
            JOIN public.courses c ON c.id = m.course_id
            WHERE e.id = exercise_translations.exercise_id
              AND c.status = 'published'
              AND public.can_read_lesson(l.id)
        )
    );

DROP POLICY IF EXISTS "Read non-hidden tests or admin" ON public.exercise_tests;
CREATE POLICY "Read non-hidden tests or admin"
    ON public.exercise_tests FOR SELECT
    USING (
        public.is_admin()
        OR (
            is_hidden = false
            AND EXISTS (
                SELECT 1 FROM public.exercises e
                WHERE e.id = exercise_tests.exercise_id AND public.can_read_lesson(e.lesson_id)
            )
        )
    );

-- Pour revenir en arrière : exécuter à nouveau la section « POLICIES » du schéma de base
-- (supabase/schema.sql), ou me demander le script de retour.
