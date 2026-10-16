# Statistiques d'audience (anonymes)

## Ce que ça fait
- Compte les **visiteurs** (un numéro aléatoire par navigateur), les **pages vues** (y compris les changements d'écran de l'appli) et 4 actions : **inscription, connexion, début d'un cours, cours terminé**.
- L'onglet **Administration → Statistiques** affiche une section « Audience du site » : visiteurs (aujourd'hui, 7 j, 30 j), pages vues, connexions, inscrits total, nouveaux inscrits par jour et par semaine, utilisateurs actifs (7 et 30 jours), cours les plus suivis, taux de cours terminés, pays estimé, langue, appareil.

## Ce qui n'est JAMAIS enregistré
Nom, e-mail, téléphone, identifiant du compte, adresse IP, adresse complète de la page (donc jamais les codes de certificat ou d'invitation). Le pays est estimé par le **fuseau horaire** du navigateur.

## Désactivé automatiquement
- sur `localhost`, `127.0.0.1`, `*.local` et en mode développement ;
- si le navigateur envoie « Do Not Track » ;
- hors connexion ;
- sur un appareil où tu ouvres une fois le site avec **`?notrack=1`** (ex. `https://ton-site/?notrack=1`) — fais-le sur ton PC et ton téléphone pour ne pas fausser les chiffres. `?notrack=0` réactive.

## Activation (une seule fois)
1. Supabase → **SQL Editor** → colle le contenu de `supabase/analytics.sql` → **Run**.
2. `git push` (le site envoie les statistiques dès que la base est prête ; avant, les envois échouent en silence).
3. Ouvre le site, navigue un peu, puis **Administration → Statistiques**.

## Sécurité
- La table `analytics_events` n'a **aucun accès direct** pour les clients (RLS sans politique, droits retirés).
- Écriture : seulement la fonction `track_event` (valide tout, ignore le reste, 300 événements maximum par visiteur et par jour, un seul « début » / « fin » par cours et par visiteur).
- Lecture : seulement `analytics_summary()`, qui **refuse tout compte non administrateur côté serveur** (erreur `forbidden`).
- Nettoyage : `select analytics_purge(400);` (admin) supprime les événements de plus de 400 jours.

## Limites à connaître
- Un visiteur = un navigateur : une personne sur deux appareils compte deux fois ; vider les données du navigateur crée un nouveau visiteur.
- « Actifs » = visiteurs connectés vus dans la période (pas liés au compte, donc approximatifs).
- Les cours sont suivis depuis la mise en ligne de cette fonction : pas d'historique avant.
- Les robots qui exécutent JavaScript peuvent être comptés.
