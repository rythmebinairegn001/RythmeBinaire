# Enfants : séances avec un professeur et classes — activation

Tout est piloté par l'**adulte responsable** (espace « Famille »). L'enfant ne réserve rien et ne rejoint aucune classe seul.

## Séance avec un professeur, réservée par le parent
- Dans « Famille » > bouton **Séance avec un professeur** sous l'enfant.
- Chaque enfant a **son propre quota mensuel** (le même nombre que les autres élèves, 2 par défaut). Il ne mord pas sur le quota du parent.
- Le parent doit cocher « Je serai présent(e) pendant toute la séance », sinon les créneaux restent bloqués (et la base refuse aussi).
- **Seul le parent reçoit le lien** de la visio (dans « Famille » et dans « Mes séances »). L'enfant ne voit pas le lien.
- Le professeur voit : « Enfant : prénom — un parent sera présent », avec l'e-mail du parent, jamais celui de l'enfant.
- Annulation : même règle (12 h avant).

## Classe d'un enfant, avec l'accord du parent
- Dans « Famille » > bouton **Classes**. Le parent saisit le code, voit le **nom de la classe et du professeur**, coche l'autorisation, puis inscrit l'enfant. La date et le parent ayant donné l'accord sont enregistrés.
- Le professeur voit le **prénom**, les leçons terminées, la progression et le code des exercices (relecture).
- Le professeur ne voit **jamais l'identifiant de connexion** de l'enfant (il passait avant par la fiche de l'élève : c'est maintenant bloqué) ni d'e-mail. L'export CSV non plus.
- Le professeur **ne peut pas écrire directement** à un enfant (bouton masqué et refusé par la base). Pour un retour, il peut passer par le parent.
- Le parent peut **retirer** l'enfant à tout moment.

## Activation
1. Il faut déjà avoir exécuté `enfants.sql`, `professeurs.sql`, `tutorat.sql` (et `notifications.sql`).
2. Exécuter `enfants-v2.sql` dans Supabase (SQL Editor). Sans danger pour les élèves ordinaires.
3. Déployer le site. Sans le script, les boutons affichent « pas encore activé ».
4. **Ne ré-exécute pas** `tutorat.sql` ni `professeurs.sql` après celui-ci : ils remettraient d'anciennes règles. Si c'est nécessaire, ré-exécute `enfants-v2.sql` ensuite.

## Test conseillé (5 minutes)
1. Compte parent avec un enfant : « Famille » > Classes > code d'une classe d'un professeur test > inscrire.
2. Compte professeur : l'enfant apparaît avec « Compte enfant », sans e-mail ni bouton « Écrire ».
3. « Séance avec un professeur » : cocher la présence, réserver. Côté professeur : « Enfant … un parent sera présent ».

## Testé
Sur une vraie base PostgreSQL de test : aperçu de classe, inscription par le parent, par un non-parent, par l'élève pour lui-même, code invalide, enfant suspendu, relecture de la fiche par le professeur (refusée pour l'enfant), message refusé, progression visible, retrait ; réservation avec/sans présence, non-parent, quotas séparés parent/enfant, quota atteint, créneau pris, vue professeur, annulation qui libère le créneau.

## Limites
- Un enfant peut quitter une classe lui-même (le parent peut le réinscrire).
- Les questions écrites restent réservées aux comptes ordinaires (pas pour les enfants).
- Rien n'oblige techniquement un parent à rester présent : c'est une déclaration. Le professeur est informé et peut interrompre une séance.
- Pas de paiement à la séance.
