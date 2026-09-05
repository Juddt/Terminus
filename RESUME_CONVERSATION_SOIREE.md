# Résumé conversation Soirée — Pour Claude Code

## Le projet

**Soirée** est une app mobile de jeux de soirée/alcool. Un seul téléphone posé au centre de la table agit comme maître du jeu. L'objectif est de devenir le leader premium en France face à des concurrents cheap (Picolo, TOZ, Chopine).

## Architecture actuelle

**Mono-fichier → Arborescence** : le projet est passé d'un `app-soiree-prototype-v2.html` (~3400 lignes) à une structure modulaire.

```
terminus.html (532 lignes, structure HTML)
├── css/
│   ├── base.css (variable et resets)
│   ├── app.css (screens, layout)
│   ├── games-shared.css (styles jeux)
│   └── games/ (CSS par jeu)
│       ├── palmier.css, bus.css, cible.css, pmu.css, pof.css, dice.css
├── js/
│   ├── core/
│   │   ├── state.js, navigation.js, setup-wizard.js, session-engine.js
│   │   ├── persistence.js (snapshot & reprise), history.js (Hall of Fame)
│   │   ├── custom-content.js (mode perso), feedback.js (son/vibration)
│   │   ├── sober-mode.js (mode sans alcool), display-mode.js (mode TV)
│   │   ├── share.js (lien + QR), recap-card.js (carte-souvenir)
│   ├── data/
│   │   ├── content.js (règles, défis, votes, moments, etc.)
│   │   ├── games-catalog.js (métadonnées jeux)
│   ├── games/ (moteur par jeu)
│   │   ├── shared-cards.js, palmier.js, bus.js, cible.js, purple.js, pmu.js, pof.js, des.js
│   ├── lib/
│   │   └── qrcode.js (vendorisé, MIT)
├── manifest.json (PWA)
├── sw.js (service worker, network-first)
├── icons/ (192×512 PNG)
```

## Architecture

### Deux modes

1. **Mode Rapide** — L'app pilote toute la soirée automatiquement
   - Setup : nombre de joueurs → prénoms → durée (10/20/30/45/60 min) → intensité (Soft/Fun/Chaos)
   - Enchaîne automatiquement : règles, défis, mini-jeux, votes, moments, événements spéciaux
   - Timer global avec barre de progression
   - Système anti-répétition par shuffle-bag
   - Climax surprise (cul sec collectif) déclenché par timer caché
   - Timer par item indicatif (ring ✓ quand fini), le joueur avance manuellement avec "Suivant"
   - Boutons Pause et Suivant toujours visibles
   - Recettes de contenu par durée (ex: 45min = 12 mini-jeux, 18 votes, 12 défis, etc.)

2. **Mode Jeux** — Bibliothèque de 7 jeux interactifs + catalogue filtrable
   - Chaque jeu : bouton "Jouer" (lance direct) + bouton "Règles" (fiche condensée)
   - Bouton "?" en jeu pour voir les règles sans quitter la partie
   - Bouton "Accueil" discret sur tous les écrans
   - Filtre par catégorie (Adresse, Devinette, Bluff, Rapide)
   - Tags difficulté (Facile, Modéré, Intense)

### Les 7 jeux implémentés et testés

#### 1. Le Palmier
- 52 cartes, pioche + applique la règle + pose la carte en équilibre
- **Règles** : As (cul sec/distribue), 2-3 (bois/donne), 4 (Floor), 5 (Sky), 6 (Valise), 7 (Maître Question persistant), 8 (distribue 8), 9 (J'ai jamais), 10 (Maître Freeze persistant), Valet (thème), Dame (tournée), Roi (invente règle, 4ème = cul sec)
- **Jauge d'équilibre** : curseur oscillant, taper quand il est dans la zone verte. Vitesse constante par tour, augmente entre les tours. Zone rétrécit avec la difficulté. Départ gauche/droite aléatoire.
- **Palmier visuel** : mini-cartes crème en éventail au-dessus d'une bouteille, avec jitter organique seeded. Toutes les cartes jouées restent visibles.
- **Fin** : 5 chutes = perdu, ou toutes les cartes piochées = gagné (verre créateurs)
- Header : badges [X cartes] [X/4 Rois] [X/5 chutes], pills Maître Question/Freeze

#### 2. Le Bus
- Phase 1 : 4 rounds par joueur (Rouge/Noir → Plus haut/Plus bas → Dedans/Dehors → Devine ♥♦♣♠)
- Erreurs croissantes : 1, 2, 3, 4 gorgées
- Phase 2 : le pire joueur monte dans le bus, 5 cartes face cachée, figure = boit et recommence

#### 3. La Cible
- 21 cartes en 4 cercles concentriques (10 + 6 + 4 + 1)
- Extérieur : Rouge/Noir (1 gorgée), Cercle 2 : Pair/Impair (2), Cercle 3 : Symbole (3), Centre : Valeur exacte (5)
- **Compteur cumulatif** : gagné = s'additionne, perdu = boit tout le compteur + la carte
- Cartes spéciales (As, Roi, Dame, Valet, 7, 10) avec effets bonus
- Layout circulaire CSS avec angles staggerés entre cercles

#### 4. Purple
- Prédire les couleurs des prochaines cartes : Rouge (2 rouges), Noir (2 noires), Purple (1+1), Double Purple (2+2), Triple Purple (3+3)
- Compteur cumulatif comme La Cible

#### 5. Le PMU (Course des As)
- Phase paris : chaque joueur choisit un As (♥♦♣♠) et mise 1-5 gorgées
- Course : on retourne des cartes, le symbole avance son As
- 7 obstacles face cachée, se révèlent quand tous les As les dépassent → reculent un cheval
- Premier As à la ligne d'arrivée gagne. Gagnants distribuent double, perdants boivent leur mise.

#### 6. Duel de Dés
- 2 joueurs, chacun lance un dé (vrais dés CSS avec points)
- Le plus bas boit la multiplication des deux
- Animation : faces aléatoires pendant 700ms puis résultat
- Égalité = relance automatique (pas de gorgées)

#### 7. Pile ou Face
- **Mode Fun** : mise 1-3 gorgées, choisis Pile ou Face
- **Mode Prison** : 5 manches obligatoires, 2 → 4 → 8 → 16 → cul sec
- Pièce dorée 3D avec animation rotateY
- Le perdant boit, le gagnant regarde

### Jeu manquant : UnderDicateur
**Status** : À réimplémenter (absent de l'arborescence actuelle)
- Jeu social type Undercover + Dictateur
- **Rôles** : Citoyens (mot), Undercover (mot proche), Mister White (pas de mot), Dictateur (pouvoir caché)
- **Distribution** : téléphone passe de main en main, chacun voit son rôle en secret
- **Tour de table** : chacun dit un seul mot (dans la vraie vie), l'Undercover et Mister White bluffent
- **Dictateur** : après le tour, joue un pouvoir secret (Exécution / Protection / Distribution / Passer)
- **Vote** : le groupe pointe du doigt dans la vraie vie, on sélectionne l'éliminé sur l'app
- **30 paires de mots** à écrire (Pizza/Pasta, Bière/Vin, Tinder/Bumble, etc.)
- **Victoire** : Citoyens si tous UC+MW éliminés | Undercover si majoritaires | Mister White s'il devine le mot

### Compteur créateurs
- Incrémenter à chaque fin de partie réussie (fin de jeu, fin de session Mode Rapide)
- Affichage : "🥂 X verre(s) pour les créateurs du jeu"
- Sauvegardé dans `creatorsGlasses` (global persistent)

## Identité visuelle

### Direction artistique
- **Premium minimaliste** : Apple × Notion × Spotify × Linear × Airbnb
- **PAS** de gaming, néon, dégradé flashy, RGB, cartoon
- Dark warm (pas froid) : bois sombre, cuir, bar à cocktails

### Palette actuelle (CSS variables)
```css
--bg: #17120f
--surface: #2a231e
--accent: #b8814a / #c99a67
--text: #f4ece2
--sage: #8A9A7E (succès)
--clay: #A3503A (erreur)
```

### Cartes à jouer
- **Réalistes** : fond crème `#f6f1e7`, rouge `#a82020`, noir `#1a1a1a`
- Ombre portée `box-shadow: 0 8px 20px rgba(0,0,0,0.4)`
- Pas de cartes stylisées/néon

### Typographie
- Display : Fraunces (serif)
- Body : Inter (sans-serif)
- Contenu de jeu lisible à 1-2 mètres (25-32px)

### Boutons et surfaces
- Boutons : border-radius 16px
- Game cards : border-radius 18px
- Mode cards : border-radius 20px
- Badges : pills 20px, fond translucide sans bordure
- Stat cards : surface `#2a231e`, radius 18px

## Navigation

- `goTo(name)` → active `screen-{name}`
- Chaque jeu : `screen-{id}-setup` → `screen-{id}`
- Overlay de règles : `showRulesOverlay(gameId)` / `closeRulesOverlay()`
- Bouton Accueil discret sur tous les écrans de jeu
- Le back des setups ramène à la liste des jeux

## Nouvelles features (branche `feature/soiree-plus`)

### PWA & Offline
- `manifest.json` : app installable sur home screen, thème dark
- `sw.js` : service worker network-first (mise à jour dès que connecté)
- Icônes 192×512 PNG
- Fonctionnement hors-ligne complet

### Persistance & Reprise
- `persistence.js` : snapshot localStorage (sauvegarde auto pendant une soirée)
- Banner "Soirée en cours · X joueurs · ~Y min restantes" sur l'accueil
- Boutons "Reprendre" / "Ignorer"
- Timeout 3h (abandon auto si vieille session)

### Historique cross-session
- `history.js` : records persistés (nb joueurs, durée, gagnants, total verres)
- Hall of Fame : classement cumulatif par joueur
- Écran Historique (accueil) → récap global + leaderboard
- Effacer l'historique (confirmation)

### Avatars & Identité visuelle
- `setup-wizard.js` : emoji avatar par joueur, cliquable pour cycler (🍹 🎲 🃏 🥂, etc.)
- Avatar badge affiché partout (setup, jeu, recap, historique)
- Couleur propre par joueur (hsl séquentiel)

### Carte-souvenir partageable
- `recap-card.js` : canvas avec logo + joueurs + gagnants + stats
- Télécharger en PNG
- Partager via `navigator.share()` (WhatsApp, etc.)
- Écran dédié après fin de soirée

### Partage de configuration
- `share.js` : générer un lien avec préremplissage (joueurs, durée, intensité)
- QR code (qrcode.js vendorisé)
- Copier le lien ou scannez le QR

### Confort utilisateur
- `feedback.js` : toggles Son/Vibration, persistés en localStorage
- `sober-mode.js` : affichage "Verre" → "Point" (même mécanique, pas d'alcool)
- `display-mode.js` : Mode TV/Grand écran (titre +25% size, lisible à 5m)
- Boutons toggles sur accueil

### Contenu personnalisé (mode solo)
- `custom-content.js` : ajouter ses propres règles/défis (tiered Soft/Fun/Chaos)
- Accueil → "Mes ajouts"
- Sauvegardé localement, inclus dans les sessions futures

### Tracking par joueur (fin de session)
- Stats par joueur : défi(s) réussi(s), verres bus
- Podium MVP (plus challenge) / Plus tranquille (0 challenge)
- Affichage "Par joueur" : défi ✓, verres 🍷

## Contenu Mode Rapide

- ~48 règles (tiered 0/1/2)
- ~40 défis (1 ou 2 joueurs ciblés)
- ~19 mini-jeux
- ~28 votes
- ~18 moments légers
- ~12 événements spéciaux
- ~6 climax events
- Récipes par durée : 10/20/30/45/60 min

## État du projet

### ✅ Fait (main branch)
- Phase 0.1 : merge branche jami + refonte minimaliste accueil
- Phase 0.2 : validation 7/7 jeux + Mode Rapide complet (aucune régression)
- Toutes les features PWA + persistance + historique + avatars + partage

### 🔨 À faire
- **Phase 1.1** : réimplémenter UnderDicateur (absent du catalogue)
  - Moteur: rôles cachés, passage d'appareil, pouvoirs, vote mixed real+digital
  - Contenu: 30 paires de mots FR
  - Intégration au catalogue + test complet
  
- **Phase 2** : revue de code (fuites d'intervalle, race conditions) + design final
- **Phase 3** : test réel en soirée + conformité légale (18+, avertissements alcool)

### Prochaines phases (post-MVP)
1. **React Native / Expo** migration (animations Reanimated/Skia, native feel)
2. **Monétisation** freemium via RevenueCat
3. **Lancement** via BDE/réseaux étudiants français

## Fichiers de référence actuels

- `terminus.html` — structure principale
- `js/core/` — moteurs (session, wizard, persistence, historique, etc.)
- `js/games/` — jeux individuels
- `js/data/content.js` — toutes les règles/défis/votes/moments
- `js/data/games-catalog.js` — métadonnées jeux + filtres
- `sw.js` — service worker (précache, network-first)
- `.claude/launch.json` — config lancement local (`/run`)
