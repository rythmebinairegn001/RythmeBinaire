-- ============================================================================
-- CERTIFICATS VÉRIFIABLES
-- À exécuter UNE fois dans Supabase → SQL Editor. Sans danger si relancé.
--
-- Un certificat n'est délivré QUE si l'élève a terminé toutes les leçons du cours (vérifié ici,
-- dans la base, pas dans le navigateur). Chaque certificat a un code (ex : RB-7KQ4M2XD) que
-- n'importe qui peut vérifier sur le site, sans compte.
-- Les cours d'exemple écrits dans le code (sans leçons en base) ne délivrent pas de certificat.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.gen_cert_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
    alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_code TEXT; i INT;
BEGIN
    LOOP
        v_code := 'RB-';
        FOR i IN 1..8 LOOP
            v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates c WHERE c.code = v_code);
    END LOOP;
    RETURN v_code;
END $$;

CREATE TABLE IF NOT EXISTS public.certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id       TEXT NOT NULL,
    student_name    TEXT NOT NULL,
    course_title_fr TEXT NOT NULL,
    course_title_en TEXT NOT NULL,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked         BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, course_id)
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student reads own certificates" ON public.certificates;
CREATE POLICY "Student reads own certificates" ON public.certificates FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Admin manages certificates" ON public.certificates;
CREATE POLICY "Admin manages certificates" ON public.certificates FOR UPDATE
    USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Pas de politique INSERT : un certificat ne s'obtient que par issue_certificate().

-- Délivre (ou renvoie) le certificat de l'élève connecté pour un cours terminé.
-- Erreurs : not_authenticated, no_content, not_finished, name_required.
CREATE OR REPLACE FUNCTION public.issue_certificate(p_course_id TEXT, p_name TEXT DEFAULT NULL)
RETURNS SETOF public.certificates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_total INT; v_done INT; v_name TEXT; v_fr TEXT; v_en TEXT;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

    IF EXISTS (SELECT 1 FROM public.certificates WHERE user_id = auth.uid() AND course_id = p_course_id) THEN
        RETURN QUERY SELECT * FROM public.certificates WHERE user_id = auth.uid() AND course_id = p_course_id;
        RETURN;
    END IF;

    SELECT count(*) INTO v_total
    FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id::text = p_course_id;
    IF v_total = 0 THEN RAISE EXCEPTION 'no_content'; END IF;

    SELECT count(DISTINCT lp.lesson_id) INTO v_done
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id::text = lp.lesson_id
    JOIN public.modules m ON m.id = l.module_id AND m.course_id::text = p_course_id
    WHERE lp.user_id = auth.uid() AND lp.course_id = p_course_id;
    IF v_done < v_total THEN RAISE EXCEPTION 'not_finished'; END IF;

    SELECT NULLIF(trim(full_name), '') INTO v_name FROM public.users WHERE id = auth.uid();
    v_name := COALESCE(v_name, NULLIF(trim(p_name), ''));
    IF v_name IS NULL OR length(v_name) < 2 THEN RAISE EXCEPTION 'name_required'; END IF;
    v_name := left(v_name, 80);

    SELECT title INTO v_fr FROM public.course_translations WHERE course_id::text = p_course_id AND lang = 'fr';
    SELECT title INTO v_en FROM public.course_translations WHERE course_id::text = p_course_id AND lang = 'en';
    v_fr := COALESCE(v_fr, v_en, 'Cours');
    v_en := COALESCE(v_en, v_fr);

    RETURN QUERY
    INSERT INTO public.certificates (code, user_id, course_id, student_name, course_title_fr, course_title_en)
    VALUES (public.gen_cert_code(), auth.uid(), p_course_id, v_name, v_fr, v_en)
    ON CONFLICT (user_id, course_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.issue_certificate(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_certificate(TEXT, TEXT) TO authenticated;

-- Vérification publique par code (sans compte) : nom, cours, date, validité. Rien d'autre.
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code TEXT)
RETURNS TABLE (student_name TEXT, course_title_fr TEXT, course_title_en TEXT, issued_at TIMESTAMPTZ, revoked BOOLEAN)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT c.student_name, c.course_title_fr, c.course_title_en, c.issued_at, c.revoked
    FROM public.certificates c WHERE c.code = upper(trim(p_code))
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

GRANT SELECT, UPDATE ON public.certificates TO authenticated;
