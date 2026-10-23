# Historique des tentatives de quiz

## Ce que ça fait
Chaque passage d'un quiz est enregistré : date, score (ex. 3/5), réussi ou non, questions ratées.
- **Élève** : tableau de bord → carte « Mes quiz : essais et scores » (une ligne par leçon, détail des essais en dépliant).
- **Professeur** : Espace professeur → ouvrir une classe → bloc « Quiz de la classe » : élèves bloqués (3 échecs ou plus sur le même quiz), questions les plus ratées, détail par élève.
- **Parent** : Famille → rapport d'un enfant → « Quiz de <prénom> ».
- **Administrateur** : lecture de tout (via la base).

## Activation (une seule fois)
1. Supabase → SQL Editor → coller `supabase/quiz-tentatives.sql` → Run (script 17, après `professeurs.sql`, `enfants.sql` et `parents.sql`).
2. `git push` pour déployer le site.
Sans l'étape 1, les quiz marchent comme avant : l'enregistrement est simplement ignoré.

## Limites
- Seules les tentatives faites **après** l'activation sont enregistrées.
- La correction se fait dans le navigateur : c'est un suivi, pas un examen noté.
- Vie privée : chacun ne voit que ce qu'il a le droit de voir (élève = lui-même, professeur = ses classes, parent = ses enfants).
