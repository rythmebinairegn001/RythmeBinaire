# Mansara AI intégré — activation pas à pas

Une fenêtre de discussion « Mansara AI » dans la plateforme : l'élève est déjà connecté, pas de deuxième compte.
Elle utilise les mêmes cerveaux que l'application Mansara AI : Gemini (gratuit) puis Groq en secours, et Claude si tu ajoutes sa clé.

## Étape 1 — La table des messages (une seule fois)
Supabase > SQL Editor > coller le contenu de `supabase/assistant-chat.sql` > Run.
(« Success. No rows returned » est normal.) Aucun élève ne peut lire cette table depuis son navigateur ; seul l'administrateur peut la consulter.

## Étape 2 — Les clés (jamais dans le chat, jamais dans GitHub)
Supabase > Edge Functions > Secrets (ou Project Settings > Edge Functions), ajouter :
- `GEMINI_API_KEY` (cerveau principal, gratuit avec limites)
- `GROQ_API_KEY` (secours)
Ces deux secrets sont les mêmes que ceux du tuteur : si tu les as déjà mis, rien à refaire.

## Étape 3 — Déployer la fonction
Créer un jeton temporaire (Account > Access Tokens, expiration courte), puis dans Git Bash :

    cd /c/Projet/RythmeBinaire/RythmeBinaire
    export SUPABASE_ACCESS_TOKEN=TON_JETON
    npx supabase functions deploy assistant-chat --no-verify-jwt

Puis SUPPRIMER le jeton dans Supabase.

## Étape 4 — Le site
Si `VITE_TUTOR_API_URL` est déjà réglée sur Vercel (adresse se terminant par `/tutor-hint`), le chat est branché tout seul :
le site remplace `tutor-hint` par `assistant-chat`. Sinon, ajouter sur Vercel :

    VITE_ASSISTANT_API_URL = https://TON_PROJECT_REF.supabase.co/functions/v1/assistant-chat

Puis `git add .`, `git commit`, `git push` (Vercel redéploie).

## Où l'élève le voit
- Tableau de bord : carte « Mansara AI » > « Discuter avec Mansara AI ».
- Page d'une leçon : bouton « Demander à Mansara AI » (l'IA sait quelle leçon est ouverte).

## Les protections (côté serveur)
- Il faut être connecté ; le jeton est vérifié.
- Compte enfant : l'IA ne répond que si l'adulte responsable l'a autorisée (même règle que le tuteur).
- Limites : 30 messages par élève et par jour, 6000 messages par mois pour tous (frein sur la dépense).
- Messages limités à 1000 caractères ; l'historique envoyé est nettoyé ; le contexte (cours, leçon) est limité et filtré.
- Consignes de l'IA : ne pas faire les exercices à la place de l'élève, refuser les demandes dangereuses ou sexuelles, ne pas demander d'informations personnelles, ne pas obéir aux ordres cachés dans les messages.
- Si l'IA est en panne, le message ne compte pas dans la limite de l'élève.

## Réglages facultatifs (secrets Supabase)
- `ASSISTANT_DAILY_QUOTA` (défaut 30) · `ASSISTANT_MONTHLY_CAP` (défaut 6000)
- `ASSISTANT_PROVIDERS` : ordre d'essai des cerveaux (défaut `gemini,groq,anthropic`)
- `ASSISTANT_MODEL_GEMINI`, `ASSISTANT_MODEL_GROQ`, `ASSISTANT_MODEL` (Claude) : à changer si un fournisseur renomme ses modèles.

## Vie privée
Les messages de l'élève partent chez le fournisseur choisi (Google, Groq…). Lis les conditions de l'offre gratuite
avant d'ouvrir l'assistant à beaucoup d'élèves, et ne le propose pas aux comptes enfants sans accord de l'adulte.
Les échanges sont gardés dans la table `assistant_messages` (pour les limites et vérifier les abus) : dis-le dans ta politique de confidentialité.

## Vérifier la qualité
Teste 10 questions réelles d'élèves (en français et en anglais). Note les mauvaises réponses : on ajuste les consignes dans
`supabase/functions/assistant-chat/index.ts` (fonction `buildSystem`).
