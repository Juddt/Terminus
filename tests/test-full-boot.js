// Test de démarrage réel : charge TOUS les scripts dans l'ordre du HTML et joue une
// soirée complète. C'est ce test qui attrape les fonctions manquantes (comme tickGlobal)
// que la simple vérification de syntaxe ne voit pas.
const fs=require('fs'),vm=require('vm');
const store={};
const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
const ctx2d=new Proxy({},{get:()=>()=>({}) , set:()=>true});
function el(id){return{id,innerHTML:'',textContent:'',value:'',disabled:false,style:{},dataset:{},
 offsetWidth:100,offsetHeight:100,width:300,height:300,
 classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){f?this._s.add(c):this._s.delete(c);return this._s.has(c)},contains(c){return this._s.has(c)}},
 querySelectorAll:()=>[],querySelector:()=>null,appendChild(){},removeChild(){},setAttribute(){},
 addEventListener(){},removeEventListener(){},focus(){},blur(){},remove(){},
 getContext:()=>ctx2d,getBoundingClientRect:()=>({top:0,left:0,width:300,height:300}),
 toDataURL:()=>'data:,',getTotalLength:()=>100,getPointAtLength:()=>({x:0,y:0})};}
const els={};
const document={getElementById:i=>els[i]||(els[i]=el(i)),querySelectorAll:()=>[],querySelector:()=>el('x'),addEventListener(){},createElement:t=>el('new-'+t),body:el('body')};
const ctx={console,localStorage,document,navigator:{},Sound:{play(){},toggle(){}},AudioContext:function(){return{createOscillator:()=>({connect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},type:""}),createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}}}),currentTime:0,destination:{},state:"running",resume(){}}},
 window:{matchMedia:()=>({matches:false}),location:{href:'http://x/'},history:{replaceState(){}},
   addEventListener(){},removeEventListener(){},requestAnimationFrame:()=>0},
 requestAnimationFrame:()=>0,cancelAnimationFrame(){},
 setTimeout:f=>{f();return 0},clearInterval(){},setInterval:()=>0,URL:global.URL};
vm.createContext(ctx);

// Ordre exact des <script> d'index.html
const html=fs.readFileSync('../index.html','utf8');
const files=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
let ok=true;
files.forEach(f=>{
  try{ vm.runInContext(fs.readFileSync('../'+f,'utf8'),ctx,{filename:f}); }
  catch(e){ console.log('ÉCHEC chargement '+f+' : '+e.message); ok=false; }
});
console.log('Scripts chargés :', files.length, ok?'OK':'AVEC ERREURS');

[10,30,60].forEach(d=>{
  try{
    vm.runInContext(`state.playerCount=4; nameDraft=['A','B','C','D']; state.durationMin=${d};
      state.sessionMode='chaos'; launchSession();`,ctx);
    for(let i=0;i<40;i++) vm.runInContext('state.advanceLock=false; tickGlobal();',ctx);
    for(let i=0;i<25;i++) vm.runInContext('state.advanceLock=false; advanceQueue();',ctx);
    vm.runInContext('openPause(); closePause(); quitSessionToHome(); resumeSession(); endSession();',ctx);
    console.log('Durée '+d+' min : lancement, 40 tics, 25 manches, pause/reprise, fin → OK');
  }catch(e){ console.log('Durée '+d+' min : ÉCHEC — '+e.message); ok=false; }
});
console.log(ok?'\nDÉMARRAGE COMPLET OK':'\nDES ERREURS SUBSISTENT');
