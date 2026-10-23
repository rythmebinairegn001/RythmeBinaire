# Relances des élèves inactifs (WhatsApp)

Aucun script SQL : après `git push`, dans Espace professeur > une classe, un encadré « Relancer N élèves inactifs » apparaît dès qu'un élève n'a pas travaillé depuis plus de 7 jours (ou n'a jamais commencé).

- Le message est écrit en FR ou EN selon la langue du professeur ; il peut citer les prénoms (jamais ceux des comptes enfants).
- Boutons : copier le message, ouvrir le groupe WhatsApp de la classe (lien déjà enregistré par le professeur), ou envoyer via WhatsApp en choisissant le contact.
- Aucun numéro de téléphone n'est enregistré. L'envoi automatique demanderait l'API WhatsApp Business (payante, avec numéros et consentement).
