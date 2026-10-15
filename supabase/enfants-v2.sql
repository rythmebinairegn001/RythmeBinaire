-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS enfants.sql, professeurs.sql et tutorat.sql
-- (et idéalement après notifications.sql).
--
-- Deux fonctions pour les comptes enfants (moins de 12 ans), toujours pilotées par l'ADULTE RESPONSABLE :
--
--  A. Réservation d'une séance en tête-à-tête par un parent pour son enfant
--     - chaque enfant a son propre quota mensuel (le même nombre que les autres élèves) ;
--     - le parent doit confirmer qu'il sera présent pendant la séance ;
--     - le lien de la séance n'est visible que par le parent ; le professeur voit « Enfant — un parent sera présent ».
--
--  B. Inscription d'un enfant à la classe d'un professeur, avec l'accord du parent
--     - seul l'adulte responsable peut inscrire son enfant (code de classe), après avoir vu le nom de la classe et du professeur ;
--     - le professeur voit le prénom de l'enfant et sa progression, JAMAIS son identifiant de connexion ni un e-mail ;
--     - le professeur ne peut PAS écrire directement à un enfant ;
--     - le parent peut retirer son enfant d'une classe à tout moment.
--
-- Ne change rien pour les élèves ordinaires.

-- ---------------------------------------------------------------- outils
CREATE OR REPLACE FUNCTION public.is_supervised_child(p_user UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v BOOLEAN := false;
BEGIN
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = $1)' INTO v USING p_user;
    END IF;
    RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.is_supervised_child(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_supervised_child(UUID) TO authenticated;

-- L'adulte responsable de cet enfant (et enfant non suspendu) ? Lève une erreur sinon.
CREATE OR REPLACE FUNCTION public.assert_guardian_of(p_child UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_n INTEGER := 0; v_susp BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    IF to_regclass('public.guardian_links') IS NULL THEN RAISE EXCEPTION 'not_guardian'; END IF;
    EXECUTE 'SELECT count(*), COALESCE(bool_or(suspended), false) FROM public.guardian_links WHERE child_id = $1 AND guardian_id = $2'
        INTO v_n, v_susp USING p_child, auth.uid();
    IF v_n = 0 THEN RAISE EXCEPTION 'not_guardian'; END IF;
    IF v_susp THEN RAISE EXCEPTION 'child_suspended'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_guardian_of(UUID) FROM PUBLIC;

-- ================================================================ B. CLASSES
ALTER TABLE public.class_members ADD COLUMN IF NOT EXISTS consent_guardian UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.class_members ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- Ce que le parent voit AVANT d'accepter : nom de la classe et du professeur (rien d'autre)
CREATE OR REPLACE FUNCTION public.class_preview(p_code TEXT)
RETURNS TABLE (class_name TEXT, teacher_name TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT c.name, COALESCE(NULLIF(trim(u.full_name), ''), 'Professeur')
    FROM public.classes c JOIN public.users u ON u.id = c.teacher_id
    WHERE c.join_code = upper(trim(p_code)) AND c.open AND auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.join_class_for_child(p_code TEXT, p_child UUID)
RETURNS TABLE (class_id UUID, class_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class public.classes%ROWTYPE;
BEGIN
    PERFORM public.assert_guardian_of(p_child);
    SELECT * INTO v_class FROM public.classes WHERE join_code = upper(trim(p_code));
    IF NOT FOUND OR NOT v_class.open THEN RAISE EXCEPTION 'invalid_code'; END IF;
    IF v_class.teacher_id = p_child THEN RAISE EXCEPTION 'own_class'; END IF;
    INSERT INTO public.class_members (class_id, student_id, consent_guardian, consent_at)
    VALUES (v_class.id, p_child, auth.uid(), now())
    ON CONFLICT ON CONSTRAINT class_members_pkey DO UPDATE SET consent_guardian = EXCLUDED.consent_guardian, consent_at = EXCLUDED.consent_at;
    RETURN QUERY SELECT v_class.id, v_class.name;
END $$;

CREATE OR REPLACE FUNCTION public.child_classes(p_child UUID)
RETURNS TABLE (class_id UUID, class_name TEXT, teacher_name TEXT, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    PERFORM public.assert_guardian_of(p_child);
    RETURN QUERY
    SELECT c.id, c.name, COALESCE(NULLIF(trim(u.full_name), ''), 'Professeur'), m.joined_at
    FROM public.class_members m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.users u ON u.id = c.teacher_id
    WHERE m.student_id = p_child
    ORDER BY m.joined_at DESC;
END $$;

-- Retirer l'enfant : autorisé même si le compte de l'enfant est suspendu
CREATE OR REPLACE FUNCTION public.remove_child_from_class(p_class UUID, p_child UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = p_child AND guardian_id = auth.uid()) THEN
        RAISE EXCEPTION 'not_guardian';
    END IF;
    DELETE FROM public.class_members WHERE class_id = p_class AND student_id = p_child;
END $$;

-- Liste des élèves d'une classe pour le professeur : un enfant apparaît SANS e-mail ni identifiant.
CREATE OR REPLACE FUNCTION public.class_roster(p_class UUID)
RETURNS TABLE (student_id UUID, full_name TEXT, email TEXT, is_child BOOLEAN, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF NOT (public.is_admin() OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = p_class AND c.teacher_id = auth.uid())) THEN
        RAISE EXCEPTION 'not_teacher';
    END IF;
    RETURN QUERY
    SELECT m.student_id, u.full_name,
           CASE WHEN public.is_supervised_child(m.student_id) THEN NULL ELSE u.email END,
           public.is_supervised_child(m.student_id), m.joined_at
    FROM public.class_members m JOIN public.users u ON u.id = m.student_id
    WHERE m.class_id = p_class
    ORDER BY m.joined_at;
END $$;

-- Le professeur ne lit plus directement la fiche d'un enfant (identifiant de connexion) : il passe par class_roster()
DROP POLICY IF EXISTS "Teacher reads class students" ON public.users;
CREATE POLICY "Teacher reads class students" ON public.users FOR SELECT
    USING (
        NOT public.is_supervised_child(users.id)
        AND id IN (
            SELECT m.student_id FROM public.class_members m
            JOIN public.classes c ON c.id = m.class_id
            WHERE c.teacher_id = auth.uid()
        )
    );

-- Pas de message direct d'un professeur à un enfant
DROP POLICY IF EXISTS "Teacher writes messages" ON public.teacher_messages;
CREATE POLICY "Teacher writes messages" ON public.teacher_messages FOR INSERT
    WITH CHECK (
        teacher_id = auth.uid()
        AND NOT public.is_supervised_child(student_id)
        AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.class_members m WHERE m.class_id = teacher_messages.class_id AND m.student_id = teacher_messages.student_id)
    );

-- ================================================================ A. TÊTE-À-TÊTE POUR UN ENFANT
ALTER TABLE public.tutoring_slots ADD COLUMN IF NOT EXISTS for_child UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tutoring_slots_child_idx ON public.tutoring_slots (for_child, starts_at);

-- Le quota d'un adulte ne compte plus les séances réservées pour ses enfants (chaque enfant a le sien)
CREATE OR REPLACE FUNCTION public.tutoring_quota()
RETURNS TABLE (quota INTEGER, used INTEGER, answer_hours INTEGER)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
    v_q INTEGER; v_h INTEGER; v_used INTEGER;
    v_start TIMESTAMPTZ := date_trunc('month', now());
    v_end TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
BEGIN
    BEGIN
        SELECT (s.value #>> '{}')::integer INTO v_q FROM public.app_settings s WHERE s.key = 'tutoring_monthly_quota';
    EXCEPTION WHEN others THEN v_q := NULL; END;
    IF v_q IS NULL OR v_q < 0 THEN v_q := 2; END IF;
    BEGIN
        SELECT (s.value #>> '{}')::integer INTO v_h FROM public.app_settings s WHERE s.key = 'tutoring_answer_hours';
    EXCEPTION WHEN others THEN v_h := NULL; END;
    IF v_h IS NULL OR v_h < 1 OR v_h > 168 THEN v_h := 24; END IF;

    SELECT
        (SELECT count(*) FROM public.tutoring_slots t
          WHERE t.booked_by = auth.uid() AND t.for_child IS NULL AND t.status = 'booked' AND t.starts_at >= v_start AND t.starts_at < v_end)
      + (SELECT count(*) FROM public.tutoring_questions q
          WHERE q.student_id = auth.uid() AND q.created_at >= v_start AND q.created_at < v_end)
    INTO v_used;
    RETURN QUERY SELECT v_q, v_used, v_h;
END $$;

CREATE OR REPLACE FUNCTION public.child_tutoring_quota(p_child UUID)
RETURNS TABLE (quota INTEGER, used INTEGER, answer_hours INTEGER)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
    v_q INTEGER; v_used INTEGER; v_h INTEGER;
    v_start TIMESTAMPTZ := date_trunc('month', now());
    v_end TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
BEGIN
    PERFORM public.assert_guardian_of(p_child);
    SELECT t.quota, t.answer_hours INTO v_q, v_h FROM public.tutoring_quota() t;
    SELECT count(*) INTO v_used FROM public.tutoring_slots s
     WHERE s.for_child = p_child AND s.status = 'booked' AND s.starts_at >= v_start AND s.starts_at < v_end;
    RETURN QUERY SELECT v_q, v_used, v_h;
END $$;

CREATE OR REPLACE FUNCTION public.book_slot_for_child(p_slot_id UUID, p_child UUID, p_present BOOLEAN, p_topic TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_q INTEGER; v_used INTEGER; v_id UUID;
BEGIN
    PERFORM public.assert_guardian_of(p_child);
    IF NOT COALESCE(p_present, false) THEN RAISE EXCEPTION 'presence_required'; END IF;
    SELECT q.quota, q.used INTO v_q, v_used FROM public.child_tutoring_quota(p_child) q;
    IF v_used >= v_q THEN RAISE EXCEPTION 'quota_reached'; END IF;

    UPDATE public.tutoring_slots
       SET status = 'booked', booked_by = auth.uid(), for_child = p_child, booked_at = now(),
           topic = NULLIF(left(trim(COALESCE(p_topic, '')), 300), '')
     WHERE id = p_slot_id AND status = 'open' AND starts_at > now() + interval '2 hours' AND teacher_id <> auth.uid()
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
END $$;

-- L'annulation libère aussi la mention « pour un enfant »
CREATE OR REPLACE FUNCTION public.cancel_booking(p_slot_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    UPDATE public.tutoring_slots
       SET status = 'open', booked_by = NULL, for_child = NULL, booked_at = NULL, topic = NULL
     WHERE id = p_slot_id AND booked_by = auth.uid() AND status = 'booked' AND starts_at > now() + interval '12 hours'
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.tutoring_slots WHERE id = p_slot_id AND booked_by = auth.uid() AND status = 'booked') THEN
            RAISE EXCEPTION 'too_late';
        END IF;
        RAISE EXCEPTION 'not_found';
    END IF;
END $$;

-- Mes séances (adulte) : on ajoute le prénom de l'enfant concerné
DROP FUNCTION IF EXISTS public.my_bookings();
CREATE FUNCTION public.my_bookings()
RETURNS TABLE (id UUID, teacher_name TEXT, starts_at TIMESTAMPTZ, duration_min INTEGER, meeting_url TEXT, topic TEXT, child_name TEXT, child_id UUID)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT t.id, COALESCE(NULLIF(trim(u.full_name), ''), 'Professeur'), t.starts_at, t.duration_min, t.meeting_url, t.topic,
           (SELECT NULLIF(trim(c.full_name), '') FROM public.users c WHERE c.id = t.for_child),
           t.for_child
    FROM public.tutoring_slots t JOIN public.users u ON u.id = t.teacher_id
    WHERE t.booked_by = auth.uid() AND t.status = 'booked' AND t.starts_at > now() - interval '2 hours'
    ORDER BY t.starts_at
$$;

-- Vue du professeur : pour un enfant, prénom + mention « enfant », et l'e-mail du PARENT (jamais celui de l'enfant)
DROP FUNCTION IF EXISTS public.teacher_slots();
CREATE FUNCTION public.teacher_slots()
RETURNS TABLE (id UUID, starts_at TIMESTAMPTZ, duration_min INTEGER, meeting_url TEXT, status TEXT, topic TEXT,
               student_name TEXT, student_email TEXT, is_child BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF NOT (public.is_teacher() OR public.is_admin()) THEN RAISE EXCEPTION 'not_teacher'; END IF;
    RETURN QUERY
    SELECT t.id, t.starts_at, t.duration_min, t.meeting_url, t.status, t.topic,
           CASE WHEN t.for_child IS NOT NULL
                THEN COALESCE(NULLIF(trim(ch.full_name), ''), 'Enfant')
                ELSE COALESCE(NULLIF(trim(u.full_name), ''), u.email) END,
           u.email,
           (t.for_child IS NOT NULL)
    FROM public.tutoring_slots t
    LEFT JOIN public.users u ON u.id = t.booked_by
    LEFT JOIN public.users ch ON ch.id = t.for_child
    WHERE t.teacher_id = auth.uid() AND t.status <> 'cancelled' AND t.starts_at > now() - interval '1 day'
    ORDER BY t.starts_at;
END $$;

REVOKE ALL ON FUNCTION public.class_preview(TEXT), public.join_class_for_child(TEXT, UUID), public.child_classes(UUID),
    public.remove_child_from_class(UUID, UUID), public.class_roster(UUID), public.child_tutoring_quota(UUID),
    public.book_slot_for_child(UUID, UUID, BOOLEAN, TEXT), public.my_bookings(), public.teacher_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_preview(TEXT), public.join_class_for_child(TEXT, UUID), public.child_classes(UUID),
    public.remove_child_from_class(UUID, UUID), public.class_roster(UUID), public.child_tutoring_quota(UUID),
    public.book_slot_for_child(UUID, UUID, BOOLEAN, TEXT), public.my_bookings(), public.teacher_slots() TO authenticated;
