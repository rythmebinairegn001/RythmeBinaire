-- ============================================================================
-- PARCOURS GUIDÉS (script 19)
-- À exécuter UNE fois dans Supabase → SQL Editor, APRÈS certificats.sql. Sans danger si relancé.
--
-- Un parcours = une suite ordonnée de cours (ex : « Web de zéro ») avec un certificat à la fin.
-- Le certificat de parcours est délivré par la base seulement si TOUS les cours du parcours
-- sont terminés. Il réutilise la table certificates (course_id = 'path:<id du parcours>')
-- et se vérifie sur la même page publique.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learning_paths (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_fr    TEXT NOT NULL,
    title_en    TEXT NOT NULL,
    summary_fr  TEXT NOT NULL DEFAULT '',
    summary_en  TEXT NOT NULL DEFAULT '',
    course_ids  TEXT[] NOT NULL DEFAULT '{}',
    position    INT NOT NULL DEFAULT 0,
    published   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads published paths" ON public.learning_paths;
CREATE POLICY "Anyone reads published paths" ON public.learning_paths FOR SELECT
    USING (published OR public.is_admin());
DROP POLICY IF EXISTS "Admin manages paths" ON public.learning_paths;
CREATE POLICY "Admin manages paths" ON public.learning_paths FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.learning_paths TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;

-- Délivre (ou renvoie) le certificat de parcours. Erreurs : not_authenticated, no_content, not_finished, name_required.
CREATE OR REPLACE FUNCTION public.issue_path_certificate(p_path_id UUID, p_name TEXT DEFAULT NULL)
RETURNS SETOF public.certificates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_key TEXT := 'path:' || p_path_id::text;
    v_path public.learning_paths%ROWTYPE;
    v_cid TEXT; v_total INT; v_done INT; v_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

    IF EXISTS (SELECT 1 FROM public.certificates WHERE user_id = auth.uid() AND course_id = v_key) THEN
        RETURN QUERY SELECT * FROM public.certificates WHERE user_id = auth.uid() AND course_id = v_key;
        RETURN;
    END IF;

    SELECT * INTO v_path FROM public.learning_paths WHERE id = p_path_id AND published;
    IF NOT FOUND OR coalesce(array_length(v_path.course_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'no_content'; END IF;

    FOREACH v_cid IN ARRAY v_path.course_ids LOOP
        SELECT count(*) INTO v_total
        FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
        WHERE m.course_id::text = v_cid;
        IF v_total = 0 THEN RAISE EXCEPTION 'not_finished'; END IF;

        SELECT count(DISTINCT lp.lesson_id) INTO v_done
        FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id::text = lp.lesson_id
        JOIN public.modules m ON m.id = l.module_id AND m.course_id::text = v_cid
        WHERE lp.user_id = auth.uid() AND lp.course_id = v_cid;
        IF v_done < v_total THEN RAISE EXCEPTION 'not_finished'; END IF;
    END LOOP;

    SELECT NULLIF(trim(full_name), '') INTO v_name FROM public.users WHERE id = auth.uid();
    v_name := COALESCE(v_name, NULLIF(trim(p_name), ''));
    IF v_name IS NULL OR length(v_name) < 2 THEN RAISE EXCEPTION 'name_required'; END IF;
    v_name := left(v_name, 80);

    RETURN QUERY
    INSERT INTO public.certificates (code, user_id, course_id, student_name, course_title_fr, course_title_en)
    VALUES (public.gen_cert_code(), auth.uid(), v_key, v_name, v_path.title_fr, v_path.title_en)
    ON CONFLICT (user_id, course_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.issue_path_certificate(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_path_certificate(UUID, TEXT) TO authenticated;
