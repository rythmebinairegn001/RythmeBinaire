# Application installable — aucune configuration

Le site peut s'installer comme une appli : icône sur le bureau ou le menu Démarrer, fenêtre à part sans barre d'adresse, ouverture plus rapide, et lecture hors connexion (voir `HORS-CONNEXION-ACTIVATION.md`). Pas d'App Store ni de Play Store, et rien à payer.

## Pour l'élève
- **Chrome / Edge (ordinateur)** : tableau de bord > « Hors connexion » > bouton **Installer RythmeBinaireGn comme une appli**. Ou l'icône d'installation dans la barre d'adresse.
- **Safari (Mac, iPhone)** : bouton Partager > « Sur l'écran d'accueil ». Le site l'explique dans le même panneau.
- Une fois installée, le panneau affiche « Appli installée ✓ ».

## Fichiers
- `public/manifest.webmanifest` (nom, couleurs, icônes), `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (recadrés depuis ton logo), `index.html` (lien vers le manifest), `vercel.json`, `src/lib/install.ts`.
- Le service worker (`public/sw.js`) est la même pièce que pour le mode hors connexion : si tu le désactives avec `?nosw=1`, l'installation n'est plus proposée.

## À savoir
- Ça ne marche qu'en `https` (le site Vercel l'est).
- L'appli installée se met à jour toute seule au prochain lancement avec internet.
- Pour changer l'icône plus tard : remplace les trois fichiers `icon-*.png` (192 px, 512 px, et une version « maskable » avec le logo à ~75 % au centre sur fond uni).
- Testé : Chromium confirme que l'appli est installable (aucune erreur du manifest). Le bouton lui-même n'apparaît que sur un vrai Chrome/Edge, où je ne l'ai pas essayé.
