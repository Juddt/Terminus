# Terminus

Application mobile (PWA, sans build, sans backend hors Pilliers en ligne) de jeux de soirée
et d'alcool. Un téléphone posé au centre de la table pilote la partie, ou chacun joue depuis
le sien selon le jeu. Objectif produit : devenir une alternative premium aux apps du genre
(Picolo, TOZ, Chopine) — visuel et contenu soignés plutôt que jetables.

Fonctionne 100% hors-ligne après premier chargement (Service Worker), installable sur écran
d'accueil, aucune donnée envoyée à un serveur (à l'exception du multijoueur en ligne des
Pilliers, seul mode qui utilise un service tiers — voir plus bas).

## Lancer le projet en local

Pas de build, pas de dépendances à installer : c'est du HTML/CSS/JS servi tel quel.

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`. Un `.claude/launch.json` est fourni pour lancer le
serveur directement depuis Claude Code (`/run`).

## Les deux modes

### Mode Rapide
L'app pilote toute la soirée automatiquement : nombre de joueurs → prénoms → durée
(10/20/30/45/60 min) → intensité (Soft/Fun/Chaos). Elle enchaîne règles, défis, mini-jeux,
votes, moments et événements spéciaux tirés d'un pool de **447 items**, avec anti-répétition
par shuffle-bag et un climax surprise (cul sec collectif) déclenché par un timer caché.

Le curseur d'intensité choisit une **fenêtre** de contenu, pas un plafond : en Chaos, seul le
registre le plus corsé est servi (pas de contenu "soft" qui vient casser l'ambiance).

### Mode Jeux
Bibliothèque de **9 jeux** avec catalogue filtrable (catégorie, difficulté) :

| Jeu | Joueurs | Résumé |
|---|---|---|
| Le Palmier | 2-10 | Pioche une carte, applique sa règle, pose-la en équilibre sur le palmier. 5 chutes = perdu. |
| Le Bus | 2-10 | Devine les caractéristiques de tes cartes cachées ; le pire joueur monte dans le bus. |
| La Cible | 2-10 | Cartes cachées en cercles concentriques, plus tu vises le centre plus tu risques gros. |
| Purple | 2-10 | Prédis la couleur des prochaines cartes retournées. |
| Le PMU | 2-8 | Course de chevaux (As) à paris, obstacles cachés. |
| Le Duel de Dés | 2 | Chacun lance un dé, le plus bas boit la multiplication des deux. |
| Pile ou Face | 2+ | Mode Fun (mise libre) ou Mode Prison (2→4→8→16→cul sec). |
| UnderDicateur | 4-12 | Undercover à rôles cachés + un Dictateur tiré au hasard avec des pouvoirs secrets à usage unique. |
| Les Pilliers de bar | 3-20 | Loup-Garou version bar : rôles cachés, votes, alcootest, chimiste, barman ripou... Disponible en local (téléphone qui tourne) **et en ligne** (voir ci-dessous). |

Chaque jeu a un bouton Règles condensées, un bouton "?" pendant la partie, et un retour
Accueil qui coupe proprement toute boucle en cours (timers, animations).

## Les Pilliers de bar — en ligne

`pilliers-online/` est une variante autonome (pas de dépendance au reste de l'app) qui
permet de jouer aux Pilliers avec chacun son téléphone, via **Firebase Realtime Database**
(projet `terminus-pilliers`, configuré dans `pilliers-online/firebase-config.js`).

- Un joueur **crée une partie** (code à 4 caractères), les autres la **rejoignent** avec ce
  code. Chacun voit sa carte de rôle en privé sur son propre téléphone.
- Choix à la création : **Appareil au milieu** (un téléphone posé sur la table fait office
  de narrateur automatique, comportement historique, aucune pénalité) ou **Narrateur
  humain** (une vraie personne anime la partie sans y jouer ; elle accumule des gorgées de
  pénalité à des moments clés du déroulé — nuit qui commence, réveil, sentence injuste,
  victoire d'un camp).
- Rôles disponibles : Villageois, Pillier / Coma / Infect Buveur / Tequila Paf (camp
  Pilliers), Éthylotest, Chimiste, Foie d'Acier, Barman Ripou, Videur (camp village),
  Parasite, Wingman Toxique, Mauvais Buveur, Alcoolique Anonyme (rôles solo).
- Contrainte volontaire : ce module ne partage pas d'état avec le reste de l'app (pas de
  session Mode Rapide, pas d'historique commun) — c'est un espace de jeu séparé.

## Architecture

```
index.html                    structure principale de l'app
css/
  base.css                    variables (palette, typo), resets
  app.css                     écrans, layout
  games-shared.css            styles communs aux jeux
  games/*.css                 un fichier par jeu
js/
  core/                       moteurs transverses
    state.js, navigation.js, setup-wizard.js, session-engine.js
    persistence.js (reprise de soirée), history.js (Hall of Fame)
    custom-content.js, audio.js, sober-mode.js, display-mode.js
    share.js (lien + QR), recap-card.js (carte-souvenir canvas)
    confetti.js (canvas de particules pour les moments clés)
  data/
    content.js                règles/défis/votes/moments (447 items)
    games-catalog.js          métadonnées + filtres du catalogue
    underdicateur-words.js    200 paires de mots
  games/                      moteur de chaque jeu (un fichier par jeu)
  lib/qrcode.js               vendorisé (MIT)
manifest.json, sw.js, icons/  PWA (installable, offline, network-first)
pilliers-online/               variante multijoueur en ligne des Pilliers (Firebase RTDB)
```

## Fonctionnalités transverses

- **PWA complète** : installable, fonctionne hors-ligne, service worker network-first avec
  repli sur cache (`response.ok` vérifié avant mise en cache, jamais d'erreur mise en cache).
- **Reprise de soirée** : snapshot localStorage, bandeau "Reprendre" à l'accueil, abandon
  automatique après 3h.
- **Historique cross-session** : Hall of Fame cumulatif par joueur (parties, gagnants,
  verres bus).
- **Avatars** : emoji cliquable par joueur, couleur propre, affiché partout.
- **Carte-souvenir** : récap en canvas, téléchargeable en PNG ou partageable
  (`navigator.share`).
- **Partage de configuration** : lien préreempli (joueurs, durée, intensité) + QR code.
- **Confort** : toggles Son/Vibration, Mode sans alcool (verre → point, même mécanique),
  Mode TV (texte agrandi, lisible à distance).
- **Contenu personnalisé** : ajout de règles/défis perso, sauvegardés en local.
- **Conformité légale (France)** : barrière d'âge 18+ au premier lancement, message
  sanitaire réglementaire (article L3323-4 CSP) affiché à trois reprises, mentions légales
  et confidentialité. Aucune donnée ne quitte l'appareil (hors lien de partage et Pilliers
  en ligne) — pas de compte, pas de tracking, pas de bandeau cookies car sans objet.
  **À compléter avant mise en ligne publique** : identité de l'éditeur, directeur de
  publication, e-mail de contact, date de mise à jour (marqueurs `[À COMPLÉTER]` dans
  `js/core/legal.js`) ; une relecture juridique (loi Évin) reste recommandée avant tout
  lancement commercial.

## Identité visuelle — « Le Confetti »

Palette claire "carnet de tickets" (fond crème `#F3EAD6`, accent corail `#E1502F`), chaque
type de contenu (défi/vote/règle/mini-jeu/moment) a sa propre couleur de ticket avec
perforations. Typographie Unbounded (titres) / Work Sans (texte) / IBM Plex Mono
(numéros de ticket). Confetti canvas déclenché sur défi réussi, climax et fin de soirée
(désactivé si `prefers-reduced-motion`). Mode Chaos (intensité ≥ 85%) visuellement plus
agressif : liseré alarme, ticket Défi en rouge, pulsation.

Les fiches de rôle des Pilliers (local et en ligne) gardent volontairement un fond sombre
("night mode") avec texte crème — seule exception cohérente au thème clair général.

## État du projet

### Fait
- 9 jeux implémentés et testés, Mode Rapide complet (447 items, fenêtres d'intensité).
- PWA (installable, offline), persistance/reprise, historique, avatars, partage + QR,
  carte-souvenir, mode sans alcool, mode TV, contenu personnalisé.
- Revue de sécurité : XSS du lien de partage corrigé (validation + `escapeHtml` sur 16
  points d'insertion), fuites de timers corrigées, accès `localStorage` protégés,
  service worker ne met plus en cache les réponses en erreur.
- Conformité légale de base (barrière d'âge, message sanitaire, mentions légales).
- Refonte visuelle complète "Le Confetti" (palette, typographie, confetti, Mode Chaos).
- Les Pilliers de bar en ligne : création/rejoindre par code, choix narrateur
  humain/appareil, pénalités du narrateur humain, retheme aux couleurs de l'app, correctif
  d'un bug de blocage Firebase (un `null` envoyé revient `undefined` côté client, rejeté
  par le SDK en écriture — normalisé avant chaque mise à jour).
- Contraste des fiches de rôle des Pilliers (local + en ligne) corrigé.

### À faire
- Appliquer la direction artistique récente aux écrans plus anciens (historique, récap,
  partage, mes ajouts) — le récap garde volontairement sa propre palette sombre "poster".
- Compléter les mentions légales avant mise en ligne publique (voir ci-dessus).
- Décision migration React Native / Expo vs. PWA.

### Pistes post-MVP
- Migration React Native / Expo (animations natives).
- Monétisation freemium (RevenueCat).
- Lancement via réseaux étudiants / BDE.
