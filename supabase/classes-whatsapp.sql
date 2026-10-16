-- À exécuter UNE FOIS dans Supabase > SQL Editor (après professeurs.sql ; enfants.sql est optionnel).
--
-- GROUPE WHATSAPP D'UNE CLASSE : le professeur colle le lien d'invitation d'un groupe WhatsApp
-- (https://chat.whatsapp.com/...) ; les élèves de la classe voient un bouton « Rejoindre le groupe WhatsApp ».
--
-- Sécurité :
--  * Seul un lien d'invitation WhatsApp est accepté (rien d'autre, pas de numéro de téléphone).
--  * Seul le professeur de la classe peut le modifier (règle déjà en place sur la table classes).
--  * Seuls les MEMBRES de la classe reçoivent le lien (jamais le public).
--  * Les COMPTES ENFANTS (moins de 12 ans, supervisés) ne reçoivent jamais le lien :
--    un groupe WhatsApp avec des inconnus n'est pas pour eux.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_whatsapp_url_format;
ALTER TABLE public.classes ADD CONSTRAINT classes_whatsapp_url_format
    CHECK (whatsapp_url IS NULL OR whatsapp_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$');

CREATE OR REPLACE FUNCTION public.my_class_links()
RETURNS TABLE (class_id UUID, whatsapp_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
    v_child BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN RETURN; END IF;
    IF to_regclass('public.guardian_links') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE child_id = $1)' INTO v_child USING auth.uid();
    END IF;
    IF v_child THEN RETURN; END IF;
    RETURN QUERY
    SELECT c.id, c.whatsapp_url
    FROM public.class_members m
    JOIN public.classes c ON c.id = m.class_id
    WHERE m.student_id = auth.uid() AND c.whatsapp_url IS NOT NULL;
END $$;

REVOKE ALL ON FUNCTION public.my_class_links() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_class_links() TO authenticated;
