-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Crée les réglages d'accès payant et la liste des accès accordés.
-- Rien ne change pour les élèves tant que l'interrupteur « accès payant » reste éteint
-- (il l'est par défaut).

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.access_grants (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'granted' CHECK (kind IN ('granted', 'paid')),
    note TEXT,
    expires_at TIMESTAMPTZ,            -- NULL = accès sans fin
    granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- Réglages : tout le monde peut les lire (le site en a besoin), seul l'admin les modifie
DROP POLICY IF EXISTS "Everyone reads app settings" ON public.app_settings;
CREATE POLICY "Everyone reads app settings"
    ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage app settings" ON public.app_settings;
CREATE POLICY "Admins manage app settings"
    ON public.app_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Accès : l'élève voit le sien, l'admin gère tout. Un élève ne peut JAMAIS s'accorder un accès.
DROP POLICY IF EXISTS "Eleve reads own access" ON public.access_grants;
CREATE POLICY "Eleve reads own access"
    ON public.access_grants FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage access" ON public.access_grants;
CREATE POLICY "Admins manage access"
    ON public.access_grants FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Valeurs de départ (accès payant ÉTEINT)
INSERT INTO public.app_settings (key, value) VALUES
    ('paywall_enabled', 'false'::jsonb),
    ('free_lessons_per_course', '2'::jsonb)
ON CONFLICT (key) DO NOTHING;
