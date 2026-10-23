-- ============================================================================
-- CHAT DE CLASSE (script 20)
-- À exécuter UNE fois dans Supabase → SQL Editor, APRÈS professeurs.sql. Sans danger si relancé.
--
-- Un salon de discussion par classe : le professeur et les élèves de la classe, personne d'autre.
--  * Les comptes enfants supervisés ne rejoignent pas de classe seuls : ils n'ont donc pas de chat.
--  * Tout passe par des fonctions serveur : aucune lecture ni écriture directe des tables.
--  * Liens, e-mails et numéros de téléphone sont refusés (comme dans l'Entraide).
--  * Anti-spam : 15 messages par minute et par personne.
--  * Tout membre peut signaler un message ; le professeur (et l'admin) peut supprimer un message
--    et mettre un élève en sourdine (il peut lire mais plus écrire).
--  * On voit seulement « Prénom N. », jamais l'e-mail.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
    deleted     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS class_messages_class_idx ON public.class_messages (class_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.class_message_reports (
    message_id  UUID NOT NULL REFERENCES public.class_messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.class_mutes (
    class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, user_id)
);

-- RLS activée SANS politique : les tables sont fermées, seules les fonctions ci-dessous y accèdent.
ALTER TABLE public.class_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_mutes           ENABLE ROW LEVEL SECURITY;

-- Rôle de l'utilisateur dans une classe : 'teacher', 'student' ou NULL (étranger à la classe).
CREATE OR REPLACE FUNCTION public.chat_role(p_class UUID) RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM public.classes c WHERE c.id = p_class AND c.teacher_id = auth.uid()) THEN 'teacher'
        WHEN EXISTS (SELECT 1 FROM public.class_members m WHERE m.class_id = p_class AND m.student_id = auth.uid()) THEN 'student'
        ELSE NULL
    END
$$;

CREATE OR REPLACE FUNCTION public.chat_name(p_user UUID) RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT COALESCE(
        NULLIF(trim(split_part(trim(u.full_name), ' ', 1) ||
            CASE WHEN position(' ' in trim(u.full_name)) > 0
                 THEN ' ' || upper(left(trim(split_part(trim(u.full_name), ' ', 2)), 1)) || '.' ELSE '' END), ''),
        'Élève')
    FROM public.users u WHERE u.id = p_user
$$;

-- Résumé de mes salons (en tant que professeur ou élève).
CREATE OR REPLACE FUNCTION public.class_chat_summary()
RETURNS TABLE (class_id UUID, class_name TEXT, teacher_name TEXT, is_teacher BOOLEAN, member_count INT, last_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT c.id, c.name,
           COALESCE(NULLIF(trim(t.full_name), ''), 'Professeur'),
           (c.teacher_id = auth.uid()),
           (SELECT count(*)::int FROM public.class_members m WHERE m.class_id = c.id),
           (SELECT max(cm.created_at) FROM public.class_messages cm WHERE cm.class_id = c.id AND NOT cm.deleted)
    FROM public.classes c
    JOIN public.users t ON t.id = c.teacher_id
    WHERE auth.uid() IS NOT NULL
      AND (c.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_members m WHERE m.class_id = c.id AND m.student_id = auth.uid()))
    ORDER BY c.name
$$;

-- Derniers messages (100 max). p_since = ne renvoyer que les plus récents (économie de données).
CREATE OR REPLACE FUNCTION public.class_chat_list(p_class UUID, p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (id UUID, author_id UUID, author_name TEXT, is_teacher BOOLEAN, body TEXT, created_at TIMESTAMPTZ,
               mine BOOLEAN, reports INT, author_muted BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_role TEXT := public.chat_role(p_class); v_mod BOOLEAN;
BEGIN
    IF v_role IS NULL AND NOT public.is_admin() THEN RAISE EXCEPTION 'not_allowed'; END IF;
    v_mod := (v_role = 'teacher') OR public.is_admin();
    RETURN QUERY
    SELECT * FROM (
        SELECT m.id, m.user_id, public.chat_name(m.user_id),
               EXISTS (SELECT 1 FROM public.classes c WHERE c.id = p_class AND c.teacher_id = m.user_id),
               m.body, m.created_at, (m.user_id = auth.uid()),
               CASE WHEN v_mod THEN (SELECT count(*)::int FROM public.class_message_reports r WHERE r.message_id = m.id) ELSE 0 END,
               EXISTS (SELECT 1 FROM public.class_mutes x WHERE x.class_id = p_class AND x.user_id = m.user_id)
        FROM public.class_messages m
        WHERE m.class_id = p_class AND NOT m.deleted AND (p_since IS NULL OR m.created_at > p_since)
        ORDER BY m.created_at DESC
        LIMIT 100
    ) s ORDER BY s.created_at ASC;
END $$;

-- Écrire un message. Erreurs : not_allowed, muted, empty, link, personal_info, rate_limited.
CREATE OR REPLACE FUNCTION public.class_chat_post(p_class UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT := public.chat_role(p_class); v_body TEXT := trim(COALESCE(p_body, '')); v_id UUID;
BEGIN
    IF v_role IS NULL THEN RAISE EXCEPTION 'not_allowed'; END IF;
    IF v_role = 'student' AND EXISTS (SELECT 1 FROM public.class_mutes WHERE class_id = p_class AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'muted';
    END IF;
    IF length(v_body) < 1 OR length(v_body) > 1000 THEN RAISE EXCEPTION 'empty'; END IF;
    IF v_body ~* '(https?://|www\.)' THEN RAISE EXCEPTION 'link'; END IF;
    IF v_body ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' THEN RAISE EXCEPTION 'personal_info'; END IF;
    IF v_body ~ '(\+?\d[\d .-]{7,}\d)' THEN RAISE EXCEPTION 'personal_info'; END IF;
    IF (SELECT count(*) FROM public.class_messages WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute') >= 15 THEN
        RAISE EXCEPTION 'rate_limited';
    END IF;
    INSERT INTO public.class_messages (class_id, user_id, body) VALUES (p_class, auth.uid(), v_body) RETURNING class_messages.id INTO v_id;
    RETURN v_id;
END $$;

-- Supprimer un message : son auteur, le professeur de la classe ou l'admin.
CREATE OR REPLACE FUNCTION public.class_chat_delete(p_message UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class UUID; v_author UUID;
BEGIN
    SELECT class_id, user_id INTO v_class, v_author FROM public.class_messages WHERE id = p_message;
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    IF v_author <> auth.uid() AND public.chat_role(v_class) IS DISTINCT FROM 'teacher' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'not_allowed';
    END IF;
    UPDATE public.class_messages SET deleted = true WHERE id = p_message;
END $$;

-- Signaler un message d'un autre membre.
CREATE OR REPLACE FUNCTION public.class_chat_report(p_message UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class UUID; v_author UUID;
BEGIN
    SELECT class_id, user_id INTO v_class, v_author FROM public.class_messages WHERE id = p_message AND NOT deleted;
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    IF public.chat_role(v_class) IS NULL THEN RAISE EXCEPTION 'not_allowed'; END IF;
    IF v_author = auth.uid() THEN RAISE EXCEPTION 'own_message'; END IF;
    INSERT INTO public.class_message_reports (message_id, user_id) VALUES (p_message, auth.uid()) ON CONFLICT DO NOTHING;
END $$;

-- Sourdine d'un élève (professeur de la classe ou admin).
CREATE OR REPLACE FUNCTION public.class_chat_mute(p_class UUID, p_student UUID, p_muted BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF public.chat_role(p_class) IS DISTINCT FROM 'teacher' AND NOT public.is_admin() THEN RAISE EXCEPTION 'not_allowed'; END IF;
    IF p_muted THEN
        INSERT INTO public.class_mutes (class_id, user_id) VALUES (p_class, p_student) ON CONFLICT DO NOTHING;
    ELSE
        DELETE FROM public.class_mutes WHERE class_id = p_class AND user_id = p_student;
    END IF;
END $$;

REVOKE ALL ON FUNCTION public.chat_role(UUID), public.chat_name(UUID), public.class_chat_summary(),
    public.class_chat_list(UUID, TIMESTAMPTZ), public.class_chat_post(UUID, TEXT), public.class_chat_delete(UUID),
    public.class_chat_report(UUID), public.class_chat_mute(UUID, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_chat_summary(), public.class_chat_list(UUID, TIMESTAMPTZ), public.class_chat_post(UUID, TEXT),
    public.class_chat_delete(UUID), public.class_chat_report(UUID), public.class_chat_mute(UUID, UUID, BOOLEAN) TO authenticated;
