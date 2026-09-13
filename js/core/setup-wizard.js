// ---------------------------------------------------------------------------------
// PAGE DE CONFIGURATION UNIQUE
// ---------------------------------------------------------------------------------
// Remplace l'ancien tunnel en trois étapes (nombre → prénoms → durée, avec des boutons
// « Suivant ») par un seul écran : mode choisi, durée, nombre de joueurs, prénoms, et
// l'action principale en bas.
//
// Choix de conception notables :
//  - Les prénoms saisis vivent dans nameDraft, indépendamment du nombre de joueurs
//    affiché. Diminuer puis réaugmenter le compteur restaure donc les prénoms déjà
//    tapés au lieu de les perdre.
//  - Un champ vide n'empêche jamais de démarrer : il devient « Joueur 3 » (voir
//    collectPlayers). La saisie des prénoms reste facultative.
//  - Chaque joueur reçoit un uid : deux « Julie » restent deux joueurs distincts pour
//    les statistiques, même si leur prénom est identique.

const LAST_DURATION_KEY = 'soiree_last_duration_v1';
const LAST_PLAYERS_KEY = 'soiree_last_players_v1';

let nameDraft = [];
let setupContext = { type: 'before', game: null };

function loadLastDuration(){
  try{
    const v = parseInt(localStorage.getItem(LAST_DURATION_KEY), 10);
    return DURATIONS.some(d => d.min === v) ? v : 30;
  }catch(e){ return 30; }
}
function saveLastDuration(min){
  try{ localStorage.setItem(LAST_DURATION_KEY, String(min)); }catch(e){}
}

// Bornes de joueurs : celles du mode, ou celles réellement déclarées par le jeu choisi
// (champ `joueurs` du catalogue : "2-10", "2+", "2"...).
function playerBounds(){
  if(setupContext.type === 'game' && setupContext.game){
    const raw = String(setupContext.game.joueurs || '');
    const range = raw.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
    if(range) return { min: parseInt(range[1],10), max: parseInt(range[2],10) };
    const plus = raw.match(/(\d+)\s*\+/);
    if(plus) return { min: parseInt(plus[1],10), max: 20 };
    const exact = raw.match(/^\s*(\d+)\s*$/);
    if(exact) return { min: parseInt(exact[1],10), max: parseInt(exact[1],10) };
  }
  return { min: 2, max: 20 };
}

// Point d'entrée : depuis l'accueil (before) ou depuis un jeu de la bibliothèque.
function openSetupFor(context){
  setupContext = context || { type:'before', game:null };
  if(setupContext.mode) state.sessionMode = setupContext.mode;
  const bounds = playerBounds();
  // Les champs restent VIDES par défaut : préremplir avec l'ancien groupe obligeait à
  // effacer des prénoms qu'on ne voulait pas. Le groupe précédent reste rappelable en un
  // geste via le bouton dédié (voir reusePreviousGroup).
  state.playerCount = Math.min(bounds.max, Math.max(bounds.min, state.playerCount || 4));
  state.durationMin = loadLastDuration();
  renderSetupPage();
  goTo('setup');
}

// « à » + un titre qui commence par un article : « Jouer à Le Duel de Dés » n'est pas
// français. On contracte comme il se doit, et on laisse « à » seul devant les titres
// sans article (Purple, UnderDicateur…).
function aTitre(name){
  if(/^Le /.test(name))  return 'au ' + name.slice(3);
  if(/^Les /.test(name)) return 'aux ' + name.slice(4);
  if(/^La /.test(name))  return 'à la ' + name.slice(3);
  if(/^L'/.test(name))   return "à l'" + name.slice(2);
  return 'à ' + name;
}

function renderSetupPage(){
  const isBefore = setupContext.type === 'before';
  const game = setupContext.game;

  // Un jeu précis n'a pas de durée de before : on ne lui impose pas ce réglage.
  const durBlock = document.getElementById('setup-duration-block');
  if(durBlock) durBlock.style.display = isBefore ? '' : 'none';
  // Un seul libellé de lancement : l'ambiance n'est plus un choix du joueur (voir
  // setSessionMode), donc le bouton ne la mentionne plus.
  const launchBtn = document.getElementById('setup-launch-btn');
  launchBtn.textContent = isBefore ? 'Lancer le before' : 'Jouer ' + aTitre(game.name);

  if(isBefore) renderDurationChoices();
  renderCounter();
  renderNameRows();
}

function renderDurationChoices(){
  const wrap = document.getElementById('duration-seg');
  if(!wrap) return;
  wrap.innerHTML = DURATIONS.map(d =>
    '<button class="seg-btn'+(state.durationMin === d.min ? ' selected' : '')+'" onclick="selectDuration('+d.min+')">'+
      (d.min >= 60 ? '1 h' : d.min + ' min') +
    '</button>'
  ).join('');
}
function selectDuration(min){
  state.durationMin = min;
  saveLastDuration(min);
  Sound.play('tick');
  renderDurationChoices();
}

function renderCounter(){
  const bounds = playerBounds();
  const label = document.getElementById('player-count-label');
  if(label) label.textContent = state.playerCount;
  const minus = document.getElementById('count-minus');
  const plus = document.getElementById('count-plus');
  // Rendus indisponibles aux bornes plutôt que silencieusement inopérants.
  if(minus) minus.disabled = state.playerCount <= bounds.min;
  if(plus) plus.disabled = state.playerCount >= bounds.max;
}

function changeCount(delta){
  const bounds = playerBounds();
  const next = Math.max(bounds.min, Math.min(bounds.max, state.playerCount + delta));
  if(next === state.playerCount) return;
  captureNameDraft();           // ne jamais perdre les saisies en cours
  state.playerCount = next;
  Sound.play('tick');
  renderCounter();
  renderNameRows();
}

// Relit les champs affichés vers le brouillon (avant tout re-rendu).
function captureNameDraft(){
  document.querySelectorAll('#name-rows .name-row-input').forEach(input=>{
    nameDraft[parseInt(input.dataset.index, 10)] = input.value;
  });
}

// Rappelle le groupe de la dernière soirée dans les champs, sur demande explicite.
function reusePreviousGroup(){
  const last = loadLastPlayers();
  if(!last || !last.length) return;
  nameDraft = last.map(p => p.name);
  state.playerCount = Math.min(playerBounds().max, Math.max(playerBounds().min, last.length));
  Sound.play('tick');
  renderCounter();
  renderNameRows();
}

function renderNameRows(){
  const wrap = document.getElementById('name-rows');
  if(!wrap) return;
  // Bouton de reprise affiché seulement s'il y a un groupe précédent ET que rien n'a
  // encore été saisi : il ne doit jamais écraser une saisie en cours.
  const reuse = document.getElementById('reuse-group');
  if(reuse){
    const last = loadLastPlayers();
    const vierge = !nameDraft.some(n => (n||'').trim());
    reuse.style.display = (last && last.length && vierge) ? '' : 'none';
    if(last && last.length) reuse.textContent = 'Reprendre : ' + last.map(p=>p.name).join(', ');
  }
  const n = state.playerCount;
  let html = '';
  for(let i = 0; i < n; i++){
    const last = (i === n - 1);
    html +=
      '<div class="name-row">'+
        '<span class="name-row-dot" style="background:'+PLAYER_COLORS[i % PLAYER_COLORS.length]+'"></span>'+
        '<input class="name-row-input" data-index="'+i+'" type="text" maxlength="16" '+
          'value="'+escapeHtml(nameDraft[i] || '')+'" placeholder="Prénom '+(i+1)+'" '+
          'autocomplete="off" autocapitalize="words" '+
          // « Suivant » du clavier passe au champ suivant ; le dernier ferme le clavier.
          'enterkeyhint="'+(last ? 'done' : 'next')+'" '+
          'oninput="onNameInput(this)" onkeydown="onNameKey(event, this)">'+
      '</div>';
  }
  wrap.innerHTML = html;
}

function onNameInput(input){
  nameDraft[parseInt(input.dataset.index, 10)] = input.value;
}

function onNameKey(e, input){
  if(e.key !== 'Enter') return;
  e.preventDefault();
  const idx = parseInt(input.dataset.index, 10);
  const next = document.querySelector('#name-rows .name-row-input[data-index="'+(idx+1)+'"]');
  if(next && next.focus) next.focus();
  else if(input.blur) input.blur();
}

// Liste de joueurs au lancement. Champ vide => « Joueur N », jamais de blocage.
function collectPlayers(){
  captureNameDraft();
  const players = [];
  for(let i = 0; i < state.playerCount; i++){
    const raw = (nameDraft[i] || '').trim();
    players.push({
      name: raw || ('Joueur ' + (i + 1)),
      uid: 'p' + i + '_' + Date.now(),
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      avatar: PLAYER_AVATARS[i % PLAYER_AVATARS.length]
    });
  }
  return players;
}

function saveLastPlayers(){
  try{
    localStorage.setItem(LAST_PLAYERS_KEY, JSON.stringify(
      state.players.map(p => ({ name: p.name, avatar: p.avatar }))
    ));
  }catch(e){}
}
function loadLastPlayers(){
  try{
    const raw = localStorage.getItem(LAST_PLAYERS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

// Action principale de la page de configuration. Un jeu de la bibliothèque et le before
// partagent désormais le MÊME écran de réglages : c'était déjà le cas pour les bornes de
// joueurs (playerBounds lit le champ `joueurs` du catalogue), mais la bibliothèque
// lançait encore les jeux par leur propre écran de saisie, en doublon. Un jeu qui déclare
// `startFn` reçoit ici les joueurs collectés et démarre ; les autres gardent leur écran
// dédié le temps d'être repris.
function launchFromSetup(){
  if(setupContext.type === 'game' && setupContext.game && setupContext.game.startFn){
    const players = collectPlayers();
    state.players = players;
    saveLastPlayers();
    window[setupContext.game.startFn](players);
    return;
  }
  launchSession();
}

// Depuis l'écran de fin : revenir changer la durée en gardant le groupe.
function changeDuration(){
  setupContext = { type:'before', game:null };
  nameDraft = state.players.map(p => p.name);
  renderSetupPage();
  goTo('setup');
}
