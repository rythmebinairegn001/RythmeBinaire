# Activation : chat de classe

1. `git push` du code.
2. Supabase > SQL Editor : lancer `supabase/chat-classes.sql` (script 20, après `professeurs.sql`).
3. Élèves : un encadré « Chat de classe » apparaît sur leur tableau de bord dès qu'ils ont rejoint une classe. Professeurs : même encadré en haut de l'espace professeur.

## Règles de sécurité
- Un salon par classe : seuls le professeur et les élèves de la classe y accèdent. Les comptes enfants supervisés ne rejoignent pas de classe, donc pas de chat.
- Tout passe par des fonctions serveur ; les tables sont fermées aux accès directs.
- Liens, e-mails et numéros de téléphone sont refusés. Maximum 15 messages par minute et par personne.
- On voit « Prénom N. », jamais l'e-mail.
- Tout membre peut signaler un message. Le professeur voit le nombre de signalements, peut supprimer un message et mettre un élève en sourdine (il lit mais n'écrit plus). L'admin peut aussi supprimer.

## Pour la connexion faible
Pas de connexion permanente : le site demande les nouveaux messages toutes les 8 secondes tant que la fenêtre est ouverte et visible, et seulement les messages nouveaux (rechargement complet environ chaque minute).
Limite honnête : pas de modération automatique des insultes ; elle repose sur les signalements et le professeur.
