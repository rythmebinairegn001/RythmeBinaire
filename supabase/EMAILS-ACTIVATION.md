# E-mails et relances — activation (script 22)

Ce que ça ajoute : 4 messages automatiques, dans le site tout de suite et par e-mail dès que Resend est branché.

| Message | Quand |
| --- | --- |
| Bienvenue | à la création du compte |
| Certificat obtenu | quand un certificat de cours ou de parcours est délivré |
| Prêt pour ta première leçon ? | 3 jours après l'inscription, si aucune leçon terminée (une seule fois) |
| Ta prochaine leçon t'attend | 7 à 30 jours sans leçon terminée (un rappel tous les 14 jours au plus) |

Jamais pour un compte enfant supervisé. Les comptes par téléphone (adresse interne en `.invalid`) voient le message dans le site mais ne reçoivent aucun e-mail. Chaque e-mail rappelle qu'on peut le couper dans le tableau de bord.

## Étape 1 — la base (à faire maintenant)
Supabase > SQL Editor > `supabase/emails-bienvenue-relance.sql` > Run.
Attention : au premier passage, les élèves déjà inactifs (7 à 30 jours) recevront UN rappel d'un coup, dans le site. C'est voulu.

## Étape 2 — la fonction et la planification (à faire maintenant, sans domaine)
Les relances ne partent que si la fonction `send-notifications` tourne toutes les 5 minutes (voir `NOTIFICATIONS-ACTIVATION.md`, étape 2). Comme le code de la fonction a changé, redéploie-la :
```bash
npx supabase functions deploy send-notifications --no-verify-jwt
```
Si elle n'était pas encore déployée : choisis un secret, fais `npx supabase secrets set CRON_SECRET=MON_SECRET SITE_URL=https://rythmebinairegn.vercel.app`, déploie, puis crée la tâche Cron toutes les 5 minutes (POST sur `https://TON-PROJET.supabase.co/functions/v1/send-notifications`, en-tête `x-cron-secret: MON_SECRET`). Ne mets jamais ce secret dans le chat.

## Étape 3 — plus tard, quand tu auras un domaine
1. Achète un nom de domaine (ex. `rythmebinairegn.africa`).
2. Resend > Domains > Add Domain : Resend donne quelques lignes DNS (SPF, DKIM) à copier chez ton vendeur de domaine ; attends « Verified ».
3. Resend > API Keys : crée une clé. Puis :
```bash
npx supabase secrets set RESEND_API_KEY=re_xxx MAIL_FROM="RythmeBinaireGn <notifications@TON-DOMAINE>"
```
Pas besoin de redéployer. Seules les notifications des 2 derniers jours partent par e-mail (pas d'envoi massif des anciennes).

## À savoir
- Sans domaine vérifié, Resend n'envoie qu'à ton propre e-mail : inutile pour les élèves.
- Une partie de tes élèves s'inscrit avec un numéro de téléphone : pour eux, l'e-mail ne sert à rien. Les messages dans le site et les relances WhatsApp de l'admin restent utiles.

## Rappel « série en danger » (script 23)
Supabase > SQL Editor > `supabase/serie-rappel.sql` > Run, puis redéploie `send-notifications` (même commande qu'au-dessus). Chaque soir à partir de 17 h (heure de la Guinée), un élève avec une série d'au moins 2 jours qui n'a rien fait aujourd'hui reçoit un message encourageant (un par jour au plus). Côté site, une bulle « 🔥 Série de N jours » apparaît aussi quand on valide la première leçon du jour.
