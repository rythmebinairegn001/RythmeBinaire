# Activation : inscription par numéro de téléphone

## Ce que ça fait
- À l'inscription et à la connexion, l'élève choisit « Par e-mail » ou « Par téléphone ».
- Par téléphone : pays + numéro + mot de passe (8 caractères minimum). Aucun SMS, donc aucun coût.
- Connexion : il écrit son numéro avec le + et l'indicatif (ex : +224 627 99 86 79) et son mot de passe.
- À l'inscription, un CODE DE RÉCUPÉRATION (ex : AB3D-K7MP-Q2XZ) est affiché une seule fois ; l'élève doit cocher « je l'ai noté ».
  S'il oublie son mot de passe : « Mot de passe oublié » > « Par téléphone » > numéro + code + nouveau mot de passe (un nouveau code est alors donné).
- Réservé aux 12 ans et plus (même case à cocher qu'avec l'e-mail). Les enfants restent créés par leur adulte (Famille).

## Limites à connaître
- Le numéro n'est PAS vérifié : quelqu'un peut s'inscrire avec le numéro d'un autre. On ne s'en sert donc jamais pour envoyer des messages.
- Pas d'e-mail de notification pour ces comptes (notifications dans le site seulement).
- Code perdu = compte à réinitialiser à la main par toi (mot de passe dans Supabase > Authentication > Users).
- Anti-abus : 10 inscriptions par heure et par adresse réseau ; 5 codes faux par heure et par numéro.
- Les professeurs et l'admin voient le numéro à la place de l'e-mail.

## Étapes
1. Supabase > SQL Editor : lancer `supabase/telephone.sql` (script 21).
2. Dans le dossier du projet (Git Bash) : `npx supabase functions deploy phone-account`
3. `git push`.
4. Test : s'inscrire avec un numéro de test, noter le code, se déconnecter, se reconnecter avec le numéro, puis tester « Mot de passe oublié » > « Par téléphone ».

Si Supabase refuse le domaine interne `tel.rythmebinaire.invalid`, choisis un domaine à toi (ex : `tel.rythmebinairegn.africa`) et mets EXACTEMENT la même valeur à deux endroits :
`npx supabase secrets set PHONE_EMAIL_DOMAIN=…` et Vercel `VITE_PHONE_EMAIL_DOMAIN=…` (puis redéployer).
