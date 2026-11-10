-- ============================================================================
-- E-MAILS / NOTIFICATIONS SUPPLÉMENTAIRES (script 22)
-- À exécuter UNE fois dans Supabase > SQL Editor, APRÈS notifications.sql et certificats.sql.
-- Sans danger si relancé.
--
-- Ajoute 4 notifications automatiques (dans le site, et par e-mail dès que Resend est branché) :
--   1. bienvenue            : à la création du compte
--   2. certificat obtenu    : félicitations quand un certificat de cours ou de parcours est délivré
--   3. jamais commencé      : 3 jours après l'inscription, si aucune leçon n'est terminée (une seule fois)
--   4. inactif              : 7 à 30 jours sans leçon terminée (au plus un rappel tous les 14 jours)
-- Jamais pour : un compte enfant supervisé. (Les comptes par téléphone n'ont pas de vraie adresse :
-- ils voient le message dans le site, aucun e-mail ne part.)
-- ============================================================================

-- 1. Bienvenue
CREATE OR REPLACE FUNCTION public.trg_notify_welcome() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.notify_user(NEW.id, 'welcome',
        'Bienvenue sur RythmeBinaireGn !', 'Welcome to RythmeBinaireGn!',
        'Ton compte est prêt. Commence par un cours gratuit, une petite leçon par jour suffit. Chez nous, on apprend au rythme de l''Afrique.',
        'Your account is ready. Start with a free course: one small lesson a day is enough. Here, you learn at the rhythm of Africa.');
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_welcome ON public.users;
CREATE TRIGGER notify_welcome AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_welcome();

-- 2. Certificat obtenu (cours ou parcours)
CREATE OR REPLACE FUNCTION public.trg_notify_certificate() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.notify_user(NEW.user_id, 'certificate',
        'Bravo, tu as ton certificat !', 'Congratulations, you earned your certificate!',
        'Certificat : ' || COALESCE(NEW.course_title_fr, '') || '. Retrouve-le dans ton espace et partage-le avec son code de vérification.',
        'Certificate: ' || COALESCE(NEW.course_title_en, NEW.course_title_fr, '') || '. Find it in your space and share it with its verification code.');
    RETURN NEW;
END $$;

DO $$
BEGIN
    IF to_regclass('public.certificates') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS notify_certificate ON public.certificates;
        CREATE TRIGGER notify_certificate AFTER INSERT ON public.certificates
            FOR EACH ROW EXECUTE FUNCTION public.trg_notify_certificate();
    END IF;
END $$;

-- 3 et 4. Relances (appelée toutes les 5 minutes par send-notifications)
CREATE OR REPLACE FUNCTION public.queue_inactivity_reminders() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INTEGER := 0;
BEGIN
    -- Inscrits depuis 3 à 30 jours qui n'ont terminé aucune leçon : un seul message, jamais répété
    FOR r IN
        SELECT u.id FROM public.users u
        JOIN auth.users a ON a.id = u.id
        WHERE a.created_at <= now() - interval '3 days' AND a.created_at > now() - interval '30 days'
          AND NOT EXISTS (SELECT 1 FROM public.lesson_progress lp WHERE lp.user_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM public.notifications x WHERE x.user_id = u.id AND x.kind = 'not_started')
          AND NOT public.is_supervised_child(u.id)
        LIMIT 200
    LOOP
        PERFORM public.notify_user(r.id, 'not_started',
            'Prêt à faire ta première leçon ?', 'Ready for your first lesson?',
            'Une leçon prend 10 à 15 minutes. Ouvre ton premier cours : tu verras, le plus dur est de commencer.',
            'A lesson takes 10 to 15 minutes. Open your first course: the hardest part is starting.');
        n := n + 1;
    END LOOP;

    -- Élèves actifs puis silencieux depuis 7 à 30 jours : un rappel tous les 14 jours au plus
    FOR r IN
        SELECT lp.user_id AS id FROM public.lesson_progress lp
        GROUP BY lp.user_id
        HAVING max(lp.completed_at) <= now() - interval '7 days' AND max(lp.completed_at) > now() - interval '30 days'
        LIMIT 200
    LOOP
        CONTINUE WHEN public.is_supervised_child(r.id);
        CONTINUE WHEN EXISTS (SELECT 1 FROM public.notifications x
                              WHERE x.user_id = r.id AND x.kind = 'inactive' AND x.created_at > now() - interval '14 days');
        PERFORM public.notify_user(r.id, 'inactive',
            'Ta prochaine leçon t''attend', 'Your next lesson is waiting',
            'Tu n''as pas travaillé depuis quelques jours. Reprends où tu t''es arrêté : 10 minutes aujourd''hui suffisent.',
            'You have not studied for a few days. Pick up where you stopped: 10 minutes today is enough.');
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.queue_inactivity_reminders() FROM PUBLIC, anon, authenticated;
