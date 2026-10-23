-- ============================================================================
-- RÉVISION ESPACÉE DES QUIZ (script 18)
-- À exécuter UNE fois, APRÈS quiz-tentatives.sql. Sans danger si relancé.
-- Le site propose à l'élève de refaire, quelques jours plus tard, les questions qu'il a ratées.
-- Chaque réponse donnée en révision est enregistrée ici (seul l'élève la voit, et l'admin).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    q_index INTEGER NOT NULL CHECK (q_index >= 0 AND q_index < 100),
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_reviews_user ON public.quiz_reviews(user_id, created_at DESC);

ALTER TABLE public.quiz_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student records own quiz reviews" ON public.quiz_reviews;
CREATE POLICY "Student records own quiz reviews" ON public.quiz_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Student reads own quiz reviews" ON public.quiz_reviews;
CREATE POLICY "Student reads own quiz reviews" ON public.quiz_reviews FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

GRANT SELECT, INSERT ON public.quiz_reviews TO authenticated;
