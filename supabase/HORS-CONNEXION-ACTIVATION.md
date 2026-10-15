# Lecture hors connexion — activation

Aucun script SQL. Rien à configurer côté Supabase. Tout se fait dans le code du site.

## Ce que ça fait
- Après une visite avec internet, le site garde sur l'appareil : le catalogue, le texte des leçons déjà chargées, les tests des exercices ouverts, et le profil de base de l'élève (jamais celui d'un admin).
- Sans internet : le site s'ouvre, l'élève relit ses cours, et peut coder en JavaScript. Pour Python, il clique une fois sur « Préparer Python hors connexion » (≈ 10 Mo, une seule fois).
- Les leçons terminées hors connexion sont gardées sur l'appareil et envoyées au retour d'internet (mécanisme déjà existant).
- Le tuteur IA, les messages, les réservations et les notifications demandent internet.

## Fichiers
- `public/sw.js` : service worker (pages, fichiers du site, moteur Python). Ne touche jamais à Supabase.
- `vercel.json` : `sw.js` jamais mis en cache par le navigateur.
- `src/lib/offlineStore.ts`, `src/lib/offline.ts`, `src/components/student/OfflinePanel.tsx`.

## Interrupteur de secours
Si quelque chose se comporte bizarrement après une mise à jour : ouvrir le site avec `?nosw=1` à la fin de l'adresse (ex. `https://ton-site/?nosw=1`). Le service worker et ses caches sont supprimés sur cet appareil. L'élève peut aussi le faire dans « Hors connexion » > « Désactiver ».
Pour le retirer pour tout le monde : publier un `sw.js` qui se désinscrit, ou supprimer l'appel `initOffline()` dans `App.tsx`.

## Déjà testé dans un vrai navigateur (Chromium, base simulée)
Le service worker s'installe et prend le contrôle ; le site se rouvre sans internet avec la bannière ; le catalogue et le texte des leçons sont enregistrés puis relus sans internet ; Chrome juge l'appli installable (aucune erreur). Pas encore testé : Safari/Firefox, le moteur Python hors connexion (il demande l'accès à jsdelivr), et une vraie connexion lente.

## À tester quand même après le déploiement
1. Ouvrir le site avec internet, se connecter, ouvrir un cours et une leçon.
2. Recharger une fois (le service worker prend le contrôle).
3. Chrome > F12 > Réseau > « Hors connexion », recharger : le site doit s'ouvrir, le cours doit rester lisible.
4. Python : cliquer « Préparer Python », couper internet, lancer un exercice Python.
5. Terminer une leçon hors connexion, rétablir internet : elle doit apparaître comme terminée.

## Limites
- Seuls les cours déjà ouverts avec internet sont lisibles hors connexion.
- Un nouveau déploiement n'est visible qu'après un rechargement avec internet.
- Safari efface parfois les données d'un site peu visité au bout de quelques jours.
- Le moteur Python vient de jsdelivr : si ce service est bloqué, Python hors connexion ne sera pas préparé.
