-- ============================================================================
-- COURS EN TÊTE-À-TÊTE
-- À exécuter UNE fois APRÈS professeurs.sql (il utilise is_teacher()). Sans danger si relancé.
--
-- Deux façons de recevoir l'aide d'un professeur, avec un même quota mensuel (2 par défaut) :
--  1) une séance en visio : le professeur publie des créneaux avec SON lien (Meet, Zoom, appel WhatsApp…),
--     l'élève réserve, le lien n'est visible que par l'élève qui a réservé ;
--  2) une question écrite (texte + code) pour les connexions faibles : réponse sous 24 h par défaut.
-- Les comptes enfants (moins de 12 ans) ne réservent pas et ne posent pas de question seuls.
-- Réglages dans app_settings (un nombre) : 'tutoring_monthly_quota' (défaut 2 par mois)
-- et 'tutoring_answer_hours' (délai de réponse promis, défaut 24).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tutoring_slots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    starts_at     TIMESTAMPTZ NOT NULL,
    duration_min  INTEGER NOT NULL DEFAULT 30 CHECK (duration_min IN (15, 30, 45, 60)),
    meeting_url   TEXT NOT NULL CHECK (meeting_url ~* '^https://' AND length(meeting_url) <= 300),
    status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'booked', 'cancelled')),
    booked_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    booked_at     TIMESTAMPTZ,
    topic         TEXT CHECK (topic IS NULL OR length(topic) <= 300),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tutoring_slots_open_idx ON public.tutoring_slots (status, starts_at);
CREATE INDEX IF NOT EXISTS tutoring_slots_teacher_idx ON public.tutoring_slots (teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS tutoring_slots_booked_idx ON public.tutoring_slots (booked_by, starts_at);

CREATE TABLE IF NOT EXISTS public.tutoring_questions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body         TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
    code         TEXT CHECK (code IS NULL OR length(code) <= 4000),
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
    answer       TEXT CHECK (answer IS NULL OR length(answer) <= 4000),
    answered_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS tutoring_questions_student_idx ON public.tutoring_questions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tutoring_questions_status_idx ON public.tutoring_questions (status, created_at);

ALTER TABLE public.tutoring_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_questions ENABLE ROW LEVEL SECURITY;

-- Créneaux : le professeur gère les siens (le lien de visio n'est lisible que par lui et l'admin).
-- Les élèves passent par les fonctions ci-dessous, qui ne montrent le lien qu'après réservation.
DROP POLICY IF EXISTS "Teacher manages own slots" ON public.tutoring_slots;
CREATE POLICY "Teacher manages own slots" ON public.tutoring_slots FOR ALL
    USING (teacher_id = auth.uid() OR public.is_admin())
    WITH CHECK ((teacher_id = auth.uid() AND public.is_teacher()) OR public.is_admin());

-- Questions : l'élève lit les siennes (l'envoi passe par ask_question), l'admin voit tout.
DROP POLICY IF EXISTS "Student reads own questions" ON public.tutoring_questions;
CREATE POLICY "Student reads own questions" ON public.tutoring_questions FOR SELECT
    USING (student_id = auth.uid() OR public.is_admin());

-- Quota du mois en cours : séances réservées (non annulées) + questions posées, et délai de réponse promis.
CREATE OR REPLACE FUNCTION public.tutoring_quota()
RETURNS TABLE (quota INTEGER, used INTEGER, answer_hours INTEGER)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
    v_q INTEGER;
    v_h INTEGER;
    v_start TIMESTAMPTZ := date_trunc('month', now());
    v_end TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
    v_used INTEGER;
BEGIN
    BEGIN
        SELECT (s.value #>> '{}')::integer INTO v_q FROM public.app_settings s WHERE s.key = 'tutoring_monthly_quota';
    EXCEPTION WHEN others THEN
        v_q := NULL;
    END;
    IF v_q IS NULL OR v_q < 0 THEN v_q := 2; END IF;

    BEGIN
        SELECT (s.value #>> '{}')::integer INTO v_h FROM public.app_settings s WHERE s.key = 'tutoring_answer_hours';
    EXCEPTION WHEN others THEN
        v_h := NULL;
    END;
    IF v_h IS NULL OR v_h < 1 OR v_h > 168 THEN v_h := 24; END IF;

    SELECT
        (SELECT count(*) FROM public.tutoring_slots t
          WHERE t.booked_by = auth.uid() AND t.status = 'booked' AND t.starts_at >= v_start AND t.starts_at < v_end)
      + (SELECT count(*) FROM public.tutoring_questions q
          WHERE q.student_id = auth.uid() AND q.created_at >= v_start AND q.created_at < v_end)
    INTO v_used;
    RETURN QUERY SELECT v_q, v_used, v_h;
END $$;

-- Un compte enfant supervisé ne réserve pas seul.
CREATE OR REPLACE FUNCTION public.tutoring_is_child() RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v BOOLEAN := false;
BEGIN
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = $1)' INTO v USING auth.uid();
    END IF;
    RETURN v;
END $$;

-- Créneaux libres, au moins 2 h dans le futur, sans le lien de visio.
CREATE OR REPLACE FUNCTION public.open_slots()
RETURNS TABLE (id UUID, teacher_name TEXT, starts_at TIMESTAMPTZ, duration_min INTEGER)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT t.id, COALESCE(NULLIF(trim(u.full_name), ''), 'Professeur'), t.starts_at, t.duration_min
    FROM public.tutoring_slots t JOIN public.users u ON u.id = t.teacher_id
    WHERE t.status = 'open' AND t.starts_at > now() + interval '2 hours' AND t.teacher_id <> auth.uid()
    ORDER BY t.starts_at LIMIT 60
$$;

-- Mes séances réservées (avec le lien), y compris celles qui viennent de commencer.
CREATE OR REPLACE FUNCTION public.my_bookings()
RETURNS TABLE (id UUID, teacher_name TEXT, starts_at TIMESTAMPTZ, duration_min INTEGER, meeting_url TEXT, topic TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT t.id, COALESCE(NULLIF(trim(u.full_name), ''), 'Professeur'), t.starts_at, t.duration_min, t.meeting_url, t.topic
    FROM public.tutoring_slots t JOIN public.users u ON u.id = t.teacher_id
    WHERE t.booked_by = auth.uid() AND t.status = 'booked' AND t.starts_at > now() - interval '2 hours'
    ORDER BY t.starts_at
$$;

-- Réserver. Erreurs : not_authenticated, child_account, quota_reached, slot_unavailable.
CREATE OR REPLACE FUNCTION public.book_slot(p_slot_id UUID, p_topic TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_q INTEGER; v_used INTEGER; v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    IF public.tutoring_is_child() THEN RAISE EXCEPTION 'child_account'; END IF;
    SELECT q.quota, q.used INTO v_q, v_used FROM public.tutoring_quota() q;
    IF v_used >= v_q THEN RAISE EXCEPTION 'quota_reached'; END IF;

    UPDATE public.tutoring_slots
       SET status = 'booked', booked_by = auth.uid(), booked_at = now(), topic = NULLIF(left(trim(COALESCE(p_topic, '')), 300), '')
     WHERE id = p_slot_id AND status = 'open' AND starts_at > now() + interval '2 hours' AND teacher_id <> auth.uid()
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
END $$;

-- Annuler une réservation, jusqu'à 12 h avant. Le créneau redevient libre et le quota est rendu.
CREATE OR REPLACE FUNCTION public.cancel_booking(p_slot_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    UPDATE public.tutoring_slots
       SET status = 'open', booked_by = NULL, booked_at = NULL, topic = NULL
     WHERE id = p_slot_id AND booked_by = auth.uid() AND status = 'booked' AND starts_at > now() + interval '12 hours'
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.tutoring_slots WHERE id = p_slot_id AND booked_by = auth.uid() AND status = 'booked') THEN
            RAISE EXCEPTION 'too_late';
        END IF;
        RAISE EXCEPTION 'not_found';
    END IF;
END $$;

-- Poser une question écrite. Erreurs : not_authenticated, child_account, quota_reached.
CREATE OR REPLACE FUNCTION public.ask_question(p_body TEXT, p_code TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_q INTEGER; v_used INTEGER; v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    IF public.tutoring_is_child() THEN RAISE EXCEPTION 'child_account'; END IF;
    SELECT q.quota, q.used INTO v_q, v_used FROM public.tutoring_quota() q;
    IF v_used >= v_q THEN RAISE EXCEPTION 'quota_reached'; END IF;
    INSERT INTO public.tutoring_questions (student_id, body, code)
    VALUES (auth.uid(), left(trim(p_body), 2000), NULLIF(left(p_code, 4000), ''))
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

-- Côté professeur : mes créneaux (avec le nom et l'e-mail de l'élève qui a réservé).
CREATE OR REPLACE FUNCTION public.teacher_slots()
RETURNS TABLE (id UUID, starts_at TIMESTAMPTZ, duration_min INTEGER, meeting_url TEXT, status TEXT, topic TEXT, student_name TEXT, student_email TEXT)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF NOT (public.is_teacher() OR public.is_admin()) THEN RAISE EXCEPTION 'not_teacher'; END IF;
    RETURN QUERY
    SELECT t.id, t.starts_at, t.duration_min, t.meeting_url, t.status, t.topic,
           COALESCE(NULLIF(trim(u.full_name), ''), u.email), u.email
    FROM public.tutoring_slots t LEFT JOIN public.users u ON u.id = t.booked_by
    WHERE t.teacher_id = auth.uid() AND t.status <> 'cancelled' AND t.starts_at > now() - interval '1 day'
    ORDER BY t.starts_at;
END $$;

-- Côté professeur : questions à traiter (anciennes d'abord) + réponses des 30 derniers jours.
CREATE OR REPLACE FUNCTION public.teacher_questions()
RETURNS TABLE (id UUID, student_name TEXT, body TEXT, code TEXT, status TEXT, answer TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF NOT (public.is_teacher() OR public.is_admin()) THEN RAISE EXCEPTION 'not_teacher'; END IF;
    RETURN QUERY
    SELECT q.id, COALESCE(NULLIF(trim(u.full_name), ''), 'Élève'), q.body, q.code, q.status, q.answer, q.created_at
    FROM public.tutoring_questions q JOIN public.users u ON u.id = q.student_id
    WHERE q.status = 'open' OR q.answered_at > now() - interval '30 days'
    ORDER BY (q.status = 'open') DESC, q.created_at ASC LIMIT 100;
END $$;

CREATE OR REPLACE FUNCTION public.answer_question(p_id UUID, p_answer TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    IF NOT (public.is_teacher() OR public.is_admin()) THEN RAISE EXCEPTION 'not_teacher'; END IF;
    IF length(trim(COALESCE(p_answer, ''))) = 0 THEN RAISE EXCEPTION 'empty_answer'; END IF;
    UPDATE public.tutoring_questions
       SET status = 'answered', answer = left(trim(p_answer), 4000), answered_by = auth.uid(), answered_at = now()
     WHERE id = p_id AND status = 'open'
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.tutoring_quota(), public.tutoring_is_child(), public.open_slots(), public.my_bookings(),
    public.book_slot(UUID, TEXT), public.cancel_booking(UUID), public.ask_question(TEXT, TEXT),
    public.teacher_slots(), public.teacher_questions(), public.answer_question(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tutoring_quota(), public.open_slots(), public.my_bookings(),
    public.book_slot(UUID, TEXT), public.cancel_booking(UUID), public.ask_question(TEXT, TEXT),
    public.teacher_slots(), public.teacher_questions(), public.answer_question(UUID, TEXT) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutoring_slots TO authenticated;
GRANT SELECT ON public.tutoring_questions TO authenticated;
