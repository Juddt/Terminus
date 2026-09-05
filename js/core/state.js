let creatorsGlasses = 0;

let state = {
  step:0, playerCount:4, players:[],
  durationMin:20, intensityValue:50,
  globalSecondsTotal:0, globalSecondsLeft:0, globalInterval:null,
  ringInterval:null, activeRules:[],
  ringTotal:10, ringLeft:10,
  paused:false, bags:{},
  climaxElapsedTarget:0, climaxFired:false,
  stats:{ challenges:0, specials:0, rulesAdded:0, targets:{}, playerChallenges:{}, playerDrinks:{} },
  // sessionActive : vrai uniquement pendant une soirée Mode Rapide en cours (voir
  // session-engine.js). Utilisé par persistence.js pour savoir quand sauvegarder/effacer
  // la snapshot de reprise. lastItem garde le dernier item affiché pour pouvoir le
  // réafficher tel quel après une reprise.
  sessionActive:false, lastItem:null
};

// Échappe le texte destiné à innerHTML. Indispensable : les prénoms de joueurs et le
// contenu personnalisé sont concaténés dans du HTML à une dizaine d'endroits, et les
// prénoms peuvent venir d'un lien de partage (?c=...) fabriqué par un tiers — sans
// échappement, ouvrir un tel lien exécutait du JS dans l'origine de l'app.
function escapeHtml(v){
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Nettoyages à lancer en quittant un écran. Sans ça, le bouton « Accueil » d'un jeu
// laissait tourner sa boucle d'animation : celle du Palmier tourne à 60 fps et
// continuait jusqu'à la fermeture de l'onglet, batterie comprise. Le bouton « Quitter »
// juste à côté appelait bien la fonction de sortie du jeu — d'où un comportement qui
// dépendait du bouton choisi.
const SCREEN_CLEANUPS = {};
function registerScreenCleanup(screen, fn){ SCREEN_CLEANUPS[screen] = fn; }

function goTo(name){
  document.querySelectorAll('.screen.active').forEach(s=>{
    const id = s.id.replace(/^screen-/, '');
    if(id !== name && SCREEN_CLEANUPS[id]){
      try{ SCREEN_CLEANUPS[id](); }catch(e){}
    }
  });
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
}
