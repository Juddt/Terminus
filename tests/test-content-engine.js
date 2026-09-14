const fs = require('fs');
const vm = require('vm');

// --- Stubs minimalistes du navigateur ---
const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const fakeEl = { classList: { toggle(){}, add(){}, remove(){}, contains(){ return false; } }, style:{}, textContent:'', value:'', dataset:{} };
const document = { getElementById: () => fakeEl, querySelectorAll: () => [], querySelector: () => fakeEl };
const navigator = { vibrate: () => {} };
const Sound = { play(){}, toggle(){} };
const window = { fireConfetti: null };

const ctx = { console, localStorage, document, navigator, Sound, window, escapeHtml: (v)=>v, soberize: (v)=>v };
vm.createContext(ctx);

const content = fs.readFileSync('../js/data/content.js', 'utf8');
const engine = fs.readFileSync('../js/core/session-engine.js', 'utf8');

vm.runInContext(content, ctx, { filename: 'content.js' });
vm.runInContext('function getEffectiveRules(){ return RULES; } function getEffectiveChallenges(){ return CHALLENGES; }', ctx);
// state minimal requis par les fonctions du moteur
vm.runInContext(`var state = { players:[], stats:{targets:{}}, queueTierWindows:null, currentTierWindow:null, intensityValue:50 };`, ctx);
vm.runInContext(engine, ctx, { filename: 'session-engine.js' });

function makePlayers(n){
  const arr = [];
  for(let i=0;i<n;i++) arr.push({name:'J'+i, color:'#000', avatar:'🦊'});
  return arr;
}

// Chaque type que buildStructuredQueue peut produire, et le stock où renderItem va
// puiser (voir les branches `type === …` de session-engine.js). Les deux listes doivent
// rester alignées : c'est ce que vérifie la garde ci-dessous.
const BAG_SOURCES = {
  rule:       'getEffectiveRules()',
  challenge:  'getEffectiveChallenges()',
  minigame:   'MINIGAMES',
  vote:       'VOTES',
  light:      'LIGHT_EVENTS',
  special:    'SPECIAL_EVENTS',
  quiz:       'QUIZ',
  dilemme:    'DILEMMAS',
  mission:    'MISSIONS',
  prediction: 'PREDICTIONS',
  destin:     'DESTINS',
  barman:     'BARMAN',
  tribunal:   'TRIBUNAL',
  roulette:   'ROULETTE',
};

let totalRuns = 0, errors = 0;
[10,30,60].forEach(duration=>{
  [2,4,6,9,14].forEach(playerCount=>{
    ctx.state.players = makePlayers(playerCount);
    ctx.state.stats = {targets:{}};
    for(let run=0; run<8; run++){
      totalRuns++;
      try{
        const built = vm.runInContext(`buildStructuredQueue(${duration}, ${playerCount})`, ctx);
        const {queue, tierWindows} = built;
        if(queue.length !== tierWindows.length) throw new Error('longueurs différentes queue/tierWindows');
        if(queue.length < 3) throw new Error('file trop courte: '+queue.length);
        const expected = {10:10,30:30,60:80}[duration];
        if(Math.abs(queue.length - expected) > 1) throw new Error('longueur de file inattendue: '+queue.length+' (attendu ~'+expected+')');
        if(queue[queue.length-1] !== 'special') throw new Error('dernier item n\'est pas le climax: '+queue[queue.length-1]);
        // Simule un tirage réel de contenu pour CHAQUE item (pas juste le type), pour
        // vérifier que drawFromBag ne plante jamais et ne renvoie jamais undefined.
        ctx.state.queueTierWindows = tierWindows;
        queue.forEach((type, idx)=>{
          vm.runInContext(`updateIntensityForIndex(${idx})`, ctx);
          const source = BAG_SOURCES[type];
          // Un type sorti de la file sans source connue ici, c'est une famille ajoutée
          // au moteur sans être ajoutée au test : on le dit, au lieu de le confondre
          // avec un stock vide. C'est exactement ce qui s'était passé pour les huit
          // familles ajoutées après coup — le test croyait tester quiz, dilemme,
          // mission, destin, barman, tribunal, prediction et roulette, et il les
          // signalait tous comme « undefined ».
          if(!source) throw new Error('type sans source déclarée dans BAG_SOURCES : '+type);
          const item = vm.runInContext(`drawFromBag('${type}', ${source})`, ctx);
          if(!item) throw new Error('drawFromBag a renvoyé '+item+' pour le type '+type);
          const players = vm.runInContext(`pickPlayers(${item.n||0})`, ctx);
          if(players.length !== (item.n||0)) throw new Error('pickPlayers a renvoyé '+players.length+' au lieu de '+(item.n||0));
        });
      }catch(e){
        errors++;
        console.error('ÉCHEC duration='+duration+' players='+playerCount+' run='+run+' :', e.message);
      }
    }
  });
});

console.log('Combinaisons testées :', totalRuns, '— erreurs :', errors);

// Vérifie que l'historique persistant limite bien les répétitions : sur beaucoup de
// tirages consécutifs de "vote" avec le même stock, on ne devrait jamais voir deux fois
// le même texte avant d'avoir tout épuisé une fois.
ctx.state.currentTierWindow = {min:0, max:2};
const seen = [];
let repeatsTooSoon = 0;
const voteCount = vm.runInContext('VOTES.length', ctx);
for(let i=0;i<voteCount*2;i++){
  const v = vm.runInContext(`drawFromBag('vote_test', VOTES)`, ctx);
  const idxInCycle = i % voteCount;
  if(idxInCycle === 0) seen.length = 0;
  if(seen.includes(v.text)) repeatsTooSoon++;
  seen.push(v.text);
}
console.log('VOTES total:', voteCount, '— répétitions prématurées détectées:', repeatsTooSoon);

// Vérifie l'anti-répétition de trame : deux lancers consécutifs pour la même durée ne
// doivent jamais choisir la même trame (tant qu'il y a plus d'une trame possible).
console.log('--- Anti-répétition des trames ---');
[10,30,60].forEach(duration=>{
  ctx.state.players = makePlayers(5);
  let lastId = null, sameTwice = 0;
  for(let i=0;i<20;i++){
    vm.runInContext(`buildStructuredQueue(${duration}, 5)`, ctx);
    const raw = JSON.parse(localStorage.getItem('soiree_last_structure_v1'));
    const id = raw[duration];
    if(id === lastId) sameTwice++;
    lastId = id;
  }
  console.log('Durée '+duration+' min — trame répétée consécutivement:', sameTwice, '/ 20');
});

// Répartition réelle des types sur une soirée de 60 min (moyenne sur 50 tirages),
// pour confirmer concrètement que "rule" est redevenu une composante mineure.
console.log('--- Vérification Chill vs Chaos ---');
ctx.state.players = makePlayers(5);
['chaos','chill'].forEach(mode=>{
  ctx.state.sessionMode = mode;
  const built = vm.runInContext(`buildStructuredQueue(60, 5)`, ctx);
  ctx.state.queueTierWindows = built.tierWindows;
  let maxTier = 0, chaosVisualHit = false;
  built.queue.forEach((t,idx)=>{
    vm.runInContext(`updateIntensityForIndex(${idx})`, ctx);
    const tw = vm.runInContext('state.currentTierWindow', ctx);
    maxTier = Math.max(maxTier, tw.max);
    if(vm.runInContext('state.intensityValue', ctx) >= 85) chaosVisualHit = true;
  });
  console.log('Mode '+mode+' — tier max atteint: '+maxTier+' — mode Chaos visuel déclenché: '+chaosVisualHit);
});
ctx.state.sessionMode = 'chaos';

console.log('--- Répartition des types (60 min, 6 joueurs, moyenne sur 50 tirages) ---');
const tally = {};
let totalCount = 0;
ctx.state.players = makePlayers(6);
for(let i=0;i<50;i++){
  const built = vm.runInContext(`buildStructuredQueue(60, 6)`, ctx);
  built.queue.forEach(t=>{ tally[t] = (tally[t]||0) + 1; totalCount++; });
}
Object.keys(tally).sort((a,b)=>tally[b]-tally[a]).forEach(t=>{
  const pct = (100*tally[t]/totalCount).toFixed(1);
  console.log('  '+t.padEnd(10)+': '+pct+'%');
});
