-- À exécuter UNE FOIS dans Supabase > SQL Editor (après acces.sql ; notifications.sql est optionnel).
--
-- ENTRAIDE entre élèves : questions et réponses en texte (léger, sans images), avec modération.
--
-- Règles de sécurité :
--  * Réservé aux comptes de 12 ans ou plus : un COMPTE ENFANT supervisé ne lit ni n'écrit rien.
--  * Les autres voient seulement « Prénom N. » (jamais d'e-mail, jamais le nom complet).
--  * Interdits dans un message : liens, e-mails, numéros de téléphone (protège les jeunes de 12 à 17 ans).
--  * Limites par jour : 5 questions et 30 réponses par personne.
--  * Signalement par n'importe qui : à 3 signalements différents, le message est masqué en attendant l'admin.
--  * L'admin peut masquer, rétablir, supprimer un message, et réduire un utilisateur au silence.
--  * Les professeurs désignés sont repérés par un badge « Professeur ».
-- Aucun accès direct aux tables : tout passe par les fonctions ci-dessous.

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        TEXT NOT NULL CHECK (kind IN ('question', 'answer')),
    parent_id   UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,   -- la question d'une réponse
    author_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id   TEXT,                                                       -- cours concerné (facultatif)
    title       TEXT CHECK (title IS NULL OR length(trim(title)) BETWEEN 5 AND 120),
    body        TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 2 AND 2000),
    lang        TEXT NOT NULL DEFAULT 'fr' CHECK (lang IN ('fr', 'en')),
    status      TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
    hidden_by   TEXT CHECK (hidden_by IS NULL OR hidden_by IN ('auto', 'admin', 'author')),
    reviewed    BOOLEAN NOT NULL DEFAULT false,            -- vrai = l'admin a rétabli : plus de masquage automatique
    accepted    BOOLEAN NOT NULL DEFAULT false,            -- réponse acceptée par l'auteur de la question
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT forum_question_has_title CHECK ((kind = 'question' AND title IS NOT NULL AND parent_id IS NULL) OR (kind = 'answer' AND parent_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS forum_posts_list_idx   ON public.forum_posts (kind, status, lang, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_parent_idx ON public.forum_posts (parent_id, created_at);
CREATE INDEX IF NOT EXISTS forum_posts_author_idx ON public.forum_posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.forum_reports (
    post_id     UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS public.forum_mutes (
    user_id   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    muted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason    TEXT
);

ALTER TABLE public.forum_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_mutes   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage forum posts" ON public.forum_posts;
CREATE POLICY "Admins manage forum posts" ON public.forum_posts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage forum reports" ON public.forum_reports;
CREATE POLICY "Admins manage forum reports" ON public.forum_reports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage forum mutes" ON public.forum_mutes;
CREATE POLICY "Admins manage forum mutes" ON public.forum_mutes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.forum_reports, public.forum_mutes TO authenticated;

-- ---------------------------------------------------------------- outils internes
CREATE OR REPLACE FUNCTION public.forum_is_child(p_user UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v BOOLEAN := false;
BEGIN
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = $1)' INTO v USING p_user;
    END IF;
    RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.forum_is_teacher(p_user UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v BOOLEAN := false;
BEGIN
    IF to_regclass('public.teachers') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = $1)' INTO v USING p_user;
    END IF;
    RETURN v;
END $$;

-- « Prénom N. » : premier mot du nom + initiale du dernier mot
CREATE OR REPLACE FUNCTION public.forum_display_name(p_user UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_name TEXT; v_first TEXT; v_last TEXT; v_words TEXT[];
BEGIN
    SELECT trim(full_name) INTO v_name FROM public.users WHERE id = p_user;
    IF v_name IS NULL OR v_name = '' THEN RETURN 'Élève'; END IF;
    v_words := regexp_split_to_array(v_name, '\s+');
    v_first := v_words[1];
    IF array_length(v_words, 1) > 1 THEN
        v_last := v_words[array_length(v_words, 1)];
        RETURN left(v_first, 20) || ' ' || upper(left(v_last, 1)) || '.';
    END IF;
    RETURN left(v_first, 20);
END $$;

-- Vérifie le texte : lève 'link', 'personal_info' ou 'empty'
CREATE OR REPLACE FUNCTION public.forum_check_text(p_text TEXT) RETURNS VOID
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF p_text IS NULL OR length(trim(p_text)) < 2 THEN RAISE EXCEPTION 'empty'; END IF;
    IF p_text ~* '(https?://|www\.)' THEN RAISE EXCEPTION 'link'; END IF;
    IF p_text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' THEN RAISE EXCEPTION 'personal_info'; END IF;
    IF p_text ~ '\d[\d\s.\-]{7,}\d' THEN RAISE EXCEPTION 'personal_info'; END IF;
END $$;

-- Qui peut écrire/lire ? Lève 'not_authenticated', 'child_account' ou (écriture) 'muted'
CREATE OR REPLACE FUNCTION public.forum_assert_member(p_write BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
    IF public.forum_is_child(auth.uid()) THEN RAISE EXCEPTION 'child_account'; END IF;
    IF p_write AND EXISTS (SELECT 1 FROM public.forum_mutes WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'muted'; END IF;
END $$;

-- ---------------------------------------------------------------- lecture
CREATE OR REPLACE FUNCTION public.forum_list(p_lang TEXT DEFAULT NULL, p_course TEXT DEFAULT NULL, p_unsolved BOOLEAN DEFAULT false,
                                              p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (id UUID, title TEXT, excerpt TEXT, author_name TEXT, author_is_teacher BOOLEAN, course_id TEXT, lang TEXT,
               created_at TIMESTAMPTZ, answer_count BIGINT, solved BOOLEAN, mine BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    PERFORM public.forum_assert_member(false);
    RETURN QUERY
    SELECT q.id, q.title, left(q.body, 160), public.forum_display_name(q.author_id), public.forum_is_teacher(q.author_id),
           q.course_id, q.lang, q.created_at,
           (SELECT count(*) FROM public.forum_posts a WHERE a.parent_id = q.id AND a.status = 'visible'),
           EXISTS (SELECT 1 FROM public.forum_posts a WHERE a.parent_id = q.id AND a.status = 'visible' AND a.accepted),
           (q.author_id = auth.uid())
    FROM public.forum_posts q
    WHERE q.kind = 'question' AND q.status = 'visible'
      AND (p_lang IS NULL OR q.lang = p_lang)
      AND (p_course IS NULL OR q.course_id = p_course)
      AND (NOT p_unsolved OR NOT EXISTS (SELECT 1 FROM public.forum_posts a WHERE a.parent_id = q.id AND a.status = 'visible' AND a.accepted))
    ORDER BY q.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50)) OFFSET GREATEST(0, COALESCE(p_offset, 0));
END $$;

-- Une question et ses réponses (la question en premier)
CREATE OR REPLACE FUNCTION public.forum_thread(p_question UUID)
RETURNS TABLE (id UUID, kind TEXT, title TEXT, body TEXT, author_name TEXT, author_is_teacher BOOLEAN, course_id TEXT,
               lang TEXT, accepted BOOLEAN, created_at TIMESTAMPTZ, mine BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    PERFORM public.forum_assert_member(false);
    RETURN QUERY
    SELECT p.id, p.kind, p.title, p.body, public.forum_display_name(p.author_id), public.forum_is_teacher(p.author_id),
           p.course_id, p.lang, p.accepted, p.created_at, (p.author_id = auth.uid())
    FROM public.forum_posts p
    WHERE (p.id = p_question OR p.parent_id = p_question) AND p.status = 'visible'
      AND EXISTS (SELECT 1 FROM public.forum_posts q WHERE q.id = p_question AND q.kind = 'question' AND q.status = 'visible')
    ORDER BY (p.kind = 'question') DESC, p.accepted DESC, p.created_at ASC;
END $$;

-- ---------------------------------------------------------------- écriture
CREATE OR REPLACE FUNCTION public.forum_ask(p_title TEXT, p_body TEXT, p_course TEXT DEFAULT NULL, p_lang TEXT DEFAULT 'fr')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    PERFORM public.forum_assert_member(true);
    IF length(trim(COALESCE(p_title, ''))) < 5 THEN RAISE EXCEPTION 'empty'; END IF;
    PERFORM public.forum_check_text(p_title);
    PERFORM public.forum_check_text(p_body);
    IF (SELECT count(*) FROM public.forum_posts WHERE author_id = auth.uid() AND kind = 'question' AND created_at > now() - interval '24 hours') >= 5 THEN
        RAISE EXCEPTION 'rate_limited';
    END IF;
    INSERT INTO public.forum_posts (kind, author_id, course_id, title, body, lang)
    VALUES ('question', auth.uid(), NULLIF(left(trim(COALESCE(p_course, '')), 80), ''), left(trim(p_title), 120), left(trim(p_body), 2000),
            CASE WHEN p_lang = 'en' THEN 'en' ELSE 'fr' END)
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.forum_answer(p_question UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_q public.forum_posts%ROWTYPE; v_id UUID;
BEGIN
    PERFORM public.forum_assert_member(true);
    PERFORM public.forum_check_text(p_body);
    SELECT * INTO v_q FROM public.forum_posts WHERE id = p_question AND kind = 'question' AND status = 'visible';
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    IF (SELECT count(*) FROM public.forum_posts WHERE author_id = auth.uid() AND kind = 'answer' AND created_at > now() - interval '24 hours') >= 30 THEN
        RAISE EXCEPTION 'rate_limited';
    END IF;
    INSERT INTO public.forum_posts (kind, parent_id, author_id, body, lang)
    VALUES ('answer', p_question, auth.uid(), left(trim(p_body), 2000), v_q.lang)
    RETURNING id INTO v_id;
    -- Prévenir l'auteur de la question (si les notifications sont installées)
    IF v_q.author_id <> auth.uid() AND to_regprocedure('public.notify_user(uuid,text,text,text,text,text)') IS NOT NULL THEN
        BEGIN
            PERFORM public.notify_user(v_q.author_id, 'forum_answer', 'Nouvelle réponse à ta question', 'New answer to your question',
                'Quelqu''un a répondu à « ' || left(v_q.title, 60) || ' ».', 'Someone answered “' || left(v_q.title, 60) || '”.');
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
    RETURN v_id;
END $$;

-- L'auteur de la question marque UNE réponse comme utile (ou l'admin)
CREATE OR REPLACE FUNCTION public.forum_accept(p_answer UUID, p_value BOOLEAN DEFAULT true)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a public.forum_posts%ROWTYPE; v_q public.forum_posts%ROWTYPE;
BEGIN
    PERFORM public.forum_assert_member(false);
    SELECT * INTO v_a FROM public.forum_posts WHERE id = p_answer AND kind = 'answer' AND status = 'visible';
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    SELECT * INTO v_q FROM public.forum_posts WHERE id = v_a.parent_id;
    IF v_q.author_id <> auth.uid() AND NOT public.is_admin() THEN RAISE EXCEPTION 'not_allowed'; END IF;
    IF COALESCE(p_value, true) THEN
        UPDATE public.forum_posts SET accepted = false WHERE parent_id = v_a.parent_id AND accepted;
    END IF;
    UPDATE public.forum_posts SET accepted = COALESCE(p_value, true) WHERE id = p_answer;
END $$;

-- Retirer son propre message (il est masqué, pas détruit : l'admin garde la trace)
CREATE OR REPLACE FUNCTION public.forum_remove_own(p_post UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM public.forum_assert_member(false);
    UPDATE public.forum_posts SET status = 'hidden', hidden_by = 'author', accepted = false
     WHERE id = p_post AND author_id = auth.uid() AND status = 'visible';
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
END $$;

-- Signaler un message. 3 signalements différents = masqué en attendant l'admin (sauf s'il a déjà été rétabli par l'admin).
-- Retourne : 'ok' | 'already' | 'own_post' | 'not_found'
CREATE OR REPLACE FUNCTION public.forum_report(p_post UUID, p_reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p public.forum_posts%ROWTYPE; v_n INTEGER;
BEGIN
    PERFORM public.forum_assert_member(false);
    SELECT * INTO v_p FROM public.forum_posts WHERE id = p_post AND status = 'visible';
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF v_p.author_id = auth.uid() THEN RETURN 'own_post'; END IF;
    IF EXISTS (SELECT 1 FROM public.forum_reports WHERE post_id = p_post AND reporter_id = auth.uid()) THEN RETURN 'already'; END IF;
    INSERT INTO public.forum_reports (post_id, reporter_id, reason) VALUES (p_post, auth.uid(), NULLIF(left(trim(COALESCE(p_reason, '')), 300), ''));
    SELECT count(*) INTO v_n FROM public.forum_reports WHERE post_id = p_post;
    IF v_n >= 3 AND NOT v_p.reviewed THEN
        UPDATE public.forum_posts SET status = 'hidden', hidden_by = 'auto' WHERE id = p_post;
    END IF;
    RETURN 'ok';
END $$;

-- ---------------------------------------------------------------- modération (admin)
CREATE OR REPLACE FUNCTION public.forum_admin_list(p_only_flagged BOOLEAN DEFAULT true)
RETURNS TABLE (id UUID, kind TEXT, title TEXT, body TEXT, author_id UUID, author_name TEXT, author_email TEXT, status TEXT, hidden_by TEXT,
               report_count BIGINT, reasons TEXT, created_at TIMESTAMPTZ, author_muted BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_allowed'; END IF;
    RETURN QUERY
    SELECT p.id, p.kind, p.title, p.body, p.author_id, COALESCE(NULLIF(trim(u.full_name), ''), u.email), u.email, p.status, p.hidden_by,
           (SELECT count(*) FROM public.forum_reports r WHERE r.post_id = p.id),
           (SELECT string_agg(r.reason, ' | ') FROM public.forum_reports r WHERE r.post_id = p.id AND r.reason IS NOT NULL),
           p.created_at,
           EXISTS (SELECT 1 FROM public.forum_mutes m WHERE m.user_id = p.author_id)
    FROM public.forum_posts p JOIN public.users u ON u.id = p.author_id
    WHERE NOT p_only_flagged OR p.status = 'hidden' OR EXISTS (SELECT 1 FROM public.forum_reports r WHERE r.post_id = p.id)
    ORDER BY (p.status = 'hidden' AND p.hidden_by = 'auto') DESC, 10 DESC, p.created_at DESC
    LIMIT 100;
END $$;

-- p_action : 'hide' | 'restore' | 'delete'
CREATE OR REPLACE FUNCTION public.forum_admin_action(p_post UUID, p_action TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RETURN 'not_allowed'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.forum_posts WHERE id = p_post) THEN RETURN 'not_found'; END IF;
    IF p_action = 'hide' THEN
        UPDATE public.forum_posts SET status = 'hidden', hidden_by = 'admin', reviewed = true WHERE id = p_post;
    ELSIF p_action = 'restore' THEN
        UPDATE public.forum_posts SET status = 'visible', hidden_by = NULL, reviewed = true WHERE id = p_post;
        DELETE FROM public.forum_reports WHERE post_id = p_post;
    ELSIF p_action = 'delete' THEN
        DELETE FROM public.forum_posts WHERE id = p_post;
    ELSE
        RETURN 'bad_action';
    END IF;
    RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.forum_admin_mute(p_user UUID, p_muted BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.is_admin() THEN RETURN 'not_allowed'; END IF;
    IF p_muted THEN
        IF p_user = auth.uid() THEN RETURN 'not_allowed'; END IF;
        INSERT INTO public.forum_mutes (user_id, reason) VALUES (p_user, NULLIF(left(trim(COALESCE(p_reason, '')), 300), ''))
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        DELETE FROM public.forum_mutes WHERE user_id = p_user;
    END IF;
    RETURN 'ok';
END $$;

-- Le site demande d'abord ceci : l'entraide est-elle disponible pour moi ? ('ok' | 'child_account' | 'muted' | 'not_authenticated')
CREATE OR REPLACE FUNCTION public.forum_status() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN 'not_authenticated'; END IF;
    IF public.forum_is_child(auth.uid()) THEN RETURN 'child_account'; END IF;
    IF EXISTS (SELECT 1 FROM public.forum_mutes WHERE user_id = auth.uid()) THEN RETURN 'muted'; END IF;
    RETURN 'ok';
END $$;

REVOKE ALL ON FUNCTION public.forum_is_child(UUID), public.forum_is_teacher(UUID), public.forum_display_name(UUID), public.forum_check_text(TEXT),
    public.forum_assert_member(BOOLEAN), public.forum_list(TEXT, TEXT, BOOLEAN, INTEGER, INTEGER), public.forum_thread(UUID),
    public.forum_ask(TEXT, TEXT, TEXT, TEXT), public.forum_answer(UUID, TEXT), public.forum_accept(UUID, BOOLEAN), public.forum_remove_own(UUID),
    public.forum_report(UUID, TEXT), public.forum_admin_list(BOOLEAN), public.forum_admin_action(UUID, TEXT),
    public.forum_admin_mute(UUID, BOOLEAN, TEXT), public.forum_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_list(TEXT, TEXT, BOOLEAN, INTEGER, INTEGER), public.forum_thread(UUID),
    public.forum_ask(TEXT, TEXT, TEXT, TEXT), public.forum_answer(UUID, TEXT), public.forum_accept(UUID, BOOLEAN), public.forum_remove_own(UUID),
    public.forum_report(UUID, TEXT), public.forum_admin_list(BOOLEAN), public.forum_admin_action(UUID, TEXT),
    public.forum_admin_mute(UUID, BOOLEAN, TEXT), public.forum_status() TO authenticated;
