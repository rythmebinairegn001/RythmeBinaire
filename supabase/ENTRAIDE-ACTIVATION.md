# Entraide (questions / réponses) — activation

## Ce que c'est
Un espace où les élèves de 12 ans et plus posent des questions et s'entraident. Texte seulement (léger pour les petites connexions), FR/EN.

## Sécurité (voulue, surtout pour les 12–17 ans)
- **Comptes enfants supervisés : aucun accès** (ni lecture ni écriture), vérifié par la base, pas seulement par le site.
- On voit seulement « Prénom N. », jamais l'e-mail.
- Liens, e-mails et numéros de téléphone sont refusés.
- Limites par jour : 5 questions, 30 réponses.
- Tout membre peut signaler ; à 3 signalements différents, le message est masqué en attendant ta décision.
- Toi (admin) : onglet **Entraide** → masquer, rétablir, supprimer, réduire un auteur au silence.
- Les professeurs désignés ont un badge « Professeur ».
- Limite honnête : il n'y a pas de modération automatique du contenu (insultes, etc.) : elle repose sur les signalements et sur toi. Tant que la communauté est petite, passe dans l'onglet de temps en temps.

## Étapes
1. Supabase → SQL Editor → coller `supabase/entraide.sql` → Run (sans risque : ajoute seulement 3 tables et des fonctions ; peut être relancé).
2. Déployer le site (git push).
3. Les élèves de 12+ voient le bouton **Entraide** sur leur tableau de bord.
Pour tout couper : ne pas exécuter le script (le site cache alors l'entraide d'elle-même).

## Retour en arrière
`DROP TABLE public.forum_reports, public.forum_mutes, public.forum_posts CASCADE;` puis supprimer les fonctions `forum_*`.
