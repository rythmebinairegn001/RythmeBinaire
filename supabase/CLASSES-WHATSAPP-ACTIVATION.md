# Groupe WhatsApp d'une classe

## Ce que ça fait
Le professeur colle le lien d'invitation d'un groupe WhatsApp dans sa classe (Espace professeur → ouvrir la classe → « Groupe WhatsApp de la classe »). Ses élèves voient alors un bouton **« Rejoindre le groupe WhatsApp »** dans « Ma classe ».

## Pour le professeur
1. Dans WhatsApp, créer un groupe.
2. « Infos du groupe » → « Inviter via un lien » → copier le lien (`https://chat.whatsapp.com/…`).
3. Le coller dans la classe → **Enregistrer**. Pour le retirer : vider le champ → **Retirer**.
Prévenir les élèves : dans un groupe WhatsApp, les participants voient le numéro des autres.

## Sécurité
- Seul un lien `https://chat.whatsapp.com/<code>` est accepté (la base refuse tout le reste, y compris les numéros de téléphone).
- Seul le professeur de la classe peut le modifier.
- Seuls les **membres** de la classe reçoivent le lien (fonction `my_class_links()`).
- Les **comptes enfants** (moins de 12 ans) ne reçoivent jamais le lien, et l'adulte responsable ne le voit pas non plus dans l'espace famille.
- Aucun numéro de téléphone n'est enregistré par la plateforme.

## Activation (une seule fois)
1. Supabase → SQL Editor → coller `supabase/classes-whatsapp.sql` → Run (script 16, après `professeurs.sql`).
2. `git push`.
Tant que le script n'est pas lancé, le site marche normalement : le professeur voit un message « lance supabase/classes-whatsapp.sql » s'il essaie d'enregistrer, et les élèves ne voient rien.
