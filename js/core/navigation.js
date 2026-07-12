// Filtre courant du catalogue ('all' ou une valeur de g.category). Persiste tant que
// l'app reste ouverte, réinitialisé au rechargement (pas besoin de le sauvegarder).
let gamesListCategoryFilter = 'all';

// Correspondance label -> slug ASCII, pour éviter des noms de classe CSS accentués
// (game-difficulty-Modéré) qui posent parfois problème selon les outils/navigateurs.
const DIFFICULTY_SLUGS = { 'Facile':'facile', 'Modéré':'modere', 'Intense':'intense' };

function renderGamesList(){
  const wrap = document.getElementById('games-list-wrap');
  wrap.innerHTML = '';
  const filtered = gamesListCategoryFilter === 'all'
    ? GAMES
    : GAMES.filter(g=> g.category === gamesListCategoryFilter);

  if(!filtered.length){
    wrap.innerHTML = '<div class="step-sub">Aucun jeu dans cette catégorie.</div>';
    return;
  }

  filtered.forEach(g=>{
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = '<div class="game-name">'+g.name+'</div>'+
      '<div class="game-meta"><span>'+g.joueurs+'</span><span>'+g.duree+'</span>'+
        (g.category ? '<span>'+g.category+'</span>' : '')+
        (g.difficulty ? '<span class="game-difficulty game-difficulty-'+(DIFFICULTY_SLUGS[g.difficulty]||'')+'">'+g.difficulty+'</span>' : '')+
      '</div>'+
      '<div style="display:flex;gap:8px;margin-top:10px;">'+
        (g.interactive ? '<button class="btn btn-primary" style="flex:2;padding:12px;" onclick="event.stopPropagation();'+g.launchFn+'()">Jouer</button>' : '')+
        '<button class="btn btn-ghost" style="flex:1;padding:12px;" onclick="event.stopPropagation();openGameDetail(\''+g.id+'\')">Règles</button>'+
      '</div>';
    wrap.appendChild(card);
  });
}

function setGamesListFilter(category){
  gamesListCategoryFilter = category;
  document.querySelectorAll('.games-filter-chip').forEach(el=>{
    el.classList.toggle('selected', el.dataset.category === category);
  });
  renderGamesList();
}

function openGamesList(){
  const filterWrap = document.getElementById('games-filter-wrap');
  if(filterWrap && !filterWrap.dataset.built){
    // Une puce "Tous" + une par catégorie présente dans le catalogue.
    const categories = ['all', ...new Set(GAMES.map(g=>g.category).filter(Boolean))];
    filterWrap.innerHTML = categories.map(c=>
      '<div class="games-filter-chip'+(c==='all'?' selected':'')+'" data-category="'+c+'" onclick="setGamesListFilter(\''+c+'\')">'+(c==='all'?'Tous':c)+'</div>'
    ).join('');
    filterWrap.dataset.built = '1';
  }
  renderGamesList();
  goTo('games-list');
}

function openGameDetail(id){
  const g = GAMES.find(x=>x.id===id);
  document.getElementById('gd-name').textContent = g.name;
  document.getElementById('gd-desc').textContent = soberize(g.desc);
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
      step.innerHTML = '<div class="step-num" style="min-width:28px; font-size:13px;">'+r.card+'</div><div class="step-text">'+soberize(r.text)+'</div>';
    } else {
      step.innerHTML = '<div class="step-text">'+soberize(r)+'</div>';
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
      el.innerHTML = '<div class="step-num">'+r.card+'</div><div class="step-text">'+soberize(r.text)+'</div>';
    } else {
      el.innerHTML = '<div class="step-text">'+soberize(r)+'</div>';
    }
    wrap.appendChild(el);
  });
  document.getElementById('rules-overlay').classList.remove('hidden');
}
function closeRulesOverlay(){
  document.getElementById('rules-overlay').classList.add('hidden');
}
