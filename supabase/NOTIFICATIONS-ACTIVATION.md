# Notifications — activation

## Ce qui marche tout de suite (sans rien payer)
Après `notifications.sql`, un panneau **Notifications** apparaît en haut du tableau de bord (élève et professeur) dès qu'il y a quelque chose à lire. Il se met à jour toutes les 2 minutes et quand on revient sur l'onglet.

| Qui | Prévenu de |
| --- | --- |
| Élève | message d'un professeur · réponse à sa question · séance annulée par le professeur (sa séance lui est rendue) · rappel de séance |
| Professeur | nouvelle question d'un élève · séance réservée · réservation annulée par l'élève · rappel de séance |

Cela règle le point faible signalé plus tôt : un élève est maintenant prévenu si un professeur annule sa séance.

## Étape 1 — la base de données
Supabase → SQL Editor → `supabase/notifications.sql` → Run. À lancer **en dernier**, après `professeurs.sql` et `tutorat.sql`. Sans danger si relancé.

## Étape 2 (facultative) — rappels de séance et e-mails
Les rappels (« ta séance commence dans moins de 2 h ») et les e-mails passent par une petite fonction serveur appelée toutes les 5 minutes.
Elle ne touche jamais aux comptes enfants (adresse interne) ni aux personnes qui ont décoché « Recevoir aussi par e-mail ».

1. **Choisis un secret** (une longue phrase au hasard), appelé ci-dessous `MON_SECRET`.
2. **Déploie la fonction** (Git Bash, dans le dossier du projet, comme pour les autres) :
   ```bash
   npx supabase secrets set CRON_SECRET=MON_SECRET SITE_URL=https://TON-SITE
   npx supabase functions deploy send-notifications --no-verify-jwt
   ```
3. **Planifie l'appel toutes les 5 minutes** : Supabase → Integrations → **Cron** (le nom du menu peut varier) → nouvelle tâche, toutes les 5 minutes, type *HTTP request* : méthode POST, URL `https://TON-PROJET.supabase.co/functions/v1/send-notifications`, en-tête `x-cron-secret: MON_SECRET`.
   → À ce stade, les **rappels de séance** arrivent déjà dans le site. Aucun e-mail n'est envoyé (la fonction répond « no_api_key »).
4. **Pour envoyer aussi des e-mails** : crée un compte sur Resend (offre gratuite d'environ 3 000 e-mails par mois), puis :
   - il faut **un nom de domaine à toi** vérifié chez Resend (quelques dollars par an). Sans domaine vérifié, Resend n'envoie qu'à ton propre e-mail : inutile pour les élèves ;
   - crée une clé d'API, puis :
   ```bash
   npx supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="RythmeBinaireGn <notifications@TON-DOMAINE>"
   ```
   Pas besoin de redéployer.

## À savoir
- **Franchement** : en Guinée, beaucoup d'élèves lisent peu leurs e-mails. Les notifications dans le site sont utiles mais seulement quand l'élève ouvre le site. Pour une vraie relance, WhatsApp reste plus efficace : l'envoi automatique par WhatsApp demande l'offre payante *WhatsApp Business* ; à regarder plus tard si les e-mails ne suffisent pas.
- Les notifications des 2 derniers jours seulement sont envoyées par e-mail. Si la clé est ajoutée plus tard, les anciennes ne sont pas renvoyées.
- Un e-mail contient le titre, le début du message (300 caractères) et le lien du site. Aucune donnée sensible.
