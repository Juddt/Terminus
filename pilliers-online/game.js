/* Les Pilliers — en ligne. Un téléphone "hôte" narre la partie pour la table,
   chaque joueur rejoint avec un code et agit en privé sur son propre téléphone. */

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();

const ROLE_INFO = {
  villageois: {camp:'village', name:'Villageois', desc:"Aucun pouvoir particulier. Observe, débat, et vote le jour."},
  pillier: {camp:'pilliers', name:'Pillier', desc:"Chaque nuit, tu te reconnais avec les autres Pilliers pour désigner ensemble une victime à éliminer."},
  coma: {camp:'pilliers', name:'Coma', desc:"Pillier. La victime désignée par les Pilliers tombe dans le coma : cul sec direct."},
  infect: {camp:'pilliers', name:'Infect Buveur', desc:"Pillier comme les autres — un membre de plus dans le camp pour la nuit."},
  tequila: {camp:'pilliers', name:'Tequila Paf', desc:"Pillier comme les autres — un membre de plus dans le camp pour la nuit."},
  ethylotest: {camp:'village', name:'Éthylotest', desc:"Chaque nuit, teste un joueur en secret : Pillier ou pas. Le joueur testé boit un shot."},
  chimiste: {camp:'village', name:'Chimiste', desc:"Chaque nuit, protège un joueur de l'élimination. Le joueur choisi boit une gorgée, protégé ou non."},
  foie: {camp:'village', name:"Foie d'Acier", desc:"Immunisé : ne peut jamais être éliminé par les Pilliers pendant la nuit."},
  barman: {camp:'village', name:'Barman Ripou', desc:"Une fois par partie, peut rediriger la victime des Pilliers vers un autre joueur."},
  videur: {camp:'village', name:'Videur', desc:"Chaque nuit, annule le pouvoir d'un joueur pour la nuit."},
  parasite: {camp:'solo', name:'Parasite', desc:"Lié en secret à un autre joueur dès le début. S'il est encore en vie à la fin de la partie, tu gagnes avec lui."},
  wingman: {camp:'solo', name:'Wingman Toxique', desc:"Lié en secret à un autre joueur. S'il meurt (nuit ou vote), tu bois cul sec en miroir, immédiatement."},
  mauvais: {camp:'solo', name:'Mauvais Buveur', desc:"Si le village t'élimine par vote, tout le monde boit 2 gorgées de pénalité en ton honneur."},
  alcoolique: {camp:'solo', name:'Alcoolique Anonyme', desc:"La première fois que le village te désigne par vote, tu survis et révèles ton rôle. La seconde fois, tu es éliminé pour de bon."},
};
// Composition par nombre de joueurs (3 à 20) — voir js/games/pilliers.js pour le
// détail du raisonnement (même table, dupliquée ici car ce fichier tourne seul,
// sans dépendance au reste de l'app).
const ROLE_SETS = {
  3:  ['pillier','villageois','villageois'],
  4:  ['pillier','villageois','villageois','villageois'],
  5:  ['pillier','ethylotest','villageois','villageois','villageois'],
  6:  ['pillier','coma','ethylotest','chimiste','mauvais','wingman'],
  7:  ['pillier','coma','ethylotest','chimiste','foie','mauvais','villageois'],
  8:  ['coma','infect','ethylotest','chimiste','foie','barman','mauvais','villageois'],
  9:  ['pillier','coma','ethylotest','chimiste','foie','barman','mauvais','wingman','villageois'],
  10: ['coma','infect','tequila','ethylotest','chimiste','foie','wingman','videur','mauvais','villageois'],
  11: ['pillier','coma','infect','ethylotest','chimiste','foie','barman','videur','mauvais','wingman','villageois'],
  12: ['coma','infect','tequila','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','villageois'],
  13: ['pillier','coma','infect','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','villageois','villageois'],
  14: ['pillier','coma','infect','tequila','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','villageois'],
  15: ['pillier','coma','infect','tequila','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','villageois','villageois'],
  16: ['pillier','coma','infect','tequila','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','villageois','villageois','villageois'],
  17: ['pillier','coma','infect','tequila','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','mauvais','villageois','villageois','villageois'],
  18: ['pillier','coma','infect','tequila','pillier','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','mauvais','villageois','villageois','villageois'],
  19: ['pillier','coma','infect','tequila','pillier','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','mauvais','alcoolique','villageois','villageois','villageois'],
  20: ['pillier','coma','infect','tequila','pillier','ethylotest','chimiste','foie','barman','videur','parasite','alcoolique','mauvais','wingman','mauvais','alcoolique','villageois','villageois','villageois','villageois'],
};
const PIL_MIN_PLAYERS = 3;
const PIL_MAX_PLAYERS = 20;
const CAMP_LABEL = {pilliers:'Camp des Pilliers', village:'Village', solo:'Solo'};
const PIL_PROMPTS = {
  videur: "Choisis qui tu empêches d'agir cette nuit",
  barman: "Choisis vers qui rediriger la victime des Pilliers",
  chimiste: "Choisis qui tu protèges cette nuit",
  ethylotest: "Choisis qui tu testes",
};

let myId = null, myCode = null, amHost = false;
let state = null;
let roleSeen = false;

function shuffleArr(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function uid(){ return 'p'+Math.random().toString(36).slice(2,10); }
function genCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function frame(){ return document.getElementById('frame'); }

/* --- Session persistence (per browser tab / device) --- */
function loadSession(){
  try{ return JSON.parse(localStorage.getItem('pil_session')||'null'); }catch(e){ return null; }
}
function saveSession(){
  localStorage.setItem('pil_session', JSON.stringify({pid:myId, code:myCode, isHost:amHost}));
  localStorage.setItem('pil_role_seen_'+myCode, roleSeen ? '1':'0');
}

/* --- Landing --- */
function renderLanding(){
  frame().innerHTML =
    '<div class="title">Les Pilliers</div>'+
    '<div class="subtitle">Loup-garou version bar — en ligne</div>'+
    '<div class="landing-choice primary" id="lc-host">'+
      '<h3>Héberger une partie</h3><p>Ce téléphone devient l\'écran de la table : il annonce la nuit, le jour et les votes.</p>'+
    '</div>'+
    '<div class="landing-choice" id="lc-join">'+
      '<h3>Rejoindre une partie</h3><p>Ton téléphone à toi : ton rôle secret et tes actions de nuit.</p>'+
    '</div>'+
    '<div class="spacer"></div>';
  document.getElementById('lc-host').onclick = renderHostCreateForm;
  document.getElementById('lc-join').onclick = renderJoinForm;
}

function renderHostCreateForm(){
  frame().innerHTML =
    '<div class="title" style="font-size:24px;">Héberger</div>'+
    '<div class="subtitle">Ce téléphone sera l\'écran commun — pose-le au centre, ou branche-le à une enceinte.</div>'+
    '<button class="btn btn-primary" id="do-host">Créer la partie</button>'+
    '<div class="error-msg" id="err"></div>'+
    '<div class="spacer"></div>'+
    '<div class="landing-choice" id="back">← Retour</div>';
  document.getElementById('back').onclick = renderLanding;
  document.getElementById('do-host').onclick = hostCreateRoom;
}

function renderJoinForm(){
  frame().innerHTML =
    '<div class="title" style="font-size:24px;">Rejoindre</div>'+
    '<div class="subtitle">Demande le code à la personne qui héberge.</div>'+
    '<input class="field code" id="in-code" maxlength="4" placeholder="CODE">'+
    '<input class="field" id="in-name" maxlength="16" placeholder="Ton prénom">'+
    '<div class="error-msg" id="err"></div>'+
    '<button class="btn btn-primary" id="do-join">Rejoindre</button>'+
    '<div class="spacer"></div>'+
    '<div class="landing-choice" id="back">← Retour</div>';
  document.getElementById('back').onclick = renderLanding;
  document.getElementById('do-join').onclick = ()=>{
    const code = document.getElementById('in-code').value.toUpperCase().trim();
    const name = document.getElementById('in-name').value.trim();
    if(!code || code.length!==4) return showErr('Code à 4 caractères');
    if(!name) return showErr('Entre ton prénom');
    playerJoinRoom(code, name);
  };
}
function showErr(msg){ const el=document.getElementById('err'); if(el) el.textContent = msg; }

/* --- Create / Join --- */
async function hostCreateRoom(){
  showErr('');
  let code, exists=true;
  do{
    code = genCode();
    exists = (await db.ref('games/'+code).once('value')).exists();
  } while(exists);
  myId = uid(); myCode = code; amHost = true; roleSeen = false;
  await db.ref('games/'+code).set({
    code, createdAt: Date.now(), hostId: myId,
    status:'lobby', night:0,
    players:{}, roles:{}, order:[], bonds:{}, powers:{barmanUsed:false, alcooliqueSaved:false},
  });
  saveSession();
  attachListener();
}

async function playerJoinRoom(code, name){
  showErr('');
  const snap = await db.ref('games/'+code).once('value');
  if(!snap.exists()) return showErr('Code introuvable');
  const data = snap.val();
  if(data.status !== 'lobby') return showErr('La partie a déjà commencé');
  if((data.order||[]).length >= PIL_MAX_PLAYERS) return showErr('Partie complète ('+PIL_MAX_PLAYERS+' joueurs max)');
  myId = uid(); myCode = code; amHost = false; roleSeen = false;
  await db.ref('games/'+code+'/players/'+myId).set({name, connected:true});
  const orderRef = db.ref('games/'+code+'/order');
  await orderRef.transaction(order => { order = order || []; order.push(myId); return order; });
  saveSession();
  attachListener();
}

function attachListener(){
  db.ref('games/'+myCode).on('value', snap=>{
    state = snap.val();
    if(!state){ renderGone(); return; }
    render();
  });
  if(amHost){
    db.ref('games/'+myCode+'/submission').on('value', snap=>{
      const sub = snap.val();
      if(sub) processSubmission(sub);
    });
  }
}

function renderGone(){
  frame().innerHTML = '<div class="title" style="font-size:22px;">Partie introuvable</div>'+
    '<div class="subtitle">Elle a peut-être été fermée.</div>'+
    '<button class="btn btn-primary" id="back2">Retour à l\'accueil</button>';
  localStorage.removeItem('pil_session');
  document.getElementById('back2').onclick = ()=>{ myId=null; myCode=null; amHost=false; renderLanding(); };
}

/* --- Resume an existing session on reload --- */
function tryResume(){
  const s = loadSession();
  if(!s || !s.code || !s.pid) return renderLanding();
  myId = s.pid; myCode = s.code; amHost = s.isHost;
  roleSeen = localStorage.getItem('pil_role_seen_'+myCode) === '1';
  attachListener();
}

/* --- Helpers on state --- */
function alivePlayers(){
  return (state.order||[]).filter(pid => state.players[pid] && (!state.roles[pid] || state.roles[pid].alive!==false))
    .map(pid=> ({id:pid, name:state.players[pid].name, role: state.roles[pid]}));
}
function playerName(pid){ return state.players[pid] ? state.players[pid].name : '???'; }
function roleOf(pid){ return state.roles[pid]; }

/* ================= HOST-side game engine ================= */

async function startGame(){
  const order = state.order||[];
  const count = order.length;
  if(count < PIL_MIN_PLAYERS || count > PIL_MAX_PLAYERS) return;
  const roleKeys = shuffleArr(ROLE_SETS[count]);
  const roles = {};
  order.forEach((pid,i)=>{ roles[pid] = {key:roleKeys[i], camp:ROLE_INFO[roleKeys[i]].camp, alive:true}; });
  const bonds = {};
  const wingmanPid = order.find(pid=>roles[pid].key==='wingman');
  if(wingmanPid) bonds.wingman = randomOther(order, wingmanPid);
  const parasitePid = order.find(pid=>roles[pid].key==='parasite');
  if(parasitePid) bonds.parasite = randomOther(order, parasitePid);
  await db.ref('games/'+myCode).update({
    roles, bonds, powers:{barmanUsed:false, alcooliqueSaved:false},
    night:1, status:'night-intro', nightData:null, submission:null, pendingTarget:null, winner:null,
  });
}
function randomOther(order, exclude){
  const opts = order.filter(p=>p!==exclude);
  return opts[Math.floor(Math.random()*opts.length)];
}

function buildNightSteps(){
  const order = state.order;
  const isAliveWithKey = key => order.find(pid => state.roles[pid].key===key && state.roles[pid].alive);
  const steps = [];
  const videurPid = isAliveWithKey('videur');
  if(videurPid) steps.push({type:'videur', actorId:videurPid});
  const anyPillier = order.some(pid=> state.roles[pid].camp==='pilliers' && state.roles[pid].alive);
  if(anyPillier) steps.push({type:'pilliers', actorId: order.filter(pid=>state.roles[pid].camp==='pilliers' && state.roles[pid].alive)[0]});
  const barmanPid = isAliveWithKey('barman');
  if(barmanPid && !state.powers.barmanUsed) steps.push({type:'barman', actorId:barmanPid});
  const chimistePid = isAliveWithKey('chimiste');
  if(chimistePid) steps.push({type:'chimiste', actorId:chimistePid});
  const ethylotestPid = isAliveWithKey('ethylotest');
  if(ethylotestPid) steps.push({type:'ethylotest', actorId:ethylotestPid});
  return steps;
}

async function beginNightSteps(){
  const steps = buildNightSteps();
  await db.ref('games/'+myCode).update({
    status:'night-step', steps, stepIdx:0, nightData:{}, submission:null,
  });
}

async function processSubmission(sub){
  // sub = {type, actorId, targetId} — targetId null means "passer"
  const nd = state.nightData || {};
  if(sub.type==='videur') nd.videurTarget = sub.targetId;
  if(sub.type==='barman'){ nd.barmanRedirect = sub.targetId; if(sub.targetId!==null) await db.ref('games/'+myCode+'/powers/barmanUsed').set(true); }
  if(sub.type==='chimiste') nd.chimisteTarget = sub.targetId;
  if(sub.type==='pilliers') nd.pilliersTarget = sub.targetId;
  if(sub.type==='ethylotest') nd.ethylotestCheck = {targetId: sub.targetId, isPillier: sub.targetId ? state.roles[sub.targetId].camp==='pilliers' : null};

  const nextIdx = state.stepIdx + 1;
  await db.ref('games/'+myCode).update({ nightData: nd, submission:null, stepIdx: nextIdx });
  if(nextIdx >= (state.steps||[]).length){
    await resolveNight(nd);
  }
}

async function resolveNight(nd){
  nd = nd || state.nightData || {};
  const finalTarget = (nd.barmanRedirect !== undefined && nd.barmanRedirect !== null) ? nd.barmanRedirect : nd.pilliersTarget;
  const roles = JSON.parse(JSON.stringify(state.roles));
  const died = [];
  if(finalTarget && roles[finalTarget] && roles[finalTarget].alive){
    const protectedByChimiste = nd.chimisteTarget === finalTarget;
    const immune = roles[finalTarget].key === 'foie';
    if(!protectedByChimiste && !immune){
      roles[finalTarget].alive = false;
      died.push(finalTarget);
      const wingmanPid = state.order.find(pid=>roles[pid].key==='wingman');
      if(wingmanPid && roles[wingmanPid].alive && state.bonds.wingman===finalTarget){
        roles[wingmanPid].alive = false;
        died.push(wingmanPid);
      }
    }
  }
  await db.ref('games/'+myCode).update({ roles, status:'morning', nightData: Object.assign({}, nd, {died}) });
}

function checkWin(){
  const order = state.order;
  const alivePilliers = order.filter(pid=>state.roles[pid].alive && state.roles[pid].camp==='pilliers').length;
  const aliveOthers = order.filter(pid=>state.roles[pid].alive && state.roles[pid].camp!=='pilliers').length;
  if(alivePilliers===0) return 'village';
  if(alivePilliers>=aliveOthers) return 'pilliers';
  return null;
}

async function afterMorning(){
  const win = checkWin();
  if(win) return db.ref('games/'+myCode).update({status:'end', winner:win});
  await db.ref('games/'+myCode).update({status:'day', dayEndsAt: Date.now()+90000});
}

async function endDebate(){
  await db.ref('games/'+myCode).update({status:'vote-countdown', voteStartedAt: Date.now()});
}

async function selectAccused(pid){
  await db.ref('games/'+myCode).update({status:'sentence-confirm', pendingTarget:pid});
}
async function cancelAccusation(){
  await db.ref('games/'+myCode).update({status:'vote-choice', pendingTarget:null});
}

async function confirmSentence(){
  const pid = state.pendingTarget;
  const roles = JSON.parse(JSON.stringify(state.roles));
  const r = roles[pid];
  const powers = JSON.parse(JSON.stringify(state.powers));

  if(r.key==='alcoolique' && !powers.alcooliqueSaved){
    powers.alcooliqueSaved = true;
    await db.ref('games/'+myCode).update({powers, status:'sentence', sentenceResult:{pid, saved:true}});
    return;
  }
  r.alive = false;
  const wasInnocent = r.camp !== 'pilliers';
  let mirrorPid = null;
  const wingmanPid = state.order.find(p=>roles[p].key==='wingman');
  if(wingmanPid && roles[wingmanPid].alive && state.bonds.wingman===pid){
    roles[wingmanPid].alive = false;
    mirrorPid = wingmanPid;
  }
  await db.ref('games/'+myCode).update({ roles, status:'sentence', sentenceResult:{pid, saved:false, wasInnocent, mirrorPid, wasMauvais:r.key==='mauvais'} });
}

async function afterSentence(){
  const win = checkWin();
  if(win) return db.ref('games/'+myCode).update({status:'end', winner:win});
  await db.ref('games/'+myCode).update({status:'night-intro', night: state.night+1, pendingTarget:null, sentenceResult:null});
}

async function submitAction(type, targetId){
  await db.ref('games/'+myCode+'/submission').set({type, actorId:myId, targetId: targetId===undefined?null:targetId});
}

/* ================= Rendering ================= */

function render(){
  if(state.status==='lobby') return amHost ? renderHostLobby() : renderPlayerLobby();
  if(!roleSeen && state.roles && state.roles[myId] && !amHost) return renderRoleReveal();
  return amHost ? renderHostGame() : renderPlayerGame();
}

function roleBadge(){
  if(amHost || !state.roles || !state.roles[myId]) return '';
  const info = ROLE_INFO[state.roles[myId].key];
  const alive = state.roles[myId].alive;
  return '<div class="role-badge-mini">'+(alive?'':'💀 ')+info.name+'</div>';
}

function renderHostLobby(){
  const order = state.order||[];
  const ready = order.length >= PIL_MIN_PLAYERS && order.length <= PIL_MAX_PLAYERS;
  frame().innerHTML =
    '<div class="host-tag">Écran de la table</div>'+
    '<div class="room-code-display"><div class="lbl">Code de partie</div><div class="code">'+state.code+'</div></div>'+
    '<div class="player-list">'+
      order.map(pid=>'<div class="player-row"><span><span class="dot"></span>'+playerName(pid)+'</span></div>').join('')+
    '</div>'+
    '<div class="count-hint'+(ready?' ok':'')+'">'+order.length+' joueur'+(order.length>1?'s':'')+' — de '+PIL_MIN_PLAYERS+' à '+PIL_MAX_PLAYERS+'</div>'+
    '<div class="spacer"></div>'+
    '<button class="btn btn-primary" id="start-btn" '+(ready?'':'disabled')+'>Lancer la partie</button>';
  const btn = document.getElementById('start-btn');
  if(btn) btn.onclick = startGame;
}

function renderPlayerLobby(){
  frame().innerHTML =
    '<div class="room-code-display"><div class="lbl">Code de partie</div><div class="code">'+state.code+'</div></div>'+
    '<div class="pil-body"><div class="pil-rule-line">Tu es dans la partie. En attente que l\'hôte lance la partie...</div></div>'+
    '<div class="player-list">'+
      (state.order||[]).map(pid=>'<div class="player-row"><span><span class="dot"></span>'+playerName(pid)+'</span></div>').join('')+
    '</div>';
}

function renderRoleReveal(){
  const info = ROLE_INFO[state.roles[myId].key];
  frame().innerHTML =
    '<div class="pil-body">'+
      '<div class="pil-role-card camp-'+info.camp+'">'+
        '<div class="pil-role-camp">'+CAMP_LABEL[info.camp]+'</div>'+
        '<div class="pil-role-name">'+info.name+'</div>'+
        '<div class="pil-role-desc">'+info.desc+'</div>'+
      '</div>'+
    '</div>'+
    '<button class="btn btn-primary" id="seen-btn">J\'ai vu mon rôle</button>';
  document.getElementById('seen-btn').onclick = ()=>{ roleSeen = true; saveSession(); render(); };
}

/* ---- Host narrator screens ---- */
function renderHostGame(){
  const s = state;
  let body = '', footer = '';
  if(s.status==='night-intro'){
    body = '<div class="pil-night-pulse"></div><div class="pil-rule-line" style="margin-top:22px;">Tout le monde ferme les yeux (ou pas — chacun a son téléphone)</div><div style="font-size:12px;color:var(--text-faint);margin-top:6px;">Nuit '+s.night+'</div>';
    footer = '<button class="btn btn-primary" id="b1">Commencer les appels</button>';
    setTimeout(()=> document.getElementById('b1').onclick = beginNightSteps);
  } else if(s.status==='night-step'){
    const step = s.steps[s.stepIdx];
    if(!step){ body = '<div class="pil-rule-line">Résolution en cours...</div>'; }
    else {
      const label = step.type==='pilliers' ? 'Le camp des Pilliers' : ROLE_INFO[roleOf(step.actorId).key].name;
      body = '<div class="pil-pass-card">En attente de</div><div class="pil-pass-name">'+label+'</div><div class="pil-rule-line" style="font-size:14px;margin-top:14px;color:var(--text-faint);">Sur son propre téléphone...</div>';
    }
  } else if(s.status==='morning'){
    const died = (s.nightData && s.nightData.died) || [];
    if(died.length===0) body = '<div class="pil-pass-card">Le village se réveille</div><div class="pil-rule-line" style="margin-top:14px;">Personne n\'est mort cette nuit. Étrange...</div>';
    else body = '<div class="pil-pass-card">Le village se réveille</div>'+died.map(pid=>{
      const info = ROLE_INFO[roleOf(pid).key];
      return '<div class="pil-rule-line" style="margin-top:10px;">'+playerName(pid)+' est retrouvé inconscient — cul sec.</div><div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div>';
    }).join('');
    footer = '<button class="btn btn-primary" id="b2">Continuer</button>';
    setTimeout(()=> document.getElementById('b2').onclick = afterMorning);
  } else if(s.status==='day'){
    return renderDayScreen(true);
  } else if(s.status==='vote-countdown'){
    return renderVoteCountdown(true);
  } else if(s.status==='vote-choice'){
    body = '<div class="pil-rule-line">Qui est le plus désigné ?</div><div class="pil-target-grid">'+
      alivePlayers().map(p=>'<div class="pil-target-btn" data-pid="'+p.id+'">'+p.name+'</div>').join('')+'</div>';
    footer = '<button class="btn btn-ghost" id="b3">Personne — pas de vote</button>';
    setTimeout(()=>{
      document.querySelectorAll('.pil-target-btn').forEach(el=> el.onclick = ()=> selectAccused(el.dataset.pid));
      document.getElementById('b3').onclick = afterMorning;
    });
  } else if(s.status==='sentence-confirm'){
    body = '<div class="pil-rule-line">'+playerName(s.pendingTarget)+' est désigné par le village</div>';
    footer = '<div class="footer-row"><button class="btn btn-ghost" id="b4">Annuler</button><button class="btn btn-primary" id="b5">Cul sec et sentence</button></div>';
    setTimeout(()=>{ document.getElementById('b4').onclick = cancelAccusation; document.getElementById('b5').onclick = confirmSentence; });
  } else if(s.status==='sentence'){
    body = renderSentenceHTML();
    footer = '<button class="btn btn-primary" id="b6">Continuer</button>';
    setTimeout(()=> document.getElementById('b6').onclick = afterSentence);
  } else if(s.status==='end'){
    return renderEndScreen(true);
  }
  frame().innerHTML = '<div class="host-tag">Écran de la table — Nuit '+s.night+'</div><div class="pil-body">'+body+'</div>'+footer;
}

function renderSentenceHTML(){
  const s = state, sr = s.sentenceResult;
  if(!sr) return '';
  const r = s.roles[sr.pid]; // already mutated to alive:false if eliminated, or unchanged if saved
  const info = ROLE_INFO[r.key];
  if(sr.saved){
    return '<div class="pil-rule-line">'+playerName(sr.pid)+'</div><div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div><div class="pil-rule-line" style="margin-top:12px;">Increvable ! Il survit au vote.</div>';
  }
  let extra = '';
  if(sr.wasInnocent) extra += '<div class="pil-rule-line" style="color:var(--clay);margin-top:10px;">Erreur judiciaire ! Tout le monde boit 2 gorgées de pénalité.</div>';
  if(sr.wasMauvais) extra += '<div class="pil-rule-line" style="color:var(--accent);margin-top:6px;">C\'était le Mauvais Buveur — tournée générale !</div>';
  if(sr.mirrorPid) extra += '<div class="pil-rule-line" style="color:var(--clay);margin-top:6px;">'+playerName(sr.mirrorPid)+' était son Wingman — il boit cul sec en miroir !</div>';
  return '<div class="pil-rule-line">'+playerName(sr.pid)+'</div><div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div><div class="pil-rule-line" style="margin-top:12px;">Cul sec, et révèle son identité.</div>'+extra;
}

function renderDayScreen(isHost){
  const s = state;
  const remaining = Math.max(0, Math.ceil((s.dayEndsAt - Date.now())/1000));
  frame().innerHTML =
    (isHost ? '<div class="host-tag">Écran de la table</div>' : roleBadge())+
    '<div class="pil-body"><div class="pil-timer-big" id="timer">'+remaining+'</div><div class="pil-timer-sub">Débat — silence après le gong</div></div>'+
    (isHost ? '<button class="btn btn-ghost" id="skip-debate">Passer au vote</button>' : '');
  if(isHost){ const b = document.getElementById('skip-debate'); if(b) b.onclick = endDebate; }
  clearInterval(window.__pilTick);
  window.__pilTick = setInterval(()=>{
    if(!state || state.status!=='day'){ clearInterval(window.__pilTick); return; }
    const left = Math.max(0, Math.ceil((state.dayEndsAt - Date.now())/1000));
    const el = document.getElementById('timer');
    if(el) el.textContent = left;
    if(left<=0){ clearInterval(window.__pilTick); if(isHost) endDebate(); }
  }, 250);
}

function renderVoteCountdown(isHost){
  const s = state;
  const elapsed = Date.now() - s.voteStartedAt;
  const n = Math.max(0, 3 - Math.floor(elapsed/800));
  frame().innerHTML =
    (isHost ? '<div class="host-tag">Écran de la table</div>' : roleBadge())+
    '<div class="pil-body"><div class="pil-timer-sub">Tout le monde pointe un suspect...</div><div class="pil-timer-big">'+(n>0?n:'👉')+'</div></div>';
  clearInterval(window.__pilTick);
  window.__pilTick = setInterval(()=>{
    if(!state || state.status!=='vote-countdown'){ clearInterval(window.__pilTick); return; }
    const e = Date.now() - state.voteStartedAt;
    if(e >= 2400){ clearInterval(window.__pilTick); if(isHost) db.ref('games/'+myCode).update({status:'vote-choice'}); }
    else render();
  }, 200);
}

function renderEndScreen(isHost){
  const s = state;
  const label = s.winner==='village' ? 'Le Village l\'emporte !' : 'Les Pilliers l\'emportent !';
  let roster = '<div class="pil-roster">';
  (s.order||[]).forEach(pid=>{
    const info = ROLE_INFO[s.roles[pid].key];
    roster += '<div class="'+(s.roles[pid].alive?'':'dead')+'">'+playerName(pid)+' — '+info.name+'</div>';
  });
  roster += '</div>';
  frame().innerHTML =
    (isHost ? '<div class="host-tag">Écran de la table</div>' : '')+
    '<div class="pil-body"><div style="font-family:Fraunces,serif;font-size:26px;color:var(--accent);">'+label+'</div>'+roster+'</div>'+
    (isHost ? '<button class="btn btn-primary" id="replay">Rejouer (mêmes joueurs)</button>' : '<div class="pil-rule-line">Merci d\'avoir joué !</div>');
  if(isHost){ document.getElementById('replay').onclick = ()=> db.ref('games/'+myCode).update({status:'lobby', roles:{}, bonds:{}, night:0, sentenceResult:null, pendingTarget:null, winner:null}); }
}

/* ---- Player screens ---- */
function renderPlayerGame(){
  const s = state;
  if(s.status==='night-step'){
    const step = s.steps[s.stepIdx];
    if(!step) return renderWaiting();
    if(step.type==='pilliers') return renderPilliersStep(step);
    if(step.actorId===myId) return renderActionScreen(step);
    return renderWaiting();
  }
  if(s.status==='morning') return renderMorningMirror();
  if(s.status==='day') return renderDayScreen(false);
  if(s.status==='vote-countdown') return renderVoteCountdown(false);
  if(s.status==='vote-choice' || s.status==='sentence-confirm') return renderWaiting('Le village vote... regarde le téléphone de la table.');
  if(s.status==='sentence'){
    frame().innerHTML = roleBadge()+'<div class="pil-body">'+renderSentenceHTML()+'</div>';
    return;
  }
  if(s.status==='end') return renderEndScreen(false);
  return renderWaiting();
}

function renderWaiting(msg){
  frame().innerHTML = roleBadge()+
    '<div class="pil-body"><div class="pil-night-pulse"></div><div class="pil-rule-line" style="margin-top:22px;">'+(msg||'En attente...')+'</div></div>';
}

function renderPilliersStep(step){
  const myRole = state.roles[myId];
  if(myRole.camp !== 'pilliers') return renderWaiting();
  const teammates = state.order.filter(pid=> state.roles[pid].camp==='pilliers' && state.roles[pid].alive).map(playerName).join(', ');
  if(step.actorId !== myId){
    frame().innerHTML = roleBadge()+'<div class="pil-body"><div class="pil-rule-line">Ton camp : '+teammates+'</div><div class="pil-rule-line" style="font-size:14px;color:var(--text-faint);margin-top:10px;">'+playerName(step.actorId)+' désigne la victime cette nuit...</div></div>';
    return;
  }
  const targets = alivePlayers();
  frame().innerHTML = roleBadge()+
    '<div class="pil-body"><div class="pil-rule-line">Ton camp : '+teammates+'</div>'+
    '<div class="pil-rule-line" style="font-size:15px;margin-top:10px;">Désignez ensemble la victime</div>'+
    '<div class="pil-target-grid">'+targets.map(p=>'<div class="pil-target-btn" data-pid="'+p.id+'">'+p.name+'</div>').join('')+'</div>'+
    '</div><button class="btn btn-ghost" id="skip">Nuit blanche — personne</button>';
  document.querySelectorAll('.pil-target-btn').forEach(el=> el.onclick = ()=> submitAction('pilliers', el.dataset.pid));
  document.getElementById('skip').onclick = ()=> submitAction('pilliers', null);
}

function renderActionScreen(step){
  const targets = alivePlayers();
  frame().innerHTML = roleBadge()+
    '<div class="pil-body"><div class="pil-rule-line">'+PIL_PROMPTS[step.type]+'</div>'+
    '<div class="pil-target-grid">'+targets.map(p=>'<div class="pil-target-btn" data-pid="'+p.id+'">'+p.name+'</div>').join('')+'</div>'+
    '</div><button class="btn btn-ghost" id="skip">Passer</button>';
  document.querySelectorAll('.pil-target-btn').forEach(el=> el.onclick = ()=>{
    if(step.type==='ethylotest') return showEthylotestResultThenSubmit(el.dataset.pid);
    submitAction(step.type, el.dataset.pid);
  });
  document.getElementById('skip').onclick = ()=> submitAction(step.type, null);
}

function showEthylotestResultThenSubmit(targetId){
  const isPillier = state.roles[targetId].camp==='pilliers';
  frame().innerHTML = roleBadge()+
    '<div class="pil-body"><div class="pil-rule-line">'+playerName(targetId)+' boit un shot.</div>'+
    '<div class="pil-secret-result '+(isPillier?'is-pillier':'is-clean')+'">'+(isPillier?'PILLIER':'PAS PILLIER')+'</div>'+
    '<div style="font-size:11px;color:var(--text-faint);margin-top:10px;">Résultat secret — ne le dis à personne</div></div>'+
    '<button class="btn btn-primary" id="ok">C\'est vu, masquer</button>';
  document.getElementById('ok').onclick = ()=> submitAction('ethylotest', targetId);
}

function renderMorningMirror(){
  const died = (state.nightData && state.nightData.died) || [];
  let html = '<div class="pil-pass-card">Le village se réveille</div>';
  if(died.length===0) html += '<div class="pil-rule-line" style="margin-top:14px;">Personne n\'est mort cette nuit. Étrange...</div>';
  else died.forEach(pid=>{
    const info = ROLE_INFO[roleOf(pid).key];
    html += '<div class="pil-rule-line" style="margin-top:10px;">'+playerName(pid)+' est retrouvé inconscient — cul sec.</div><div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div>';
  });
  frame().innerHTML = roleBadge()+'<div class="pil-body">'+html+'</div>';
}

/* --- Boot --- */
tryResume();
