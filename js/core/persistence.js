// Sauvegarde/reprise de la session Mode Rapide en cours. `state` vit uniquement en
// mémoire (voir state.js) : si l'onglet se ferme par erreur pendant une soirée, tout
// est perdu. On snapshotte régulièrement les champs sérialisables de `state` (donc pas
// les handles de setInterval) dans localStorage, et on propose de reprendre au chargement.

const SESSION_SNAPSHOT_KEY = 'soiree_session_snapshot_v1';

// Champs de `state` à sauvegarder : tout ce qui décrit la partie en cours, sans les
// handles d'intervalle (non sérialisables et de toute façon invalides après reload).
const SNAPSHOT_FIELDS = [
  'playerCount','players','durationMin','intensityValue',
  'globalSecondsTotal','globalSecondsLeft','activeRules',
  'ringTotal','ringLeft','bags','climaxElapsedTarget','climaxFired',
  'climaxQueueIndex','stats','typesQueue','queueIndex','lastItem','paused'
];

function saveSessionSnapshot(){
  // state.sessionActive n'est vrai que pendant une soirée Mode Rapide (voir
  // startMainLoop/endSession dans session-engine.js) : on évite de sauvegarder
  // pendant le wizard ou les mini-jeux de la bibliothèque.
  if(!state.sessionActive) return;
  const snapshot = {};
  SNAPSHOT_FIELDS.forEach(k=> snapshot[k] = state[k]);
  snapshot.savedAt = Date.now();
  try{
    localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }catch(e){
    // Quota localStorage dépassé : tant pis, la reprise ne sera juste pas proposée.
  }
}

function clearSessionSnapshot(){
  localStorage.removeItem(SESSION_SNAPSHOT_KEY);
}

function loadSessionSnapshot(){
  try{
    const raw = localStorage.getItem(SESSION_SNAPSHOT_KEY);
    if(!raw) return null;
    const snapshot = JSON.parse(raw);
    // Une soirée censée durer plus de 3h sans reprise est considérée comme abandonnée
    // (évite de proposer de reprendre une session vieille de plusieurs jours).
    if(Date.now() - snapshot.savedAt > 3 * 60 * 60 * 1000) return null;
    return snapshot;
  }catch(e){
    return null;
  }
}

// Affiche le bandeau "Reprendre la soirée en cours" sur l'écran d'accueil, s'il y a
// une snapshot valide. Appelé une fois au chargement de la page.
function checkForResumableSession(){
  const snapshot = loadSessionSnapshot();
  const banner = document.getElementById('resume-banner');
  if(!snapshot){
    banner.classList.add('hidden');
    return;
  }
  const minutesLeft = Math.max(1, Math.round(snapshot.globalSecondsLeft / 60));
  document.getElementById('resume-banner-text').textContent =
    'Soirée en cours · ' + snapshot.players.length + ' joueurs · ~' + minutesLeft + ' min restantes';
  banner.classList.remove('hidden');
}

function dismissResumableSession(){
  clearSessionSnapshot();
  document.getElementById('resume-banner').classList.add('hidden');
}

function resumeSession(){
  const snapshot = loadSessionSnapshot();
  if(!snapshot) return;

  SNAPSHOT_FIELDS.forEach(k=>{ if(k in snapshot) state[k] = snapshot[k]; });
  state.sessionActive = true;

  goTo('main');
  document.getElementById('global-fill').style.width =
    Math.max(0, (state.globalSecondsLeft / state.globalSecondsTotal) * 100) + '%';
  renderRulesBanner();

  if(state.lastItem){
    document.getElementById('item-eyebrow').textContent = state.lastItem.eyebrow;
    document.getElementById('item-text').textContent = state.lastItem.text;
    const tagsWrap = document.getElementById('item-players');
    tagsWrap.innerHTML = '';
    (state.lastItem.players||[]).forEach(p=>{
      const tag = document.createElement('div');
      tag.className = 'player-tag';
      tag.innerHTML = '<span class="dot" style="background:'+p.color+'"></span>'+p.name;
      tagsWrap.appendChild(tag);
    });
  }

  // Reprend le minuteur de la manche là où il s'est arrêté, plutôt que d'en relancer un neuf.
  resumeRingFrom(state.ringTotal, state.ringLeft);
  state.globalInterval = setInterval(tickGlobal, 1000);
  saveSessionSnapshot();
}
