-- ============================================================================
-- ESPACE PROFESSEUR : classes, élèves rattachés, suivi de progression, messages
-- À exécuter UNE fois dans Supabase → SQL Editor. Sans danger si relancé.
-- Ne dépend d'aucun autre script (sauf is_admin(), déjà présent).
--
-- Principe :
--  * L'admin désigne un professeur (une ligne dans `teachers`) : c'est un compte normal + ce droit.
--  * Le professeur crée des classes. Chaque classe a un CODE (ex : K7P4QX) à donner aux élèves.
--  * L'élève entre le code dans son tableau de bord : il rejoint la classe (il peut la quitter).
--  * Le professeur voit UNIQUEMENT les élèves de SES classes : nom, e-mail, leçons terminées.
--  * Les comptes enfants supervisés (moins de 12 ans) ne peuvent PAS rejoindre une classe seuls :
--    leur adulte reste leur point de contact (protection des enfants).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teachers (
    user_id   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Génère un code court sans caractères ambigus (pas de 0/O, 1/I)
CREATE OR REPLACE FUNCTION public.gen_join_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
    alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code TEXT;
    i INT;
BEGIN
    LOOP
        code := '';
        FOR i IN 1..6 LOOP
            code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE join_code = code);
    END LOOP;
    RETURN code;
END $$;

CREATE TABLE IF NOT EXISTS public.classes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
    join_code   TEXT NOT NULL UNIQUE DEFAULT public.gen_join_code(),
    open        BOOLEAN NOT NULL DEFAULT true,         -- false = le code n'accepte plus de nouveaux élèves
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS classes_teacher_idx ON public.classes (teacher_id);

CREATE TABLE IF NOT EXISTS public.class_members (
    class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS class_members_student_idx ON public.class_members (student_id);

-- Cours suivis par la classe (le professeur choisit sur quoi il suit ses élèves)
CREATE TABLE IF NOT EXISTS public.class_courses (
    class_id   UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    course_id  TEXT NOT NULL,
    PRIMARY KEY (class_id, course_id)
);

-- Messages du professeur à un élève (encouragement, correction, consigne)
CREATE TABLE IF NOT EXISTS public.teacher_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS teacher_messages_student_idx ON public.teacher_messages (student_id, created_at DESC);

ALTER TABLE public.teachers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_courses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;

-- Qui est professeur ? (fonction utilisable dans les règles ci-dessous)
CREATE OR REPLACE FUNCTION public.is_teacher() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

-- teachers : l'admin gère, chacun voit sa propre ligne
DROP POLICY IF EXISTS "Admins manage teachers" ON public.teachers;
CREATE POLICY "Admins manage teachers" ON public.teachers FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Teacher reads own row" ON public.teachers;
CREATE POLICY "Teacher reads own row" ON public.teachers FOR SELECT USING (user_id = auth.uid());

-- classes : le professeur gère les siennes (seulement s'il est professeur) ; l'admin voit tout
DROP POLICY IF EXISTS "Teacher manages own classes" ON public.classes;
CREATE POLICY "Teacher manages own classes" ON public.classes FOR ALL
    USING (teacher_id = auth.uid() OR public.is_admin())
    WITH CHECK ((teacher_id = auth.uid() AND public.is_teacher()) OR public.is_admin());

-- class_members : le professeur lit/retire les élèves de ses classes ; l'élève lit/quitte les siennes.
-- (L'ajout se fait uniquement par join_class() ci-dessous : pas de politique INSERT.)
DROP POLICY IF EXISTS "Teacher reads members" ON public.class_members;
CREATE POLICY "Teacher reads members" ON public.class_members FOR SELECT
    USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS "Teacher removes members" ON public.class_members;
CREATE POLICY "Teacher removes members" ON public.class_members FOR DELETE
    USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS "Student reads own membership" ON public.class_members;
CREATE POLICY "Student reads own membership" ON public.class_members FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Student leaves class" ON public.class_members;
CREATE POLICY "Student leaves class" ON public.class_members FOR DELETE USING (student_id = auth.uid());

-- class_courses : le professeur gère ceux de ses classes
DROP POLICY IF EXISTS "Teacher manages class courses" ON public.class_courses;
CREATE POLICY "Teacher manages class courses" ON public.class_courses FOR ALL
    USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()) OR public.is_admin())
    WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()) OR public.is_admin());

-- teacher_messages : le professeur écrit à un élève QUI EST dans la classe ; l'élève lit les siens
DROP POLICY IF EXISTS "Teacher writes messages" ON public.teacher_messages;
CREATE POLICY "Teacher writes messages" ON public.teacher_messages FOR INSERT
    WITH CHECK (
        teacher_id = auth.uid()
        AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.class_members m WHERE m.class_id = teacher_messages.class_id AND m.student_id = teacher_messages.student_id)
    );
DROP POLICY IF EXISTS "Teacher reads own messages" ON public.teacher_messages;
CREATE POLICY "Teacher reads own messages" ON public.teacher_messages FOR SELECT
    USING (teacher_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Teacher deletes own messages" ON public.teacher_messages;
CREATE POLICY "Teacher deletes own messages" ON public.teacher_messages FOR DELETE USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "Student reads own messages" ON public.teacher_messages;
CREATE POLICY "Student reads own messages" ON public.teacher_messages FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Student marks messages read" ON public.teacher_messages;
CREATE POLICY "Student marks messages read" ON public.teacher_messages FOR UPDATE
    USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Le professeur voit le profil et la progression des élèves de SES classes (et rien d'autre)
DROP POLICY IF EXISTS "Teacher reads class students" ON public.users;
CREATE POLICY "Teacher reads class students" ON public.users FOR SELECT
    USING (id IN (
        SELECT m.student_id FROM public.class_members m
        JOIN public.classes c ON c.id = m.class_id
        WHERE c.teacher_id = auth.uid()
    ));
DROP POLICY IF EXISTS "Teacher reads class progress" ON public.lesson_progress;
CREATE POLICY "Teacher reads class progress" ON public.lesson_progress FOR SELECT
    USING (user_id IN (
        SELECT m.student_id FROM public.class_members m
        JOIN public.classes c ON c.id = m.class_id
        WHERE c.teacher_id = auth.uid()
    ));

-- Rejoindre une classe avec un code. Renvoie le nom de la classe.
-- Refuse : code inconnu ou fermé, compte enfant supervisé (si la table guardian_links existe).
CREATE OR REPLACE FUNCTION public.join_class(p_code TEXT)
RETURNS TABLE (class_id UUID, class_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_class public.classes%ROWTYPE;
    v_child BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = $1)' INTO v_child USING auth.uid();
    END IF;
    IF v_child THEN RAISE EXCEPTION 'child_account'; END IF;

    SELECT * INTO v_class FROM public.classes WHERE join_code = upper(trim(p_code));
    IF NOT FOUND OR NOT v_class.open THEN RAISE EXCEPTION 'invalid_code'; END IF;
    IF v_class.teacher_id = auth.uid() THEN RAISE EXCEPTION 'own_class'; END IF;

    INSERT INTO public.class_members (class_id, student_id) VALUES (v_class.id, auth.uid())
    ON CONFLICT DO NOTHING;
    RETURN QUERY SELECT v_class.id, v_class.name;
END $$;
REVOKE ALL ON FUNCTION public.join_class(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_class(TEXT) TO authenticated;

-- Mes classes (côté élève) : nom de la classe + nom du professeur, rien d'autre
CREATE OR REPLACE FUNCTION public.my_classes()
RETURNS TABLE (class_id UUID, class_name TEXT, teacher_name TEXT, joined_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT c.id, c.name, COALESCE(u.full_name, 'Professeur'), m.joined_at
    FROM public.class_members m
    JOIN public.classes c ON c.id = m.class_id
    JOIN public.users u ON u.id = c.teacher_id
    WHERE m.student_id = auth.uid()
    ORDER BY m.joined_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_classes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_classes() TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers, public.classes, public.class_members,
    public.class_courses, public.teacher_messages TO authenticated;
