// Filtre courant du catalogue ('all' ou une valeur de g.category). Persiste tant que
// l'app reste ouverte, réinitialisé au rechargement (pas besoin de le sauvegarder).
let gamesListCategoryFilter = 'all';

// Correspondance label -> slug ASCII, pour éviter des noms de classe CSS accentués
// (game-difficulty-Modéré) qui posent parfois problème selon les outils/navigateurs.
const DIFFICULTY_SLUGS = { 'Facile':'facile', 'Modéré':'modere', 'Intense':'intense' };

// Teinte du halo de scène : on réutilise la première couleur du dégradé du jeu, qui
// servait auparavant de fond plein. Le grand panneau coloré a disparu, mais chaque jeu
// garde sa signature lumineuse.
function stageGlow(g){
  const m = /#([0-9A-Fa-f]{6})/.exec(g.cardGrad || '');
  return m ? '#'+m[1] : 'var(--accent)';
}

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
    const stage = document.createElement('div');
    stage.className = 'game-stage';
    stage.setAttribute('onclick', 'openGameDetail(\''+g.id+'\')');
    stage.innerHTML =
      // L'affiche montre l'objet réel du jeu (game-posters.js) ; la silhouette plate
      // de game-art.js reste utilisée dans l'index compact, où la place est minuscule.
      '<div class="game-stage-object" style="--stage-glow:'+stageGlow(g)+'">'+
        '<div class="poster">'+(GAME_POSTERS[g.id] || GAME_ART[g.id] || '')+'</div>'+
      '</div>'+
      '<div class="game-stage-body">'+
        '<div class="game-name">'+g.name+'</div>'+
        (g.tagline ? '<div class="game-principle">'+soberize(g.tagline)+'</div>' : '')+
        '<div class="game-stage-meta"><span>'+g.joueurs+' joueurs</span><span>'+g.duree+'</span></div>'+
        '<button class="btn btn-primary" onclick="event.stopPropagation();'+g.launchFn+'()">Jouer</button>'+
      '</div>';
    wrap.appendChild(stage);
  });

  // Index compact : retrouver immédiatement un jeu précis sans balayer la scène.
  const index = document.getElementById('games-index');
  if(index){
    index.innerHTML = filtered.map(g=>
      '<div class="games-index-row" onclick="openGameDetail(\''+g.id+'\')">'+
        (GAME_ART[g.id]||'')+
        '<span class="games-index-name">'+g.name+'</span>'+
        '<span class="games-index-meta">'+g.joueurs+' · '+g.duree+'</span>'+
      '</div>'
    ).join('');
  }
}

// Fait défiler la scène d'un jeu vers la gauche ou la droite : le balayage tactile n'est
// jamais le seul moyen de naviguer (cf. accessibilité et usage à une main).
function scrollGamesScene(dir){
  const scene = document.getElementById('games-list-wrap');
  if(!scene) return;
  const card = scene.querySelector('.game-stage');
  if(!card) return;
  const step = card.offsetWidth + 16; // largeur d'une carte + l'écart défini en CSS
  scene.scrollBy({ left: dir * step, behavior:'smooth' });
}

function toggleGamesIndex(){
  const index = document.getElementById('games-index');
  const btn = document.getElementById('games-index-toggle');
  const open = index.classList.toggle('open');
  btn.textContent = open ? 'Masquer l\'index' : 'Tous les jeux';
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
    '<div class="gd-item"><b>'+g.duree+'</b>Durée</div>'+
    '<div class="gd-item"><b>'+(g.materiel || 'Aucun')+'</b>Matériel</div>';
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
    playWrap.innerHTML = '<button class="btn btn-primary" onclick="'+g.launchFn+'()" style="width:100%;">Jouer en local (passation)</button>'+
      (g.onlineUrl ? '<button class="btn btn-ghost" onclick="window.open(\''+g.onlineUrl+'\',\'_blank\')" style="width:100%;margin-top:10px;">Jouer en ligne (un téléphone par joueur)</button>' : '');
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
