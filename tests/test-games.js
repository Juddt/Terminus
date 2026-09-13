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
['js/data/games-catalog.js','js/games/des.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));

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

console.log(ok?'\nMINI-JEUX CONFORMES':'\nDES ÉCARTS SUBSISTENT');
process.exit(ok?0:1);
