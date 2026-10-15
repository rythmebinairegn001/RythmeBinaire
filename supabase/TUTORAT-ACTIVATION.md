# Cours en tête-à-tête — activation

## Les décisions prises (modifiables)
- **Visio par lien externe** : le professeur colle son propre lien (Google Meet, Zoom, appel WhatsApp…). Zéro coût, zéro code vidéo à maintenir, et ça marche avec ce que tes professeurs utilisent déjà.
- **Qui donne les cours** : les professeurs désignés (onglet admin *Professeurs*). Tu y es seul pour l'instant : ajoute ton propre e-mail pour publier tes créneaux. Quand tes amis arrivent, tu les ajoutes et chacun publie les siens.
- **Paiement** : inclus dans l'abonnement, avec un **quota de 2 séances par mois** (pas de paiement à la séance). Pour le changer : Supabase → Table Editor → `app_settings` → nouvelle ligne `key = tutoring_monthly_quota`, `value = 3` (par exemple). Le quota s'applique aussi pendant la phase gratuite, pour ne pas te submerger.
- **Alternative sans vidéo** : l'élève pose une **question écrite** (texte + code), un professeur répond sous **24 h** (réglable : ligne `tutoring_answer_hours` dans `app_settings`, ex. `12`). Les questions en retard apparaissent en rouge dans l'espace professeur. Elle compte dans le même quota que la séance en visio.

## Règles
- Un créneau doit être publié plus de 2 h à l'avance ; on réserve au plus tard 2 h avant.
- L'élève peut annuler jusqu'à 12 h avant : le créneau redevient libre et la séance lui est rendue.
- Le lien de visio n'est visible que par l'élève qui a réservé (et le professeur), et le bouton « Rejoindre » apparaît 10 minutes avant.
- Les comptes enfants (moins de 12 ans) ne réservent pas et ne posent pas de question seuls.
- Toute question écrite est visible par tous les professeurs désignés. Choisis-les avec soin.

## Activer
1. Supabase → SQL Editor → `supabase/tutorat.sql` → Run. À lancer **après** `professeurs.sql`. Sans danger si relancé.
2. Après le `git push` : ajoute-toi comme professeur (admin → Professeurs), reconnecte-toi, ouvre *Espace professeur* → section *Tête-à-tête* → publie un créneau avec ton lien.
3. Avec un compte élève de test : *Aide d'un professeur* → réserve, puis vérifie « Mes séances » et la question écrite.

## Limites de cette première version
- **Pas de rappel automatique** (pas d'e-mail ni de SMS). Le professeur voit le nom et l'e-mail de l'élève dans sa liste pour le prévenir si besoin. Si un professeur annule une séance réservée, l'élève la voit disparaître : prévenez-le par WhatsApp.
- Pas de paiement à la séance ni de réservation pour un enfant par son parent (viendra avec le paiement automatique).
- Pas de fuseaux horaires multiples : l'heure affichée est celle de l'appareil de chaque personne.
