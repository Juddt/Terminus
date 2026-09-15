
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
  const filtered = GAMES;

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
        '<div class="game-stage-meta">'+
          '<span>'+g.joueurs+' joueurs</span><span>'+g.duree+'</span>'+
        '</div>'+
        '<div class="game-stage-actions">'+
          '<button class="btn btn-primary" onclick="event.stopPropagation();'+g.launchFn+'()">Jouer</button>'+
          '<button class="btn btn-ghost" onclick="event.stopPropagation();showRulesOverlay(\''+g.id+'\')">Règles</button>'+
        '</div>'+
      '</div>';
    wrap.appendChild(stage);
  });

  renderGamesDots(filtered.length);

  // Mosaïque : retrouver un jeu d'un coup d'œil, avec son objet — le même que la fiche.
  const index = document.getElementById('games-index');
  if(index){
    index.innerHTML = filtered.map((g, i)=>
      '<button class="games-tile" onclick="pickGameFromIndex('+i+')">'+
        '<span class="games-tile-art" style="--stage-glow:'+stageGlow(g)+'">'+
          '<span class="games-tile-poster">'+(GAME_POSTERS[g.id] || GAME_ART[g.id] || '')+'</span>'+
        '</span>'+
        '<span class="games-tile-name">'+g.name+'</span>'+
      '</button>'
    ).join('');
  }
}

// Une pastille par jeu de la sélection courante. Elles remplacent les deux flèches, qui
// occupaient une ligne entière et faisaient bouger la mise en page d'un jeu à l'autre.
function renderGamesDots(total){
  const wrap = document.getElementById('games-dots');
  if(!wrap) return;
  if(total < 2){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = Array.from({length: total}, (_, i) =>
    '<button class="games-dot'+(i === 0 ? ' current' : '')+'" data-i="'+i+'" '+
      'aria-label="Jeu '+(i+1)+' sur '+total+'" onclick="goToGameIndex('+i+')"></button>'
  ).join('');
}

// Le balayage tactile n'est jamais le seul moyen de naviguer : on peut toucher une
// pastille pour sauter directement à un jeu.
function goToGameIndex(i){
  const scene = document.getElementById('games-list-wrap');
  const card = scene && scene.querySelector('.game-stage');
  if(!card) return;
  scene.scrollTo({ left: i * card.offsetWidth, behavior:'smooth' });
}

// La pastille active suit le défilement réel — y compris un balayage à mi-chemin, qui
// se recale sur le jeu le plus proche.
function syncGamesDots(){
  const scene = document.getElementById('games-list-wrap');
  const wrap = document.getElementById('games-dots');
  if(!scene || !wrap || !wrap.children.length) return;
  const card = scene.querySelector('.game-stage');
  if(!card || !card.offsetWidth) return;
  const idx = Math.round(scene.scrollLeft / card.offsetWidth);
  [...wrap.children].forEach((d, i) => d.classList.toggle('current', i === idx));
}

// Toucher une tuile amène à ce jeu dans la scène et referme la mosaïque : on repart de
// la fiche complète, avec « Jouer » et « Règles » sous la main.
function pickGameFromIndex(i){
  goToGameIndex(i);
  // La mosaïque reste en place : on remonte simplement sur la fiche du jeu choisi, avec
  // « Jouer » et « Règles » sous la main.
  const screen = document.getElementById('screen-games-list');
  if(screen) screen.scrollTo({ top:0, behavior:'smooth' });
}


function openGamesList(){
  renderGamesList();
  // Un seul écouteur, posé une fois pour toutes : la scène est reconstruite à chaque
  // changement de filtre, pas son conteneur.
  const scene = document.getElementById('games-list-wrap');
  if(scene && !scene.dataset.dotsBound){
    scene.addEventListener('scroll', syncGamesDots, { passive:true });
    scene.dataset.dotsBound = '1';
  }
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
  const title = document.getElementById('rules-overlay-title');
  if(title) title.textContent = g.name;
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
