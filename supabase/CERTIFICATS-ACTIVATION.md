# Certificats vérifiables — activation

## Ce que ça fait
- Quand un élève a terminé **toutes les leçons** d'un cours (100 %), son tableau de bord affiche **Mes certificats** → « Obtenir mon certificat ».
- La base vérifie elle-même que toutes les leçons sont terminées : impossible de tricher depuis le navigateur.
- Le certificat porte son nom, le cours, la date et un **code** (ex : RB-7KQ4M2XD). Il s'imprime ou s'enregistre en PDF (bouton Imprimer).
- N'importe qui peut vérifier un code, sans compte : pied de page du site → **Vérifier un certificat**, ou le lien `/?verif=RB-XXXXXXXX` écrit sur le certificat.
- Seuls le nom, le cours et la date sont montrés à la vérification. Rien d'autre.
- Un certificat peut être annulé (colonne `revoked` = true dans Table Editor) : la vérification affichera « annulé ».

## Limites à connaître
- Les cours d'exemple écrits dans le code (sans leçons en base) ne délivrent **pas** de certificat ; les cours importés en base, si.
- Le nom imprimé est celui du profil. S'il est vide, l'élève le saisit une fois. Il ne peut plus être changé ensuite (sauf par toi, dans la table).
- C'est un certificat de **suivi complet du cours**, pas un diplôme reconnu par l'État. À écrire clairement dans tes communications.
- Mentionne dans la page Confidentialité (relecture à venir) que le nom, le cours et la date d'un certificat sont consultables par quiconque connaît le code.

## Activer
1. Supabase → SQL Editor → colle `supabase/certificats.sql` → Run (« Success »). Sans danger si relancé.
2. Après le `git push`, connecte-toi avec un compte qui a terminé un cours importé : « Obtenir mon certificat » apparaît.
3. Teste la vérification dans une fenêtre privée avec le code.
