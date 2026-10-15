# Espace professeur — activation

Rien ne change pour tes élèves tant que tu n'as pas exécuté le script. Sans le script, la page Professeurs de l'admin
affiche simplement un message jaune « pas encore activé ».

## Ce que ça apporte
- **Un professeur** = un compte normal à qui tu donnes le droit (onglet admin **Professeurs**, par e-mail).
- Il crée des **classes**. Chaque classe a un **code de 6 caractères** (ex : K7P4QX) qu'il donne à ses élèves (WhatsApp, tableau…).
- L'élève saisit le code dans **Ma classe** (tableau de bord) et peut la quitter quand il veut.
- Le professeur voit **uniquement les élèves de ses classes** : leçons terminées, % de progression sur les cours qu'il choisit,
  dernière activité, et un état (Actif / Calme / À relancer / Pas commencé). Les élèves à relancer sont en haut de la liste.
- Il peut **écrire un message** à un élève (encouragement, consigne). L'élève le voit dans Ma classe.
- **Relecture du code** (script `professeurs-code.sql`, à lancer après `professeurs.sql`) : le bouton « code » ouvre les derniers envois de l'élève (réussi/échoué/erreur, code, exercice) et « Commenter » prépare un message qui rappelle l'exercice. Le professeur ne lit que le code des élèves de ses classes.
- **Export Excel (CSV)** du suivi d'une classe, et possibilité de **fermer le code** pour ne plus accepter d'élèves.

## Protection des enfants
Un compte enfant supervisé (moins de 12 ans) **ne peut pas** rejoindre une classe tout seul et ne voit pas « Ma classe ».
Son adulte reste son contact. Si tu veux un jour des classes d'enfants, on le fera avec l'accord explicite du parent.

## Activer
1. Supabase → **SQL Editor** → colle `supabase/professeurs.sql` → **Run** (« Success »). Tu peux le relancer sans danger.
2. Vérifie : Table Editor → `teachers`, `classes`, `class_members`, `class_courses`, `teacher_messages`.
3. Site (après le `git push`) → connecté en admin → onglet **Professeurs** → ajoute l'e-mail d'un compte existant.
4. Ce compte se reconnecte : un bouton **Espace professeur** apparaît sur son tableau de bord.
5. Test rapide : crée une classe, copie le code, connecte-toi avec un compte élève de test, saisis le code dans **Ma classe**,
   termine une leçon, puis regarde le suivi côté professeur.

## À savoir
- Ce que le professeur voit d'un élève : nom, e-mail, leçons terminées. Rien d'autre (pas de mot de passe, pas de paiement).
  À mentionner dans la page Confidentialité quand tu la feras relire.
- Le rôle de tes professeurs humains (tête-à-tête, correction) reste à définir : cet espace sert d'abord au **suivi de groupe**.
- Le commentaire est un message libre (pas de annotation ligne par ligne).
