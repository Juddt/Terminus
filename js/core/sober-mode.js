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
  // Les locutions verbe + « cul sec » d'abord : sinon les deux moitiés sont remplacées
  // séparément et le rendu donne « fait un gage mini-défi éclair ».
  [/boivent cul secs?/gi, 'font un mini-défi éclair'],
  [/boit cul secs?/gi, 'fait un mini-défi éclair'],
  [/buvez cul secs?/gi, 'faites un mini-défi éclair'],
  [/bois cul secs?/gi, 'fais un mini-défi éclair'],
  [/boire cul secs?/gi, 'faire un mini-défi éclair'],
  [/cul secs/gi, 'mini-défis éclair'],
  // Idem pour « boire » collé à une quantité de gorgées : traités séparément, le verbe et
  // le complément donnaient « fait un gage une point de gage ».
  [/boivent une gorgée/gi, 'prennent un gage'],
  [/boit une gorgée/gi, 'prend un gage'],
  [/buvez une gorgée/gi, 'prenez un gage'],
  [/bois une gorgée/gi, 'prends un gage'],
  [/boivent (\d+|deux|trois|quatre|cinq) gorgées/gi, 'prennent $1 gages'],
  [/boit (\d+|deux|trois|quatre|cinq) gorgées/gi, 'prend $1 gages'],
  [/buvez (\d+|deux|trois|quatre|cinq) gorgées/gi, 'prenez $1 gages'],
  [/bois (\d+|deux|trois|quatre|cinq) gorgées/gi, 'prends $1 gages'],
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
  try{ return localStorage.getItem(SOBER_MODE_KEY) === '1'; }catch(e){ return false; }
}

function toggleSoberMode(){
  try{ localStorage.setItem(SOBER_MODE_KEY, isSoberModeOn() ? '0' : '1'); }catch(e){}
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
