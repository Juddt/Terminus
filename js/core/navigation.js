function openGamesList(){
  const wrap = document.getElementById('games-list-wrap');
  wrap.innerHTML = '';
  GAMES.forEach(g=>{
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = '<div class="game-name">'+g.name+'</div>'+
      '<div class="game-meta"><span>'+g.joueurs+'</span><span>'+g.duree+'</span></div>'+
      '<div style="display:flex;gap:8px;margin-top:10px;">'+
        (g.interactive ? '<button class="btn btn-primary" style="flex:2;padding:12px;" onclick="event.stopPropagation();'+g.launchFn+'()">Jouer</button>' : '')+
        '<button class="btn btn-ghost" style="flex:1;padding:12px;" onclick="event.stopPropagation();openGameDetail(\''+g.id+'\')">Règles</button>'+
      '</div>';
    wrap.appendChild(card);
  });
  goTo('games-list');
}

function openGameDetail(id){
  const g = GAMES.find(x=>x.id===id);
  document.getElementById('gd-name').textContent = g.name;
  document.getElementById('gd-desc').textContent = g.desc;
  let metaHTML = '<div class="gd-item"><b>'+g.joueurs+'</b>Joueurs</div>'+
    '<div class="gd-item"><b>'+g.duree+'</b>Durée</div>';
  if(g.materiel) metaHTML += '<div class="gd-item"><b>'+g.materiel+'</b>Matériel</div>';
  document.getElementById('gd-meta').innerHTML = metaHTML;
  const rulesWrap = document.getElementById('gd-rules');
  rulesWrap.innerHTML = '';
  g.rules.forEach((r)=>{
    const step = document.createElement('div');
    step.className = 'rule-step';
    if(typeof r === 'object' && r.card){
      step.innerHTML = '<div class="step-num" style="min-width:28px; font-size:13px;">'+r.card+'</div><div class="step-text">'+r.text+'</div>';
    } else {
      step.innerHTML = '<div class="step-text">'+r+'</div>';
    }
    rulesWrap.appendChild(step);
  });
  const playWrap = document.getElementById('gd-play-wrap');
  if(g.interactive){
    playWrap.classList.remove('hidden');
    playWrap.innerHTML = '<button class="btn btn-primary" onclick="'+g.launchFn+'()" style="width:100%;">Jouer sur l\'app</button>';
  } else {
    playWrap.classList.add('hidden');
    playWrap.innerHTML = '';
  }
  goTo('game-detail');
}

function showRulesOverlay(gameId){
  const g = GAMES.find(x=>x.id===gameId);
  if(!g) return;
  const wrap = document.getElementById('rules-overlay-content');
  wrap.innerHTML = '';
  g.rules.forEach(r=>{
    const el = document.createElement('div');
    el.className = 'rule-step';
    if(typeof r === 'object' && r.card){
      el.innerHTML = '<div class="step-num">'+r.card+'</div><div class="step-text">'+r.text+'</div>';
    } else {
      el.innerHTML = '<div class="step-text">'+r+'</div>';
    }
    wrap.appendChild(el);
  });
  document.getElementById('rules-overlay').classList.remove('hidden');
}
function closeRulesOverlay(){
  document.getElementById('rules-overlay').classList.add('hidden');
}
