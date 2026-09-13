# Transition — Soirée

Salut. Ce projet a été développé jusqu'ici dans une session de chat (pas d'accès navigateur), à coups d'itérations basées sur des captures d'écran envoyées par le client et des briefs écrits très détaillés. **Aucune de ces modifications n'a jamais été vue tourner dans un vrai navigateur.** Tout ce qui suit a été vérifié par des tests automatisés (Node, DOM simulé) et par les retours du client sur ses propres captures — pas par un rendu visuel que l'assistant précédent aurait pu juger lui-même. Ta première tâche, avant tout nouveau développement, devrait être d'ouvrir l'app dans un vrai navigateur et de regarder ce qui a été construit.

## Le projet en une phrase

**Soirée** est une PWA (HTML/CSS/JS vanilla, sans build, sans framework) pour lancer un "before" entre amis avant de sortir : un mode automatique qui enchaîne défis/votes/mini-jeux/règles pendant 10, 30 ou 60 minutes, plus une bibliothèque de 9 mini-jeux à boire jouables indépendamment.

Cible : jeunes adultes, avant de sortir, ambiance nocturne. Le client a une direction artistique très précise (voir plus bas) et a redemandé plusieurs fois de rediriger le projet — l'historique ci-dessous explique pourquoi certaines choses ont changé de nom/forme plusieurs fois.

## Comment lancer et tester

Pas de build, pas de `npm install` pour l'app elle-même :

```bash
cd soiree
python3 -m http.server 8000
# ouvrir http://localhost:8000
```

**Quatre suites de tests dans `tests/`** (Node pur, aucune dépendance, ~2s à exécuter) :

```bash
cd tests
node test-content-engine.js      # moteur de contenu : dosage, trames, anti-répétition
node test-scenes-and-progress.js # scènes, progression, joueurs en session, footer
node test-setup-page.js          # page de réglages unique
node test-full-boot.js           # charge les 29 scripts dans l'ORDRE RÉEL du HTML et
                                  # joue une partie complète sur les 3 durées
```

**`test-full-boot.js` est le plus important des quatre.** Il simule un DOM minimal, charge tous les `<script>` d'`index.html` dans l'ordre exact, puis lance vraiment une session (`launchSession()`, 40 tics, 25 manches, pause/reprise, fin) sur 10/30/60 min. C'est le seul test qui aurait attrapé les bugs "fonction supprimée par erreur" décrits plus bas — les vérifications de syntaxe seules (`node --check`) ne les voient pas, puisque la fonction manquante n'est détectée qu'à l'exécution.

**Lance ces 4 tests avant et après chaque modification.** Ce n'est pas une formalité : à plusieurs reprises dans cette session, des remplacements de blocs de code (`str_replace` avec de mauvaises bornes) ont supprimé par erreur des fonctions entières du moteur (`pick`, `pickPlayers`, `startRing`, `tickGlobal`, `markChallengeResult`, la gestion des joueurs en session...). Ces suppressions étaient syntaxiquement valides — `node --check` ne les voyait pas — et n'ont été détectées qu'en relançant `test-full-boot.js` ou en observant un crash runtime signalé par le client. **Après toute édition de fichier .js, relance au moins `test-full-boot.js` avant de considérer le travail terminé.**

## Structure du projet

```
index.html                 Toutes les balises <screen>, chargées d'un coup (pas de router)
css/base.css                Variables CSS (palette, reset)
css/app.css                 Tout le reste du style de l'app principale
css/games-shared.css        Styles partagés entre mini-jeux (badges, cartes à jouer...)
css/games/*.css             Un fichier par mini-jeu pour son UI spécifique
js/data/content.js          RULES, CHALLENGES, MINIGAMES, VOTES, LIGHT_EVENTS,
                            SPECIAL_EVENTS, CLIMAX_EVENTS, DURATIONS, STRUCTURES
js/data/games-catalog.js    GAMES : catalogue des 9 mini-jeux (nom, règles, icône, tagline)
js/data/game-art.js         GAME_ART : silhouettes SVG dessinées pour chaque mini-jeu
js/core/state.js            L'objet `state` global (pas de framework, un seul objet partagé)
js/core/session-engine.js   Le cœur : moteur de contenu, minuteur, footer, joueurs en session
js/core/scenes.js           Rendu des scènes du before (duel/vote/règle/surprise/défi...)
                            + le chemin de progression (trail)
js/core/setup-wizard.js     La page de réglages unique (mode/durée/joueurs/prénoms)
js/core/navigation.js       Bibliothèque de jeux (scène de sélection horizontale)
js/core/persistence.js      Sauvegarde/reprise de session (localStorage)
js/core/legal.js            Mentions légales, RGPD, effacement des données
js/core/share.js            Lien de partage de configuration
js/games/*.js               Un fichier par mini-jeu (logique + rendu, autonomes)
tests/*.js                  Les 4 suites décrites ci-dessus
sw.js                       Service worker (cache offline) — PENSE À BUMPER CACHE_NAME
                            (`soiree-cache-v24` actuellement) à chaque modification de
                            fichier, sinon les utilisateurs gardent l'ancienne version en cache
```

Pas de bundler : tous les `<script src="js/...">` sont chargés séquentiellement dans `index.html`, dans un ordre dont dépendent certaines définitions (ex. `content.js` doit précéder `session-engine.js`). Si tu ajoutes un fichier, ajoute-le au bon endroit dans `index.html` **et** dans `PRECACHE_URLS` de `sw.js` **et** dans la liste de fichiers de `test-full-boot.js`.

## Direction artistique : VOLT

Le client a été très précis là-dessus, après avoir refusé deux directions précédentes (une palette "carnet/ticket" crème-corail, puis un thème sombre néon violet-rose). La direction actuelle et validée :

- Fond noir charbon (`--bg: #0D0D0D`), jaune acide en couleur signature (`--accent: #E8FF3D`), blanc chaud pour le texte (`--text: #FFF8ED`).
- **Une seule couleur secondaire**, réservée exclusivement aux moments spéciaux/climax (`--clay: #FF3B5C`, rose vif). Ne pas l'utiliser ailleurs — c'est un choix délibéré de discipline chromatique.
- Typographie : `Anton` (condensée, massive) pour les titres, `Work Sans` pour le texte de lecture, `IBM Plex Mono` pour les éléments techniques (compteurs).
- Le client a explicitement demandé d'éviter : les emojis comme substitut à une direction artistique (remplacés par les SVG de `game-art.js`), les effets "cyberpunk néon générique", l'accumulation de dégradés/verre sur chaque rectangle.
- Toutes les couleurs passent par les variables CSS de `css/base.css` — ne jamais coder une couleur en dur, ça a causé des couleurs orphelines à chaque changement de palette précédent.

## Ce qui fonctionne aujourd'hui

- **Accueil** : deux boutons Chill/Chaos qui lancent directement le before dans l'ambiance choisie (`openLaunchEntry('chill'|'chaos')`), plus "Choisir un jeu". Bandeau de reprise si une session est en cours.
- **Page de réglages unique** (`js/core/setup-wizard.js`) : plus de tunnel en étapes. Durée (10/30/60), compteur de joueurs borné selon le jeu choisi (`playerBounds()`), prénoms en champs vides (aucun préremplissage — le client y tenait explicitement), reprise du groupe précédent proposée mais jamais imposée.
- **Le before** (`js/core/scenes.js` + `session-engine.js`) : plus de "grand ticket" unique. Chaque activité recompose une scène selon son type — `pickSceneKind()` détermine si c'est un duel, un vote, une règle, une surprise, une action adressée à quelqu'un, un moment collectif ou un défi simple (attention : deux joueurs ne signifient PAS automatiquement un duel, voir cette fonction). Chemin de progression vertical en arrière-plan (`renderProgressPath` dans `scenes.js`), basé sur `globalSecondsLeft/globalSecondsTotal`, jamais sur un nombre de manches.
- **Mode Chill/Chaos** : `state.sessionMode`, clampe la fenêtre de tiers de contenu (`updateIntensityForIndex` dans `session-engine.js`) — Chill ne dépasse jamais le tier 1, Chaos utilise toute l'amplitude.
- **Commandes adaptées par activité** : `renderMainFooter()` choisit Réussi/Raté (défis uniquement), Continuer, C'est noté, Valider le vote... Bouton Passer toujours présent, ne compte jamais comme un échec. Verrou anti-double-appui (`state.advanceLock`).
- **Gestion des joueurs en session** : ajout/retrait via un panneau depuis le bas (`openAddPlayerOverlay`), partie mise en pause pendant la saisie, prénoms identiques distingués par un `uid` interne.
- **Bibliothèque de jeux** (`navigation.js`) : scène de sélection horizontale avec balayage + flèches, chaque jeu a sa silhouette SVG (`game-art.js`) et son halo de couleur propre, index compact "Tous les jeux".
- **Moteur de contenu** (`buildStructuredQueue` dans `session-engine.js`) : plusieurs "trames" possibles par durée (voir `STRUCTURES` dans `content.js`), dosage calibré par `TOTAL_ITEMS_BY_DURATION` (10/30/80 items), historique de contenu persistant en localStorage pour éviter les répétitions d'une soirée à l'autre.
- Barrière d'âge remplacée par un badge discret "18+" (non bloquant), mentions légales et message sanitaire conservés.

## Ce qui reste à faire (dans l'ordre de priorité annoncé par le client)

1. **Vérification visuelle générale.** Rien n'a jamais été vu tourner. Il y a très probablement des problèmes de mise en page que seul un vrai navigateur révèle.
2. **Les 9 mini-jeux eux-mêmes** (`js/games/*.js` + `css/games/*.css`) — Palmier, Bus, Cible, Purple, PMU, Duel de Dés, Pile ou Face, UnderDicateur, Les Pilliers. Ils n'ont reçu que la nouvelle palette/typo par héritage des variables CSS ; leurs écrans et interactions internes datent d'avant toute cette refonte. **Le client a désigné le Duel de Dés (`js/games/des.js`) comme premier chantier de référence** — face-à-face clair, dés en relief, lancer bref, résultat animé conforme au moteur, gestion des égalités, enchaînement rapide, protection anti-double-appui. Une fois celui-ci fait, il doit servir de référence de qualité pour les 8 autres, chacun avec sa propre signature (voir les pistes détaillées que le client a données : cartes avec historique visuel, pièce avec tranche et rotation, cible avec impact net, course avec dépassements, bluff avec informations secrètes protégées...).
3. **Matière visuelle avancée** (verre fumé, chrome, reflets, perspective) — seulement amorcée via les SVG plats de `game-art.js`, pas de vrai rendu de profondeur/lumière.
4. **Idée de cocktails à débloquer** selon la réussite aux jeux — jamais implémentée, à l'état d'idée. Si vous l'attaquez : le client avait suggéré de débloquer selon la *participation/variété* plutôt que la *réussite*, pour éviter de gamifier la consommation d'alcool.

## Pièges déjà rencontrés (pour ne pas les reproduire)

- **CSS : une règle `#id{display:...}` bat `.screen{display:none}`.** Tous les écrans utilisent la convention `.screen{display:none} .screen.active{display:flex}`. Si tu ajoutes du style à un écran par son id, ne mets JAMAIS `display` dessus sans le scoper à `.active`, sinon l'écran reste affiché en permanence, superposé aux autres (bug réel rencontré : l'accueil et la page de réglages s'affichaient l'un sur l'autre).
- **`window.fireConfetti = function(){}` ne crée pas de variable globale `fireConfetti`.** Dans ce projet sans modules, appeler `fireConfetti()` sans le préfixe `window.` fonctionne dans un vrai navigateur (où `window` est le scope global) mais pas dans un contexte Node isolé (d'où l'intérêt de `test-full-boot.js`, qui l'a détecté). Garder le préfixe `window.fireConfetti(...)` partout.
- **`Sound.play()` peut lever une exception** si l'API Web Audio est indisponible/bloquée — déjà corrigé (`try/catch` interne dans `audio.js`), mais à garder en tête si tu retouches ce fichier : le son ne doit jamais faire planter l'appelant.
- **Toujours grep les accès `document.getElementById('...')` non gardés** après avoir supprimé un élément du HTML. Un script de détection existe (voir `test-full-boot.js`, qui charge tout et exécute réellement), plus fiable qu'un grep statique.
- **`localStorage` peut lever en navigation privée iOS.** Convention du projet : toujours envelopper les accès dans `try{}catch(e){}`. Vérifie ce pattern avant d'ajouter une nouvelle clé.

## Contraintes du client à respecter

- Aucune animation ne doit retarder une action ni contenir de clignotement stroboscopique ; respecter `prefers-reduced-motion` partout (déjà fait via `REDUCED_MOTION` dans `scenes.js`, à reproduire dans tout nouveau code d'animation).
- Sons facultatifs, jamais bloquants.
- Ton du texte : phrases courtes, complices, jamais de jargon forcé (exemples donnés par le client : "À toi.", "Qui assume ?", "Vous avez 5 secondes.").
- Ne jamais transformer une gorgée/un gage en obligation — le message légal explicite que tout reste facultatif.
- Le client valide beaucoup par capture d'écran. Anticipe qu'il va comparer ce que tu livres à ce qu'il a demandé littéralement — il a un œil précis et repère vite les écarts.

Bon courage.
