# Mise en ligne pas à pas (tout d'un coup, dans le bon ordre)

À faire **une fois**, après les retours de tes étudiants et leurs corrections. Compte environ 1 h 30 au calme.
Chaque étape dit comment vérifier que ça a marché. **Si une étape échoue, arrête-toi et envoie-moi le message d'erreur.**

Ce que contient ce lot (rien n'est encore en ligne) :
accès offerts/payants · tuteur IA · comptes enfants · écoles · pages Tarifs/Conditions/Confidentialité ·
espace professeur (classes, codes, suivi) · certificats vérifiables · série de jours et badges · statistiques admin · nouveaux cours (en brouillon).

> Bonne nouvelle : tout est **éteint ou invisible par défaut**. Les élèves ne voient aucun blocage, le tuteur IA
> reste en faux indices tant que tu ne l'actives pas, et rien n'est payant tant que tu n'allumes pas l'interrupteur.

---

## Étape 0 — Avant de commencer (5 min)
1. Ouvre Git Bash dans `C:\Projet\RythmeBinaire\RythmeBinaire`.
2. `git status` → tu dois voir mes fichiers modifiés/nouveaux (src/…, supabase/…). C'est normal.
3. `npm run build` → doit finir par « built in … ». Si une erreur rouge apparaît : stop, envoie-la-moi.

## Étape 1 — La base de données : 10 scripts, dans CET ordre (15 min)
Supabase → ton projet → **SQL Editor** → **New query**. Pour chaque fichier : colle tout le contenu → **Run**.
Chaque script se termine par « Success ». Tu peux relancer un script sans danger.

| Ordre | Fichier | Ce que ça ajoute |
| --- | --- | --- |
| 1 | `supabase/acces.sql` | accès offerts/payants + interrupteur (éteint) |
| 2 | `supabase/tutor-hint.sql` | prépare le tuteur IA (sécurise les indices) |
| 3 | `supabase/enfants.sql` | comptes enfants supervisés |
| 4 | `supabase/ecoles.sql` | écoles, élèves rattachés, paiements |
| 5 | `supabase/professeurs.sql` | espace professeur : classes, codes, suivi, messages |
| 6 | `supabase/professeurs-code.sql` | le professeur peut relire le code de ses élèves (après `professeurs.sql`) |
| 7 | `supabase/certificats.sql` | certificats vérifiables (voir `CERTIFICATS-ACTIVATION.md`) |
| 8 | `supabase/parents.sql` | rapports de progression pour les parents (après `enfants.sql`) |
| 9 | `supabase/tutorat.sql` | cours en tête-à-tête : créneaux, réservations, questions écrites (après `professeurs.sql`) |
| 10 | `supabase/notifications.sql` | notifications dans le site (à lancer EN DERNIER ; e-mails en option : `NOTIFICATIONS-ACTIVATION.md`) |

Vérifier : Table Editor → tu vois `app_settings`, `access_grants`, `guardian_links`, `schools`, `school_members`, `school_payments`, `teachers`, `classes`, `class_members`, `class_courses`, `teacher_messages`, `certificates`, `tutoring_slots`, `tutoring_questions`, `notifications`.

## Étape 2 — Mettre le site en ligne (10 min)
```bash
git add -A
git commit -m "Acces payant, tuteur IA, comptes enfants, ecoles, tarifs, badges, statistiques"
git push
```
Vercel déploie tout seul (1 à 2 minutes). Vérifier : va sur ton site → connecte-toi en élève → ouvre un cours et une leçon :
tout doit marcher **comme avant**. Le menu a un nouveau lien « Tarifs ».

## Étape 3 — Vérifier l'admin (10 min)
Connecte-toi avec ton compte admin :
- **Élèves** : tu vois « Gestion des accès » (interrupteur éteint). Ne l'allume pas encore.
- **Écoles** : la page s'ouvre (plus de message « exécute ecoles.sql »).
- **Professeurs** : la page s'ouvre. Ajoute-toi toi-même pour tester (voir `PROFESSEURS-ACTIVATION.md`).
- **Statistiques** : des chiffres s'affichent.
- **Cours** : importe `cours-python-donnees.json` et `cours-javascript.json` (dossier `C:\Projet\contenus-cours`). Ils arrivent en **brouillon** ; relis-les, puis publie ceux que tu valides.
  Pense à mettre l'ancien cours JavaScript vide (`course-js-04`) en brouillon.

## Étape 4 — Comptes enfants : la fonction serveur (15 min)
Suis `supabase/ENFANTS-ACTIVATION.md` (étapes 2 à 4) : deux commandes de déploiement, puis un test avec un enfant factice.

## Étape 5 — Tuteur IA (30 min, seulement quand tu as de l'argent sur l'API)
Suis `supabase/TUTEUR-IA-ACTIVATION.md` en entier (crédit Anthropic, plafond de dépense, déploiement, variable Vercel).
Tu peux sauter cette étape : le site continue de fonctionner avec les faux indices.

## Étape 6 — Allumer l'accès payant (plus tard, quand tu es prêt à encaisser)
Avant d'allumer :
1. Les pages **Conditions** et **Confidentialité** relues (idéalement par une personne compétente en droit guinéen).
2. **Un hébergement qui autorise l'usage commercial.** Vercel Hobby l'interdit et Vercel Pro est payant. Tant que ce n'est pas réglé, laisse l'interrupteur éteint : le site reste gratuit pour tous. Une alternative gratuite à étudier avec moi le moment venu : un autre hébergeur dont l'offre gratuite autorise le commercial (à vérifier dans ses conditions avant de migrer).
3. Ton **message de blocage** écrit (Élèves → Gestion des accès) avec le numéro Orange Money et ton WhatsApp.
4. Tes étudiants actuels reçoivent un **accès offert** (bouton « Donner l'accès ») pour ne pas être bloqués.
5. Annonce la date à l'avance sur tes groupes WhatsApp.
Puis allume l'interrupteur. Tu peux **l'éteindre à tout moment** : tout se rouvre aussitôt.

---

## Si quelque chose se passe mal
- **Le site affiche une erreur après le push** : Vercel → Deployments → choisis le déploiement précédent → **Promote to Production**. Le site revient comme avant en 1 minute. Les scripts SQL n'ont rien supprimé ; ils sont sans danger pour l'ancienne version.
- **Un élève est bloqué par erreur** : éteins l'interrupteur d'accès payant (Élèves → Gestion des accès).
- **Une étape SQL échoue** : copie le message d'erreur exact et envoie-le-moi, ne relance pas au hasard.


## Lecture hors connexion (aucun SQL)
Rien à exécuter : c'est dans le code du site. Voir `HORS-CONNEXION-ACTIVATION.md` (test à faire après déploiement + interrupteur de secours `?nosw=1`).


## Avant de faire payer : protection côté base (script 11, à part)
`acces-serveur.sql` fait respecter le paywall par la base elle-même. À exécuter juste avant d'allumer l'interrupteur « accès payant », pas avant. Voir `ACCES-SERVEUR-ACTIVATION.md` (retour arrière : `acces-serveur-retour.sql`).


## Règle des 12 ans renforcée (script 12, à part)
`age12.sql` : déclaration exigée par la base + signalements par les professeurs + onglet admin « Âge ». Ordre important : script, puis déployer le site, puis cocher l'exigence dans l'admin. Voir `AGE12-ACTIVATION.md`.


## Enfants : séances et classes (script 13, à part)
`enfants-v2.sql` : réservation d'une séance par un parent pour son enfant, et inscription d'un enfant à une classe avec l'accord du parent. À exécuter après `enfants.sql`, `professeurs.sql`, `tutorat.sql`. Ne pas ré-exécuter ces scripts après lui. Voir `ENFANTS-V2-ACTIVATION.md`.


## Application installable (aucun SQL)
Fichiers du site seulement (manifest + icônes). Voir `APPLI-INSTALLABLE.md`.


## Entraide : questions / réponses (script 14, à part, facultatif)
`entraide.sql` : espace d'entraide pour les 12 ans et plus (fermé aux comptes enfants), avec onglet admin « Entraide » pour modérer. À exécuter seul, puis déployer le site. Sans le script, le site cache simplement l'entraide. Voir `ENTRAIDE-ACTIVATION.md`.


## Prix par pays (aucun SQL)
La page Tarifs propose un sélecteur de pays. Les montants sont dans `src/data/pricing.ts` (`COUNTRY_PRICES`) : ce sont des propositions à valider avant d'ouvrir le paiement dans un pays.


## Statistiques d'audience (script 15, à part, facultatif)
Compte les visiteurs (anonymes), les pages vues et quelques actions ; l'onglet « Statistiques » de l'admin affiche une section « Audience du site ». Détails : `ANALYTICS-ACTIVATION.md`. Tant que le script n'est pas lancé, le site fonctionne normalement et la section affiche un message d'activation.

## Groupe WhatsApp des classes (script 16, à part, facultatif)
Le professeur peut ajouter le lien d'un groupe WhatsApp à sa classe ; les élèves de 12 ans et plus voient un bouton pour le rejoindre. Détails : `CLASSES-WHATSAPP-ACTIVATION.md`.

## Récapitulatif de l'ordre complet
1 à 10 : étape 1 ci-dessus (dans l'ordre) → 13 `enfants-v2.sql` (après 3, 5 et 9) → 12 `age12.sql` → déployer le site → 14 `entraide.sql` (quand tu veux) → 15 `analytics.sql` (quand tu veux) → 16 `classes-whatsapp.sql` (quand tu veux, après 5) → `acces-serveur.sql` juste avant d'allumer l'accès payant.
Chaque script est sans danger à relancer, sauf : ne pas relancer `tutorat.sql` ni `professeurs.sql` après `enfants-v2.sql`.
