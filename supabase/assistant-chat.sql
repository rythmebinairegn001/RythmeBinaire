-- Script « Mansara AI intégré » — à exécuter UNE FOIS dans Supabase > SQL Editor.
-- But : garder la trace des messages envoyés à l'assistant (sert à compter les limites par élève
-- et le plafond mensuel, et à vérifier les abus). Seule la fonction serveur « assistant-chat »
-- peut écrire ou lire cette table (clé de service) : aucun élève ne peut la lire ni la modifier
-- depuis son navigateur. L'administrateur peut la consulter.

CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Aucune règle pour les élèves = aucun accès depuis le navigateur.
DROP POLICY IF EXISTS "Admins read assistant messages" ON public.assistant_messages;
CREATE POLICY "Admins read assistant messages"
    ON public.assistant_messages FOR SELECT
    USING (public.is_admin());

-- Accélère le comptage par élève / par jour / par mois
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_created
    ON public.assistant_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created
    ON public.assistant_messages (created_at DESC);
