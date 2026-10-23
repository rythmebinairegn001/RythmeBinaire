-- ============================================================================
-- PARCOURS GUIDÉS INITIAUX (8 parcours)
-- À lancer UNE fois dans Supabase > SQL Editor, APRÈS parcours.sql (script 19).
-- Sans danger si relancé : un parcours déjà créé (même titre FR) n'est pas recréé.
-- Les cours sont retrouvés par leur titre français. Les parcours sont créés NON PUBLIÉS :
-- vérifie l'ordre dans Administration > Parcours guidés, puis coche « Publié ».
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.cid(p_pattern TEXT) RETURNS TEXT
LANGUAGE sql AS $$
    SELECT c.id::text FROM public.courses c
    JOIN public.course_translations t ON t.course_id = c.id AND t.lang = 'fr'
    WHERE t.title ILIKE p_pattern
    ORDER BY c.id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION pg_temp.add_path(p_pos INT, p_tfr TEXT, p_ten TEXT, p_sfr TEXT, p_sen TEXT, p_patterns TEXT[])
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_ids TEXT[] := '{}'; v_id TEXT; p TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.learning_paths WHERE title_fr = p_tfr) THEN
        RAISE NOTICE 'Déjà présent : %', p_tfr; RETURN;
    END IF;
    FOREACH p IN ARRAY p_patterns LOOP
        v_id := pg_temp.cid(p);
        IF v_id IS NULL THEN RAISE NOTICE '  cours introuvable pour "%" (parcours "%")', p, p_tfr;
        ELSE v_ids := v_ids || v_id; END IF;
    END LOOP;
    INSERT INTO public.learning_paths (title_fr, title_en, summary_fr, summary_en, course_ids, position, published)
    VALUES (p_tfr, p_ten, p_sfr, p_sen, v_ids, p_pos, false);
    RAISE NOTICE 'Créé : % (% cours)', p_tfr, array_length(v_ids, 1);
END $$;

SELECT pg_temp.add_path(1,
 'Programmation de zéro', 'Programming from scratch',
 'Apprends à penser comme un programmeur, puis maîtrise Python pas à pas jusqu’à l’analyse de données.',
 'Learn to think like a programmer, then master Python step by step up to data analysis.',
 ARRAY['Algorithmique%', 'Python%Fondament%', 'Python%Interm%', 'Python Donn%']);

SELECT pg_temp.add_path(2,
 'Développeur web de zéro', 'Web developer from scratch',
 'Construis des sites complets : HTML et CSS, JavaScript interactif, bases de données SQL et PHP côté serveur.',
 'Build complete websites: HTML and CSS, interactive JavaScript, SQL databases and server-side PHP.',
 ARRAY['D_veloppement Web%', 'JavaScript pas%', 'SQL%', 'PHP%']);

SELECT pg_temp.add_path(3,
 'Devenir comptable avec Excel', 'Become an accountant with Excel',
 'Des formules de base aux tableaux croisés dynamiques, puis la gestion d’une boutique et la comptabilité de base.',
 'From basic formulas to pivot tables, then shop management and basic accounting.',
 ARRAY['Excel pour d_butants%', 'Excel avanc_%', 'Gestion de boutique%']);

SELECT pg_temp.add_path(4,
 'Secrétariat et bureautique pro', 'Office and secretarial skills',
 'Maîtrise Word, Excel et PowerPoint pour produire des documents, tableaux et présentations professionnels.',
 'Master Word, Excel and PowerPoint to produce professional documents, spreadsheets and presentations.',
 ARRAY['Bureautique Essentielle%', 'Word et documents%', 'Excel pour d_butants%', 'PowerPoint%']);

SELECT pg_temp.add_path(5,
 'Culture numérique', 'Digital literacy',
 'Comprendre internet, te protéger en ligne, utiliser l’intelligence artificielle et lire l’anglais du numérique.',
 'Understand the internet, stay safe online, use artificial intelligence and read the English of technology.',
 ARRAY['Internet et s_curit_%', 'S_curit_ et Hygi_ne%', 'Comprendre et Utiliser%', 'Anglais technique%']);

SELECT pg_temp.add_path(6,
 'Premiers pas en code (enfants)', 'First steps in coding (kids)',
 'Un parcours ludique pour les enfants : Scratch, puis premiers sites en HTML/CSS, puis premiers jeux en Python.',
 'A fun path for kids: Scratch, then first websites in HTML/CSS, then first games in Python.',
 ARRAY['Scratch%', 'HTML et CSS pour enfants%', 'Python pour enfants%']);

SELECT pg_temp.add_path(7,
 'Entrepreneur numérique', 'Digital entrepreneur',
 'Crée tes visuels avec Canva, vends en ligne avec le marketing digital et gère ta boutique au quotidien.',
 'Create your visuals with Canva, sell online with digital marketing and manage your shop day to day.',
 ARRAY['Design graphique avec Canva%', 'Marketing digital%', 'Gestion de boutique%']);

SELECT pg_temp.add_path(8,
 'Développeur professionnel', 'Professional developer',
 'Les compétences d’un développeur en équipe : logique, terminal, Git et GitHub, bases de données et anglais technique.',
 'The skills of a developer in a team: logic, terminal, Git and GitHub, databases and technical English.',
 ARRAY['Algorithmique%', 'Terminal, Git%', 'JavaScript pas%', 'SQL%', 'Anglais technique%']);

-- Contrôle : combien de cours par parcours ?
SELECT position, title_fr, coalesce(array_length(course_ids, 1), 0) AS nb_cours, published
FROM public.learning_paths ORDER BY position;
