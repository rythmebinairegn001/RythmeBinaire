# Exercices SQL corrigés dans le navigateur

## Ce que ça fait
Un exercice dont le langage est **SQL** s'exécute dans le navigateur de l'élève avec SQLite (bibliothèque sql.js, ≈ 1 Mo, chargée seulement dans ces exercices puis gardée en cache pour le hors connexion). Aucun serveur.

## Comment un exercice SQL est corrigé
- Chaque **test** a une « entrée » : le script SQL qui crée la base d'exemple (tables + données).
- Option : une ligne `-- CHECK` dans l'entrée ; ce qui suit est une requête de **vérification exécutée après le code de l'élève** (pour corriger INSERT, UPDATE, DELETE, CREATE VIEW, CREATE INDEX…).
- Sans CHECK, on compare le résultat de la **dernière requête** de l'élève.
- Le résultat s'écrit une ligne par ligne, colonnes séparées par ` | `, `NULL` pour une valeur vide, **sans titres de colonnes**. Un test **caché** peut utiliser une autre base pour empêcher de tricher en recopiant la réponse.
- Dans l'administration, choisir le langage « SQL (SQLite, corrigé dans le navigateur) ».

## Cours SQL
`cours-sql.json` contient maintenant 36 leçons : chaque leçon (théorie + quiz de 5 questions) est suivie d'un **atelier** avec un exercice corrigé automatiquement. Pour l'obtenir : supprimer le cours SQL dans l'administration puis réimporter le fichier.

## Activation
Rien à lancer dans Supabase. Faire `git push` pour déployer le site.
