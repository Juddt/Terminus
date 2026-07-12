function shuffleArr(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function buildBag(arr){ return { items: shuffleArr(arr), index:0 }; }
function drawFromBag(bagKey, sourceArr){
  let bag = state.bags[bagKey];
  if(!bag || bag.index >= bag.items.length){
    bag = buildBag(filterByTier(sourceArr));
    state.bags[bagKey] = bag;
  }
  const item = bag.items[bag.index];
  bag.index++;
  return item;
}

function buildQueue(recipe){
  let arr = [];
  Object.keys(recipe).forEach(type=>{ for(let i=0;i<recipe[type];i++) arr.push(type); });
  arr = shuffleArr(arr);
  const half = Math.floor(arr.length/2);
  const specialIdxs = arr.map((t,i)=> t==='special' ? i : -1).filter(i=>i>=0);
  const hasLateSpecial = specialIdxs.some(i=>i>=half);
  if(specialIdxs.length>0 && !hasLateSpecial){
    const swapWith = half + Math.floor(Math.random()*(arr.length-half));
    const idx = specialIdxs[0];
    const tmp = arr[idx]; arr[idx] = arr[swapWith]; arr[swapWith] = tmp;
  }
  const lateSpecials = arr.map((t,i)=> (t==='special' && i>=half) ? i : -1).filter(i=>i>=0);
  state.climaxQueueIndex = lateSpecials.length ? lateSpecials[Math.floor(Math.random()*lateSpecials.length)] : -1;
  return arr;
}

function launchSession(){
  state.globalSecondsTotal = state.durationMin * 60;
  state.globalSecondsLeft = state.globalSecondsTotal;
  state.activeRules = [];
  state.bags = {};
  state.climaxFired = false;
  state.stats = { challenges:0, specials:0, rulesAdded:0, targets:{} };
  state.typesQueue = buildQueue(RECIPES[state.durationMin]);
  state.queueIndex = 0;
  state.sessionActive = true;
  goTo('countdown');
  let n = 3;
  document.getElementById('cd-number').textContent = n;
  const cdInterval = setInterval(()=>{
    n--;
    if(n > 0){ document.getElementById('cd-number').textContent = n; }
    else { clearInterval(cdInterval); startMainLoop(); }
  }, 800);
}

function startMainLoop(){
  goTo('main');
  document.getElementById('global-fill').style.width = '100%';
  state.globalInterval = setInterval(tickGlobal, 1000);
  advanceQueue();
}

function tickGlobal(){
  if(state.paused) return;
  state.globalSecondsLeft--;
  const pct = Math.max(0, (state.globalSecondsLeft / state.globalSecondsTotal) * 100);
  document.getElementById('global-fill').style.width = pct + '%';
  // Snapshot périodique (toutes les 5s) pour la reprise de session : suffisant pour ne
  // jamais perdre plus de quelques secondes, sans écrire dans localStorage à chaque tick.
  if(state.globalSecondsLeft % 5 === 0) saveSessionSnapshot();
  // Safety net : force le climax s'il n'a pas encore eu lieu et qu'il reste peu de temps
  if(!state.climaxFired && state.globalSecondsLeft > 5 && state.globalSecondsLeft <= 30){
    fireClimax();
    return;
  }
  if(state.globalSecondsLeft <= 0){ endSession(); }
}

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function pickPlayers(n){ return [...state.players].sort(()=>Math.random()-0.5).slice(0, n); }
function fillTemplate(text, players){
  let t = text;
  players.forEach((p,i)=>{ t = t.split('{p'+(i+1)+'}').join(p.name); });
  return t;
}
function tierLimit(){ return (state.intensityValue/100) * 2; }
function filterByTier(arr){ const lim = tierLimit(); return arr.filter(i => i.tier <= lim); }
function speedFactor(){ return 1 - (state.intensityValue/100) * 0.4; }

function advanceQueue(){
  clearInterval(state.ringInterval);

  let type;
  if(state.queueIndex < state.typesQueue.length){
    type = state.typesQueue[state.queueIndex];
  } else {
    // file épuisée avant la fin du minuteur global : contenu de secours léger
    type = Math.random() < 0.5 ? 'vote' : 'light';
  }
  const isClimax = (state.queueIndex === state.climaxQueueIndex);
  state.queueIndex++;

  if(type === 'special'){
    if(isClimax){ fireClimax(); } else { showSpecialEvent(); }
    return;
  }

  if(type === 'rule'){
    const r = drawFromBag('rule', getEffectiveRules());
    const players = pickPlayers(1);
    const text = fillTemplate(r.text, players);
    state.activeRules.push(text);
    state.stats.rulesAdded++;
    renderRulesBanner();
    renderItem('Nouvelle règle', text, [], Math.round(4*speedFactor()));
  } else if(type === 'challenge'){
    const c = drawFromBag('challenge', getEffectiveChallenges());
    const players = pickPlayers(c.n);
    const text = fillTemplate(c.text, players);
    state.stats.challenges++;
    players.forEach(p=>{ state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1; });
    renderItem('Défi', text, players, Math.round(25*speedFactor()));
  } else if(type === 'minigame'){
    const m = drawFromBag('minigame', MINIGAMES);
    const players = m.text.includes('{p1}') ? pickPlayers(1) : [];
    const text = fillTemplate(m.text, players);
    renderItem('Mini-jeu', text, players, Math.round(m.dur*speedFactor()));
  } else if(type === 'vote'){
    const v = drawFromBag('vote', VOTES);
    renderItem('Vote', v.text, [], Math.round(20*speedFactor()));
  } else {
    const l = drawFromBag('light', LIGHT_EVENTS);
    renderItem('Moment', l.text, [], Math.round(l.dur*speedFactor()));
  }
}

function renderItem(eyebrow, text, players, seconds){
  document.getElementById('item-eyebrow').textContent = eyebrow;
  document.getElementById('item-text').textContent = text;
  const tagsWrap = document.getElementById('item-players');
  tagsWrap.innerHTML = '';
  players.forEach(p=>{
    const tag = document.createElement('div');
    tag.className = 'player-tag';
    tag.innerHTML = '<span class="dot" style="background:'+p.color+'"></span>'+p.name;
    tagsWrap.appendChild(tag);
  });
  // Sauvegardé pour la reprise de session (persistence.js) : permet de réafficher
  // l'item courant sans avoir à le retirer une seconde fois du bag.
  state.lastItem = { eyebrow, text, players };
  startRing(Math.max(4,seconds));
  saveSessionSnapshot();
}

function startRing(seconds){
  resumeRingFrom(seconds, seconds);
}

// Démarre (ou reprend) l'anneau de progression. `total` est la durée complète de la
// manche, `left` le temps restant à afficher — identiques pour un démarrage normal,
// différents quand on reprend une session interrompue (persistence.js).
function resumeRingFrom(total, left){
  state.ringTotal = total;
  state.ringLeft = left;
  const fg = document.getElementById('ring-fg');
  const circumference = 125.6;
  document.getElementById('ring-label').textContent = Math.max(0, left);
  fg.setAttribute('stroke-dashoffset', circumference * (1 - left/total));
  fg.style.stroke = left > 0 ? 'var(--accent)' : 'var(--sage)';
  clearInterval(state.ringInterval);
  state.ringInterval = setInterval(()=>{
    if(state.paused) return;
    state.ringLeft--;
    document.getElementById('ring-label').textContent = Math.max(0, state.ringLeft);
    const offset = circumference * (1 - state.ringLeft / state.ringTotal);
    fg.setAttribute('stroke-dashoffset', offset);
    if(state.ringLeft <= 0){
      clearInterval(state.ringInterval);
      fg.style.stroke = 'var(--sage)';
      document.getElementById('ring-label').textContent = '✓';
      playTimerEndSound();
      vibrate([60]);
    }
  }, 1000);
}

function advanceManually(){
  clearInterval(state.ringInterval);
  advanceQueue();
}

function renderRulesBanner(){
  const wrap = document.getElementById('rules-banner');
  wrap.innerHTML = '';
  state.activeRules.forEach(r=>{
    const pill = document.createElement('div');
    pill.className = 'rule-pill';
    pill.innerHTML = '<span class="ic">·</span>' + r;
    wrap.appendChild(pill);
  });
}

function showSpecialEvent(){
  const e = drawFromBag('special', SPECIAL_EVENTS);
  const players = e.n ? pickPlayers(e.n) : [];
  const text = fillTemplate(e.text, players);
  state.stats.specials++;
  document.getElementById('screen-special').classList.remove('climax');
  document.getElementById('special-eyebrow').textContent = 'Moment';
  document.getElementById('special-icon').textContent = '▲';
  document.getElementById('special-text').textContent = text;
  goTo('special');
  vibrate([80,40,80]);
  setTimeout(()=>{ goTo('main'); advanceQueue(); }, 3200);
}

function fireClimax(){
  state.climaxFired = true;
  const text = pick(CLIMAX_EVENTS);
  document.getElementById('screen-special').classList.add('climax');
  document.getElementById('special-eyebrow').textContent = "L'instant";
  document.getElementById('special-icon').textContent = '◆';
  document.getElementById('special-text').textContent = text;
  goTo('special');
  vibrate([100,60,100,60,220]);
  playClimaxSound();
  setTimeout(()=>{ goTo('main'); advanceQueue(); }, 4500);
}

function openPause(){ state.paused = true; goTo('pause'); }
function closePause(){ state.paused = false; goTo('main'); }

// Classe les joueurs par nombre de fois ciblés (state.stats.targets) pour le podium
// MVP/Loser de fin de soirée. Renvoie null si aucun défi n'a ciblé personne (rien à
// afficher) ou si tout le monde est à égalité (pas de podium pertinent).
function computeTargetPodium(){
  const ranked = state.players
    .map(p=>({ name:p.name, color:p.color, count: state.stats.targets[p.name]||0 }))
    .sort((a,b)=> b.count - a.count);
  if(!ranked.length || ranked[0].count === 0) return null;
  const mvp = ranked[0];
  const chill = ranked[ranked.length-1];
  if(mvp.count === chill.count) return null; // tout le monde à égalité : pas de distinction
  return { mvp, chill };
}

function renderTargetPodium(){
  const wrap = document.getElementById('podium-wrap');
  wrap.innerHTML = '';
  const podium = computeTargetPodium();
  if(!podium) return;

  const mvpCard = document.createElement('div');
  mvpCard.className = 'podium-card podium-mvp';
  mvpCard.innerHTML = '<div class="podium-icon">🏆</div><div><div class="stat-label">MVP DE LA SOIRÉE</div>'+
    '<div class="podium-name"><span class="dot" style="background:'+podium.mvp.color+'"></span>'+podium.mvp.name+'</div></div>'+
    '<div class="podium-count">'+podium.mvp.count+'</div>';
  wrap.appendChild(mvpCard);

  const chillCard = document.createElement('div');
  chillCard.className = 'podium-card podium-chill';
  chillCard.innerHTML = '<div class="podium-icon">😌</div><div><div class="stat-label">LE PLUS TRANQUILLE</div>'+
    '<div class="podium-name"><span class="dot" style="background:'+podium.chill.color+'"></span>'+podium.chill.name+'</div></div>'+
    '<div class="podium-count">'+podium.chill.count+'</div>';
  wrap.appendChild(chillCard);
}

function endSession(){
  clearInterval(state.globalInterval);
  clearInterval(state.ringInterval);
  state.sessionActive = false;
  clearSessionSnapshot();
  goTo('end');
  const h = Math.floor(state.durationMin/60);
  const m = state.durationMin % 60;
  document.getElementById('end-duration').textContent = h + 'h' + (m? (m<10?'0'+m:m) : '') + ' de soirée jouée';

  renderTargetPodium();

  const stats = [
    {label:'Défis lancés', value: state.stats.challenges},
    {label:'Règles imposées', value: state.stats.rulesAdded},
    {label:'Événements spéciaux', value: state.stats.specials},
  ];
  const wrap = document.getElementById('stats-wrap');
  wrap.innerHTML = '';
  stats.forEach(s=>{
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = '<div class="stat-label">'+s.label.toUpperCase()+'</div><div class="stat-value">'+s.value+'</div>';
    wrap.appendChild(card);
  });
  creatorsGlasses++;
  const cc = document.createElement('div');
  cc.className = 'creators-counter';
  cc.textContent = '🥂 '+creatorsGlasses+' verre'+(creatorsGlasses>1?'s':'')+' pour les créateurs du jeu';
  wrap.appendChild(cc);

  recordSessionInHistory();
}

function resetAll(){
  state.sessionActive = false;
  clearSessionSnapshot();
  state.step = 0; state.playerCount = 4; state.players = []; state.durationMin = 20;
  document.getElementById('player-count').value = 4;
  document.getElementById('intensity-slider').value = 50;
  updateIntensityLabel(50);
  document.getElementById('chips-wrap').innerHTML = '';
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.querySelector('.step[data-step="0"]').classList.add('active');
  document.querySelectorAll('#setup-progress div').forEach(d=>d.classList.remove('done'));
  goTo('home');
}
