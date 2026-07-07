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
    const r = drawFromBag('rule', RULES);
    const players = pickPlayers(1);
    const text = fillTemplate(r.text, players);
    state.activeRules.push(text);
    state.stats.rulesAdded++;
    renderRulesBanner();
    renderItem('Nouvelle règle', text, [], Math.round(4*speedFactor()));
  } else if(type === 'challenge'){
    const c = drawFromBag('challenge', CHALLENGES);
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
  startRing(Math.max(4,seconds));
}

function startRing(seconds){
  state.ringTotal = seconds;
  state.ringLeft = seconds;
  const fg = document.getElementById('ring-fg');
  const circumference = 125.6;
  document.getElementById('ring-label').textContent = seconds;
  fg.setAttribute('stroke-dashoffset', 0);
  fg.style.stroke = 'var(--accent)';
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
  if(navigator.vibrate) navigator.vibrate([80,40,80]);
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
  if(navigator.vibrate) navigator.vibrate([100,60,100,60,220]);
  setTimeout(()=>{ goTo('main'); advanceQueue(); }, 4500);
}

function openPause(){ state.paused = true; goTo('pause'); }
function closePause(){ state.paused = false; goTo('main'); }

function endSession(){
  clearInterval(state.globalInterval);
  clearInterval(state.ringInterval);
  goTo('end');
  const h = Math.floor(state.durationMin/60);
  const m = state.durationMin % 60;
  document.getElementById('end-duration').textContent = h + 'h' + (m? (m<10?'0'+m:m) : '') + ' de soirée jouée';

  let topTarget = '—', topCount = 0;
  Object.keys(state.stats.targets).forEach(name=>{
    if(state.stats.targets[name] > topCount){ topCount = state.stats.targets[name]; topTarget = name; }
  });

  const stats = [
    {label:'Le plus sollicité', value: topTarget + (topCount? ' ('+topCount+')' : '')},
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
}

function resetAll(){
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
