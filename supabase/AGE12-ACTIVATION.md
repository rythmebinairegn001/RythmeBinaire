# Règle des 12 ans renforcée — activation

## Ce qu'on peut et ne peut pas faire
Vérifier vraiment l'âge demanderait une pièce d'identité. On ne le fait pas (surtout pas pour des enfants : ce serait collecter des données sensibles). Ce script met en place des protections raisonnables :

1. **Déclaration exigée par la base.** Avant, la case « J'ai 12 ans ou plus » n'était vérifiée que par le site : on pouvait la contourner en appelant Supabase directement. Maintenant, la base peut refuser toute inscription sans déclaration. La date de la déclaration est enregistrée. Les comptes enfants créés par un adulte (via « Famille ») passent normalement.
2. **Signalement par les professeurs.** Un bouton drapeau à côté de chaque élève de la classe. Il envoie un signalement à l'admin. Un compte enfant supervisé ne peut pas être signalé.
3. **Examen par l'admin.** Onglet « Âge » : ignorer, ou bloquer le compte (la personne ne peut plus se connecter), et réactiver si c'était une erreur.
4. **Conditions d'utilisation** : une phrase indique que les comptes suspects peuvent être bloqués.

## Activation (dans cet ordre)
1. Exécuter `age12.sql` dans Supabase (SQL Editor). Rien ne change encore.
2. Déployer la nouvelle version du site (elle envoie la déclaration à l'inscription).
3. Admin > onglet « Âge » > cocher « Exiger la déclaration ». **Seulement après l'étape 2** : sinon les inscriptions échouent (« Database error saving new user »).
4. Test : créer un compte normal (doit marcher), créer un compte enfant depuis « Famille » (doit marcher).
5. Problème d'inscription ? Décocher la case dans l'onglet « Âge ».

## À savoir
- Les comptes déjà existants ne sont pas touchés (ils apparaissent comme « aucune déclaration enregistrée »).
- Un enfant qui coche la case sans que personne ne s'en aperçoive restera possible : c'est la limite de toute déclaration. Le signalement par les professeurs est le filet de sécurité.
- Un compte bloqué voit « Ce compte est suspendu ». Réactiver depuis l'onglet « Âge ».
- L'inscription par un fournisseur externe (Google, etc.) n'existe pas sur le site. Si tu en ajoutes un plus tard, il faudra aussi envoyer la déclaration.
- L'invitation d'un utilisateur depuis le tableau de bord Supabase est refusée quand l'exigence est allumée (pas de déclaration). Décoche temporairement si tu en as besoin.

## Testé
Sur une vraie base PostgreSQL de test : exigence éteinte/allumée, déclaration absente/fausse/vraie, compte enfant, réglage absent (les inscriptions restent autorisées), signalement par le professeur de l'élève, doublon, élève hors classe, élève ordinaire, compte enfant, lecture refusée aux non-admins, blocage et réactivation, impossibilité de se bloquer soi-même.
