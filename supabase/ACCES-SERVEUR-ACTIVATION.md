# Protection du paywall côté base — activation

**Quand l'exécuter :** seulement quand tu décides de faire payer (avant d'allumer l'interrupteur « accès payant »). Tant que le site est gratuit, tu n'en as pas besoin. Même exécuté, il ne change rien tant que l'interrupteur est éteint.

**Pourquoi :** sans lui, le verrouillage n'existe que dans le site. Un élève technique peut lire les leçons verrouillées avec les outils du navigateur. Avec lui, la base ne lui envoie tout simplement pas le contenu.

## Étapes
1. Supabase > SQL Editor > coller `acces-serveur.sql` > Run. (Après `acces.sql`, et idéalement après `ecoles.sql`, `enfants.sql`, `professeurs.sql`.)
2. Tester avec l'interrupteur éteint : tout doit rester lisible.
3. Allumer l'interrupteur, puis tester avec un compte sans accès (leçons 3 et suivantes vides), un compte avec accès, un compte école et un compte enfant.
4. Problème ? Run `acces-serveur-retour.sql` : les règles d'origine reviennent.

## Qui voit quoi (interrupteur allumé)
- Les N premières leçons de chaque cours (réglage « leçons libres ») : tout le monde, même sans compte.
- Au-delà : accès offert ou payé encore valable, élève d'une école à jour, enfant d'un adulte avec accès, professeur désigné, admin.
- Les autres voient « Leçon N » sans contenu, exercice, indice ni test.

## Testé
Sur une vraie base PostgreSQL de test (pas sur ton Supabase) : interrupteur éteint/allumé, sans compte, sans accès, accès valable/expiré, école à jour/expirée, enfant, professeur, admin, table de réglages absente, retour arrière, écriture refusée à un élève.

## Limites
- Le tuteur IA lit désormais l'exercice avec les droits de l'élève : sur une leçon verrouillée il répond « introuvable » et ne coûte rien. Cela demande de redéployer la fonction `tutor-hint` (version mise à jour).
- Un élève qui vient de recevoir son accès doit recharger la page.
- Les certificats se basent sur les leçons de la base, pas sur ce que l'élève voit : pas d'effet.
