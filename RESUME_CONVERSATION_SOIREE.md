# Soirée — état du projet

Application web (PWA) de jeux de soirée, pensée pour **un seul téléphone posé au milieu
de la table** pendant un before. Deux usages, deux entrées, pas plus :

- **Lancer le before** — l'app enchaîne toute seule des activités pendant 10, 30 ou 60 min.
- **Choisir un jeu** — un des neuf mini-jeux, lancé directement.

Public : jeunes adultes. Univers : before électrique, nocturne, adulte.

---

## 1. Lancer et tester

Aucun build, aucune dépendance pour l'app elle-même :

```bash
python3 -m http.server 8000      # puis http://localhost:8000
```

**Neuf suites de tests** (Node pur, aucune dépendance) :

```bash
cd tests
node test-full-boot.js            # charge les 31 scripts dans l'ORDRE RÉEL du HTML et
                                  # joue une soirée entière sur les 3 durées
node test-balance.js              # DOSAGE du contenu : vagues, variété, séries,
                                  # plafond des règles, répartition, rappels
node test-games.js                # conformité des mini-jeux à leurs règles et
                                  # probabilités (120 000 lancers de dés, etc.)
node test-scenes-and-progress.js  # scènes, chemin, commandes, prénoms, joueurs
node test-content-engine.js       # moteur de contenu, trames, anti-répétition
node test-setup-page.js           # page de réglages unique
node test-screens.js              # convention des écrans (voir le piège n° 1)
node test-navigation.js           # toute cible de goTo existe, tout onclick est déclaré
node test-assets-and-cache.js     # cohérence index.html / disque / PRECACHE_URLS
```

**Lancer les neuf avant et après toute modification.** Trois d'entre elles existent
parce qu'un bug réel est passé entre les mailles des autres — voir « Pièges » plus bas.

**Il y a un navigateur dans cet environnement** : `playwright` + Chromium sont
disponibles (`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`).
Des tests verts ne prouvent pas que l'interface fonctionne : **plusieurs bugs majeurs de
cette passe n'étaient visibles qu'à l'écran** (un écran qui en recouvrait un autre, une
partie bloquée en réduction d'animations). Ouvrez l'app, jouez une soirée, cliquez.

---

## 2. Architecture

HTML/CSS/JS **vanilla**, sans framework, sans bundler. Tous les `<script>` sont chargés
séquentiellement dans `index.html`, dans un ordre dont dépendent certaines définitions.
Si vous ajoutez un fichier : `index.html` **et** `PRECACHE_URLS` de `sw.js`
(test-assets-and-cache.js le vérifie).

```
index.html                  Tous les <div class="screen">, chargés d'un coup (pas de router)
css/fonts.css               Polices auto-hébergées (fonts/, 208 Ko)
css/base.css                Variables (palette), reset, famille de boutons
css/app.css                 Accueil, réglages, before, bibliothèque, scènes
css/games-shared.css        Vêtement commun des jeux + carte à jouer + composant secret
css/games/*.css             Un fichier par mini-jeu
js/data/content.js          Contenu du before + STRUCTURES (les trames de soirée)
js/data/games-catalog.js    GAMES : les neuf jeux (nom, règles, bornes, startFn)
js/data/game-art.js         Silhouettes SVG (utilisées dans l'index compact)
js/data/game-posters.js     Affiches de la bibliothèque : l'objet réel de chaque jeu
js/core/state.js            L'objet `state` global + goTo()
js/core/session-engine.js   Le moteur : file, tirage, règles, rappels, commandes
js/core/scenes.js           Les compositions du before + le chemin (module Trail)
js/core/setup-wizard.js     La page de réglages unique (partagée before / jeux)
js/core/navigation.js       La bibliothèque
js/core/persistence.js      Sauvegarde et reprise de session
js/games/shared-cards.js    Paquet de 52 cartes, carte à jouer, composant SECRET
js/games/*.js               Un fichier par mini-jeu
tests/*.js                  Les neuf suites
sw.js                       Service worker — PENSEZ À BUMPER CACHE_NAME
```

---

## 3. Direction artistique

- Fond charbon `--bg:#0D0D0D`, **jaune acide** `--accent:#E8FF3D` en signature, blanc
  chaud `--text:#FFF8ED`.
- **Une seule couleur secondaire**, `--clay:#FF3B5C` (rose vif), réservée aux moments
  spéciaux, aux surprises et aux pertes. Discipline volontaire : ne pas l'étendre.
- Typographie : `Anton` (titres), `Work Sans` (lecture), `IBM Plex Mono` (compteurs).
  **Auto-hébergées** : hors connexion, les requêtes vers fonts.googleapis échouaient et
  toute la direction typographique tombait avec.
- **Une seule famille de boutons** dans toute l'app : rectangle aux angles modérément
  arrondis (15 px), contour fin, relief par liseré clair et ombre portée. Pas de pilules.
- Jamais de couleur en dur : tout passe par les variables de `css/base.css`.
- Aucune animation permanente ni stroboscopique ; `prefers-reduced-motion` respecté
  partout — et **testé**, parce qu'il a déjà bloqué une partie.

---

## 4. Le before

### L'écran

Une barre en haut (Accueil · Ajouter des joueurs · son), la scène au centre, les
commandes en bas — toujours à la même place, jamais recouvertes. **Le temps restant
n'est affiché nulle part** : le chemin est le seul indicateur de progression globale.
Un minuteur de manche n'apparaît que si la consigne impose réellement un délai.

### Le chemin (`Trail`, dans `scenes.js`)

Trois choses **volontairement séparées** :

1. **la progression réelle** — dérivée du temps activement joué, monotone (tout recul
   est refusé), figée pendant les pauses ;
2. **le déplacement du décor** — le repère reste à hauteur fixe, c'est le paysage qui
   défile ;
3. **les effets de catégorie** — de brèves signatures lumineuses (défi, duel, vote,
   règle, surprise, collectif, finale) qui n'écrivent **jamais** sur 1 ni sur 2.

Le tracé est construit une seule fois par session. Aucun changement de catégorie ne peut
le reconstruire, le faire sauter ni le remettre à zéro.

### Les familles de contenu

Six d'origine (règles, défis, mini-jeux, votes, moments, événements) **et huit ajoutées**,
chacune avec sa mécanique, donc sa scène et ses commandes :

| Famille | Mécanique |
|---|---|
| Quiz | une vraie réponse, révélée après le débat |
| Dilemme | deux options de même poids, la minorité s'explique |
| Mission secrète | lue sous le doigt, rappelée quelques manches plus tard |
| Prédiction | posée maintenant, tranchée plus tard |
| Destins liés | deux joueurs attachés, la conséquence devient une règle |
| Barman | création collective autour d'un rôle tournant |
| Tribunal | l'accusé, le jury, acquitté ou coupable |
| Roulette | le prénom défile à l'écran et se pose |

**538 items**, chaque famille couvrant les trois tiers d'intensité.

### Les règles

Au plus **4 en vigueur**, chacune avec une durée de vie, **levée explicitement** par une
manche dédiée (une contrainte qui disparaît en silence laisse le groupe dans le doute).
Deux règles marquées du même `conflict` ne coexistent jamais.

### Le rythme

Dix trames (3 / 4 / 3 selon la durée), toutes avec au moins une **respiration** — un
creux d'intensité franc, sans quoi la soirée grimpe tout droit et s'aplatit. La file est
construite sans série de trois items identiques, et le contenu de secours (file épuisée)
puise dans huit familles en écartant les deux dernières servies.

---

## 5. Les neuf mini-jeux

Tous passent par **la même page de réglages** que le before (bornes lues dans le champ
`joueurs` du catalogue) et démarrent via `launchFromSetup()` → `startFn`. Tous partagent
la même barre, le même plateau et les mêmes boutons. Ce qui les distingue est leur
**mécanique**, pas leur habillage.

| Jeu | Signature |
|---|---|
| Le Duel de Dés | face-à-face, cubes 3D à six faces, verdict par moitié d'écran |
| Pile ou Face | une pièce cylindrique avec sa **tranche** de 36 segments |
| Purple | le paquet contre la cagnotte, cartes retournées **une par une** |
| Le Bus | une montée en quatre paliers, puis un couloir de cinq cases |
| La Cible | un plateau feutré, la visée reste à l'écran, puis l'impact |
| Le PMU | quatre couloirs, les as **glissent** — on voit les dépassements |
| Le Palmier | une bouteille, les cartes rayonnent, et la tour s'écroule vraiment |
| UnderDicateur | le mot sous voile opaque, lu sous le doigt |
| Les Pilliers | le rôle sous voile opaque, la couleur du camp après ouverture |

**Les règles et les probabilités sont inchangées** et vérifiées par `test-games.js`.

### Le composant « secret » (`shared-cards.js`)

Sur un téléphone qui circule, afficher un rôle dès qu'on touche l'écran suffit à ce que
le voisin le lise. Le secret reste donc sous un **voile opaque** (pas un flou, qui se
devine encore) et ne s'ouvre que **tant qu'un doigt reste appuyé**. Le bouton « suivant »
est désactivé tant qu'il n'a pas été consulté. Sert aussi aux missions secrètes du before.

---

## 6. La bibliothèque

Chaque jeu est présenté par **son objet réel** (`game-posters.js`), celui-là même qu'on
manipulera en jouant, posé dans une scène avec sol, lumière rasante et ombre de contact.
Pas d'icônes dessinées à part : la bibliothèque tient ainsi une promesse exacte, les
objets sont nets à toutes les densités, et une retouche du jeu se répercute sur l'affiche.

---

## 7. Pièges — chacun a coûté un bug réel

1. **`#id{display:…}` bat `.screen{display:none}`.** Écrire `#screen-xxx{display:flex}`
   laisse l'écran affiché EN PERMANENCE par-dessus tous les autres. Symptôme trompeur :
   le DOM de l'écran attendu est correct, son `innerText` aussi, mais on ne voit qu'un
   écran vide. Toujours scoper à `.active`. → `test-screens.js`.
2. **`cache.addAll` est atomique.** Une seule URL absente de `PRECACHE_URLS` fait échouer
   l'installation du service worker, et tout le mode hors connexion avec, sans message.
   → `test-assets-and-cache.js`.
3. **L'ordre scène → commandes.** Une scène qui débloque son bouton principal doit le
   faire APRÈS `renderMainFooter` (voir `afterSceneRendered`). Sinon le bouton naît
   désactivé — ce qui a bloqué toute partie en réduction d'animations.
4. **Mélanger puis rapiécer ne marche pas.** L'ancien casseur de séries permutait avec un
   item situé juste avant, qu'il venait d'y déplacer, et remettait la série en place.
   La file est désormais construite sans série. → `test-balance.js`.
5. **`window.fireConfetti = …` ne crée pas de global `fireConfetti`.** Garder le préfixe
   `window.`.
6. **`localStorage` lève en navigation privée iOS.** Toujours `try{}catch(e){}`.
7. **Échapper tout ce qui vient d'un prénom** (`escapeHtml`) : les prénoms peuvent venir
   d'un lien de partage fabriqué par un tiers.
8. **Les minuteurs survivent à la sortie d'un écran.** Chaque jeu a un jeton
   d'invalidation et un `registerScreenCleanup` : sans cela, une relance programmée
   continue d'écrire dans un écran déjà quitté.

---

## 8. Ce qui reste ouvert

- **Vérification sur un vrai téléphone.** Tout a été vu dans Chromium à plusieurs tailles
  (390×844, 360×640, 430×932) et en réduction d'animations, mais jamais sur un appareil
  réel : encoche, barre de gestes iOS, retour haptique, son, et surtout le
  **maintien du doigt** du composant secret, qui n'a été testé qu'à la souris.
- **Le contenu n'a pas été joué par un vrai groupe.** Le dosage est vérifié
  statistiquement, pas à l'usage.
- **Cocktails à débloquer** : idée jamais implémentée. Le client suggérait de débloquer
  selon la *participation* plutôt que la *réussite*, pour ne pas gamifier la
  consommation d'alcool.
- **Multijoueur en ligne des Pilliers** (`pilliers-online/`) : non retouché dans cette
  passe, et non vérifié.
- `js/core/display-mode.js` (mode grand écran) et `js/core/history.js` (retiré) :
  fonctionnalités héritées, peu ou pas exercées.

---

## 9. Ton des textes

Phrases courtes, complices, jamais de jargon forcé : « À toi. », « Qui assume ? »,
« Vous avez 5 secondes. » Aucune gorgée n'est une obligation — le message sanitaire le
dit, tout est passable, et tout reste jouable sans alcool.
