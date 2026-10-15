-- ============================================================================
-- ESPACE PARENT — rapports de progression
-- À exécuter UNE fois APRÈS enfants.sql. Sans danger si relancé.
-- Ouvre au parent (l'adulte qui a créé le compte enfant) la lecture des exercices envoyés
-- et du nombre de demandes d'indices de SES enfants, uniquement. La lecture des leçons terminées
-- est déjà ouverte par enfants.sql.
-- ============================================================================
DROP POLICY IF EXISTS "Guardian reads children submissions" ON public.exercise_submissions;
CREATE POLICY "Guardian reads children submissions" ON public.exercise_submissions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.guardian_links g
        WHERE g.child_id = exercise_submissions.user_id AND g.guardian_id = auth.uid()
    ));

DO $$
BEGIN
    IF to_regclass('public.ai_hint_requests') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Guardian reads children hint requests" ON public.ai_hint_requests';
        EXECUTE $p$CREATE POLICY "Guardian reads children hint requests" ON public.ai_hint_requests FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.guardian_links g
                WHERE g.child_id = ai_hint_requests.user_id AND g.guardian_id = auth.uid()
            ))$p$;
    END IF;
END $$;
