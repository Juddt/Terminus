// ===================================================================================
// ÉQUILIBRE DU CONTENU
// -----------------------------------------------------------------------------------
// Ce test ne vérifie pas que le contenu existe (test-content-engine s'en charge) mais
// qu'il est correctement DOSÉ : des vagues d'intensité plutôt qu'un niveau constant,
// une vraie variété de familles, une participation répartie entre les joueurs, des
// règles qui ne s'empilent pas indéfiniment, et des rappels qui reviennent.
// ===================================================================================
const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.join(__dirname,'..');

const store={};
const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
function makeStyle(){const st={};st.setProperty=(k,v)=>{st[k]=v};st.removeProperty=k=>{delete st[k]};st.getPropertyValue=k=>st[k]||'';return st;}
function makeEl(id){
  return {id, innerHTML:'', textContent:'', style:makeStyle(), dataset:{}, offsetWidth:100, disabled:false,
    getTotalLength:()=>1000, getPointAtLength:l=>({x:50,y:560-l*0.58}),
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},
      toggle(c,f){f===undefined?(this._s.has(c)?this._s.delete(c):this._s.add(c)):(f?this._s.add(c):this._s.delete(c));return this._s.has(c)},
      contains(c){return this._s.has(c)}},
    querySelectorAll:()=>[], querySelector:()=>null, appendChild(){}, focus(){}, addEventListener(){},
    _attrs:{}, setAttribute(k,v){this._attrs[k]=String(v)}, getAttribute(k){return k in this._attrs?this._attrs[k]:null},
    removeAttribute(k){delete this._attrs[k]}};
}
const els={};
const document={getElementById:id=>els[id]||(els[id]=makeEl(id)),querySelectorAll:()=>[],querySelector:()=>makeEl('x')};
const ctx={console,localStorage,document,navigator:{vibrate(){}},
  Sound:{play(){}},window:{matchMedia:()=>({matches:false}),fireConfetti:null},
  setTimeout:(fn)=>{fn&&fn();return 0},clearTimeout(){},clearInterval(){},setInterval:()=>0,
  requestAnimationFrame:(fn)=>{fn&&fn();return 0},
  escapeHtml:v=>String(v),soberize:v=>v,
  secretHTML:(inner)=>inner, secretBind(){}};
vm.createContext(ctx);
['js/data/content.js','js/core/state.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
vm.runInContext('function getEffectiveRules(){return RULES} function getEffectiveChallenges(){return CHALLENGES}',ctx);
['js/core/persistence.js','js/core/session-engine.js','js/core/scenes.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));

let ok=true;
function check(label, cond, detail){
  console.log((cond?'OK    | ':'ÉCHEC | ')+label+(detail!==undefined?' → '+detail:''));
  if(!cond) ok=false;
}

// --- 1. VOLUME ET RÉPARTITION DES FAMILLES ------------------------------------------
const FAMILIES = ['RULES','CHALLENGES','MINIGAMES','VOTES','LIGHT_EVENTS','SPECIAL_EVENTS',
                  'QUIZ','DILEMMAS','MISSIONS','DESTINS','BARMAN','TRIBUNAL','PREDICTIONS','ROULETTE'];
let total = 0, thin = [];
FAMILIES.forEach(f=>{
  const arr = vm.runInContext(f, ctx);
  total += arr.length;
  // Une famille doit avoir de quoi tenir une soirée sans se répéter.
  if(arr.length < 8) thin.push(f+'('+arr.length+')');
  // Chaque famille doit couvrir les trois tiers, sinon elle disparaît d'un bout de soirée.
  const tiers = new Set(arr.map(i=>i.tier).filter(t=>t!==undefined));
  if(tiers.size && tiers.size < 3) thin.push(f+' tiers:'+[...tiers].join(','));
});
check('Chaque famille a du volume et couvre les trois tiers', thin.length===0, thin.join(' '));
check('Volume total de contenu', total >= 500, total+' items');

// --- 2. VAGUES D'INTENSITÉ -----------------------------------------------------------
// Une trame doit MONTER puis REDESCENDRE, pas grimper tout droit : c'est le creux qui
// fait exister les pics.
const STRUCTURES = vm.runInContext('STRUCTURES', ctx);
let wavesOk = true, flat = [];
Object.keys(STRUCTURES).forEach(d=>{
  STRUCTURES[d].forEach(t=>{
    const sum = t.phases.reduce((a,p)=>a+p.share,0);
    if(Math.abs(sum-1) > 0.001){ console.error('ÉQUILIBRE: '+t.id+' ne totalise pas 100% ('+sum+')'); wavesOk=false; }
    if(!t.phases[t.phases.length-1].finale){ console.error('ÉQUILIBRE: '+t.id+' n\'a pas de finale'); wavesOk=false; }
    // Sur 30 et 60 minutes, on exige au moins une respiration : une phase dont le tier
    // max redescend sous celui de la phase précédente.
    if(Number(d) >= 30){
      let dip = false;
      for(let i=1;i<t.phases.length;i++) if(t.phases[i].tier.max < t.phases[i-1].tier.max) dip = true;
      if(!dip) flat.push(t.id);
    }
  });
});
check('Chaque trame totalise 100 % et se termine par une finale', wavesOk);
check('Les trames longues ménagent au moins une respiration', flat.length===0, flat.join(' '));
check('Plusieurs trames par durée',
  Object.keys(STRUCTURES).every(d=>STRUCTURES[d].length >= 3),
  Object.keys(STRUCTURES).map(d=>d+'min:'+STRUCTURES[d].length).join(' '));

// --- 3. VARIÉTÉ RÉELLE SUR UNE SOIRÉE JOUÉE -------------------------------------------
function playSession(duration, playerCount){
  vm.runInContext(`
    state.players = Array.from({length:${playerCount}},(_,i)=>({name:'J'+i, color:'#fff', avatar:'X', uid:'u'+i}));
    state.stats = {challenges:0,specials:0,rulesAdded:0,targets:{},playerChallenges:{},playerDrinks:{}};
    state.activeRules = []; state.pending = []; state.durationMin = ${duration};
    state.timeUp = false; state.climaxFired = false; state.sessionMode='full';
    state.globalSecondsTotal = ${duration*60}; state.globalSecondsLeft = ${duration*60};
    var __b = buildStructuredQueue(${duration}, ${playerCount});
    state.typesQueue = __b.queue; state.queueTierWindows = __b.tierWindows; state.queueIndex = 0;
  `, ctx);
  const seen = [], rulesOverTime = [], eyebrows = [];
  const n = vm.runInContext('state.typesQueue.length', ctx);
  for(let i=0;i<n;i++){
    vm.runInContext('state.advanceLock=false; advanceQueue();', ctx);
    seen.push(els['screen-main'] ? els['screen-main'].dataset.scene : null);
    eyebrows.push(vm.runInContext('state.lastItem ? state.lastItem.eyebrow : null', ctx));
    rulesOverTime.push(vm.runInContext('state.activeRules.length', ctx));
  }
  return { seen, rulesOverTime, eyebrows,
    targets: JSON.parse(vm.runInContext('JSON.stringify(state.stats.targets)', ctx)) };
}

const run60 = playSession(60, 6);
const kinds60 = new Set(run60.seen.filter(Boolean));
check('Une soirée d\'une heure traverse au moins 8 compositions différentes',
  kinds60.size >= 8, kinds60.size+' : '+[...kinds60].sort().join(','));

// Pas plus de trois manches de suite de la même composition.
let longestRun = 1, cur = 1;
for(let i=1;i<run60.seen.length;i++){
  if(run60.seen[i] === run60.seen[i-1]){ cur++; longestRun = Math.max(longestRun, cur); }
  else cur = 1;
}
check('Jamais plus de 3 manches identiques d\'affilée', longestRun <= 3, 'série max '+longestRun);

// --- 4. RÈGLES : PLAFOND ET EXPIRATION -------------------------------------------------
const maxRules = Math.max(...run60.rulesOverTime);
check('Les règles actives ne dépassent jamais le plafond',
  maxRules <= vm.runInContext('MAX_ACTIVE_RULES', ctx),
  maxRules+' au plus (plafond '+vm.runInContext('MAX_ACTIVE_RULES', ctx)+')');
check('Des règles sont bien levées en cours de soirée',
  run60.eyebrows.includes('Règle levée') || run60.rulesOverTime.some((n,i)=> i>0 && n < run60.rulesOverTime[i-1]),
  'levées observées');

// --- 5. PARTICIPATION RÉPARTIE ----------------------------------------------------------
const counts = Object.values(run60.targets);
if(counts.length){
  const mn = Math.min(...counts), mx = Math.max(...counts);
  check('Les sollicitations sont réparties entre les joueurs',
    mx - mn <= Math.max(3, Math.ceil(mx * 0.55)), 'de '+mn+' à '+mx+' sollicitations');
} else {
  check('Les sollicitations sont réparties entre les joueurs', false, 'aucune sollicitation');
}

// --- 6. LES RAPPELS REVIENNENT -----------------------------------------------------------
let recallSeen = 0;
for(let t=0;t<12;t++){
  const r = playSession(60, 6);
  if(r.eyebrows.some(e => e && e.indexOf('verdict') >= 0)) recallSeen++;
}
check('Missions et prédictions donnent lieu à un rappel', recallSeen >= 6, recallSeen+'/12 soirées');

// --- 7. DEUX SOIRÉES DE SUITE NE SE RESSEMBLENT PAS ---------------------------------------
const a = playSession(30, 5), b2 = playSession(30, 5);
const sameOrder = a.eyebrows.join('|') === b2.eyebrows.join('|');
check('Deux soirées consécutives ne rejouent pas la même suite', !sameOrder);

console.log('\nComposition d\'une heure :', JSON.stringify([...kinds60].sort()));
console.log(ok ? '\nCONTENU ÉQUILIBRÉ' : '\nDÉSÉQUILIBRES DÉTECTÉS');
process.exit(ok?0:1);
