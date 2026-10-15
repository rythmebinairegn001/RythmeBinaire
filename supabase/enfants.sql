-- ============================================================================
-- COMPTES ENFANTS SUPERVISÉS PAR UN ADULTE
-- À exécuter UNE fois dans Supabase → SQL Editor. Sans danger si relancé.
--
-- Principe : un enfant n'a jamais de compte libre. Son compte est créé par un adulte
-- responsable (via la fonction serveur « manage-child »). Les navigateurs ne peuvent
-- que LIRE ce lien : toute modification passe par la fonction serveur.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guardian_links (
    child_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    ai_allowed  BOOLEAN NOT NULL DEFAULT false,   -- tuteur IA : désactivé tant que l'adulte ne l'autorise pas
    suspended   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT guardian_links_username_format CHECK (username ~ '^[a-z0-9][a-z0-9_.-]{2,19}$'),
    CONSTRAINT guardian_links_not_self CHECK (child_id <> guardian_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS guardian_links_username_key ON public.guardian_links (lower(username));
CREATE INDEX IF NOT EXISTS guardian_links_guardian_idx ON public.guardian_links (guardian_id);

ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- Lecture : l'adulte voit ses enfants, l'enfant voit son propre lien, l'admin voit tout.
-- Aucune politique d'écriture : seul le serveur (clé de service) peut créer ou modifier.
DROP POLICY IF EXISTS "Read own guardian links" ON public.guardian_links;
CREATE POLICY "Read own guardian links"
    ON public.guardian_links FOR SELECT
    USING (auth.uid() = guardian_id OR auth.uid() = child_id OR public.is_admin());

GRANT SELECT ON public.guardian_links TO authenticated;

-- L'adulte peut lire le profil et la progression de SES enfants (et rien d'autre).
DROP POLICY IF EXISTS "Guardian reads children profiles" ON public.users;
CREATE POLICY "Guardian reads children profiles"
    ON public.users FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.guardian_links g
        WHERE g.child_id = users.id AND g.guardian_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Guardian reads children lesson progress" ON public.lesson_progress;
CREATE POLICY "Guardian reads children lesson progress"
    ON public.lesson_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.guardian_links g
        WHERE g.child_id = lesson_progress.user_id AND g.guardian_id = auth.uid()
    ));

-- L'enfant bénéficie de l'accès (offert ou payé) de son adulte responsable.
-- (Cette politique ne fait rien tant que acces.sql n'a pas été exécuté.)
DO $$
BEGIN
    IF to_regclass('public.access_grants') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Child reads guardian access" ON public.access_grants;
        CREATE POLICY "Child reads guardian access"
            ON public.access_grants FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.guardian_links g
                WHERE g.child_id = auth.uid() AND g.guardian_id = access_grants.user_id
            ));
    END IF;
END $$;
