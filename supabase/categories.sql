-- Nouvelles catégories de cours : « programmation » et « bureautique »
-- À lancer UNE FOIS dans Supabase → SQL Editor → Run. Sans danger si déjà lancé.
ALTER TYPE course_track ADD VALUE IF NOT EXISTS 'programmation';
ALTER TYPE course_track ADD VALUE IF NOT EXISTS 'bureautique';
