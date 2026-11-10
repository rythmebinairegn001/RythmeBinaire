-- ============================================================================
-- RAPPEL « SÉRIE EN DANGER » (script 23)
-- À exécuter UNE fois dans Supabase > SQL Editor, APRÈS emails-bienvenue-relance.sql. Sans danger si relancé.
--
-- Chaque soir (à partir de 17 h, heure de la Guinée = UTC), si un élève a terminé une leçon hier ET avant-hier
-- (série d'au moins 2 jours) mais aucune aujourd'hui, il reçoit UN message dans le site (et par e-mail
-- quand Resend sera branché) : « Ta série de N jours est en danger ». Au plus un rappel par jour.
-- Ton encourageant, jamais de culpabilisation. Jamais pour un compte enfant supervisé.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_streak_reminders() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INTEGER := 0; v_today DATE := (now() AT TIME ZONE 'UTC')::date; v_len INTEGER; v_d DATE;
BEGIN
    IF extract(hour FROM now() AT TIME ZONE 'UTC') < 17 THEN RETURN 0; END IF;

    FOR r IN
        SELECT DISTINCT lp.user_id AS id
        FROM public.lesson_progress lp
        WHERE (lp.completed_at AT TIME ZONE 'UTC')::date = v_today - 1
          AND EXISTS (SELECT 1 FROM public.lesson_progress q
                      WHERE q.user_id = lp.user_id AND (q.completed_at AT TIME ZONE 'UTC')::date = v_today - 2)
          AND NOT EXISTS (SELECT 1 FROM public.lesson_progress t
                          WHERE t.user_id = lp.user_id AND (t.completed_at AT TIME ZONE 'UTC')::date = v_today)
        LIMIT 500
    LOOP
        CONTINUE WHEN public.is_supervised_child(r.id);
        CONTINUE WHEN EXISTS (SELECT 1 FROM public.notifications x
                              WHERE x.user_id = r.id AND x.kind = 'streak_risk' AND x.created_at > now() - interval '20 hours');
        -- longueur de la série qui se termine hier
        v_len := 0; v_d := v_today - 1;
        WHILE v_len < 365 AND EXISTS (SELECT 1 FROM public.lesson_progress z
                                      WHERE z.user_id = r.id AND (z.completed_at AT TIME ZONE 'UTC')::date = v_d) LOOP
            v_len := v_len + 1; v_d := v_d - 1;
        END LOOP;
        PERFORM public.notify_user(r.id, 'streak_risk',
            'Ta série de ' || v_len || ' jours est en danger',
            'Your ' || v_len || '-day streak is at risk',
            'Une seule leçon avant minuit garde ta série vivante. Même 10 minutes comptent.',
            'One lesson before midnight keeps your streak alive. Even 10 minutes count.');
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.queue_streak_reminders() FROM PUBLIC, anon, authenticated;
