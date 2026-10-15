-- Retour arrière de acces-serveur.sql : remet les règles de lecture d'origine
-- (cours publié, ou admin). La fonction can_read_lesson reste en place, sans effet.
DROP POLICY IF EXISTS "Read lesson translations" ON public.lesson_translations;
CREATE POLICY "Read lesson translations" ON public.lesson_translations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id = l.module_id JOIN public.courses c ON c.id = m.course_id
            WHERE l.id = lesson_translations.lesson_id AND (c.status = 'published' OR public.is_admin())));

DROP POLICY IF EXISTS "Read exercises" ON public.exercises;
CREATE POLICY "Read exercises" ON public.exercises FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id = l.module_id JOIN public.courses c ON c.id = m.course_id
            WHERE l.id = exercises.lesson_id AND (c.status = 'published' OR public.is_admin())));

DROP POLICY IF EXISTS "Read exercise translations" ON public.exercise_translations;
CREATE POLICY "Read exercise translations" ON public.exercise_translations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.exercises e JOIN public.lessons l ON l.id = e.lesson_id JOIN public.modules m ON m.id = l.module_id JOIN public.courses c ON c.id = m.course_id
            WHERE e.id = exercise_translations.exercise_id AND (c.status = 'published' OR public.is_admin())));

DROP POLICY IF EXISTS "Read non-hidden tests or admin" ON public.exercise_tests;
CREATE POLICY "Read non-hidden tests or admin" ON public.exercise_tests FOR SELECT USING (is_hidden = false OR public.is_admin());
