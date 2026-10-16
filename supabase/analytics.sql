-- À exécuter UNE FOIS dans Supabase > SQL Editor (après acces.sql ; script séparé et facultatif).
--
-- STATISTIQUES D'AUDIENCE anonymes : visiteurs, pages vues, événements clés (inscription, connexion,
-- début et fin de cours), lues uniquement par l'administrateur.
--
-- Vie privée :
--  * Aucune colonne ne contient de nom, e-mail, téléphone ni identifiant d'utilisateur.
--  * Le « visiteur » est un nombre aléatoire créé dans le navigateur (sans lien avec le compte).
--  * Le pays n'est qu'une estimation (fuseau horaire du navigateur), jamais l'adresse IP.
--  * Personne ne peut lire la table directement : seule analytics_summary() (réservée à l'admin) la lit.
--  * Les événements de plus de 400 jours peuvent être supprimés avec analytics_purge().

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    vid        TEXT NOT NULL CHECK (length(vid) BETWEEN 8 AND 64),   -- visiteur aléatoire
    sid        TEXT CHECK (sid IS NULL OR length(sid) <= 64),        -- session (onglet)
    event      TEXT NOT NULL CHECK (event IN ('page_view', 'signup', 'login', 'course_start', 'course_complete')),
    view       TEXT CHECK (view IS NULL OR view ~ '^[a-z0-9-]{1,30}$'),   -- nom de page, jamais l'adresse complète
    course_id  TEXT CHECK (course_id IS NULL OR course_id ~ '^[A-Za-z0-9_-]{1,64}$'),
    lang       TEXT CHECK (lang IS NULL OR lang IN ('fr', 'en')),
    country    TEXT CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    logged_in  BOOLEAN NOT NULL DEFAULT false,
    device     TEXT CHECK (device IS NULL OR device IN ('mobile', 'desktop'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events (event, created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
-- Aucune politique : ni lecture ni écriture directe pour les clients (anon, authenticated).
REVOKE ALL ON public.analytics_events FROM anon, authenticated;

-- Enregistrement d'un événement. Ne renvoie jamais d'erreur au visiteur : ce qui est invalide est ignoré.
CREATE OR REPLACE FUNCTION public.track_event(
    p_vid TEXT, p_sid TEXT, p_event TEXT, p_view TEXT DEFAULT NULL, p_course_id TEXT DEFAULT NULL,
    p_lang TEXT DEFAULT NULL, p_country TEXT DEFAULT NULL, p_logged_in BOOLEAN DEFAULT false, p_device TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_vid IS NULL OR length(p_vid) NOT BETWEEN 8 AND 64 THEN RETURN; END IF;
    IF p_event IS NULL OR p_event NOT IN ('page_view', 'signup', 'login', 'course_start', 'course_complete') THEN RETURN; END IF;
    IF p_view IS NOT NULL AND p_view !~ '^[a-z0-9-]{1,30}$' THEN p_view := NULL; END IF;
    IF p_course_id IS NOT NULL AND p_course_id !~ '^[A-Za-z0-9_-]{1,64}$' THEN p_course_id := NULL; END IF;
    IF p_lang IS NOT NULL AND p_lang NOT IN ('fr', 'en') THEN p_lang := NULL; END IF;
    IF p_country IS NOT NULL AND p_country !~ '^[A-Z]{2}$' THEN p_country := NULL; END IF;
    IF p_device IS NOT NULL AND p_device NOT IN ('mobile', 'desktop') THEN p_device := NULL; END IF;
    IF p_sid IS NOT NULL AND length(p_sid) > 64 THEN p_sid := NULL; END IF;

    -- Plafond par visiteur et par jour (anti-abus)
    IF (SELECT count(*) FROM public.analytics_events
         WHERE vid = p_vid AND created_at >= now() - interval '1 day') >= 300 THEN RETURN; END IF;

    -- Début / fin de cours : une seule fois par visiteur et par cours
    IF p_event IN ('course_start', 'course_complete') THEN
        IF p_course_id IS NULL THEN RETURN; END IF;
        IF EXISTS (SELECT 1 FROM public.analytics_events WHERE vid = p_vid AND event = p_event AND course_id = p_course_id) THEN RETURN; END IF;
    END IF;

    INSERT INTO public.analytics_events (vid, sid, event, view, course_id, lang, country, logged_in, device)
    VALUES (p_vid, p_sid, p_event, p_view, p_course_id, p_lang, p_country, COALESCE(p_logged_in, false), p_device);
EXCEPTION WHEN OTHERS THEN
    RETURN;
END $$;

REVOKE ALL ON FUNCTION public.track_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

-- Résumé pour l'administrateur : refusé à tout autre compte, côté serveur.
CREATE OR REPLACE FUNCTION public.analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    r JSONB;
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'visitors_today', (SELECT count(DISTINCT vid) FROM public.analytics_events WHERE created_at >= date_trunc('day', now())),
        'visitors_7',     (SELECT count(DISTINCT vid) FROM public.analytics_events WHERE created_at >= now() - interval '7 days'),
        'visitors_30',    (SELECT count(DISTINCT vid) FROM public.analytics_events WHERE created_at >= now() - interval '30 days'),
        'visitors_total', (SELECT count(DISTINCT vid) FROM public.analytics_events),
        'views_today',    (SELECT count(*) FROM public.analytics_events WHERE event = 'page_view' AND created_at >= date_trunc('day', now())),
        'views_7',        (SELECT count(*) FROM public.analytics_events WHERE event = 'page_view' AND created_at >= now() - interval '7 days'),
        'views_30',       (SELECT count(*) FROM public.analytics_events WHERE event = 'page_view' AND created_at >= now() - interval '30 days'),
        'logins_30',      (SELECT count(*) FROM public.analytics_events WHERE event = 'login' AND created_at >= now() - interval '30 days'),
        'active_7',       (SELECT count(DISTINCT vid) FROM public.analytics_events WHERE logged_in AND created_at >= now() - interval '7 days'),
        'active_30',      (SELECT count(DISTINCT vid) FROM public.analytics_events WHERE logged_in AND created_at >= now() - interval '30 days'),
        'users_total',    (SELECT count(*) FROM public.users),
        'signups_7',      (SELECT count(*) FROM public.users WHERE created_at >= now() - interval '7 days'),
        'signups_30',     (SELECT count(*) FROM public.users WHERE created_at >= now() - interval '30 days'),
        'daily', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'),
                   'visitors', COALESCE(v.visitors, 0), 'views', COALESCE(v.views, 0), 'signups', COALESCE(s.signups, 0)) ORDER BY d.day)
              FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') AS d(day)
              LEFT JOIN (SELECT date_trunc('day', created_at) AS day, count(DISTINCT vid) AS visitors,
                                count(*) FILTER (WHERE event = 'page_view') AS views
                           FROM public.analytics_events WHERE created_at >= now() - interval '30 days' GROUP BY 1) v ON v.day = d.day
              LEFT JOIN (SELECT date_trunc('day', created_at) AS day, count(*) AS signups
                           FROM public.users WHERE created_at >= now() - interval '30 days' GROUP BY 1) s ON s.day = d.day
        ), '[]'::jsonb),
        'weekly_signups', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('week', to_char(w.week, 'YYYY-MM-DD'), 'signups', COALESCE(s.signups, 0)) ORDER BY w.week)
              FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') AS w(week)
              LEFT JOIN (SELECT date_trunc('week', created_at) AS week, count(*) AS signups
                           FROM public.users WHERE created_at >= now() - interval '12 weeks' GROUP BY 1) s ON s.week = w.week
        ), '[]'::jsonb),
        'courses', COALESCE((
            SELECT jsonb_agg(c ORDER BY (c->>'starts')::int DESC, (c->>'enrolled')::int DESC)
              FROM (
                SELECT jsonb_build_object('course_id', k.course_id, 'starts', COALESCE(e.starts, 0),
                       'completed', COALESCE(e.completed, 0), 'enrolled', COALESCE(n.enrolled, 0)) AS c
                  FROM (SELECT course_id FROM public.analytics_events WHERE course_id IS NOT NULL
                        UNION SELECT course_id::text FROM public.enrollments) k
                  LEFT JOIN (SELECT course_id, count(DISTINCT vid) FILTER (WHERE event = 'course_start') AS starts,
                                    count(DISTINCT vid) FILTER (WHERE event = 'course_complete') AS completed
                               FROM public.analytics_events WHERE course_id IS NOT NULL GROUP BY 1) e ON e.course_id = k.course_id
                  LEFT JOIN (SELECT course_id::text AS course_id, count(*) AS enrolled FROM public.enrollments GROUP BY 1) n ON n.course_id = k.course_id
                 ORDER BY COALESCE(e.starts, 0) DESC, COALESCE(n.enrolled, 0) DESC
                 LIMIT 20
              ) t
        ), '[]'::jsonb),
        'languages_users', COALESCE((SELECT jsonb_object_agg(l, n) FROM (SELECT preferred_language::text AS l, count(*) AS n FROM public.users GROUP BY 1) q), '{}'::jsonb),
        'languages_visitors', COALESCE((SELECT jsonb_object_agg(l, n) FROM (SELECT lang AS l, count(DISTINCT vid) AS n FROM public.analytics_events
                                         WHERE lang IS NOT NULL AND created_at >= now() - interval '30 days' GROUP BY 1) q), '{}'::jsonb),
        'countries', COALESCE((SELECT jsonb_object_agg(c, n) FROM (SELECT country AS c, count(DISTINCT vid) AS n FROM public.analytics_events
                                         WHERE country IS NOT NULL AND created_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 20) q), '{}'::jsonb),
        'devices', COALESCE((SELECT jsonb_object_agg(c, n) FROM (SELECT device AS c, count(DISTINCT vid) AS n FROM public.analytics_events
                                         WHERE device IS NOT NULL AND created_at >= now() - interval '30 days' GROUP BY 1) q), '{}'::jsonb),
        'completion', jsonb_build_object(
            'started',   (SELECT count(*) FROM (SELECT DISTINCT vid, course_id FROM public.analytics_events WHERE event = 'course_start') q),
            'completed', (SELECT count(*) FROM (SELECT DISTINCT vid, course_id FROM public.analytics_events WHERE event = 'course_complete') q))
    ) INTO r;
    RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.analytics_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_summary() TO authenticated;

-- Nettoyage des vieux événements (admin seulement).
CREATE OR REPLACE FUNCTION public.analytics_purge(p_keep_days INTEGER DEFAULT 400)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.analytics_events WHERE created_at < now() - make_interval(days => GREATEST(p_keep_days, 30));
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.analytics_purge(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_purge(INTEGER) TO authenticated;
