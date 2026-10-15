-- ============================================================================
-- NOTIFICATIONS (dans le site + e-mail facultatif)
-- À exécuter UNE fois, EN DERNIER (après professeurs.sql et tutorat.sql). Sans danger si relancé :
-- relance-le si tu ajoutes tutorat.sql plus tard, les déclencheurs manquants seront créés.
--
-- Qui est prévenu, et de quoi :
--   élève        : message d'un professeur · réponse à sa question · séance annulée par le professeur · rappel de séance
--   professeur   : nouvelle question d'un élève · séance réservée / annulée par l'élève · rappel de séance
-- Les notifications apparaissent dans le tableau de bord. L'envoi par e-mail est géré par la fonction
-- send-notifications (voir NOTIFICATIONS-ACTIVATION.md) et reste inactif tant qu'elle n'est pas déployée.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at     TIMESTAMPTZ,
    emailed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_pending_email_idx ON public.notifications (created_at) WHERE emailed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_prefs (
    user_id  UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email    BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own notifications" ON public.notifications;
CREATE POLICY "User reads own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
-- Pas de politique INSERT/UPDATE : on ne crée que par les déclencheurs, on ne marque « lu » que par la fonction ci-dessous.

DROP POLICY IF EXISTS "User reads own prefs" ON public.notification_prefs;
CREATE POLICY "User reads own prefs" ON public.notification_prefs FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "User inserts own prefs" ON public.notification_prefs;
CREATE POLICY "User inserts own prefs" ON public.notification_prefs FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "User updates own prefs" ON public.notification_prefs;
CREATE POLICY "User updates own prefs" ON public.notification_prefs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids UUID[])
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    UPDATE public.notifications SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL AND id = ANY(p_ids)
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;

-- Crée une notification dans la langue de la personne (interne : personne ne l'appelle depuis le site).
CREATE OR REPLACE FUNCTION public.notify_user(p_user UUID, p_kind TEXT, p_fr_title TEXT, p_en_title TEXT, p_fr_body TEXT, p_en_body TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_en BOOLEAN;
BEGIN
    IF p_user IS NULL THEN RETURN; END IF;
    SELECT (preferred_language::text = 'en') INTO v_en FROM public.users WHERE id = p_user;
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (p_user, p_kind,
            CASE WHEN COALESCE(v_en, false) THEN p_en_title ELSE p_fr_title END,
            left(CASE WHEN COALESCE(v_en, false) THEN p_en_body ELSE p_fr_body END, 300));
END $$;
REVOKE ALL ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.fmt_slot_time(p TIMESTAMPTZ) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$ SELECT to_char(p AT TIME ZONE 'UTC', 'DD/MM "à" HH24:MI') $$;

-- ---------------------------------------------------------------- déclencheurs

CREATE OR REPLACE FUNCTION public.trg_notify_teacher_message() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.notify_user(NEW.student_id, 'teacher_message', 'Message de ton professeur', 'Message from your teacher', NEW.body, NEW.body);
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_question() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        FOR t IN SELECT user_id FROM public.teachers LOOP
            PERFORM public.notify_user(t.user_id, 'question_new', 'Nouvelle question d''un élève', 'New student question', NEW.body, NEW.body);
        END LOOP;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'answered' THEN
        PERFORM public.notify_user(NEW.student_id, 'question_answered', 'Un professeur a répondu à ta question', 'A teacher answered your question', NEW.answer, NEW.answer);
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_slot() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT; v_when TEXT := public.fmt_slot_time(NEW.starts_at);
BEGIN
    IF OLD.status = 'open' AND NEW.status = 'booked' THEN
        SELECT COALESCE(NULLIF(trim(full_name), ''), email) INTO v_name FROM public.users WHERE id = NEW.booked_by;
        PERFORM public.notify_user(NEW.teacher_id, 'slot_booked', 'Séance réservée', 'Session booked',
            v_name || ' a réservé le ' || v_when || COALESCE(' — ' || NEW.topic, ''),
            v_name || ' booked ' || v_when || COALESCE(' — ' || NEW.topic, ''));
    ELSIF OLD.status = 'booked' AND NEW.status = 'open' AND OLD.booked_by IS NOT NULL THEN
        SELECT COALESCE(NULLIF(trim(full_name), ''), email) INTO v_name FROM public.users WHERE id = OLD.booked_by;
        PERFORM public.notify_user(NEW.teacher_id, 'slot_student_cancelled', 'Réservation annulée', 'Booking cancelled',
            v_name || ' a annulé la séance du ' || v_when || '. Le créneau est de nouveau libre.',
            v_name || ' cancelled the ' || v_when || ' session. The slot is free again.');
    ELSIF OLD.status = 'booked' AND NEW.status = 'cancelled' AND OLD.booked_by IS NOT NULL THEN
        PERFORM public.notify_user(OLD.booked_by, 'slot_teacher_cancelled', 'Séance annulée par le professeur', 'Session cancelled by the teacher',
            'Ta séance du ' || v_when || ' est annulée. Ta séance t''est rendue : tu peux en réserver une autre.',
            'Your ' || v_when || ' session is cancelled. Your session credit is back: you can book another one.');
    END IF;
    RETURN NEW;
END $$;

-- Rappels : appelée toutes les 5 minutes par send-notifications. Réservée au serveur (clé de service).
CREATE OR REPLACE FUNCTION public.queue_session_reminders() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; n INTEGER := 0;
BEGIN
    IF to_regclass('public.tutoring_slots') IS NULL THEN RETURN 0; END IF;
    FOR s IN EXECUTE 'SELECT id, teacher_id, booked_by, starts_at FROM public.tutoring_slots
                      WHERE status = ''booked'' AND booked_by IS NOT NULL AND reminded_at IS NULL
                        AND starts_at > now() AND starts_at <= now() + interval ''2 hours''' LOOP
        PERFORM public.notify_user(s.booked_by, 'slot_reminder', 'Rappel : ta séance commence bientôt', 'Reminder: your session starts soon',
            'Séance prévue le ' || public.fmt_slot_time(s.starts_at) || '. Le bouton « Rejoindre » apparaît 10 minutes avant.',
            'Session on ' || public.fmt_slot_time(s.starts_at) || '. The “Join” button appears 10 minutes before.');
        PERFORM public.notify_user(s.teacher_id, 'slot_reminder', 'Rappel : séance bientôt', 'Reminder: session soon',
            'Séance avec un élève le ' || public.fmt_slot_time(s.starts_at) || '.', 'Session with a student on ' || public.fmt_slot_time(s.starts_at) || '.');
        EXECUTE 'UPDATE public.tutoring_slots SET reminded_at = now() WHERE id = $1' USING s.id;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.queue_session_reminders() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- branchement (selon les tables présentes)
DO $$
BEGIN
    IF to_regclass('public.teacher_messages') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS notify_teacher_message ON public.teacher_messages;
        CREATE TRIGGER notify_teacher_message AFTER INSERT ON public.teacher_messages
            FOR EACH ROW EXECUTE FUNCTION public.trg_notify_teacher_message();
    END IF;
    IF to_regclass('public.tutoring_questions') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS notify_question ON public.tutoring_questions;
        CREATE TRIGGER notify_question AFTER INSERT OR UPDATE ON public.tutoring_questions
            FOR EACH ROW EXECUTE FUNCTION public.trg_notify_question();
    END IF;
    IF to_regclass('public.tutoring_slots') IS NOT NULL THEN
        ALTER TABLE public.tutoring_slots ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
        DROP TRIGGER IF EXISTS notify_slot ON public.tutoring_slots;
        CREATE TRIGGER notify_slot AFTER UPDATE ON public.tutoring_slots
            FOR EACH ROW EXECUTE FUNCTION public.trg_notify_slot();
    END IF;
END $$;

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_prefs TO authenticated;
