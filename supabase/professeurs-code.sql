-- ============================================================================
-- ESPACE PROFESSEUR — relecture du code des élèves
-- À exécuter UNE fois APRÈS professeurs.sql. Sans danger si relancé.
-- Le professeur peut lire le code envoyé par les élèves de SES classes (et seulement eux),
-- puis les commenter avec un message. Rien d'autre n'est ouvert.
-- ============================================================================
DROP POLICY IF EXISTS "Teacher reads class submissions" ON public.exercise_submissions;
CREATE POLICY "Teacher reads class submissions" ON public.exercise_submissions FOR SELECT
    USING (user_id IN (
        SELECT m.student_id FROM public.class_members m
        JOIN public.classes c ON c.id = m.class_id
        WHERE c.teacher_id = auth.uid()
    ));
