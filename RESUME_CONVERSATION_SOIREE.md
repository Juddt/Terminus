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
│       ├── underdicateur.css, pilliers.css
├── js/
│   ├── core/
│   │   ├── state.js, navigation.js, setup-wizard.js, session-engine.js
│   │   ├── persistence.js (snapshot & reprise), history.js (Hall of Fame)
│   │   ├── custom-content.js (mode perso), audio.js (module Sound synthétisé)
│   │   ├── sober-mode.js (mode sans alcool), display-mode.js (mode TV)
│   │   ├── share.js (lien + QR), recap-card.js (carte-souvenir)
│   ├── data/
│   │   ├── content.js (règles, défis, votes, moments, etc.)
│   │   ├── games-catalog.js (métadonnées jeux)
│   │   ├── underdicateur-words.js (200 paires de mots)
│   ├── games/ (moteur par jeu)
│   │   ├── shared-cards.js, palmier.js, bus.js, cible.js, purple.js, pmu.js, pof.js, des.js
│   │   ├── underdicateur.js, pilliers.js
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

2. **Mode Jeux** — Bibliothèque de 9 jeux interactifs + catalogue filtrable
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

#### 8. UnderDicateur
`js/games/underdicateur.js` · `js/data/underdicateur-words.js` · `css/games/underdicateur.css`
- 4 à 12 joueurs. Jeu social à rôles cachés (Undercover + un Dictateur aux pouvoirs secrets)
- **Rôles** : Citoyens (le mot), Undercover (un mot très proche), Mister White (aucun mot)
- **Dictateur** : tiré au hasard parmi *tous* les joueurs — il peut donc être un Citoyen
  comme un imposteur. Pas de condition de victoire propre : il sert son camp d'origine
- **Composition auto** selon l'effectif, toujours avec majorité citoyenne au départ :
  4j → 3/1/0 · 6j → 4/1/1 · 8j → 5/2/1 · 12j → 8/3/1 (cit/UC/MW)
- **Distribution** : le téléphone passe de main en main, chacun voit son rôle en secret
- **Tour de table** : l'app affiche l'ordre, chacun dit un seul mot à l'oral.
  Le premier à parler n'est jamais Mister White (il n'aurait aucun indice)
- **Phase du Dictateur** : le téléphone refait un tour complet — tous les joueurs voient
  exactement le même écran neutre, seul le Dictateur voit ses pouvoirs. L'effet n'est
  annoncé qu'une fois le passage terminé, pour ne jamais trahir son identité
- **Pouvoirs** (usage unique chacun) : Exécution (élimine, saute le vote) · Protection
  (annule le vote sur une cible) · Distribution (3 gorgées) · Passer · Renoncer
- **Vote** : le groupe pointe du doigt, on touche le nom de l'éliminé, son rôle est révélé
- **Mister White éliminé** : dernière chance de deviner le mot des Citoyens
  (comparaison tolérante : accents, casse et ponctuation ignorés)
- **200 paires de mots** dans un sac persistant (`soiree_und_wordbag_v1`) : les 200 paires
  défilent avant la moindre répétition, et le côté "mot des Citoyens" est tiré à pile ou
  face à chaque partie, ce qui double la variété perçue
- **Victoire** : Citoyens si tous UC+MW éliminés | Undercover si majoritaires | Mister
  White s'il devine le mot

### Compteur créateurs
- Incrémenter à chaque fin de partie réussie (fin de jeu, fin de session Mode Rapide)
- Affichage : "🥂 X verre(s) pour les créateurs du jeu"
- Sauvegardé dans `creatorsGlasses` (global persistent)

## Identité visuelle

### Le point de départ : ce téléphone n'est pas tenu en main

Il est posé à plat au centre d'une table, lu par 4 à 12 personnes à 1 ou 2 mètres, dans
le noir, à l'envers pour la moitié d'entre elles, par des gens qui boivent. C'est de la
**signalétique**, pas une interface de poche — et c'est ce constat qui décide tout le
reste. L'ancienne charte était une belle app tenue en main : le mot « DÉFI », la donnée
la plus importante de l'écran, y était composé en 11 px, et le minuteur qui gouverne
chaque défi tenait dans un anneau de 40 px relégué en bas de page.

### Trois partis pris

**1. Le champ de couleur est le message.** Chaque type de moment prend tout l'écran avec
sa couleur : avant d'avoir lu un mot, la table sait ce qu'elle doit faire. C'est le seul
ornement de l'app — tout le reste a été retiré pour lui laisser la place. Ce ne sont pas
des humeurs, c'est une consigne :

| Champ | Couleur | Ce que la table doit faire |
|---|---|---|
| Défi | `#B23A26` vermillon | une personne agit, maintenant |
| Mini-jeu | `#9A6512` ocre | tout le monde joue |
| Vote | `#1B5745` vert bouteille | le groupe tranche |
| Nouvelle règle | `#28357C` outremer | ça vaut pour toute la soirée |
| Spécial / climax | `#8C1D13` puis papier inversé | tout le monde boit |
| Moment | `#16161D` encre | respiration, rien d'urgent |

**2. Une seule famille de caractères.** Archivo, déclinée en trois registres —
instruction (800, ~31-40 px), libellé (700, capitales, interlettrage 0,26 em), méta (600,
11-12 px). Les systèmes de signalétique fonctionnent comme ça. Fraunces + Inter ont été
retirées : un serif à fort contraste perd ses détails à deux mètres, et Inter est le
choix par défaut de toutes les interfaces.

**3. L'échelle vise 1,50 m.** L'ancien « mode grand écran » optionnel est devenu la
taille par défaut ; le mode grand écran vise désormais une télé ou un vidéoprojecteur.

### Palette

```css
--ink:#0E0E12       /* sol neutre : navigation, listes, réglages */
--ink-2:#16161D     /* surface posée sur le sol */
--ink-3:#20202A     /* surface enfoncée : champs de saisie */
--paper:#F4F2ED     /* texte, et remplissage des boutons */
--accent:#E0A63C    /* laiton : chiffres et mises en avant */
--sage:#83A96D      /* réussite */
--clay:#C4533C      /* échec */
```

Les anciens noms (`--bg`, `--surface`, `--text`…) sont conservés comme alias : ils sont
employés ~290 fois dans les 9 jeux, les repointer propage la charte d'un coup plutôt que
de réécrire chaque fichier.

### Ce qui a été retiré

- Les coins très arrondis (16-20 px) — désormais 3-4 px, ou rien
- Les bordures sur les cartes : des filets et des rangs réglés à la place
- Les neuf gros boutons pleins du catalogue : la ligne entière lance le jeu
- Les pastilles d'avatar sur l'écran de jeu — un emoji ne survit pas à deux mètres, le
  prénom en capitales oui. Les avatars restent là où on les regarde de près : composition
  de l'équipe et résultats de fin.

### Écriture

Les intitulés disent ce que l'app fait, pas comment le mode s'appelle en interne :
« Mode rapide » est devenu « Elle mène la soirée », « Mode jeux » « Vous choisissez ».

### Cartes à jouer

Inchangées, et volontairement : crème `#F4F2ED`, rouge `#B01F1F`, noir `#14141A`, ombre
portée. Une carte doit ressembler à une carte.

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

447 items, tous tiered 0/1/2 (Soft / Fun / Chaos) :

| Type | Total | Soft (t0) | Fun (t1) | Chaos (t2) |
|---|---|---|---|---|
| Règles | 89 | 30 | 39 | 20 |
| Défis | 94 | 28 | 32 | 34 |
| Votes | 100 | 36 | 24 | 40 |
| Mini-jeux | 65 | 20 | 19 | 26 |
| Moments légers | 49 | 14 | 19 | 16 |
| Événements spéciaux | 38 | 10 | 14 | 14 |
| Climax | 12 | — | — | — |

### Le curseur d'intensité choisit une fenêtre, pas un plafond

`filterByTier()` gardait `tier <= limite`. En Chaos, le sac contenait donc **aussi tout
le tier 0** : l'app servait encore « trinquez avant chaque gorgée » entre deux
confessions, et l'intensité ne montait jamais vraiment. Chaque cran exclut maintenant ce
qui est devenu trop tiède (`tierWindow()` dans `session-engine.js`) :

| Curseur | Tiers servis | Registre |
|---|---|---|
| 0-29 % | 0 | Soft seul |
| 30-59 % | 0-1 | Soft + Fun |
| 60-84 % | 1-2 | Fun + Chaos |
| 85-100 % | **2 seul** | Chaos pur |

Repli automatique sur le plafond seul si un stock personnalisé est trop maigre pour tenir
la soirée dans la fenêtre — mieux vaut du hors-registre qu'une répétition toutes les cinq
minutes.

### Dimensionnement

Une session de 60 min tire 80 items. Chaque fenêtre est calibrée pour l'absorber **sans
une seule répétition** — vérifié en rejouant les quatre intensités par le vrai moteur.
Avant la phase 1.4, une session Soft tirait 24 votes dans un stock de 10.

### Registre du tier 2

Aveux, révélations de téléphone, verdicts de groupe, classements à voix haute, questions
sans droit de refus. Volontairement hors périmètre : escalade de consommation au-delà du
cul sec déjà présent, contenu sexuel explicite, et gages irréversibles ou humiliants
au-delà de la soirée.

### Notes techniques

- Les défis ciblent 1 ou 2 joueurs via `{p1}` / `{p2}`, remplis par `fillTemplate()`.
  Les mini-jeux n'ont pas de champ `n` : le moteur déduit le nombre de joueurs à tirer
  des marqueurs présents dans le texte.
- Le mode sans alcool (`soberize()`) traite les locutions verbe + « cul sec » / « gorgée »
  avant leurs sous-mots, sinon les deux moitiés sont remplacées séparément et le rendu
  donne « fait un gage une point de gage ». Les 447 items ont été passés au filtre.
- Recettes par durée : 10/20/30/45/60 min (voir `RECIPES`).

## Revue de code (phase 2.1)

Cinq défauts trouvés et corrigés. Trois ont été reproduits dans le navigateur avant
correctif, puis re-testés après.

### 1. Exécution de script via un lien de partage — critique

`applySharedConfigFromUrl()` reprenait les prénoms de `?c=<base64>` sans aucune
validation, et `renderChips()` les concaténait dans du `innerHTML`. Un lien fabriqué
exécutait donc du JS dans l'origine de l'app — et le lien de partage est justement fait
pour être envoyé à des gens. L'URL étant nettoyée juste après, la victime ne voyait rien.

Deux chemins de persistance existaient : le prénom du MVP part dans l'historique (Hall of
Fame) et les règles perso sont relues depuis `localStorage`, tous deux rendus en
`innerHTML`.

**Correctif** — validation à la source (coercition en chaîne, 24 caractères et 12 joueurs
maximum, entrées vides écartées) *et* `escapeHtml()` sur les 16 points d'insertion de
texte utilisateur. Défense en profondeur : ni l'un ni l'autre seul.

### 2. Le bouton « Accueil » d'un jeu ne coupait rien — élevé

Chaque écran de jeu a deux sorties côte à côte : « Quitter » appelait bien `palmierQuit()`
/ `pilQuit()`, « Accueil » appelait `goTo('home')` brut. La boucle de balance du Palmier
(16 ms, soit 60 fps) continuait donc à tourner et à écrire dans le DOM jusqu'à la
fermeture de l'onglet — sur un téléphone en soirée, c'est de la batterie pour rien.

**Correctif** — `goTo()` exécute le nettoyage déclaré par l'écran qu'on quitte
(`registerScreenCleanup`). Une seule place à tenir à jour au lieu de neuf écrans. L'écran
de session (`main`) n'en déclare volontairement pas : `openPause()` passe par `goTo()` et
l'horloge doit survivre à l'aller-retour.

### 3. Double-tap sur « Reprendre » : horloge à 2× — élevé

`resumeSession()` et `startMainLoop()` posaient un `setInterval` sans couper le précédent.
Deux appels rapprochés faisaient tourner la soirée deux fois trop vite, et l'orphelin
survivait à `clearInterval(state.globalInterval)` puisque seul le dernier handle était
mémorisé — un `tickGlobal` fantôme finissait par déclencher `endSession()` depuis
l'accueil.

**Correctif** — `clearInterval` systématique avant de reposer l'intervalle.

### 4. `localStorage` non protégé — moyen

Trois écritures et trois lectures sans `try/catch` (`audio.js`, `display-mode.js`,
`sober-mode.js`). En navigation privée iOS, `localStorage` *lève* au lieu de renvoyer
`null` : l'exception coupait la suite de la fonction et les bascules son / mode TV / sans
alcool paraissaient mortes. Pour le son, c'était le pire cas : on appuie sur muet, rien ne
se passe et l'ambiance continue.

**Correctif** — gardes sur les six accès. Les sept chemins de stockage ont été rejoués
avec un `localStorage` qui lève systématiquement.

### 5. Le service worker mémorisait les erreurs — moyen

Le handler `fetch` mettait en cache *toute* réponse, sans tester `response.ok`. Un 404 ou
un 502 servi pendant un déploiement devenait la version « hors ligne » de la ressource,
définitivement. Et `caches.match()` renvoie `undefined` sur un miss, ce qui fait lever
`respondWith()` au lieu d'afficher quelque chose.

**Correctif** — `response.ok` avant mise en cache, `event.waitUntil` autour de l'écriture,
et une vraie réponse 503 en repli. `CACHE_NAME` en v8.

## État du projet

### ✅ Fait (main branch)
- Phase 0.1 : merge branche jami + refonte minimaliste accueil
- Phase 0.2 : validation 7/7 jeux + Mode Rapide complet (aucune régression)
- Phase 1.1 : UnderDicateur implémenté (moteur, 200 paires de mots, catalogue, précache)
- Phase 1.4 : contenu Mode Rapide porté à 447 items + fenêtres d'intensité (Chaos = tier 2 pur)
- Phase 2.1 : revue de code — 5 défauts corrigés (XSS lien de partage, fuites de timer, localStorage, SW)
- Phase 2.2 : refonte complète de la charte — signalétique de table, champs de couleur par moment, Archivo
- Toutes les features PWA + persistance + historique + avatars + partage

### 🔨 À faire
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
