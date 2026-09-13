// Tests de la page de configuration unique
const fs=require('fs'), vm=require('vm');
const store={};
const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
function makeEl(id){return {id,innerHTML:'',textContent:'',value:'',disabled:false,style:{},dataset:{},
  classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){f?this._s.add(c):this._s.delete(c);return this._s.has(c)},contains(c){return this._s.has(c)}},
  querySelectorAll:()=>[],querySelector:()=>null,appendChild(){},setAttribute(){},focus(){},blur(){}};}
const els={};
// querySelectorAll('#name-rows .name-row-input') doit renvoyer les champs simulés
let nameInputs=[];
const document={getElementById:id=>els[id]||(els[id]=makeEl(id)),
  querySelectorAll:(sel)=>sel.includes('name-row-input')?nameInputs:[],
  querySelector:()=>null};
const ctx={console,localStorage,document,navigator:{},Sound:{play(){}},
  window:{matchMedia:()=>({matches:false})},setTimeout:f=>{f();return 0},clearInterval(){},setInterval:()=>0,
  escapeHtml:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),soberize:v=>v,goTo(){}};
vm.createContext(ctx);
['js/data/content.js','js/data/games-catalog.js','js/core/state.js','js/core/setup-wizard.js']
  .forEach(f=>vm.runInContext(fs.readFileSync('../'+f,'utf8'),ctx,{filename:f}));

let ok=true; const check=(label,cond,info='')=>{ console.log((cond?'OK   ':'ÉCHEC')+' | '+label+(info?' → '+info:'')); if(!cond) ok=false; };

// 1. Durée par défaut 30 à la première utilisation, puis dernière durée mémorisée
vm.runInContext("openSetupFor({type:'before',game:null})",ctx);
check('Durée par défaut = 30 min', vm.runInContext('state.durationMin',ctx)===30);
vm.runInContext('selectDuration(60)',ctx);
vm.runInContext("openSetupFor({type:'before',game:null})",ctx);
check('Dernière durée mémorisée', vm.runInContext('state.durationMin',ctx)===60);

// 2. Bornes de joueurs selon le jeu choisi
vm.runInContext("var duel=GAMES.find(g=>g.id==='des'); openSetupFor({type:'game',game:duel})",ctx);
const b=vm.runInContext('JSON.stringify(playerBounds())',ctx);
check('Duel de Dés borné à 2 joueurs', b==='{"min":2,"max":2}', b);
check('Compteur ramené dans les bornes', vm.runInContext('state.playerCount',ctx)===2);
vm.runInContext("var pil=GAMES.find(g=>g.id==='pilliers'); openSetupFor({type:'game',game:pil})",ctx);
check('Pilliers 3-20', vm.runInContext('JSON.stringify(playerBounds())',ctx)==='{"min":3,"max":20}');

// 3. Prénoms conservés quand on baisse puis remonte le compteur
vm.runInContext("openSetupFor({type:'before',game:null}); state.playerCount=4; nameDraft=['Alice','Bob','Chloé','Dan'];",ctx);
vm.runInContext('changeCount(-2)',ctx);
vm.runInContext('changeCount(2)',ctx);
const draft=vm.runInContext('JSON.stringify(nameDraft)',ctx);
check('Prénoms restaurés après -2 puis +2', draft==='["Alice","Bob","Chloé","Dan"]', draft);

// 4. Champ vide => "Joueur N", jamais de blocage
vm.runInContext("state.playerCount=3; nameDraft=['Alice','',''];",ctx);
const players=JSON.parse(vm.runInContext('JSON.stringify(collectPlayers())',ctx));
check('Champs vides remplacés', players[1].name==='Joueur 2'&&players[2].name==='Joueur 3',
  players.map(p=>p.name).join(', '));

// 5. Prénoms identiques => joueurs distincts
vm.runInContext("state.playerCount=2; nameDraft=['Julie','Julie'];",ctx);
const dup=JSON.parse(vm.runInContext('JSON.stringify(collectPlayers())',ctx));
check('Deux "Julie" = 2 identifiants distincts', dup[0].uid!==dup[1].uid);

// 6. Prénom long échappé correctement (pas de casse HTML)
vm.runInContext("state.playerCount=1; nameDraft=['<script>x'];",ctx);
vm.runInContext('renderNameRows()',ctx);
check('Prénom avec HTML échappé', !/<script>x/.test(els['name-rows'].innerHTML));

// 7. Un jeu précis ne se voit pas imposer la durée du before
vm.runInContext("openSetupFor({type:'game',game:GAMES.find(g=>g.id==='pof')})",ctx);
check('Durée masquée pour un jeu', els['setup-duration-block'].style.display==='none');
check('Plus de bloc ambiance dans les réglages', els['setup-mode-block']===undefined);

// 8. Une seule entrée "Lancer le before" : l'ambiance n'est plus un choix du joueur,
//    donc ni l'accueil ni les réglages ne la nomment. L'intensité est pilotée par la
//    trame du moteur (voir updateIntensityForIndex).
vm.runInContext("openSetupFor({type:'before',game:null})",ctx);
check('Bouton = "Lancer le before", sans ambiance',
  els['setup-launch-btn'].textContent==='Lancer le before', els['setup-launch-btn'].textContent);
check('Aucune ambiance nommée dans les réglages',
  !/chill|chaos/i.test(els['setup-launch-btn'].textContent));
vm.runInContext("openSetupFor({type:'game',game:GAMES.find(g=>g.id==='pof')})",ctx);
check('Bouton = Jouer à …', /^Jouer à /.test(els['setup-launch-btn'].textContent), els['setup-launch-btn'].textContent);


// 9. Les champs de prénoms restent VIDES par défaut
store['soiree_last_players_v1']=JSON.stringify([{name:'Alice'},{name:'Bob'}]);
vm.runInContext("nameDraft=[]; openSetupFor({type:'before',game:null})",ctx);
const draftVide=vm.runInContext('JSON.stringify(nameDraft)',ctx);
check('Aucun prénom prérempli', draftVide==='[]', draftVide);
check('Repère "Prénom 1" présent', /placeholder="Prénom 1"/.test(els['name-rows'].innerHTML));

// 10. Reprise du groupe précédent sur demande explicite
vm.runInContext('reusePreviousGroup()',ctx);
check('Reprise sur demande', vm.runInContext('JSON.stringify(nameDraft)',ctx)==='["Alice","Bob"]');

// 11. Lancement sans aucune saisie => Joueur 1..N
vm.runInContext("nameDraft=[]; state.playerCount=3;",ctx);
const auto=JSON.parse(vm.runInContext('JSON.stringify(collectPlayers())',ctx));
check('Sans saisie => Joueur 1,2,3', auto.map(p=>p.name).join(',')==='Joueur 1,Joueur 2,Joueur 3',
  auto.map(p=>p.name).join(','));

console.log('\n' + (ok?'TOUS LES TESTS PASSENT':'DES TESTS ÉCHOUENT'));
