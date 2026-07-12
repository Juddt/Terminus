function clampCount(){
  let v = parseInt(document.getElementById('player-count').value)||2;
  v = Math.max(2, Math.min(20, v));
  state.playerCount = v;
}
function changeCount(delta){
  state.playerCount = Math.max(2, Math.min(20, state.playerCount + delta));
  document.getElementById('player-count').value = state.playerCount;
}

function renderDurationChoices(){
  const wrap = document.getElementById('duration-list');
  wrap.innerHTML = '';
  DURATIONS.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'choice' + (state.durationMin===d.min ? ' selected':'');
    el.innerHTML = '<div><div class="choice-label">'+d.label+'</div><div class="choice-sub">'+d.sub+'</div></div>';
    el.onclick = ()=>{ state.durationMin = d.min; renderDurationChoices(); };
    wrap.appendChild(el);
  });
}

function updateIntensityLabel(val){
  state.intensityValue = parseInt(val);
  const label = document.getElementById('intensity-label');
  const sub = document.getElementById('intensity-sub');
  if(val < 34){ label.textContent='Soft'; sub.textContent='Ambiance détendue entre potes'; }
  else if(val < 67){ label.textContent='Fun'; sub.textContent='Le standard, ça commence à bouger'; }
  else { label.textContent='Chaos'; sub.textContent='Intensité maximale, accrochez-vous'; }
}

function renderChips(){
  const wrap = document.getElementById('chips-wrap');
  wrap.innerHTML = '';
  state.players.forEach((p, idx)=>{
    const chip = document.createElement('div');
    chip.className = 'chip';
    // L'avatar est cliquable pour changer d'emoji (voir cycleChipAvatar) ; stopPropagation
    // évite de déclencher un clic parasite sur le chip lui-même.
    chip.innerHTML = '<span class="avatar-badge" style="background:'+p.color+'" onclick="event.stopPropagation();cycleChipAvatar('+idx+')">'+(p.avatar||'')+'</span>' + p.name + '<span class="x" onclick="removePlayer('+idx+')">×</span>';
    wrap.appendChild(chip);
  });
  const remaining = state.playerCount - state.players.length;
  const remainingEl = document.getElementById('names-remaining');
  if(remaining > 0){
    remainingEl.textContent = 'Encore ' + remaining + (remaining===1 ? ' prénom' : ' prénoms') + ' sur ' + state.playerCount;
  } else {
    remainingEl.textContent = 'Tout le monde est là';
  }
  document.getElementById('names-next-btn').disabled = state.players.length < state.playerCount;
}
function removePlayer(idx){ state.players.splice(idx,1); renderChips(); }

// Fait défiler l'avatar emoji d'un joueur au clic, pour laisser un peu de personnalisation
// sans construire un vrai sélecteur (juste un cycle sur PLAYER_AVATARS).
function cycleChipAvatar(idx){
  const p = state.players[idx];
  if(!p) return;
  const current = PLAYER_AVATARS.indexOf(p.avatar);
  p.avatar = PLAYER_AVATARS[(current + 1) % PLAYER_AVATARS.length];
  renderChips();
}

document.getElementById('name-field').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    const val = e.target.value.trim();
    if(val && state.players.length < state.playerCount){
      state.players.push({
        name:val,
        color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
        avatar: PLAYER_AVATARS[state.players.length % PLAYER_AVATARS.length]
      });
      e.target.value = '';
      renderChips();
    }
  }
});

function nextStep(){
  if(state.step === 0) clampCount();
  if(state.step === 1 && state.players.length < state.playerCount) return;
  state.step++;
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.querySelector('.step[data-step="'+state.step+'"]').classList.add('active');
  const dots = document.querySelectorAll('#setup-progress div');
  dots.forEach((d,i)=> d.classList.toggle('done', i < state.step));
  if(state.step === 1) renderChips();
  if(state.step === 2) renderDurationChoices();
}
