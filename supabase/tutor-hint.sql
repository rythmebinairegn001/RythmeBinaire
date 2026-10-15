-- À exécuter UNE FOIS dans Supabase > SQL Editor (après avoir créé les tables du projet).
-- But : seul le SERVEUR (la fonction tutor-hint) peut enregistrer un indice.
-- Sans ça, un élève pourrait s'ajouter lui-même de faux indices depuis son navigateur
-- et fausser son niveau d'indice ou son quota.

DROP POLICY IF EXISTS "Eleve creates own hint requests" ON public.ai_hint_requests;

-- Accélère le comptage des indices par élève / par jour / par mois
CREATE INDEX IF NOT EXISTS idx_ai_hint_requests_user_created
    ON public.ai_hint_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_hint_requests_created
    ON public.ai_hint_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_hint_requests_user_exercise
    ON public.ai_hint_requests (user_id, exercise_id);
