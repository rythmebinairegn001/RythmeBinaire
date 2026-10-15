# Espace parent — rapports de progression

## Ce que ça apporte
Dans **Famille**, chaque enfant a un bouton **Voir le rapport** (7 derniers jours) :
leçons terminées, jours actifs sur 7, exercices réussis / essais, indices IA demandés, série en cours,
avancement par cours (%), dernière activité, et un **conseil** adapté (encourager, proposer un créneau fixe, relancer…).
Le bouton **Partager par WhatsApp** envoie un résumé texte prêt à coller : pratique pour les familles où plusieurs adultes suivent l'enfant.

## Activer
1. Supabase → SQL Editor → `supabase/parents.sql` → Run. À lancer **après** `enfants.sql`. Sans danger si relancé.
2. Sans ce script, le rapport s'affiche quand même (leçons et séries) ; seuls les exercices et indices restent à 0.

## À savoir
- Un parent ne lit que les enfants qu'il a créés (comptes de moins de 12 ans). Un élève de 12 ans ou plus gère son propre compte : pas de rapport pour un parent.
- Les « Paiements » et la « Réservation de cours » de l'espace parent viendront avec les cours en tête-à-tête.
