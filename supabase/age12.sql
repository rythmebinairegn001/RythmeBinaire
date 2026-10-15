-- À exécuter UNE FOIS dans Supabase > SQL Editor (après acces.sql ; professeurs.sql est optionnel).
--
-- Renforce la règle « 12 ans ou plus pour créer son propre compte ». Une vraie vérification d'âge
-- est impossible sans demander une pièce d'identité (ce qu'on ne veut pas faire, surtout pour des
-- enfants). On met donc en place des protections raisonnables et honnêtes :
--
--  1. La déclaration « j'ai 12 ans ou plus » est enregistrée (date incluse) et, une fois l'interrupteur
--     ci-dessous allumé, EXIGÉE par la base : on ne peut plus créer un compte en contournant la case à
--     cocher du site. Les comptes enfants créés par un adulte (fonction manage-child) sont acceptés.
--  2. Un professeur ou l'admin peut SIGNALER un compte qui semble appartenir à un enfant de moins de 12 ans.
--  3. L'admin examine les signalements : ignorer, ou bloquer le compte (connexion impossible).
--
-- Rien ne change tant que l'interrupteur « require_age_confirmation » reste éteint (par défaut).
-- ORDRE : déployer d'abord la nouvelle version du site (qui envoie la déclaration), PUIS allumer
-- l'interrupteur dans l'admin (onglet « Âge »). Sinon les inscriptions seraient refusées.

CREATE TABLE IF NOT EXISTS public.age_declarations (
    user_id     UUID PRIMARY KEY,
    declared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    kind        TEXT NOT NULL CHECK (kind IN ('self_12plus', 'guardian_created', 'unknown'))
);

CREATE TABLE IF NOT EXISTS public.age_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason      TEXT,
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'blocked')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS age_reports_status_idx ON public.age_reports (status, created_at DESC);
-- Un seul signalement ouvert par compte
CREATE UNIQUE INDEX IF NOT EXISTS age_reports_one_open ON public.age_reports (user_id) WHERE status = 'open';

ALTER TABLE public.age_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read age declarations" ON public.age_declarations;
CREATE POLICY "Admins read age declarations" ON public.age_declarations FOR SELECT USING (public.is_admin());
-- Pas de politique d'écriture : seuls les déclencheurs ci-dessous écrivent.
-- age_reports : aucune lecture directe (passer par les fonctions), l'admin gère tout.
DROP POLICY IF EXISTS "Admins manage age reports" ON public.age_reports;
CREATE POLICY "Admins manage age reports" ON public.age_reports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.age_declarations TO authenticated;
GRANT SELECT, UPDATE ON public.age_reports TO authenticated;

INSERT INTO public.app_settings (key, value) VALUES ('require_age_confirmation', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1a. Refus d'une inscription sans déclaration (si l'interrupteur est allumé)
--     En cas de panne de la vérification elle-même, l'inscription est AUTORISÉE
--     (on ne bloque jamais toutes les inscriptions par erreur).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_age_declaration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_refuse BOOLEAN := false;
BEGIN
    BEGIN
        IF COALESCE((SELECT value = 'true'::jsonb FROM app_settings WHERE key = 'require_age_confirmation'), false) THEN
            v_refuse := NOT (
                COALESCE(NEW.raw_user_meta_data->>'age_confirmed_12', '') = 'true'
                OR COALESCE(NEW.raw_user_meta_data->>'is_child', '') = 'true'
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_refuse := false;
    END;
    IF v_refuse THEN
        RAISE EXCEPTION 'age_confirmation_required: la déclaration « 12 ans ou plus » est obligatoire';
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS aa_enforce_age_declaration ON auth.users;
CREATE TRIGGER aa_enforce_age_declaration
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.enforce_age_declaration();

-- ---------------------------------------------------------------------------
-- 1b. Enregistrement de la déclaration (jamais bloquant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_age_declaration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO age_declarations (user_id, kind)
    VALUES (
        NEW.id,
        CASE
            WHEN COALESCE(NEW.raw_user_meta_data->>'is_child', '') = 'true' THEN 'guardian_created'
            WHEN COALESCE(NEW.raw_user_meta_data->>'age_confirmed_12', '') = 'true' THEN 'self_12plus'
            ELSE 'unknown'
        END
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS zz_record_age_declaration ON auth.users;
CREATE TRIGGER zz_record_age_declaration
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.record_age_declaration();

-- ---------------------------------------------------------------------------
-- 2. Signaler un compte (professeur de cet élève, ou admin)
--    Retourne : 'ok' | 'already' | 'not_allowed' | 'child_account' | 'not_found'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_underage(p_user UUID, p_reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_ok  BOOLEAN := false;
    v_tmp BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN RETURN 'not_allowed'; END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user) THEN RETURN 'not_found'; END IF;

    IF public.is_admin() THEN
        v_ok := true;
    ELSIF to_regclass('public.classes') IS NOT NULL AND to_regclass('public.class_members') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.class_members cm JOIN public.classes c ON c.id = cm.class_id
                                WHERE c.teacher_id = $1 AND cm.student_id = $2)'
            INTO v_ok USING v_uid, p_user;
    END IF;
    IF NOT COALESCE(v_ok, false) THEN RETURN 'not_allowed'; END IF;

    -- Un compte enfant supervisé a déjà un adulte responsable : pas concerné
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = $1)' INTO v_tmp USING p_user;
        IF v_tmp THEN RETURN 'child_account'; END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM age_reports WHERE user_id = p_user AND status = 'open') THEN RETURN 'already'; END IF;

    INSERT INTO age_reports (user_id, reported_by, reason)
    VALUES (p_user, v_uid, NULLIF(left(trim(COALESCE(p_reason, '')), 500), ''));
    RETURN 'ok';
END
$$;
REVOKE ALL ON FUNCTION public.report_underage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_underage(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Liste (admin) et décision (admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_age_reports()
RETURNS TABLE (id UUID, user_id UUID, user_name TEXT, user_email TEXT, reported_by_name TEXT,
               reason TEXT, status TEXT, created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, declared_kind TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT r.id, r.user_id, u.full_name, u.email, rb.full_name, r.reason, r.status, r.created_at, r.resolved_at, d.kind
    FROM age_reports r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN users rb ON rb.id = r.reported_by
    LEFT JOIN age_declarations d ON d.user_id = r.user_id
    WHERE public.is_admin()
    ORDER BY (r.status = 'open') DESC, r.created_at DESC
    LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_age_reports() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_age_reports() TO authenticated;

-- p_action : 'dismiss' (ignorer), 'block' (bloquer la connexion), 'unblock' (rouvrir un compte bloqué)
-- Retourne : 'ok' | 'not_allowed' | 'not_found' | 'bad_action'
CREATE OR REPLACE FUNCTION public.resolve_age_report(p_id UUID, p_action TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID;
BEGIN
    IF NOT public.is_admin() THEN RETURN 'not_allowed'; END IF;
    SELECT user_id INTO v_user FROM age_reports WHERE id = p_id;
    IF v_user IS NULL THEN RETURN 'not_found'; END IF;

    IF p_action = 'dismiss' THEN
        UPDATE age_reports SET status = 'dismissed', resolved_at = now(), resolved_by = auth.uid() WHERE id = p_id;
    ELSIF p_action = 'block' THEN
        IF v_user = auth.uid() THEN RETURN 'not_allowed'; END IF;
        UPDATE auth.users SET banned_until = 'infinity' WHERE id = v_user;
        UPDATE age_reports SET status = 'blocked', resolved_at = now(), resolved_by = auth.uid() WHERE id = p_id;
    ELSIF p_action = 'unblock' THEN
        UPDATE auth.users SET banned_until = NULL WHERE id = v_user;
        UPDATE age_reports SET status = 'dismissed', resolved_at = now(), resolved_by = auth.uid() WHERE id = p_id;
    ELSE
        RETURN 'bad_action';
    END IF;
    RETURN 'ok';
END
$$;
REVOKE ALL ON FUNCTION public.resolve_age_report(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_age_report(UUID, TEXT) TO authenticated;
