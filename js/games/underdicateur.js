// UnderDicateur — jeu social à rôles cachés (Undercover + un Dictateur aux pouvoirs
// secrets). Le téléphone circule de main en main : chaque joueur découvre son rôle
// seul, puis tout se joue à l'oral autour de la table. L'app ne sert qu'à distribuer
// les secrets, cadencer les phases et enregistrer l'élimination votée à main levée.
//
// Le Dictateur est tiré parmi TOUS les joueurs — il peut donc être un Citoyen comme
// l'Undercover. Ses pouvoirs servent son camp d'origine ; il n'a pas de condition de
// victoire propre, ce qui garde les trois camps du jeu original intacts.

const und = {
  players: [],              // {name, role:'citoyen'|'undercover'|'white', word, alive, dict}
  config: { white:true, dictateur:true },
  citizenWord:'', undercoverWord:'',
  revealIdx:0, revealShown:false,
  round:0, startIdx:0,
  dictIdx:-1,
  dictPowers:{ execution:true, protection:true, distribution:true },
  dictRetired:false,        // le Dictateur a renoncé définitivement
  dictPassIdx:0,
  protectedIdx:-1,
  pendingAction:null,       // {type,target} choisi par le Dictateur, appliqué en fin de passage
  lastAction:'',            // texte annoncé au groupe après la phase Dictateur
};

const UND_BAG_KEY = 'soiree_und_wordbag_v1';

/* ---------- Setup ---------- */

function underdicateurSetup(){
  und.players = [];
  document.getElementById('und-chips').innerHTML = '';
  document.getElementById('und-name-field').value = '';
  document.getElementById('und-start-btn').disabled = true;
  goTo('und-setup');
  setTimeout(function(){ document.getElementById('und-name-field').focus(); }, 100);
}

document.getElementById('und-name-field').addEventListener('keydown', function(e){
  if(e.key === 'Enter'){
    const val = e.target.value.trim();
    if(val && und.players.length < 12){
      und.players.push({ name:val, role:'citoyen', word:'', alive:true, dict:false });
      e.target.value = '';
      undRenderChips();
    }
  }
});

function undRenderChips(){
  const wrap = document.getElementById('und-chips');
  wrap.innerHTML = '';
  und.players.forEach(function(p,i){
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = p.name + '<span class="x" onclick="undRemovePlayer('+i+')">&times;</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('und-start-btn').disabled = und.players.length < 4;
}
function undRemovePlayer(i){ und.players.splice(i,1); undRenderChips(); }

// Répartition des rôles selon l'effectif. On garantit toujours une majorité citoyenne
// au départ, sinon les Undercover gagneraient dès la première manche.
function undComposition(){
  const n = und.players.length;
  let uc = n <= 7 ? 1 : (n <= 9 ? 2 : 3);
  const w = (und.config.white && n >= 5) ? 1 : 0;
  while(n - uc - w <= uc && uc > 1) uc--;
  return { uc:uc, w:w, cit:n - uc - w };
}

function undShowConfig(){
  goTo('und');
  const c = undComposition();
  const line = function(on, label, sub, fn){
    return '<div class="und-opt'+(on?' on':'')+'" onclick="'+fn+'">'+
      '<div class="und-opt-txt"><h4>'+label+'</h4><p>'+sub+'</p></div>'+
      '<div class="und-switch'+(on?' on':'')+'"></div>'+
    '</div>';
  };

  document.getElementById('und-header').innerHTML = '<div class="badge">Réglages</div>';
  document.getElementById('und-body').innerHTML =
    '<div class="und-h1">La composition</div>'+
    '<div class="und-compo">'+
      '<span><b>'+c.cit+'</b> Citoyen'+(c.cit>1?'s':'')+'</span>'+
      '<span><b>'+c.uc+'</b> Undercover</span>'+
      (c.w ? '<span><b>1</b> Mister White</span>' : '')+
    '</div>'+
    '<div class="und-opts">'+
      line(und.config.white, 'Mister White', 'Un joueur sans aucun mot. Il improvise — et peut voler la partie s&rsquo;il devine le mot.', 'und.config.white=!und.config.white;undShowConfig()')+
      line(und.config.dictateur, 'Le Dictateur', 'Un joueur au hasard reçoit trois pouvoirs secrets, un seul usage chacun.', 'und.config.dictateur=!und.config.dictateur;undShowConfig()')+
    '</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-ghost" style="flex:1;" onclick="goTo(\'und-setup\')">Retour</button>'+
    '<button class="btn btn-primary" style="flex:2;" onclick="undDealRoles()">Distribuer les rôles</button>';
}

/* ---------- Distribution des rôles ---------- */

// Sac persistant : on parcourt les 200 paires dans un ordre mélangé avant d'en revoir
// une seule. Le côté "mot des citoyens" est ensuite tiré à pile ou face, ce qui double
// la variété perçue sans toucher au contenu.
function undDrawPair(){
  let bag = null;
  try{ bag = JSON.parse(localStorage.getItem(UND_BAG_KEY)); }catch(e){}
  if(!bag || !Array.isArray(bag.order) || bag.order.length !== UND_WORD_PAIRS.length || bag.i >= bag.order.length){
    bag = { order: shuffleArr(UND_WORD_PAIRS.map(function(_,i){ return i; })), i:0 };
  }
  const pair = UND_WORD_PAIRS[bag.order[bag.i]];
  bag.i++;
  try{ localStorage.setItem(UND_BAG_KEY, JSON.stringify(bag)); }catch(e){}
  return Math.random() < 0.5 ? { cit:pair[0], uc:pair[1] } : { cit:pair[1], uc:pair[0] };
}

function undDealRoles(){
  const n = und.players.length;
  const c = undComposition();
  const pair = undDrawPair();
  und.citizenWord = pair.cit;
  und.undercoverWord = pair.uc;

  const roles = [];
  for(let i=0;i<c.uc;i++) roles.push('undercover');
  for(let i=0;i<c.w;i++)  roles.push('white');
  while(roles.length < n) roles.push('citoyen');
  const shuffled = shuffleArr(roles);

  und.players.forEach(function(p,i){
    p.role  = shuffled[i];
    p.alive = true;
    p.dict  = false;
    p.word  = p.role === 'citoyen' ? und.citizenWord : (p.role === 'undercover' ? und.undercoverWord : '');
  });

  und.dictIdx = und.config.dictateur ? Math.floor(Math.random()*n) : -1;
  if(und.dictIdx >= 0) und.players[und.dictIdx].dict = true;
  und.dictPowers = { execution:true, protection:true, distribution:true };
  und.dictRetired = false;
  und.protectedIdx = -1;
  und.lastAction = '';
  und.round = 0;
  und.revealIdx = 0;
  und.revealShown = false;

  // Le premier à parler ne doit jamais être Mister White : sans mot ni indice, il
  // serait grillé en une seconde et le rôle perdrait tout son intérêt.
  const openers = [];
  und.players.forEach(function(p,i){ if(p.role !== 'white') openers.push(i); });
  und.startIdx = openers[Math.floor(Math.random()*openers.length)];

  undRenderReveal();
}

/* ---------- Passage du téléphone : découverte des rôles ---------- */

function undRenderReveal(){
  goTo('und');
  const p = und.players[und.revealIdx];
  document.getElementById('und-header').innerHTML =
    '<div class="badge">Rôles <span class="bv">'+(und.revealIdx+1)+'/'+und.players.length+'</span></div>';

  if(!und.revealShown){
    document.getElementById('und-body').innerHTML =
      '<div class="und-pass">Passe le téléphone à</div>'+
      '<div class="palm-player-big">'+p.name+'</div>'+
      '<div class="und-sub">Personne d&rsquo;autre ne regarde.</div>';
    document.getElementById('und-footer').innerHTML =
      '<button class="btn btn-primary" onclick="und.revealShown=true;undRenderReveal()">C&rsquo;est moi</button>';
    return;
  }

  const isLast = und.revealIdx === und.players.length - 1;
  let card;
  if(p.role === 'white'){
    card = '<div class="und-role white">Mister White</div>'+
           '<div class="und-word none">Aucun mot</div>'+
           '<div class="und-sub">Écoute, déduis, et fais-toi passer pour un Citoyen.</div>';
  } else {
    card = '<div class="und-role">Ton mot</div>'+
           '<div class="und-word">'+p.word+'</div>'+
           '<div class="und-sub">Un seul mot par tour pour le décrire. Sans jamais le dire.</div>';
  }
  if(p.dict){
    card += '<div class="und-dict-tag">Tu es le Dictateur. Trois pouvoirs secrets, un seul usage chacun.</div>';
  }

  document.getElementById('und-body').innerHTML = card;
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-primary" onclick="undNextReveal()">'+(isLast ? 'Tout le monde a vu' : 'J&rsquo;ai vu — au suivant')+'</button>';
}

function undNextReveal(){
  und.revealShown = false;
  und.revealIdx++;
  if(und.revealIdx >= und.players.length){ undStartRound(); return; }
  undRenderReveal();
}

/* ---------- Tour de table ---------- */

function undAlive(){
  const out = [];
  und.players.forEach(function(p,i){ if(p.alive) out.push(i); });
  return out;
}

function undHeader(){
  const a = undAlive().length;
  document.getElementById('und-header').innerHTML =
    '<div class="badge">Manche <span class="bv">'+(und.round+1)+'</span></div>'+
    '<div class="badge">En jeu <span class="bv">'+a+'</span></div>';
}

function undStartRound(){
  goTo('und');
  undHeader();
  und.protectedIdx = -1;

  // L'ordre repart du même joueur d'ouverture, en sautant les éliminés.
  const alive = undAlive();
  let start = alive.indexOf(und.startIdx);
  if(start < 0) start = 0;
  const order = alive.slice(start).concat(alive.slice(0, start));

  const list = order.map(function(i,n){
    return '<div class="und-turn"><span class="und-turn-n">'+(n+1)+'</span>'+und.players[i].name+'</div>';
  }).join('');

  document.getElementById('und-body').innerHTML =
    '<div class="und-h1">Tour de table</div>'+
    '<div class="und-sub" style="margin-bottom:14px;">Chacun dit <b>un seul mot</b> pour décrire le sien. Interdit de le prononcer.</div>'+
    '<div class="und-order">'+list+'</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-ghost" style="flex:1;" onclick="goTo(\'games-list\')">Quitter</button>'+
    '<button class="btn btn-primary" style="flex:2;" onclick="undAfterTable()">Tour terminé</button>';
}

// Après le tour de table : phase Dictateur si le rôle est en jeu, encore vivant et
// détenteur d'au moins un pouvoir. Sinon on enchaîne directement sur le vote.
function undAfterTable(){
  const hasPower = und.dictPowers.execution || und.dictPowers.protection || und.dictPowers.distribution;
  if(und.dictIdx >= 0 && und.players[und.dictIdx].alive && !und.dictRetired && hasPower){
    und.dictPassIdx = 0;
    undRenderDictPass();
  } else {
    undRenderVote();
  }
}

/* ---------- Phase du Dictateur ---------- */

// Le téléphone refait un tour complet : tous les joueurs voient le même nombre d'écrans
// et de boutons, qu'ils soient Dictateur ou non. C'est la seule façon de garder son
// identité secrète — et c'est aussi pour ça que l'effet choisi n'est annoncé qu'une fois
// le passage terminé, jamais au moment où il est joué.
function undRenderDictPass(){
  goTo('und');
  const alive = undAlive();
  if(und.dictPassIdx >= alive.length){ undResolveDictAction(); return; }

  const idx = alive[und.dictPassIdx];
  const p = und.players[idx];
  undHeader();
  document.getElementById('und-body').innerHTML =
    '<div class="und-pass">Phase secrète — passe à</div>'+
    '<div class="palm-player-big">'+p.name+'</div>'+
    '<div class="und-sub">Tout le monde regarde ailleurs.</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-primary" onclick="undOpenDictScreen('+idx+')">C&rsquo;est moi</button>';
}

function undOpenDictScreen(idx){
  const p = und.players[idx];
  // Un non-Dictateur — ou le Dictateur qui a déjà agi ce tour — voit un écran neutre.
  if(!p.dict || und.pendingAction){
    document.getElementById('und-body').innerHTML =
      '<div class="und-role">Rien pour toi</div>'+
      '<div class="und-sub" style="margin-top:10px;">Garde ton visage impassible et passe au suivant.</div>';
    document.getElementById('und-footer').innerHTML =
      '<button class="btn btn-primary" onclick="und.dictPassIdx++;undRenderDictPass()">Suivant</button>';
    return;
  }
  undRenderPowers();
}

function undRenderPowers(){
  const pw = und.dictPowers;
  const btn = function(on, key, label, sub){
    if(!on) return '<div class="und-power spent"><h4>'+label+'</h4><p>Déjà utilisé</p></div>';
    return '<div class="und-power" onclick="undPickPower(\''+key+'\')"><h4>'+label+'</h4><p>'+sub+'</p></div>';
  };
  document.getElementById('und-body').innerHTML =
    '<div class="und-h1">Tes pouvoirs</div>'+
    '<div class="und-powers">'+
      btn(pw.execution,'execution','Exécution','Élimine qui tu veux sur-le-champ. Pas de vote ce tour. Tu bois 1 gorgée.')+
      btn(pw.protection,'protection','Protection','Un joueur devient inéliminable ce tour. Le vote tombe à l&rsquo;eau.')+
      btn(pw.distribution,'distribution','Distribution','Fais boire 3 gorgées à qui tu veux. Aucun effet sur le vote.')+
    '</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-ghost" style="flex:1;" onclick="undDictRetire()">Renoncer</button>'+
    '<button class="btn btn-primary" style="flex:2;" onclick="und.dictPassIdx++;undRenderDictPass()">Passer ce tour</button>';
}

function undDictRetire(){
  und.dictRetired = true;
  document.getElementById('und-body').innerHTML =
    '<div class="und-role">Pouvoirs abandonnés</div>'+
    '<div class="und-sub" style="margin-top:10px;">La phase secrète ne reviendra plus. Tu redeviens un joueur comme les autres.</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-primary" onclick="und.dictPassIdx++;undRenderDictPass()">Suivant</button>';
}

function undPickPower(key){
  const labels = { execution:'Qui disparaît ?', protection:'Qui protèges-tu ?', distribution:'Qui boit 3 gorgées ?' };
  const alive = undAlive();
  const list = alive.filter(function(i){
    // On ne s'exécute pas soi-même ; se protéger ou se servir à boire reste permis.
    return !(key === 'execution' && und.players[i].dict);
  }).map(function(i){
    return '<div class="und-target" onclick="undConfirmPower(\''+key+'\','+i+')">'+und.players[i].name+'</div>';
  }).join('');

  document.getElementById('und-body').innerHTML =
    '<div class="und-h1">'+labels[key]+'</div>'+
    '<div class="und-targets">'+list+'</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-ghost" onclick="undRenderPowers()">Retour</button>';
}

function undConfirmPower(key, target){
  und.dictPowers[key] = false;
  und.pendingAction = { type:key, target:target };
  document.getElementById('und-body').innerHTML =
    '<div class="und-role">C&rsquo;est noté</div>'+
    '<div class="und-sub" style="margin-top:10px;">L&rsquo;effet sera annoncé quand le téléphone aura fini son tour. Personne ne saura d&rsquo;où il vient.</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-primary" onclick="und.dictPassIdx++;undRenderDictPass()">Suivant</button>';
}

// L'effet n'est révélé qu'ici, une fois le téléphone revenu au centre : le groupe voit
// la conséquence sans jamais voir qui l'a déclenchée.
function undResolveDictAction(){
  const act = und.pendingAction;
  und.pendingAction = null;
  if(!act){ undRenderVote(); return; }

  const name = und.players[act.target].name;
  goTo('und');
  undHeader();

  if(act.type === 'distribution'){
    document.getElementById('und-body').innerHTML =
      '<div class="und-h1">Le Dictateur a frappé</div>'+
      '<div class="palm-player-big" style="margin-top:8px;">'+name+'</div>'+
      '<div class="und-drink">boit 3 gorgées</div>';
    document.getElementById('und-footer').innerHTML =
      '<button class="btn btn-primary" onclick="undRenderVote()">Passer au vote</button>';
    vibrate([40,40,40]);
    return;
  }

  if(act.type === 'protection'){
    // On ne dit surtout pas qui est protégé : la surprise se joue au moment du vote.
    und.protectedIdx = act.target;
    document.getElementById('und-body').innerHTML =
      '<div class="und-h1">Le Dictateur a agi</div>'+
      '<div class="und-sub" style="margin-top:10px;">Quelque chose a changé. Vous saurez quoi bien assez tôt.</div>';
    document.getElementById('und-footer').innerHTML =
      '<button class="btn btn-primary" onclick="undRenderVote()">Passer au vote</button>';
    return;
  }

  // Exécution : élimination immédiate, le vote de la manche saute.
  und.players[act.target].alive = false;
  document.getElementById('und-body').innerHTML =
    '<div class="und-h1">Exécution</div>'+
    '<div class="palm-player-big" style="margin-top:8px;">'+name+'</div>'+
    '<div class="und-drink">quitte la table et boit 3 gorgées</div>'+
    '<div class="und-sub" style="margin-top:8px;">Le Dictateur en boit 1. Pas de vote ce tour.</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-primary" onclick="undAfterElimination('+act.target+')">Révéler son rôle</button>';
  vibrate([80,50,120]);
}

/* ---------- Vote ---------- */

function undRenderVote(){
  goTo('und');
  undHeader();
  const list = undAlive().map(function(i){
    return '<div class="und-target" onclick="undVote('+i+')">'+und.players[i].name+'</div>';
  }).join('');
  document.getElementById('und-body').innerHTML =
    '<div class="und-h1">Le vote</div>'+
    '<div class="und-sub" style="margin-bottom:14px;">À trois, tout le monde pointe du doigt. Touchez ensuite le nom de l&rsquo;éliminé.</div>'+
    '<div class="und-targets">'+list+'</div>';
  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-ghost" onclick="goTo(\'games-list\')">Quitter</button>';
}

function undVote(idx){
  goTo('und');
  undHeader();

  if(idx === und.protectedIdx){
    und.protectedIdx = -1;
    document.getElementById('und-body').innerHTML =
      '<div class="und-h1" style="color:var(--sage);">Protégé</div>'+
      '<div class="palm-player-big" style="margin-top:8px;">'+und.players[idx].name+'</div>'+
      '<div class="und-sub" style="margin-top:8px;">Le Dictateur veillait. Personne ne quitte la table — et tout le groupe boit 1 gorgée de dépit.</div>';
    document.getElementById('und-footer').innerHTML =
      '<button class="btn btn-primary" onclick="undNextRound()">Manche suivante</button>';
    vibrate([30,30,30,30,60]);
    return;
  }

  und.players[idx].alive = false;
  undAfterElimination(idx);
}

/* ---------- Élimination et conditions de victoire ---------- */

const UND_ROLE_LABEL = { citoyen:'Citoyen', undercover:'Undercover', white:'Mister White' };

function undAfterElimination(idx){
  const p = und.players[idx];
  goTo('und');
  undHeader();

  // Mister White éliminé : il a droit à une dernière chance de rafler la partie.
  if(p.role === 'white'){
    document.getElementById('und-body').innerHTML =
      '<div class="und-h1">C&rsquo;était Mister White</div>'+
      '<div class="und-sub" style="margin:10px 0 14px;">Dernière chance : le mot des Citoyens, c&rsquo;était quoi ?</div>'+
      '<input type="text" id="und-guess-field" class="name-input" placeholder="Le mot des Citoyens" autocomplete="off" style="width:100%;max-width:280px;text-align:center;">';
    document.getElementById('und-footer').innerHTML =
      '<button class="btn btn-ghost" style="flex:1;" onclick="undGuess(true)">Il sèche</button>'+
      '<button class="btn btn-primary" style="flex:2;" onclick="undGuess(false)">Valider</button>';
    setTimeout(function(){
      const f = document.getElementById('und-guess-field');
      if(f) f.focus();
    }, 100);
    return;
  }

  const wrong = p.role === 'citoyen';
  document.getElementById('und-body').innerHTML =
    '<div class="palm-player-big">'+p.name+'</div>'+
    '<div class="und-reveal '+p.role+'">'+UND_ROLE_LABEL[p.role]+'</div>'+
    (p.dict ? '<div class="und-dict-tag">C&rsquo;était aussi le Dictateur.</div>' : '')+
    '<div class="und-drink">'+(wrong
      ? 'Mauvaise pioche. Tous les Citoyens boivent 1 gorgée.'
      : 'Bien vu. '+p.name+' boit 2 gorgées.')+'</div>';
  vibrate(wrong ? [120] : [40,40,40]);

  const win = undCheckWin();
  document.getElementById('und-footer').innerHTML = win
    ? '<button class="btn btn-primary" onclick="undEnd(\''+win+'\')">Résultat</button>'
    : '<button class="btn btn-primary" onclick="undNextRound()">Manche suivante</button>';
}

// Normalisation permissive : accents, casse, ponctuation et espaces multiples ignorés,
// pour ne pas priver Mister White d'une victoire méritée sur une faute de frappe.
function undNormalize(s){
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
}

function undGuess(skipped){
  const f = document.getElementById('und-guess-field');
  const raw = skipped ? '' : (f ? f.value : '');
  const ok = !skipped && undNormalize(raw) === undNormalize(und.citizenWord);
  if(ok){ undEnd('white'); return; }

  goTo('und');
  undHeader();
  document.getElementById('und-body').innerHTML =
    '<div class="und-h1" style="color:var(--clay);">Raté</div>'+
    (raw.trim() ? '<div class="und-sub" style="margin-top:8px;">« '+raw.trim()+' », ce n&rsquo;était pas ça.</div>' : '')+
    '<div class="und-drink">Mister White quitte la table et boit 3 gorgées.</div>';
  vibrate([120]);

  const win = undCheckWin();
  document.getElementById('und-footer').innerHTML = win
    ? '<button class="btn btn-primary" onclick="undEnd(\''+win+'\')">Résultat</button>'
    : '<button class="btn btn-primary" onclick="undNextRound()">Manche suivante</button>';
}

function undCheckWin(){
  let uc = 0, w = 0, cit = 0;
  und.players.forEach(function(p){
    if(!p.alive) return;
    if(p.role === 'undercover') uc++;
    else if(p.role === 'white') w++;
    else cit++;
  });
  if(uc === 0 && w === 0) return 'citoyens';
  if(uc > 0 && uc >= cit + w) return 'undercover';
  return null;
}

function undNextRound(){
  und.round++;
  undStartRound();
}

/* ---------- Fin de partie ---------- */

const UND_WIN_TEXT = {
  citoyens:   { t:'Les Citoyens gagnent',  s:'Tous les imposteurs ont été démasqués.', c:'var(--sage)' },
  undercover: { t:'Les Undercover gagnent', s:'Ils sont désormais assez nombreux pour faire la loi.', c:'var(--clay)' },
  white:      { t:'Mister White gagne',    s:'Sans le moindre mot, il a trouvé le vôtre.', c:'var(--accent)' },
};

function undEnd(winner){
  const w = UND_WIN_TEXT[winner];
  goTo('und');
  document.getElementById('und-header').innerHTML = '<div class="badge">Fin de partie</div>';

  const roster = und.players.map(function(p){
    return '<div class="und-row'+(p.alive?'':' out')+'">'+
      '<span class="und-row-name">'+p.name+(p.dict?' <span class="und-crown">Dictateur</span>':'')+'</span>'+
      '<span class="und-row-role '+p.role+'">'+UND_ROLE_LABEL[p.role]+'</span>'+
    '</div>';
  }).join('');

  // Le camp perdant paie l'addition. Mister White vainqueur fait boire toute la table.
  const penalty = winner === 'citoyens'
    ? 'Les Undercover et Mister White boivent 3 gorgées.'
    : (winner === 'undercover'
      ? 'Tous les Citoyens boivent 3 gorgées.'
      : 'Toute la table boit 3 gorgées.');

  creatorsGlasses++;
  document.getElementById('und-body').innerHTML =
    '<div class="und-win" style="color:'+w.c+';">'+w.t+'</div>'+
    '<div class="und-sub" style="margin-top:6px;">'+w.s+'</div>'+
    '<div class="und-words">'+
      '<div><small>Citoyens</small>'+und.citizenWord+'</div>'+
      '<div><small>Undercover</small>'+und.undercoverWord+'</div>'+
    '</div>'+
    '<div class="und-roster">'+roster+'</div>'+
    '<div class="und-drink">'+penalty+'</div>'+
    '<div class="und-creators">🥂 '+creatorsGlasses+' verre'+(creatorsGlasses>1?'s':'')+' pour les créateurs du jeu</div>';

  document.getElementById('und-footer').innerHTML =
    '<button class="btn btn-ghost" style="flex:1;" onclick="underdicateurSetup()">Nouveaux joueurs</button>'+
    '<button class="btn btn-primary" style="flex:2;" onclick="undDealRoles()">Rejouer</button>';
  vibrate([60,40,60,40,140]);
}
