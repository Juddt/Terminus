let creatorsGlasses = 0;

let state = {
  step:0, playerCount:4, players:[],
  durationMin:20, intensityValue:50,
  globalSecondsTotal:0, globalSecondsLeft:0, globalInterval:null,
  ringInterval:null, activeRules:[],
  ringTotal:10, ringLeft:10,
  paused:false, bags:{},
  climaxElapsedTarget:0, climaxFired:false,
  stats:{ challenges:0, specials:0, rulesAdded:0, targets:{} },
  // sessionActive : vrai uniquement pendant une soirée Mode Rapide en cours (voir
  // session-engine.js). Utilisé par persistence.js pour savoir quand sauvegarder/effacer
  // la snapshot de reprise. lastItem garde le dernier item affiché pour pouvoir le
  // réafficher tel quel après une reprise.
  sessionActive:false, lastItem:null
};

function goTo(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
}
