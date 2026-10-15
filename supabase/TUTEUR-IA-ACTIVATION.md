# Activer le tuteur IA — pas à pas

Le tuteur est une petite fonction qui tourne sur ton Supabase (`functions/tutor-hint/index.ts`).
La clé de l'IA reste secrète côté serveur : elle n'apparaît jamais dans le site.

## Étape 0 — Ce qui marche SANS clé (gratuit)
Une fois la fonction déployée (étapes 1 à 3), les niveaux 1 et 2 affichent les indices écrits
dans tes exercices. Les niveaux 3 et 4 disent « tuteur pas encore activé ». Rien à payer.

## Étape 1 — Sécuriser la base (une seule fois)
Supabase > SQL Editor > coller le contenu de `supabase/tutor-hint.sql` > Run.

## Étape 2 — Déployer la fonction
Dans Git Bash, dans le dossier du projet :

    npx supabase login
    npx supabase link --project-ref TON_PROJECT_REF
    npx supabase functions deploy tutor-hint

(TON_PROJECT_REF = les lettres dans l'adresse de ton projet : https://TON_PROJECT_REF.supabase.co)

## Étape 3 — Dire au site où est la fonction
Vercel > ton projet > Settings > Environment Variables > ajouter :

    VITE_TUTOR_API_URL = https://TON_PROJECT_REF.supabase.co/functions/v1/tutor-hint

Puis Deployments > Redeploy.

## Étape 4 — Activer l'IA (quand tu es prêt à payer)
1. console.anthropic.com > créer un compte > Billing : ajouter 5 $ de crédit
   (l'abonnement Claude Pro ne sert PAS à ça, c'est un compte séparé).
2. Billing > fixer une limite de dépense mensuelle (ex. 10 $).
3. API Keys > créer une clé.
4. Dans Git Bash :

       npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...ta-clé...

   C'est tout : pas besoin de redéployer.

## Réglages (facultatifs) — mêmes commandes `secrets set`
- TUTOR_DAILY_QUOTA=20     indices max par élève et par jour (défaut 20)
- TUTOR_MONTHLY_CAP=3000   indices max par mois pour TOUS les élèves (frein de sécurité sur la dépense)
- TUTOR_MODEL=claude-haiku-5-5   modèle utilisé (défaut Haiku, le moins cher)

## Règles du tuteur (appliquées par le serveur)
- 4 niveaux par exercice : 1) où est le problème, 2) piste de réflexion, 3) indice précis, 4) explication complète.
- L'élève ne peut pas sauter de niveau : le serveur compte ses indices.
- Aux niveaux 1 à 3, tout code est supprimé de la réponse, même si l'IA en écrit.
- Si l'IA est en panne, l'indice n'est pas compté.
