-- ============================================================================
-- INSCRIPTION PAR NUMÉRO DE TÉLÉPHONE (script 21)
-- À exécuter UNE fois dans Supabase → SQL Editor. Sans danger si relancé.
-- Ne dépend d'aucun autre script.
--
-- Le compte est créé par la fonction serveur « phone-account » (clé de service, jamais dans le navigateur).
-- Le numéro n'est PAS vérifié par SMS. Pour retrouver un mot de passe oublié, l'élève utilise un
-- CODE DE RÉCUPÉRATION donné une seule fois à l'inscription. Seule son empreinte (hash) est gardée.
-- Ces tables ne sont lisibles ni par les élèves ni par les professeurs : RLS activée SANS politique,
-- seule la fonction serveur (clé de service) y accède.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phone_recovery (
    user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal anti-abus : « signup » (par adresse réseau, hachée) et « recover_fail » (par numéro, haché).
CREATE TABLE IF NOT EXISTS public.phone_attempts (
    id          BIGSERIAL PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('signup', 'recover_fail')),
    key_hash    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_attempts_idx ON public.phone_attempts (kind, key_hash, created_at DESC);

ALTER TABLE public.phone_recovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_attempts ENABLE ROW LEVEL SECURITY;
