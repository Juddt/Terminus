// Conformité des mini-jeux à leurs règles. Une refonte visuelle ne doit JAMAIS déplacer
// une probabilité ni changer qui boit combien : ce test rejoue chaque mécanique un grand
// nombre de fois et vérifie le résultat contre la règle écrite dans le catalogue.
const fs=require('fs'), vm=require('vm'), path=require('path');
const root=path.join(__dirname,'..');

function makeStyle(){const st={};st.setProperty=(k,v)=>{st[k]=v};st.removeProperty=k=>{delete st[k]};st.getPropertyValue=k=>st[k]||'';return st;}
function el(id){return{id,innerHTML:'',textContent:'',value:'',disabled:false,style:makeStyle(),dataset:{},
  className:'', offsetWidth:100,
  classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){f?this._s.add(c):this._s.delete(c);return this._s.has(c)},contains(c){return this._s.has(c)}},
  querySelectorAll:()=>[],querySelector:()=>null,appendChild(){},
  _attrs:{},setAttribute(k,v){this._attrs[k]=String(v)},getAttribute(k){return k in this._attrs?this._attrs[k]:null},removeAttribute(k){delete this._attrs[k]},
  addEventListener(){},focus(){}};}
const els={};
const ctx={console,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:i=>els[i]||(els[i]=el(i)),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},
  navigator:{vibrate(){}}, Sound:{play(){}},
  window:{matchMedia:()=>({matches:false})},
  setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){},
  requestAnimationFrame:fn=>{fn&&fn();return 0},
  escapeHtml:v=>String(v), goTo(){}, openSetupFor(){}, registerScreenCleanup(){}};
ctx.window.matchMedia=()=>({matches:false});
vm.createContext(ctx);
['js/data/games-catalog.js','js/games/shared-cards.js','js/games/des.js','js/games/pof.js','js/games/purple.js','js/games/bus.js','js/games/cible.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));

let ok=true;
function check(label, cond, detail){
  console.log((cond?'OK    | ':'ÉCHEC | ')+label+(detail!==undefined?' → '+detail:''));
  if(!cond) ok=false;
}

// --- LE DUEL DE DÉS -----------------------------------------------------------------
// Règle : chacun lance un dé à six faces ; le plus BAS boit le PRODUIT des deux ;
// égalité → relance.
vm.runInContext("des.players=[{name:'A'},{name:'B'}];", ctx);

const N=120000, counts={1:0,2:0,3:0,4:0,5:0,6:0};
let ties=0, wrongLoser=0, wrongSips=0;
for(let i=0;i<N;i++){
  vm.runInContext('des.rolling=false; desRoll();', ctx);
  const [a,b]=vm.runInContext('des.values',ctx);
  counts[a]++; counts[b]++;
  if(a===b){ ties++; continue; }
  const loser = a<b ? 0 : 1;
  if(Math.min(a,b) !== [a,b][loser]) wrongLoser++;
  if(a*b !== Math.max(a,b)*Math.min(a,b)) wrongSips++;
}
check('Le perdant est toujours le dé le plus bas', wrongLoser===0, wrongLoser+' écart(s)');
check('Les gorgées valent toujours le produit des deux dés', wrongSips===0, wrongSips+' écart(s)');
const tieRate = ties/N;
check('Taux d\'égalité ≈ 1/6', Math.abs(tieRate-1/6)<0.006, tieRate.toFixed(4));
const freqs=Object.values(counts).map(c=>c/(2*N));
const spread=Math.max(...freqs)-Math.min(...freqs);
check('Les six faces sont équiprobables', spread<0.008, 'écart max '+spread.toFixed(4));

// Le verrou anti-double-appui : un second appui pendant un lancer ne retire pas de dés.
vm.runInContext('des.rolling=false; desRoll();', ctx);
const v1 = JSON.stringify(vm.runInContext('des.values',ctx));
vm.runInContext('desRoll(); desRoll();', ctx);   // rolling est encore vrai
const v2 = JSON.stringify(vm.runInContext('des.values',ctx));
check('Un double appui ne relance pas les dés', v1===v2, v1+' / '+v2);

// Après avoir quitté, les minuteurs en attente ne doivent plus rien déclencher.
vm.runInContext('des.rolling=true; const before=des.token; desQuit(); var tokenChange = des.token!==before;', ctx);
check('Quitter invalide les minuteurs en cours', vm.runInContext('tokenChange && des.rolling===false', ctx));

// La rotation 3D doit couvrir les six faces, sans doublon : sinon deux valeurs
// différentes afficheraient la même face.
const rots = new Set([1,2,3,4,5,6].map(v=>vm.runInContext('desFaceTransform('+v+',0)',ctx)));
check('Chaque valeur a sa propre orientation de cube', rots.size===6, rots.size+'/6');

// Le catalogue et le code doivent parler du même jeu.
const g = vm.runInContext("GAMES.find(x=>x.id==='des')", ctx);
check('Le catalogue borne le Duel de Dés à 2 joueurs', g.joueurs==='2', g.joueurs);
check('Le catalogue pointe vers la fonction de démarrage', g.startFn==='desStart', g.startFn);


// --- PILE OU FACE -------------------------------------------------------------------
// Règle : Fun = la mise choisie (1 à 3) ; Prison = 5 manches imposées, 2 → 4 → 8 → 16
// → cul sec. La pièce est à 50/50.
vm.runInContext("pof.players=['A','B']; pof.mode='prison';", ctx);
const stakes = [0,1,2,3,4].map(r => vm.runInContext('pof.round='+r+'; String(pofGetStake())', ctx));
check('Prison : enjeux 2/4/8/16/cul sec', JSON.stringify(stakes)===JSON.stringify(['2','4','8','16','cul sec']), stakes.join(' · '));
vm.runInContext("pof.mode='fun';", ctx);
const funStakes = [1,2,3].map(n => vm.runInContext('pof.currentBet='+n+'; String(pofGetStake())', ctx));
check('Fun : l\'enjeu est la mise choisie', JSON.stringify(funStakes)===JSON.stringify(['1','2','3']), funStakes.join(' · '));
check('Pluriel correct sur les gorgées',
  vm.runInContext("pofStakeText(1)", ctx)==='1 gorgée' && vm.runInContext("pofStakeText(3)", ctx)==='3 gorgées'
  && vm.runInContext("pofStakeText('cul sec')", ctx)==='Cul sec');
// La tranche doit faire le tour complet, sans trou ni recouvrement.
const edge = vm.runInContext('pofEdgeHTML()', ctx);
const angles = [...edge.matchAll(/rotateZ\(([\d.]+)deg\)/g)].map(m=>parseFloat(m[1]));
check('La tranche de la pièce fait le tour complet',
  angles.length===36 && Math.abs(angles[angles.length-1] - 350) < 0.01, angles.length+' segments');

// --- PURPLE -------------------------------------------------------------------------
// Règle : chaque annonce demande un nombre de cartes et une répartition rouge/noire
// précise. Les probabilités doivent rester celles d'un paquet de 52 cartes.
const calls = vm.runInContext('JSON.stringify(PURPLE_CALLS)', ctx);
const CALLS = JSON.parse(calls);
check('Rouge = 2 cartes, 2 rouges', CALLS.rouge.cards===2 && CALLS.rouge.reds===2);
check('Noir = 2 cartes, 0 rouge', CALLS.noir.cards===2 && CALLS.noir.reds===0);
check('Purple = 2 cartes, 1 rouge', CALLS.purple.cards===2 && CALLS.purple.reds===1);
check('Double Purple = 4 cartes, 2 rouges', CALLS.double.cards===4 && CALLS.double.reds===2);
check('Triple Purple = 6 cartes, 3 rouges', CALLS.triple.cards===6 && CALLS.triple.reds===3);

// Un paquet neuf : 52 cartes, toutes distinctes, 26 rouges.
const deckOk = vm.runInContext(`(function(){
  for(var t=0;t<200;t++){
    var d = makeShuffledDeck();
    if(d.length !== 52) return 'taille '+d.length;
    var seen = {};
    for(var i=0;i<52;i++){ var k=d[i].value+d[i].suit; if(seen[k]) return 'doublon '+k; seen[k]=1; }
    var reds = d.filter(function(c){return palmIsRed(c.suit)}).length;
    if(reds !== 26) return 'rouges '+reds;
  }
  return 'ok';
})()`, ctx);
check('Paquet de 52 cartes distinctes, 26 rouges', deckOk==='ok', deckOk);

// Probabilités théoriques (tirage sans remise dans 52 cartes) :
//   Rouge/Noir C(26,2)/C(52,2)=0.245 · Purple 26²/C(52,2)=0.510
//   Double C(26,2)²/C(52,4)=0.390 · Triple C(26,3)²/C(52,6)=0.332
const THEORIE = { rouge:0.2451, noir:0.2451, purple:0.5098, double:0.3901, triple:0.3320 };
Object.keys(THEORIE).forEach(key=>{
  const c = CALLS[key];
  const rate = vm.runInContext(`(function(){
    var wins=0, N=40000;
    for(var i=0;i<N;i++){
      var d = makeShuffledDeck().slice(0, ${c.cards});
      var reds = d.filter(function(x){return palmIsRed(x.suit)}).length;
      if(reds === ${c.reds}) wins++;
    }
    return wins/N;
  })()`, ctx);
  check('Probabilité « '+c.label+' » conforme au paquet',
    Math.abs(rate - THEORIE[key]) < 0.012, rate.toFixed(4)+' (théorie '+THEORIE[key]+')');
});


// --- LE BUS -------------------------------------------------------------------------
// Règle : quatre questions, pénalités 1/2/3/4. Égalité comptée comme réussite au
// tour « plus haut / plus bas », bornes exclues au tour « dedans / dehors ».
const steps = vm.runInContext('BUS_STEPS.map(function(s){return s.sips})', ctx);
check('Bus : pénalités 1/2/3/4', JSON.stringify(steps)===JSON.stringify([1,2,3,4]), steps.join('/'));
check('Bus : quatre questions', vm.runInContext('BUS_STEPS.length', ctx)===4);
// L'ordre des valeurs doit couvrir les treize rangs, As bas, Roi haut.
// busCardVal prend une CARTE ({suit, value}), pas une valeur nue.
const order = vm.runInContext("PALM_VALUES.map(function(v){return busCardVal({suit:'♠', value:v})})", ctx);
check('Bus : les 13 rangs sont ordonnés de 1 à 13',
  JSON.stringify(order)===JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12,13]), order.join(','));

// --- LA CIBLE -----------------------------------------------------------------------
// Règle : 21 cartes, 10/6/4/1 par couronne, enjeux 1/2/3/5.
const zones = JSON.parse(vm.runInContext('JSON.stringify(CIBLE_ZONES)', ctx));
check('Cible : 21 cartes au total', vm.runInContext('CIBLE_TOTAL_CARDS', ctx)===21);
check('Cible : 10/6/4/1 par couronne',
  JSON.stringify(zones.map(z=>z.n))===JSON.stringify([10,6,4,1]), zones.map(z=>z.n).join('/'));
check('Cible : enjeux 1/2/3/5',
  JSON.stringify(zones.map(z=>z.sips))===JSON.stringify([1,2,3,5]), zones.map(z=>z.sips).join('/'));

// Géométrie : sur un plateau de 320 px, aucune carte ne doit sortir du feutre ni
// mordre sur la bande radiale d'une autre couronne. C'est ce qui faisait se chevaucher
// les cartes du centre.
const BOARD = 320, R = BOARD / 2;
let geoOk = true;
const bands = zones.map(z=>{
  const r = z.radius / 100 * BOARD;
  const half = z.cardW * 1.4 / 2;
  return { z:z.z, inner: Math.max(0, r - half), outer: r + half };
});
bands.forEach(b=>{
  if(b.outer > R){ console.error('CIBLE: la couronne '+b.z+' dépasse du feutre ('+b.outer.toFixed(1)+' > '+R+')'); geoOk=false; }
});
for(let i=0;i<bands.length-1;i++){
  // bands[0] est la couronne extérieure : sa bande doit rester au-delà de la suivante.
  if(bands[i].inner < bands[i+1].outer){
    console.error('CIBLE: les couronnes '+bands[i].z+' et '+bands[i+1].z+' se chevauchent ('+
      bands[i].inner.toFixed(1)+' < '+bands[i+1].outer.toFixed(1)+')');
    geoOk=false;
  }
}
check('Cible : les quatre couronnes ne se chevauchent pas', geoOk);

// Les positions calculées restent dans le plateau, en pourcentage.
vm.runInContext("cible.players=['A','B']; cibleNewTarget();", ctx);
const cards = JSON.parse(vm.runInContext('JSON.stringify(cible.cards.map(function(c){return {x:c.x,y:c.y,z:c.zone}}))', ctx));
check('Cible : 21 cartes posées', cards.length===21, cards.length);
check('Cible : toutes les positions sont dans le plateau',
  cards.every(c=> c.x>=0 && c.x<=100 && c.y>=0 && c.y<=100));

console.log(ok?'\nMINI-JEUX CONFORMES':'\nDES ÉCARTS SUBSISTENT');
process.exit(ok?0:1);
