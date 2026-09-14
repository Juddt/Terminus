# Mettre Soirée en ligne sur GitHub Pages

Objectif : `https://juddt.github.io/Terminus/`, testable depuis un téléphone.

**Il n'y a aucune étape de build.** Le projet est du HTML/CSS/JS simple : les fichiers du
dépôt sont exactement ceux qui sont servis au navigateur. Pas de `npm install`, pas de
`npm run build`, pas de dossier `dist/` à générer.

---

## 0. Le chemin le plus court : le code est déjà sur GitHub

Le ZIP décrit plus bas date du moment où l'envoi direct vers GitHub était bloqué. Ce
n'est plus le cas : **tout le travail est poussé sur la branche
`claude/gracious-johnson-om0ejw`**. Il ne reste qu'à l'amener sur la branche que
GitHub Pages publie.

### Depuis le site de GitHub

1. Ouvrez https://github.com/Juddt/Terminus/compare/main...claude/gracious-johnson-om0ejw
2. **« Create pull request »**, puis **« Merge pull request »**.

### En ligne de commande

```bash
git fetch origin
git checkout main
git merge origin/claude/gracious-johnson-om0ejw
git push origin main
```

Puis passez directement au **§ 3 (activer GitHub Pages)** — ou, si Pages est déjà
activé sur `main` / `/ (root)`, à rien du tout : le site se republie tout seul en une
à deux minutes.

> `main` porte encore une version antérieure, sans le dossier `fonts/`. Tant que la
> fusion n'est pas faite, l'adresse publique sert cette ancienne version.

Les sections suivantes ne servent que si vous préférez passer par un ZIP.

---

## 1. Le contenu du ZIP

`soiree-github-pages.zip` contient **les fichiers à la racine**, sans dossier imbriqué :
en l'ouvrant vous voyez directement `index.html`, `css/`, `js/`, `fonts/`, `icons/`,
`manifest.json`, `sw.js`.

Ne sont **pas** inclus (inutiles en ligne) : le dossier `tests/`, la documentation
interne, la configuration de développement `.claude/`, et bien sûr `.git/` ou
`node_modules/` (le projet n'en a pas).

Le fichier `.nojekyll` **doit rester** : sans lui, GitHub Pages fait passer le site par
Jekyll, qui ignore certains fichiers.

---

## 2. Envoyer les fichiers sur GitHub

Dans le dépôt **`Juddt/Terminus`**, sur la branche **`main`**.

### Option A — par le site web de GitHub (sans ligne de commande)

1. Décompressez `soiree-github-pages.zip` sur votre ordinateur.
2. Ouvrez https://github.com/Juddt/Terminus
3. Bouton **« Add file » → « Upload files »**.
4. Faites glisser **le contenu** du dossier décompressé (pas le dossier lui-même) :
   sélectionnez `index.html`, `css`, `js`, `fonts`, `icons`, `manifest.json`, `sw.js`,
   `.nojekyll`, `README.md`, `pilliers-online`.
5. Message de commit, puis **« Commit changes »**.

> Si l'interface n'affiche pas `.nojekyll` (les fichiers commençant par un point sont
> parfois masqués par le système), créez-le à la main : **« Add file » → « Create new
> file »**, nommez-le `.nojekyll`, laissez-le vide, validez.

### Option B — en ligne de commande

```bash
cd /chemin/vers/votre/clone/Terminus
unzip -o /chemin/vers/soiree-github-pages.zip -d .
git add -A
git commit -m "Déploiement du site"
git push origin main
```

---

## 3. Activer GitHub Pages

Sur https://github.com/Juddt/Terminus → onglet **Settings** → menu de gauche **Pages** :

| Réglage | Valeur à choisir |
|---|---|
| **Source** | `Deploy from a branch` |
| **Branch** | `main` |
| **Folder** | `/ (root)` |

Puis **Save**. Comptez une à deux minutes ; l'adresse s'affiche en haut de la page :

```
https://juddt.github.io/Terminus/
```

> **Le dossier est `/ (root)`**, pas `/docs`, parce que `index.html` est à la racine du
> dépôt. Si vous préfériez `/docs`, il faudrait déplacer tout le contenu dans un dossier
> `docs/` — c'est inutile ici.

---

## 4. Vérifier depuis le téléphone

Ouvrez `https://juddt.github.io/Terminus/` dans Safari ou Chrome.

- L'écran d'accueil doit afficher **SOIRÉE** en typographie condensée massive sur fond
  noir, avec deux entrées : « Lancer le before » et « Choisir un jeu ».
- Si la typographie apparaît en police système, c'est que le cache du navigateur sert
  une ancienne version : rechargez en vidant le cache.
- Pour l'installer comme une application : Safari → **Partager → Sur l'écran d'accueil**.
  Elle s'ouvre alors en plein écran, sans barre d'adresse, et fonctionne hors connexion.

### Après chaque mise à jour

Le service worker garde une copie du site pour le mode hors connexion. Il est réglé en
« réseau d'abord », donc une nouvelle version arrive normalement au rechargement suivant.
Si un écran reste obstinément ancien, incrémentez `CACHE_NAME` dans `sw.js`
(actuellement `soiree-cache-v30`) : cela force le remplacement complet du cache.

---

## 5. Ce qui a été vérifié avant livraison

Le site a été servi **sous un sous-chemin `/Terminus/`**, exactement comme le fera GitHub
Pages, et parcouru dans un navigateur mobile (390×844) :

- aucun chemin absolu dans le HTML, le CSS ou le JS — tout est relatif, donc rien ne
  casse en sous-dossier ;
- **aucune requête en échec, aucun 404, aucune erreur console** ;
- le service worker s'enregistre bien avec la portée `/Terminus/` ;
- le manifeste et ses icônes se résolvent sous `/Terminus/` ;
- les polices auto-hébergées se chargent ;
- une soirée a été réellement jouée, et un mini-jeu lancé ;
- la **reprise de partie** a été vérifiée : soirée lancée, quelques manches jouées,
  page rechargée, bandeau « Soirée en cours » proposé avec le bon nombre de joueurs et
  le bon temps restant, reprise effective ;
- le **mode hors connexion** a été vérifié réseau coupé : l'accueil se recharge depuis
  le cache du service worker (56 entrées) ;
- les **neuf mini-jeux** ont été ouverts à 360 px et 390 px de large : aucun
  débordement horizontal, aucun élément hors cadre, aucune erreur console.

---

## 6. Points à connaître

**Ouvrir `index.html` par double-clic** (`file://`) fonctionne pour un coup d'œil rapide,
mais ce n'est pas représentatif : le navigateur bloque le chargement des polices et
refuse d'enregistrer le service worker (il exige `http://` ou `https://`). Pour un test
fidèle, utilisez GitHub Pages, ou un serveur local :

```bash
cd /dossier/du/site
python3 -m http.server 8000        # puis http://localhost:8000
```

**Le multijoueur en ligne des Pilliers** (`pilliers-online/`) est livré mais **inactif** :
il attend une configuration Firebase que vous n'avez pas encore renseignée
(`pilliers-online/firebase-config.js` explique la marche à suivre). Le reste du site,
y compris Les Pilliers en local, fonctionne sans cela.

**GitHub Pages est public.** N'importe qui connaissant l'adresse peut ouvrir le site.
Pour un dépôt privé, la publication de Pages demande un compte payant.
