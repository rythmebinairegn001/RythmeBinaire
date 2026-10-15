# Activer les comptes enfants supervisés

À faire **après** les retours des étudiants et le `git push`. Rien ne casse si tu ne le fais pas :
le bouton « Famille » affichera simplement « pas encore activé ».

## 1. La base de données (2 minutes)
Supabase → **SQL Editor** → colle le contenu de `supabase/enfants.sql` → **Run**.
(Sans danger si tu le relances.)

## 2. La fonction serveur (5 minutes)
Dans le dossier du projet, dans Git Bash :

```bash
npx supabase functions deploy manage-child
npx supabase functions deploy tutor-hint
```
`tutor-hint` est redéployée car elle sait maintenant couper l'IA pour un enfant sans accord de l'adulte.
Si tu n'as pas encore activé le tuteur IA, suis d'abord `supabase/TUTEUR-IA-ACTIVATION.md` (étapes 0 et 1).

## 3. Réglages facultatifs (secrets Supabase)
```bash
npx supabase secrets set CHILD_LIMIT=5
```
- `CHILD_LIMIT` : nombre maximum d'enfants par adulte (5 par défaut).
- `CHILD_EMAIL_DOMAIN` : domaine de l'e-mail interne des enfants (`enfants.rythmebinaire.invalid` par défaut).
  **Si tu le changes, mets exactement la même valeur dans Vercel** (variable `VITE_CHILD_EMAIL_DOMAIN`) et redéploie.

## 4. Test (5 minutes) — avec un compte adulte de test
1. Connecte-toi avec un compte adulte → tableau de bord → **Famille : comptes enfants**.
2. Crée un enfant : prénom, identifiant (ex. `test.enfant`), mot de passe.
3. Déconnecte-toi, puis connecte-toi avec l'**identifiant** (pas d'e-mail) et le mot de passe.
4. Vérifie : l'enfant ne voit pas le bouton « Famille ».
5. Reviens côté adulte : suspends l'enfant → la connexion de l'enfant doit être refusée ; réactive-le.
6. Active le tuteur IA pour l'enfant et vérifie qu'un indice arrive ; désactive-le et vérifie le refus.
7. Supprime le compte de test.

### Si la création échoue avec une erreur d'adresse e-mail
Supabase peut refuser le domaine réservé `.invalid`. Choisis alors un domaine à toi, par exemple
`enfants.rythmebinairegn.africa` (aucun e-mail n'y est jamais envoyé), puis applique-le aux **deux** endroits :
`npx supabase secrets set CHILD_EMAIL_DOMAIN=enfants.rythmebinairegn.africa` et Vercel `VITE_CHILD_EMAIL_DOMAIN=…`.

## Ce qu'il faut savoir
- Un enfant **suspendu** est bloqué à sa prochaine connexion ; une session déjà ouverte peut durer jusqu'à environ 1 heure.
- L'enfant **n'a pas d'e-mail** : si l'adulte oublie le mot de passe de l'enfant, il le change depuis « Famille ».
- L'accès aux cours de l'enfant **suit celui de l'adulte** (offert ou payé) quand l'accès payant sera activé.
- À l'inscription, la case « J'ai 18 ans ou plus » est obligatoire : les moins de 18 ans passent par un adulte.
