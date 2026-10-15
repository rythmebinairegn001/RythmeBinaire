# Activer l'offre écoles (facturation à l'école)

À faire **après** les retours des étudiants et le `git push`. Sans ça, l'onglet « Écoles » de l'admin affiche
simplement « exécute supabase/ecoles.sql ».

## 1. La base de données (2 minutes)
Supabase → **SQL Editor** → exécute d'abord `supabase/acces.sql` (si ce n'est pas déjà fait), puis `supabase/ecoles.sql`.
Aucune commande de déploiement n'est nécessaire pour cette partie.

## 2. Utilisation (admin → onglet « Écoles »)
1. **Nouvelle école** : nom, responsable, téléphone, nombre de places, prix par élève et par mois (25 000 GNF proposé).
   La facture mensuelle (places × prix) s'affiche.
2. **Élèves et paiements → Ajouter** : colle les e-mails des élèves. Ils doivent **déjà être inscrits** sur la plateforme
   (12 ans ou plus). Le site te dit qui est ajouté, qui n'est pas inscrit, qui est déjà dans une autre école, et refuse
   au-delà du nombre de places.
3. **Enregistrer un paiement reçu** : nombre de mois, montant, référence (n° Orange Money, reçu). L'école devient
   « payée jusqu'au … » ; un paiement en avance prolonge à partir de la fin actuelle (aucun jour perdu).
4. Quand la date passe, l'école devient « Expirée » et ses élèves retombent sur les leçons « Découverte ».

## À savoir
- L'accès des élèves d'école ne se voit qu'**une fois l'accès payant allumé** (Élèves → Gestion des accès).
- Un élève ne peut être que dans **une** école. Un accès offert personnel reste prioritaire.
- Les élèves ne lisent jamais les prix, notes ou paiements de leur école : ils obtiennent seulement la date de fin de paiement.
- Les élèves de moins de 12 ans d'une école ne sont pas encore gérés : ils passent pour l'instant par un adulte (page « Famille »,
  limite de 5 enfants par adulte). C'est la prochaine amélioration possible si des écoles en ont besoin.
