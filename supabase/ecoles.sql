-- ============================================================================
-- OFFRE ÉCOLES (facturation à l'école)
-- À exécuter UNE fois dans Supabase → SQL Editor. Sans danger si relancé.
-- À exécuter après acces.sql (l'accès des élèves d'une école payée en dépend).
--
-- Principe : l'admin enregistre une école (places, prix par élève), y rattache des élèves,
-- et marque l'école « payée jusqu'au … » quand la facture est réglée. Tant que l'école est
-- payée, ses élèves ont l'accès complet. Seul l'admin écrit dans ces tables.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schools (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   TEXT NOT NULL,
    contact_name           TEXT,
    contact_phone          TEXT,
    seats                  INTEGER NOT NULL DEFAULT 20 CHECK (seats >= 1),
    price_per_student_gnf  INTEGER NOT NULL DEFAULT 25000 CHECK (price_per_student_gnf >= 0),
    paid_until             TIMESTAMPTZ,                 -- null = jamais payée
    note                   TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_members (
    user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,  -- un élève, une seule école
    school_id  UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_members_school_idx ON public.school_members (school_id);

-- Journal des paiements reçus (pour savoir ce qui a été encaissé)
CREATE TABLE IF NOT EXISTS public.school_payments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    amount_gnf  BIGINT NOT NULL CHECK (amount_gnf >= 0),
    months      INTEGER NOT NULL CHECK (months >= 1),
    reference   TEXT,                                   -- ex : n° de transaction Orange Money
    paid_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS school_payments_school_idx ON public.school_payments (school_id, paid_at DESC);

ALTER TABLE public.schools         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage schools" ON public.schools;
CREATE POLICY "Admins manage schools" ON public.schools FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage school members" ON public.school_members;
CREATE POLICY "Admins manage school members" ON public.school_members FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage school payments" ON public.school_payments;
CREATE POLICY "Admins manage school payments" ON public.school_payments FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Un élève ne lit AUCUNE de ces tables. Pour calculer son accès, il appelle seulement cette
-- fonction, qui renvoie la date de fin de paiement de SON école (rien d'autre : ni contact, ni prix, ni note).
CREATE OR REPLACE FUNCTION public.my_school_paid_until()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT s.paid_until
    FROM public.school_members m
    JOIN public.schools s ON s.id = m.school_id
    WHERE m.user_id = auth.uid()
    LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.my_school_paid_until() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_school_paid_until() TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools, public.school_members, public.school_payments TO authenticated;
