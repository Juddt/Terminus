// Mode "sans alcool" : substitue le vocabulaire alcool par un équivalent gage/mini-défi
// à l'AFFICHAGE uniquement (le texte source dans js/data/content.js n'est jamais modifié).
// Choix assumé : plutôt que de dupliquer ~150 entrées de contenu avec une version sobre
// écrite à la main, on applique un dictionnaire de remplacement au rendu — moins soigné
// mot à mot, mais activable/désactivable instantanément et sans doubler la maintenance
// du contenu.

const SOBER_MODE_KEY = 'soiree_sober_mode_v1';

// Ordre important : les expressions les plus longues/spécifiques d'abord, pour qu'elles
// soient remplacées avant leurs sous-mots (ex. "cul sec" avant un éventuel mot isolé).
const SOBER_REPLACEMENTS = [
  [/cul sec/gi, 'mini-défi éclair'],
  [/gorgées/gi, 'points de gage'],
  [/gorgée/gi, 'point de gage'],
  [/verres/gi, 'jetons'],
  [/verre/gi, 'jeton'],
  [/trinquer/gi, 'toper'],
  [/trinque/gi, 'tope'],
  [/boire/gi, 'faire un gage'],
  [/buvez/gi, 'faites un gage'],
  [/bois/gi, 'fais un gage'],
  [/boivent/gi, 'font un gage'],
  [/boit/gi, 'fait un gage'],
];

function isSoberModeOn(){
  return localStorage.getItem(SOBER_MODE_KEY) === '1';
}

function toggleSoberMode(){
  localStorage.setItem(SOBER_MODE_KEY, isSoberModeOn() ? '0' : '1');
  document.querySelectorAll('.sober-mode-toggle').forEach(el=> el.classList.toggle('active', isSoberModeOn()));
}

function renderSoberModeToggle(){
  document.querySelectorAll('.sober-mode-toggle').forEach(el=> el.classList.toggle('active', isSoberModeOn()));
}

// Remplace le vocabulaire alcool d'un texte si le mode est actif ; sinon renvoie le texte
// tel quel. Appelée au moment du rendu (pas du tirage), pour qu'activer/désactiver le mode
// en cours de soirée change l'affichage immédiatement sans retirer les items du bag.
function soberize(text){
  if(!isSoberModeOn() || !text) return text;
  return SOBER_REPLACEMENTS.reduce((t, [pattern, replacement])=> t.replace(pattern, replacement), text);
}
