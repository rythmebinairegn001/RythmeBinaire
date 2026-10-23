-- ============================================================================
-- HISTORIQUE DES TENTATIVES DE QUIZ (script 17)
-- À exécuter UNE fois, APRÈS professeurs.sql et enfants.sql (et parents.sql). Sans danger si relancé.
-- Chaque passage d'un quiz est enregistré : score, réussi ou non, questions ratées.
-- Qui peut lire :
--   • l'élève : ses propres tentatives ;
--   • le professeur : celles des élèves de SES classes ;
--   • le parent : celles de SES enfants (comptes supervisés) ;
--   • l'administrateur : toutes.
-- La correction du quiz se fait dans le navigateur : c'est un suivi, pas un examen noté.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    course_title TEXT NOT NULL DEFAULT '',
    lesson_title TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL CHECK (score >= 0),
    total INTEGER NOT NULL CHECK (total > 0 AND total <= 100),
    percent INTEGER NOT NULL CHECK (percent BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL,
    -- questions ratées : [{"i": 2, "q": "texte de la question"}]
    wrong JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (score <= total)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson ON public.quiz_attempts(course_id, lesson_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student records own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Student records own quiz attempts" ON public.quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Student reads own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Student reads own quiz attempts" ON public.quiz_attempts FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Teacher reads class quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Teacher reads class quiz attempts" ON public.quiz_attempts FOR SELECT
    USING (user_id IN (
        SELECT m.student_id FROM public.class_members m
        JOIN public.classes c ON c.id = m.class_id
        WHERE c.teacher_id = auth.uid()
    ));

DO $$
BEGIN
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Guardian reads children quiz attempts" ON public.quiz_attempts';
        EXECUTE $p$CREATE POLICY "Guardian reads children quiz attempts" ON public.quiz_attempts FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.guardian_links g
                WHERE g.child_id = quiz_attempts.user_id AND g.guardian_id = auth.uid()
            ))$p$;
    END IF;
END $$;

GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
