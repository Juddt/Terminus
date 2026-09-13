// Test fonctionnel des scènes : on simule un DOM minimal et on rejoue des soirées
// entières (les 3 durées), en vérifiant que chaque type de moment produit bien sa
// composition, que le parcours reste cohérent et qu'aucun marqueur {p1} ne fuit.
const fs=require('fs'), vm=require('vm');

const store={};
const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};

function makeEl(id){
  return {id, innerHTML:'', textContent:'', style:{}, dataset:{}, offsetWidth:100,
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},
      toggle(c,f){f===undefined?(this._s.has(c)?this._s.delete(c):this._s.add(c)):(f?this._s.add(c):this._s.delete(c));return this._s.has(c)},
      contains(c){return this._s.has(c)}},
    querySelectorAll:()=>[], querySelector:()=>null, appendChild(){}, setAttribute(){}, focus(){}, getAttribute:()=>null};
}
const els={};
const document={getElementById:id=>els[id]||(els[id]=makeEl(id)),querySelectorAll:()=>[],querySelector:()=>makeEl('x')};
const ctx={console,localStorage,document,navigator:{vibrate(){}},
  Sound:{play(){}},window:{matchMedia:()=>({matches:false}),fireConfetti:null},
  setTimeout:(fn)=>{fn();return 0},clearInterval(){},setInterval:()=>0,
  escapeHtml:v=>String(v),soberize:v=>v};
vm.createContext(ctx);
['js/data/content.js','js/core/state.js'].forEach(f=>vm.runInContext(fs.readFileSync('../'+f,'utf8'),ctx,{filename:f}));
vm.runInContext('function getEffectiveRules(){return RULES} function getEffectiveChallenges(){return CHALLENGES}',ctx);
['js/core/persistence.js','js/core/session-engine.js','js/core/scenes.js'].forEach(f=>vm.runInContext(fs.readFileSync('../'+f,'utf8'),ctx,{filename:f}));

let errors=0, kinds={}, checked=0;
[10,30,60].forEach(duration=>{
  [2,5,9].forEach(pc=>{
    vm.runInContext(`
      state.players=Array.from({length:${pc}},(_,i)=>({name:'Joueur'+i,color:'#fff',avatar:'X'}));
      state.stats={challenges:0,specials:0,rulesAdded:0,targets:{},playerChallenges:{},playerDrinks:{}};
      state.activeRules=[]; state.durationMin=${duration}; state.sessionMode='chaos';
      state.timeUp=false; state.climaxFired=false;
      var __b=buildStructuredQueue(${duration},${pc});
      state.typesQueue=__b.queue; state.queueTierWindows=__b.tierWindows; state.queueIndex=0;
    `,ctx);
    const built={queue:vm.runInContext('state.typesQueue',ctx)};
    for(let i=0;i<built.queue.length;i++){
      try{
        vm.runInContext('advanceQueue()',ctx);
        checked++;
        const k=els['screen-main']?els['screen-main'].dataset.scene:null;
        const sceneHTML=els['scene']?els['scene'].innerHTML:'';
        if(k){ kinds[k]=(kinds[k]||0)+1;
          if(!sceneHTML) throw new Error('scène vide pour kind='+k);
          if(/\{p\d\}/.test(sceneHTML)) throw new Error('marqueur {pN} non remplacé: '+sceneHTML.slice(0,80));
        }
      }catch(e){ errors++; if(errors<4) console.error('ÉCHEC d='+duration+' p='+pc+' i='+i+' :',e.message); }
    }
  });
});
console.log('Activités jouées :',checked,'— erreurs :',errors);
console.log('Compositions rencontrées :',JSON.stringify(kinds));

// Progression : chemin vertical, basé sur le TEMPS écoulé (jamais sur des manches)
vm.runInContext("state.globalSecondsTotal=1800", ctx);
let pathOk = true;
[1800, 900, 60, 0].forEach(left=>{
  vm.runInContext("state.globalSecondsLeft="+left, ctx);
  try{ vm.runInContext('renderProgressPath()', ctx); }
  catch(e){ console.error('PROGRESSION: exception à left='+left+' : '+e.message); pathOk=false; }
  const rem = els['trail-remaining'] ? els['trail-remaining'].textContent : '';
  if(left>0 && !/restantes/.test(rem)){ console.error('PROGRESSION: temps restant absent à left='+left); pathOk=false; }
});
console.log('Progression (chemin, 4 positions) :', pathOk ? 'OK' : 'ÉCHEC');

// Commandes : vérifier que chaque type d'activité produit les bons boutons
const expects = {
  regle: ["C'est not"], vote: ['Valider le vote'], surprise: ['Continuer'],
};
let btnOk = true;
Object.keys(expects).forEach(kind=>{
  vm.runInContext("state.sceneKind='"+kind+"'", ctx);
  vm.runInContext('renderMainFooter(false)', ctx);
  const html = els['footer-buttons'].innerHTML;
  expects[kind].forEach(t=>{ if(!html.includes(t)){ console.error('COMMANDES: "'+t+'" absent pour '+kind); btnOk=false; } });
  if(/R\u00e9ussi|Rat\u00e9/.test(html)){ console.error('COMMANDES: Réussi/Raté présent à tort pour '+kind); btnOk=false; }
  if(!html.includes('Passer')){ console.error('COMMANDES: Passer absent pour '+kind); btnOk=false; }
});
vm.runInContext("state.sceneKind='defi'", ctx);
vm.runInContext('renderMainFooter(true)', ctx);
const dh = els['footer-buttons'].innerHTML;
if(!dh.includes('ussi') || !dh.includes('Rat')){ console.error('COMMANDES: défi sans Réussi/Raté'); btnOk=false; }
console.log('Commandes par activité :', btnOk ? 'OK' : 'ÉCHEC');

// Passer ne doit rien comptabiliser
vm.runInContext("state.stats.playerChallenges={}; state.lastItem={eyebrow:'D\u00e9fi',text:'x',players:[{name:'A',color:'#fff',avatar:'X'}]};", ctx);
vm.runInContext('skipActivity()', ctx);
const pc = vm.runInContext('JSON.stringify(state.stats.playerChallenges)', ctx);
console.log('Passer ne compte pas comme raté :', pc === '{}' ? 'OK' : 'ÉCHEC ('+pc+')');

// --- Anti-double-appui : deux avancées rapides ne doivent sauter qu'une manche ---
vm.runInContext(`
  state.advanceLock=false; state.timeUp=false;
  state.typesQueue=['vote','vote','vote','vote']; state.queueTierWindows=[{min:0,max:1}].concat([{min:0,max:1},{min:0,max:1},{min:0,max:1}]);
  state.queueIndex=0; state.climaxQueueIndex=-1;
`, ctx);
let lockSeen = false;
const realST = ctx.setTimeout;
ctx.setTimeout = (fn)=>{ lockSeen = lockSeen || vm.runInContext('state.advanceLock', ctx); return 0; };
vm.runInContext('advanceQueue();', ctx);
ctx.setTimeout = realST;
const idxAfter = lockSeen ? 1 : 99;
console.log('Verrou anti-double-appui posé pendant l\'avancée :', idxAfter===1 ? 'OK' : 'ÉCHEC');

// --- Quitter vers l'accueil : met en pause, sauvegarde, ne termine pas ---
vm.runInContext("state.sessionActive=true; state.paused=false; state.globalSecondsLeft=600; state.globalSecondsTotal=1800;", ctx);
vm.runInContext('quitSessionToHome()', ctx);
const paused = vm.runInContext('state.paused', ctx);
const stillActive = vm.runInContext('state.sessionActive', ctx);
const snap = localStorage.getItem('soiree_session_snapshot_v1');
console.log('Quitter -> pause:', paused, '| session conservée:', stillActive, '| snapshot:', !!snap,
  (paused && stillActive && snap) ? 'OK' : 'ÉCHEC');

// --- Ajout de joueurs : suspend, enchaîne, gère les doublons, garde les stats ---
vm.runInContext(`
  state.paused=false; state.pausedForPlayers=false;
  state.players=[{name:'Julie',color:'#fff',avatar:'A'},{name:'Max',color:'#fff',avatar:'B'}];
  state.stats.targets={Julie:3};
`, ctx);
vm.runInContext('openAddPlayerOverlay()', ctx);
const pausedDuring = vm.runInContext('state.paused', ctx);
els['add-player-field'].value='Julie';
vm.runInContext('addSessionPlayer()', ctx);
els['add-player-field'].value='Theo';
vm.runInContext('addSessionPlayer()', ctx);
const n = vm.runInContext('state.players.length', ctx);
const uidsUniques = vm.runInContext('new Set(state.players.filter(p=>p.uid).map(p=>p.uid)).size', ctx);
vm.runInContext('closeAddPlayerOverlay()', ctx);
const pausedAfter = vm.runInContext('state.paused', ctx);
const statsKept = vm.runInContext('state.stats.targets.Julie', ctx);
console.log('Ajout joueurs -> pause pendant:', pausedDuring, '| total:', n, '| uid uniques:', uidsUniques,
  '| pause levée:', !pausedAfter, '| stats gardées:', statsKept,
  (pausedDuring && n===4 && !pausedAfter && statsKept===3) ? 'OK' : 'ÉCHEC');

// --- Consignes : taille adaptée à la longueur ---
const court = vm.runInContext("instructionClass('Bois une gorg\u00e9e')", ctx);
const moyen = vm.runInContext("instructionClass('"+'x'.repeat(70)+"')", ctx);
const long  = vm.runInContext("instructionClass('"+'x'.repeat(160)+"')", ctx);
console.log('Consignes ->', court.split(' ')[1], '/', moyen.split(' ')[1], '/', long.split(' ')[1],
  (court.includes('xl') && moyen.includes('lg') && long.includes('md')) ? 'OK' : 'ÉCHEC');

// --- Mise en scène : 2 joueurs ne donnent pas systématiquement un duel ---
const P=[{name:'A',color:'#f',avatar:'a'},{name:'B',color:'#f',avatar:'b'}];
const cases = {
  'duel': "{p1} et {p2} s'affrontent au bras de fer",
  'adresse': "fais une d\u00e9claration dramatique \u00e0 quelqu'un",
};
let sceneOk = true;
Object.entries(cases).forEach(([expected, txt])=>{
  const got = vm.runInContext("pickSceneKind('D\u00e9fi', "+JSON.stringify(P)+", \""+txt+"\")", ctx);
  if(got !== expected){ console.error('SCÈNE: "'+txt.slice(0,30)+'" -> '+got+' (attendu '+expected+')'); sceneOk=false; }
});
console.log('Choix de mise en scène :', sceneOk ? 'OK' : 'ÉCHEC');
