# Activation : parcours guidés

1. `git push` du code.
2. Supabase > SQL Editor : lancer `supabase/parcours.sql` (script 19, après `certificats.sql`).
3. Administration > bouton « Parcours guidés » : créer un parcours (titres FR + EN, résumé, cours à cocher puis ordonnés avec les flèches), cocher « Publié ».
   Exemples : « Web de zéro », « Devenir comptable avec Excel ».
4. Les parcours publiés apparaissent sur la page Cours (public) et sur le tableau de bord élève avec la progression.
   Quand tous les cours du parcours sont terminés à 100 %, l'élève obtient un certificat de parcours (même code de vérification que les certificats de cours).

Remarques : la base refuse le certificat si un cours n'est pas terminé. Supprimer un parcours ne supprime pas les certificats déjà délivrés.
