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

// Composition par nombre de joueurs (3 à 20). Le ratio de Pilliers (~1 pour 4 joueurs),
// les pouvoirs village et les rôles solo montent progressivement avec la taille de la
// table ; le reste de la table est complété par des Villageois. Les compositions à
// 6/8/10/12 sont celles d'origine, testées en jeu — inchangées.
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

const CAMP_LABEL = {pilliers:'Camp des Pilliers', village:'Village', solo:'Solo'};

const pil = {
  players:[], count:8, roles:[], revealIdx:0,
  night:1, stepIdx:0, steps:[],
  nightData:{}, bonds:{}, powers:{barmanUsed:false, alcooliqueSaved:false},
  pendingTarget:null, dayInterval:null,
};

/* --- Setup --- */
const PIL_MIN_PLAYERS = 3;
const PIL_MAX_PLAYERS = 20;

function pilSetup(){
  pil.players=[]; pil.count=8;
  document.getElementById('pil-chips').innerHTML='';
  document.getElementById('pil-name-field').value='';
  document.getElementById('pil-start-btn').disabled=true;
  pilRenderCountChoices();
  goTo('pilliers-setup');
  setTimeout(()=> document.getElementById('pil-name-field').focus(), 100);
}

function pilSetCount(n){
  pil.count = Math.max(PIL_MIN_PLAYERS, Math.min(PIL_MAX_PLAYERS, n));
  pil.players = pil.players.slice(0, pil.count);
  pilRenderCountChoices();
  pilRenderChips();
}

function pilRenderCountChoices(){
  const wrap = document.getElementById('pil-count-choices');
  wrap.innerHTML =
    '<div class="pil-stepper">'+
      '<button type="button" class="pil-step-btn" onclick="pilSetCount(pil.count-1)" '+(pil.count<=PIL_MIN_PLAYERS?'disabled':'')+'>−</button>'+
      '<div class="pil-count-value">'+pil.count+'</div>'+
      '<button type="button" class="pil-step-btn" onclick="pilSetCount(pil.count+1)" '+(pil.count>=PIL_MAX_PLAYERS?'disabled':'')+'>+</button>'+
    '</div>'+
    '<div class="pil-count-hint">de '+PIL_MIN_PLAYERS+' à '+PIL_MAX_PLAYERS+' joueurs</div>';
}

document.getElementById('pil-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && pil.players.length<pil.count){
      pil.players.push(val);
      e.target.value='';
      Sound.play('tick');
      pilRenderChips();
    }
  }
});

function pilRenderChips(){
  const wrap=document.getElementById('pil-chips');
  wrap.innerHTML='';
  pil.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=escapeHtml(name)+'<span class="x" onclick="pilRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('pil-start-btn').disabled = pil.players.length !== pil.count;
}
function pilRemovePlayer(i){ pil.players.splice(i,1); pilRenderChips(); }

function pilRandomOther(excludeIdx){
  const options = pil.roles.map((_,i)=>i).filter(i=>i!==excludeIdx);
  return options[Math.floor(Math.random()*options.length)];
}

/* --- Game start / role assignment --- */
function pilStartGame(){
  if(pil.players.length !== pil.count) return;
  const roleKeys = shuffleArr(ROLE_SETS[pil.count]);
  pil.roles = pil.players.map((name,i)=> ({
    name, key: roleKeys[i], camp: ROLE_INFO[roleKeys[i]].camp, alive:true
  }));
  pil.night = 1;
  pil.powers = {barmanUsed:false, alcooliqueSaved:false};
  pil.bonds = {};
  const wingmanIdx = pil.roles.findIndex(r=>r.key==='wingman');
  if(wingmanIdx>=0) pil.bonds.wingman = pilRandomOther(wingmanIdx);
  const parasiteIdx = pil.roles.findIndex(r=>r.key==='parasite');
  if(parasiteIdx>=0) pil.bonds.parasite = pilRandomOther(parasiteIdx);
  pil.revealIdx = 0;
  goTo('pilliers');
  pilRevealStep();
}

function pilUpdateHeader(){
  const alive = pil.roles.filter(r=>r.alive).length;
  document.getElementById('pil-header').innerHTML =
    '<div class="badge">Nuit <span class="bv">'+pil.night+'</span></div>'+
    '<div class="badge"><span class="bv">'+alive+'</span>/'+pil.roles.length+' en vie</div>';
}

/* --- Secret role reveal (pass the phone) --- */
function pilRevealStep(){
  pilUpdateHeader();
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  if(pil.revealIdx >= pil.roles.length){
    pilNightStart();
    return;
  }
  const p = pil.roles[pil.revealIdx];
  body.innerHTML =
    '<div class="pil-pass-card">Passe le téléphone à</div>'+
    '<div class="pil-pass-name">'+p.name+'</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilRevealShow()">Je suis '+escapeHtml(p.name)+', voir mon rôle</button>';
}

function pilRevealShow(){
  Sound.play('capOpen');
  const p = pil.roles[pil.revealIdx];
  const info = ROLE_INFO[p.key];
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  body.innerHTML =
    '<div class="pil-role-card camp-'+info.camp+'">'+
      '<div class="pil-role-camp">'+CAMP_LABEL[info.camp]+'</div>'+
      '<div class="pil-role-name">'+info.name+'</div>'+
      '<div class="pil-role-desc">'+info.desc+'</div>'+
    '</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilRevealNext()">C\'est vu, masquer et passer</button>';
}

function pilRevealNext(){
  pil.revealIdx++;
  pilRevealStep();
}

/* --- Night: build the sequence of active roles --- */
function pilBuildNightSteps(){
  const steps = [];
  const findAlive = key => pil.roles.findIndex(r=>r.key===key && r.alive);
  const videurIdx = findAlive('videur');
  if(videurIdx>=0) steps.push({type:'videur', actorIdx:videurIdx});
  const anyPillier = pil.roles.some(r=>r.camp==='pilliers' && r.alive);
  if(anyPillier) steps.push({type:'pilliers'});
  const barmanIdx = findAlive('barman');
  if(barmanIdx>=0 && !pil.powers.barmanUsed) steps.push({type:'barman', actorIdx:barmanIdx});
  const chimisteIdx = findAlive('chimiste');
  if(chimisteIdx>=0) steps.push({type:'chimiste', actorIdx:chimisteIdx});
  const ethylotestIdx = findAlive('ethylotest');
  if(ethylotestIdx>=0) steps.push({type:'ethylotest', actorIdx:ethylotestIdx});
  return steps;
}

function pilNightStart(){
  pil.nightData = {};
  pil.steps = pilBuildNightSteps();
  pil.stepIdx = 0;
  Sound.ambiance(true);
  pilShowNightIntro();
}

function pilShowNightIntro(){
  pilUpdateHeader();
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  body.innerHTML =
    '<div class="pil-night-pulse"></div>'+
    '<div class="palm-rule-line" style="margin-top:22px;">Tout le monde ferme les yeux</div>'+
    '<div style="font-size:12px;color:var(--text-faint);margin-top:6px;">Nuit '+pil.night+'</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilNightNextStep()">Bip — commencer les appels</button>';
}

function pilNightNextStep(){
  if(pil.stepIdx >= pil.steps.length){
    pilResolveNight();
    return;
  }
  Sound.play('capOpen');
  const step = pil.steps[pil.stepIdx];
  if(step.type === 'pilliers') pilShowPilliersCall();
  else pilShowRoleCall(step);
}

function pilShowRoleCall(step){
  const actor = pil.roles[step.actorIdx];
  const info = ROLE_INFO[actor.key];
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  body.innerHTML =
    '<div class="pil-pass-card">Approche-toi en silence</div>'+
    '<div class="pil-pass-name">'+info.name+'</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilShowRoleAction('+step.actorIdx+',\''+step.type+'\')">J\'y suis</button>';
}

const PIL_PROMPTS = {
  videur: "Choisis qui tu empêches d'agir cette nuit",
  barman: "Choisis vers qui rediriger la victime des Pilliers",
  chimiste: "Choisis qui tu protèges cette nuit",
  ethylotest: "Choisis qui tu testes",
};

function pilShowRoleAction(actorIdx, type){
  const info = ROLE_INFO[pil.roles[actorIdx].key];
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  const targets = pil.roles.map((r,i)=>({r,i})).filter(x=>x.r.alive);
  body.innerHTML =
    '<div class="palm-player-big" style="font-size:22px;">'+info.name+'</div>'+
    '<div class="palm-rule-line" style="font-size:16px;">'+PIL_PROMPTS[type]+'</div>'+
    '<div class="pil-target-grid">'+
      targets.map(x=>'<div class="pil-target-btn" onclick="pilChooseTarget('+x.i+',\''+type+'\')">'+x.r.name+'</div>').join('')+
    '</div>';
  footer.innerHTML = '<button class="btn btn-ghost" onclick="pilStepDone()" style="flex:1;">Passer</button>';
}

function pilChooseTarget(targetIdx, type){
  Sound.play('powerConfirm');
  if(type==='videur') pil.nightData.videurTarget = targetIdx;
  if(type==='barman'){ pil.nightData.barmanRedirect = targetIdx; pil.powers.barmanUsed = true; }
  if(type==='chimiste') pil.nightData.chimisteTarget = targetIdx;
  if(type==='ethylotest') return pilShowEthylotestResult(targetIdx);
  pilStepDone();
}

function pilShowEthylotestResult(targetIdx){
  const target = pil.roles[targetIdx];
  const isPillier = target.camp === 'pilliers';
  Sound.play(isPillier ? 'fail' : 'success');
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  body.innerHTML =
    '<div class="palm-rule-line">'+target.name+' boit un shot.</div>'+
    '<div class="pil-secret-result '+(isPillier?'is-pillier':'is-clean')+'">'+(isPillier ? 'PILLIER' : 'PAS PILLIER')+'</div>'+
    '<div style="font-size:11px;color:var(--text-faint);margin-top:10px;">Résultat secret — ne le dis à personne</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilStepDone()">C\'est vu, masquer</button>';
}

function pilShowPilliersCall(){
  const pilliers = pil.roles.filter(r=>r.camp==='pilliers' && r.alive);
  const targets = pil.roles.map((r,i)=>({r,i})).filter(x=>x.r.alive);
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  body.innerHTML =
    '<div class="pil-pass-card">Le camp des Pilliers se réveille</div>'+
    '<div class="palm-rule-line" style="margin-top:10px;">'+pilliers.map(p=>p.name).join(', ')+'</div>'+
    '<div style="font-size:12px;color:var(--text-faint);margin-top:8px;">Un seul d\'entre vous désigne la victime</div>'+
    '<div class="pil-target-grid">'+
      targets.map(x=>'<div class="pil-target-btn" onclick="pilChoosePilliersTarget('+x.i+')">'+x.r.name+'</div>').join('')+
    '</div>';
  footer.innerHTML = '<button class="btn btn-ghost" onclick="pilStepDone()" style="flex:1;">Nuit blanche — personne</button>';
}

function pilChoosePilliersTarget(idx){
  Sound.play('powerConfirm');
  pil.nightData.pilliersTarget = idx;
  pilStepDone();
}

function pilStepDone(){
  pil.stepIdx++;
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');
  body.innerHTML = '<div class="palm-rule-line">C\'est fait. Rendors-toi.</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilNightNextStep()">Suivant</button>';
}

/* --- Resolve the night --- */
function pilResolveNight(){
  Sound.ambiance(false);
  const finalTarget = pil.nightData.barmanRedirect !== undefined ? pil.nightData.barmanRedirect : pil.nightData.pilliersTarget;
  const died = [];
  if(finalTarget !== undefined && finalTarget !== null){
    const t = pil.roles[finalTarget];
    if(t && t.alive){
      const protectedByChimiste = pil.nightData.chimisteTarget === finalTarget;
      const immune = t.key === 'foie';
      if(!protectedByChimiste && !immune){
        t.alive = false;
        died.push(finalTarget);
        const wIdx = pil.roles.findIndex(r=>r.key==='wingman');
        if(wIdx>=0 && pil.roles[wIdx].alive && pil.bonds.wingman === finalTarget){
          pil.roles[wIdx].alive = false;
          died.push(wIdx);
        }
      }
    }
  }
  pil.nightData.died = died;
  pilShowMorning();
}

function pilShowMorning(){
  const died = pil.nightData.died || [];
  Sound.play('alarm');
  let html = '<div class="pil-pass-card">Le village se réveille</div>';
  if(died.length===0){
    html += '<div class="palm-rule-line" style="margin-top:14px;">Personne n\'est mort cette nuit. Étrange...</div>';
  } else {
    died.forEach(idx=>{
      const r = pil.roles[idx];
      const info = ROLE_INFO[r.key];
      html += '<div class="palm-rule-line" style="margin-top:10px;">'+r.name+' est retrouvé inconscient — cul sec.</div>'+
        '<div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div>';
    });
  }
  document.getElementById('pil-body').innerHTML = html;
  document.getElementById('pil-footer').innerHTML = '<button class="btn btn-primary" onclick="pilAfterMorning()">Continuer</button>';
  pilUpdateHeader();
}

function pilCheckWin(){
  const alivePilliers = pil.roles.filter(r=>r.alive && r.camp==='pilliers').length;
  const aliveOthers = pil.roles.filter(r=>r.alive && r.camp!=='pilliers').length;
  if(alivePilliers === 0) return 'village';
  if(alivePilliers >= aliveOthers) return 'pilliers';
  return null;
}

function pilAfterMorning(){
  const win = pilCheckWin();
  if(win) return pilEndGame(win);
  pilDayStart();
}

/* --- Day: debate timer --- */
function pilDayStart(){
  pilUpdateHeader();
  let timeLeft = 90;
  document.getElementById('pil-body').innerHTML =
    '<div class="pil-timer-big" id="pil-timer">'+timeLeft+'</div>'+
    '<div class="pil-timer-sub">Débat — silence après le gong</div>';
  document.getElementById('pil-footer').innerHTML = '<button class="btn btn-ghost" onclick="pilEndDebate()" style="flex:1;">Passer au vote</button>';
  if(pil.dayInterval) clearInterval(pil.dayInterval);
  pil.dayInterval = setInterval(()=>{
    timeLeft--;
    const el = document.getElementById('pil-timer');
    if(el) el.textContent = timeLeft;
    if(timeLeft <= 15 && timeLeft > 0) Sound.play('tick');
    if(timeLeft <= 0){ clearInterval(pil.dayInterval); pilEndDebate(); }
  }, 1000);
}

function pilEndDebate(){
  if(pil.dayInterval) clearInterval(pil.dayInterval);
  Sound.play('gong');
  pilVoteCountdown();
}

/* --- Vote --- */
function pilVoteCountdown(){
  let n = 3;
  document.getElementById('pil-footer').innerHTML = '';
  document.getElementById('pil-body').innerHTML =
    '<div class="pil-timer-sub">Tout le monde pointe un suspect...</div><div class="pil-timer-big">'+n+'</div>';
  const interval = setInterval(()=>{
    n--;
    if(n>0){
      Sound.play('tick');
      document.getElementById('pil-body').innerHTML =
        '<div class="pil-timer-sub">Tout le monde pointe un suspect...</div><div class="pil-timer-big">'+n+'</div>';
    } else {
      clearInterval(interval);
      Sound.play('ding');
      pilShowVoteChoice();
    }
  }, 800);
}

function pilShowVoteChoice(){
  const alive = pil.roles.map((r,i)=>({r,i})).filter(x=>x.r.alive);
  document.getElementById('pil-body').innerHTML =
    '<div class="palm-rule-line">Qui est le plus désigné ?</div>'+
    '<div class="pil-target-grid">'+
      alive.map(x=>'<div class="pil-target-btn" onclick="pilSelectAccused('+x.i+')">'+x.r.name+'</div>').join('')+
    '</div>';
  document.getElementById('pil-footer').innerHTML = '<button class="btn btn-ghost" onclick="pilAfterMorning()" style="flex:1;">Personne — pas de vote</button>';
}

function pilSelectAccused(idx){
  Sound.play('click');
  pil.pendingTarget = idx;
  const r = pil.roles[idx];
  document.getElementById('pil-body').innerHTML =
    '<div class="palm-player-big">'+r.name+'</div>'+
    '<div class="palm-rule-line">est désigné par le village</div>';
  document.getElementById('pil-footer').innerHTML =
    '<button class="btn btn-ghost" onclick="pilShowVoteChoice()" style="flex:1;">Annuler</button>'+
    '<button class="btn btn-primary" onclick="pilConfirmSentence()" style="flex:1;">Cul sec et sentence</button>';
}

/* --- Sentence --- */
function pilConfirmSentence(){
  const idx = pil.pendingTarget;
  const r = pil.roles[idx];
  const info = ROLE_INFO[r.key];
  const body = document.getElementById('pil-body');
  const footer = document.getElementById('pil-footer');

  if(r.key === 'alcoolique' && !pil.powers.alcooliqueSaved){
    pil.powers.alcooliqueSaved = true;
    Sound.play('success');
    body.innerHTML =
      '<div class="palm-player-big">'+r.name+'</div>'+
      '<div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div>'+
      '<div class="palm-rule-line" style="margin-top:12px;">Increvable ! Il survit au vote.</div>';
    footer.innerHTML = '<button class="btn btn-primary" onclick="pilNextNight()">Nuit suivante</button>';
    return;
  }

  r.alive = false;
  const wasInnocent = r.camp !== 'pilliers';
  Sound.play(wasInnocent ? 'fail' : 'win');

  let extra = '';
  if(wasInnocent) extra += '<div class="palm-rule-line" style="color:var(--clay);margin-top:10px;">Erreur judiciaire ! Tout le monde boit 2 gorgées de pénalité.</div>';
  if(r.key === 'mauvais') extra += '<div class="palm-rule-line" style="color:var(--accent);margin-top:6px;">C\'était le Mauvais Buveur — tournée générale !</div>';

  const wIdx = pil.roles.findIndex(x=>x.key==='wingman');
  if(wIdx>=0 && pil.roles[wIdx].alive && pil.bonds.wingman === idx){
    pil.roles[wIdx].alive = false;
    extra += '<div class="palm-rule-line" style="color:var(--clay);margin-top:6px;">'+pil.roles[wIdx].name+' était son Wingman — il boit cul sec en miroir !</div>';
  }

  body.innerHTML =
    '<div class="palm-player-big">'+r.name+'</div>'+
    '<div class="pil-camp-tag camp-'+info.camp+'">'+info.name+'</div>'+
    '<div class="palm-rule-line" style="margin-top:12px;">Cul sec, et révèle son identité.</div>'+
    extra;
  footer.innerHTML = '<button class="btn btn-primary" onclick="pilAfterSentence()">Continuer</button>';
}

function pilAfterSentence(){
  const win = pilCheckWin();
  if(win) return pilEndGame(win);
  pilNextNight();
}

function pilNextNight(){
  pil.night++;
  pilNightStart();
}

/* --- End game --- */
function pilEndGame(winner){
  const label = winner === 'village' ? 'Le Village l\'emporte !' : 'Les Pilliers l\'emportent !';
  creatorsGlasses++;
  let roster = '<div class="pil-roster">';
  pil.roles.forEach(r=>{
    const info = ROLE_INFO[r.key];
    roster += '<div class="'+(r.alive?'':'dead')+'">'+r.name+' — '+info.name+'</div>';
  });
  roster += '</div>';
  document.getElementById('pil-body').innerHTML =
    '<div style="font-family:var(--font);font-weight:800;letter-spacing:-0.02em;font-size:26px;color:var(--accent);">'+label+'</div>'+
    roster+
    '<div class="creators-counter">🥂 '+creatorsGlasses+' verre'+(creatorsGlasses>1?'s':'')+' pour les créateurs</div>';
  document.getElementById('pil-footer').innerHTML =
    '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>'+
    '<button class="btn btn-primary" onclick="pilStartGame()" style="flex:1;">Rejouer (mêmes joueurs)</button>';
  Sound.play('win');
}

function pilQuit(){
  if(pil.dayInterval) clearInterval(pil.dayInterval);
  Sound.ambiance(false);
  goTo('games-list');
}

// Idem : le bouton « Accueil » contourne pilQuit(), qui est le seul à couper le minuteur
// de débat.
registerScreenCleanup('pilliers', function(){
  if(pil.dayInterval) clearInterval(pil.dayInterval);
});
