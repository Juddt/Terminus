function shuffleArr(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// --- Historique persistant de contenu déjà servi (remplace l'ancien sac-mélangé qui
// repartait de zéro à chaque lancement de soirée, dans le même onglet ou non) ---
// Un item est retiré de la pioche possible dès qu'il a été servi, jusqu'à ce que TOUT
// le contenu actuellement éligible (selon la fenêtre de tiers en cours) ait été vu au
// moins une fois — auquel cas le cycle recommence. Persisté en localStorage : deux
// soirées d'affilée ne resservent donc pas les mêmes premières phrases.
function keyOf(item){ return typeof item === 'string' ? item : item.text; }
function loadUsedSet(bagKey){
  try{
    const raw = localStorage.getItem('soiree_used_'+bagKey+'_v1');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  }catch(e){ return new Set(); }
}
function saveUsedSet(bagKey, set){
  try{ localStorage.setItem('soiree_used_'+bagKey+'_v1', JSON.stringify([...set])); }catch(e){}
}
function drawFromBag(bagKey, sourceArr){
  const pool = filterByTier(sourceArr);
  let used = loadUsedSet(bagKey);
  let candidates = pool.filter(i=> !used.has(keyOf(i)));
  if(!candidates.length){ used = new Set(); candidates = pool; }
  const chosen = pick(candidates);
  used.add(keyOf(chosen));
  saveUsedSet(bagKey, used);
  return chosen;
}

// Correspondance entre la fenêtre de tiers d'une phase et une intensité numérique
// représentative, réutilisée par speedFactor() (rythme) et le mode Chaos visuel
// — voir updateIntensityForIndex. L'intensité ne pilote plus que le contenu et le rythme.
const TIER_TO_INTENSITY = {0:20, 1:55, 2:90};

// Assouplit ou renforce certains types de contenu selon le nombre de joueurs : un vote
// est moins intéressant à 2-3 (la majorité est triviale), un défi/mini-jeu en duel
// devient au contraire le cœur du jeu ; à l'inverse un grand groupe profite davantage
// des votes et des moments collectifs.
function applyPlayerCountBias(weights, playerCount){
  const w = {...weights};
  if(playerCount <= 3){
    if(w.vote) w.vote *= 0.5;
    if(w.challenge) w.challenge *= 1.3;
  } else if(playerCount >= 9){
    if(w.vote) w.vote *= 1.4;
    if(w.light) w.light *= 1.2;
  }
  return w;
}

// --- ÉVITER LES SÉRIES -----------------------------------------------------------------
// Trois manches identiques d'affilée (trois votes, trois « moments »…) donnent
// l'impression que l'application tourne en rond. Plutôt que de mélanger puis de
// rapiécer, on CONSTRUIT directement une file sans série : c'est plus simple, et surtout
// c'est correct.
//
// La version précédente permutait les items après coup. Elle tombait dans un cycle : ne
// trouvant aucun candidat après une série, elle permutait avec un item situé juste avant
// — celui-là même qu'elle venait d'y déplacer — et remettait la série en place. Répéter
// la passe ne servait à rien, l'échange s'annulait à chaque tour, et l'on pouvait voir
// cinq « moments » de suite en fin de soirée.
//
// L'algorithme : on avance position par position et, à chaque fois, on sert le type
// qu'il reste le plus à placer, en écartant celui qui formerait une troisième
// répétition. Cela garantit au plus deux items identiques d'affilée dès que la
// composition le permet (autrement dit, tant qu'aucun type ne dépasse le double du
// nombre des autres plus un).
//
// La contrainte à respecter n'est pas la phase mais la FENÊTRE DE TIERS de chaque
// position : c'est elle qui garantit qu'on ne verra pas de contenu de fin de soirée à
// l'ouverture. Chaque position ne peut donc recevoir qu'un type provenant du stock de sa
// propre fenêtre — mais la file est parcourue d'un bout à l'autre, ce qui élimine aussi
// les séries à cheval sur deux phases.
function tierKey(w){ return w.min + '-' + w.max; }

function buildQueueWithoutRuns(slots){
  // slots : [{ type, window }] dans l'ordre des phases. On regroupe les types par
  // fenêtre, puis on réémet dans les mêmes positions.
  const stock = {};
  slots.forEach(s=>{
    const k = tierKey(s.window);
    stock[k] = stock[k] || {};
    stock[k][s.type] = (stock[k][s.type] || 0) + 1;
  });

  const out = [];
  for(let i = 0; i < slots.length; i++){
    const pool = stock[tierKey(slots[i].window)];
    const prev1 = out[i-1], prev2 = out[i-2];
    const forbidden = (prev1 !== undefined && prev1 === prev2) ? prev1 : null;

    let best = null, bestCount = -1;
    Object.keys(pool).forEach(type=>{
      if(pool[type] <= 0 || type === forbidden) return;
      // À égalité de stock restant, on tranche au hasard : deux soirées avec la même
      // trame ne doivent pas produire exactement le même ordre.
      if(pool[type] > bestCount || (pool[type] === bestCount && Math.random() < 0.5)){
        best = type; bestCount = pool[type];
      }
    });
    // Aucun autre type disponible dans cette fenêtre : la série est inévitable, on sert
    // quand même plutôt que de laisser un trou dans la soirée.
    if(best === null){
      best = Object.keys(pool).find(t=> pool[t] > 0);
      if(best === undefined) best = slots[i].type;
    }
    if(pool[best] > 0) pool[best]--;
    out.push(best);
  }
  return out;
}

// Mémorise la dernière trame utilisée PAR DURÉE (10/30/60 ont chacune leur propre
// historique), pour ne jamais la reproposer au lancement suivant de la même durée.
const LAST_STRUCTURE_KEY = 'soiree_last_structure_v1';
function loadLastStructureId(durationMin){
  try{ return (JSON.parse(localStorage.getItem(LAST_STRUCTURE_KEY)||'{}'))[durationMin] || null; }
  catch(e){ return null; }
}
function saveLastStructureId(durationMin, id){
  try{
    const raw = JSON.parse(localStorage.getItem(LAST_STRUCTURE_KEY)||'{}');
    raw[durationMin] = id;
    localStorage.setItem(LAST_STRUCTURE_KEY, JSON.stringify(raw));
  }catch(e){}
}

// Nombre total d'items de contenu par durée (hors climax final, ajouté à part) —
// reprend exactement les volumes de l'ancienne table RECIPES, calibrés à l'usage pour
// remplir la durée sans jamais répéter de contenu (voir le journal de bord). Le bug
// corrigé ici calculait ce total en divisant le temps de chaque phase par la durée
// nominale de chaque type d'item (AVG_DURATION) : pour un type court comme "rule" (5s
// nominales), ça gonflait le compte de façon disproportionnée (jusqu'à 250+ items sur
// une soirée d'1h, largement dominés par des règles) au lieu des ~80 items visés,
// puisque les items s'enchaînent au rythme du groupe (avance manuelle), pas au rythme
// du minuteur indicatif de chaque item.
const TOTAL_ITEMS_BY_DURATION = { 10:10, 30:30, 60:80 };

// Répartit `total` items entiers entre les types de `weights` en respectant leurs
// proportions relatives, sans perte d'arrondi (méthode des plus grands restes) : la
// somme des comptes obtenus vaut toujours exactement `total`.
function distributeCounts(total, weights){
  const types = Object.keys(weights);
  const sumW = types.reduce((a,t)=> a + weights[t], 0) || 1;
  const exact = types.map(t=> ({ t, value: total * weights[t] / sumW }));
  const counts = {};
  let assigned = 0;
  exact.forEach(e=>{ counts[e.t] = Math.floor(e.value); assigned += counts[e.t]; });
  let remainder = total - assigned;
  exact.sort((a,b)=> (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)));
  for(let i=0; i<remainder && exact.length; i++){ counts[exact[i % exact.length].t]++; }
  return counts;
}

// Construit la file d'une soirée à partir d'une trame (STRUCTURES) choisie au hasard
// pour la durée demandée, en écartant la dernière trame utilisée pour cette même durée.
// Renvoie { queue, tierWindows } : deux tableaux parallèles — le type de chaque item et
// la fenêtre de tiers à utiliser au moment de le tirer (state.currentTierWindow en est
// synchronisé à chaque avancée, voir updateIntensityForIndex). Un climax est toujours
// ajouté en tout dernier, garantissant une vraie fin plutôt qu'un contenu quelconque.
function buildStructuredQueue(durationMin, playerCount){
  const profiles = STRUCTURES[durationMin] || STRUCTURES[30];
  const avoidId = loadLastStructureId(durationMin);
  const pool = profiles.filter(p=> p.id !== avoidId);
  const profile = pick(pool.length ? pool : profiles);
  saveLastStructureId(durationMin, profile.id);

  const totalItems = Math.max(1, (TOTAL_ITEMS_BY_DURATION[durationMin] || 30) - 1); // -1 : le climax est ajouté à part, hors de ce total
  const queue = [];
  const tierWindows = [];
  const slots = [];          // { type, window } dans l'ordre des phases
  let remaining = totalItems;
  profile.phases.forEach((phase, i)=>{
    const isLast = i === profile.phases.length - 1;
    const weights = applyPlayerCountBias(phase.weights, playerCount);
    // La dernière phase absorbe l'arrondi restant, pour retomber exactement sur
    // `totalItems` au total plutôt que de dériver de quelques unités phase après phase.
    const phaseCount = isLast ? remaining : Math.min(remaining, Math.max(1, Math.round(totalItems * phase.share)));
    remaining -= phaseCount;
    const counts = distributeCounts(phaseCount, weights);
    Object.keys(counts).forEach(type=>{
      for(let k = 0; k < counts[type]; k++) slots.push({ type, window: phase.tier });
    });
  });

  // La file est composée d'un seul tenant, sans série de trois items identiques (voir
  // buildQueueWithoutRuns), en respectant la fenêtre de tiers de chaque position.
  buildQueueWithoutRuns(slots).forEach((t, i)=>{
    queue.push(t);
    tierWindows.push(slots[i].window);
  });
  // Climax garanti tout à la fin, quel que soit le contenu déjà généré pour la finale —
  // on ne dépend plus d'un tirage qui pourrait placer le "special" ailleurs.
  const lastPhase = profile.phases[profile.phases.length-1];
  queue.push('special');
  tierWindows.push(lastPhase.tier);
  state.climaxQueueIndex = queue.length - 1;
  return { queue, tierWindows };
}

// Synchronise state.currentTierWindow / state.intensityValue / le mode Chaos visuel sur
// la phase à laquelle appartient l'item d'index `idx` de la file en cours. Remplace
// l'ancien réglage manuel unique (curseur Soft/Fun/Chaos) : l'intensité grimpe et
// redescend désormais toute seule, phase après phase, au fil de la structure choisie.
function updateIntensityForIndex(idx){
  const raw = (state.queueTierWindows && state.queueTierWindows[idx]) || {min:0, max:1};
  // Mode Chill : on ne dépasse jamais la fenêtre {0,1} (jamais de contenu tier 2, jamais
  // le mode Chaos visuel, rythme mécaniquement plus doux via speedFactor). Mode Chaos :
  // pleine amplitude de la trame, inchangée.
  const cap = state.sessionMode === 'chill' ? 1 : 2;
  const tw = { min: Math.min(raw.min, cap), max: Math.min(raw.max, cap) };
  state.currentTierWindow = tw;
  state.intensityValue = TIER_TO_INTENSITY[tw.max] != null ? TIER_TO_INTENSITY[tw.max] : 55;
  // L'intensité reste INTERNE : elle règle le contenu tiré et le rythme (speedFactor),
  // sans traitement visuel propre. Les bandeaux rayés « mode Chaos » ont été retirés —
  // ils recouvraient les commandes et clignotaient en permanence. C'est le chemin qui
  // porte l'ambiance désormais (voir Trail.signal).
}

// L'accueil ne propose plus qu'une seule porte d'entrée vers le before : l'intensité
// n'est plus un réglage offert au joueur. Elle monte et redescend toute seule, phase
// après phase, au fil de la trame choisie (voir STRUCTURES et updateIntensityForIndex),
// ce qui donne des vagues au sein d'une même soirée plutôt qu'un niveau constant choisi
// à l'avance. `sessionMode` reste dans l'état, en interne : 'full' laisse au moteur toute
// l'amplitude de la trame, 'chill' la plafonne au tier 1 (réservé à un éventuel réglage
// d'accessibilité, plus exposé dans l'interface).
function setSessionMode(mode){
  state.sessionMode = (mode === 'chill') ? 'chill' : 'full';
}

function launchSession(){
  state.globalSecondsTotal = state.durationMin * 60;
  state.globalSecondsLeft = state.globalSecondsTotal;
  // Les joueurs viennent des champs de la page de configuration : un champ vide
  // devient "Joueur N" (voir collectPlayers), le lancement n'est jamais bloqué.
  if(typeof collectPlayers === 'function') state.players = collectPlayers();
  state.activeRules = [];
  state.pending = [];
  state.lastRecallIndex = null;
  state.recentTypes = [];
  state.itemMeta = {};
  state.climaxFired = false;
  state.timeUp = false;
  state.timeUpGrace = 0;
  // playerChallenges : {done, failed} par joueur (boutons ✓ Fait / ✗ Raté). playerDrinks :
  // verres bus par joueur — convention du jeu, incrémenté uniquement quand un défi est
  // marqué "Raté" (pas de tentative de deviner un nombre de gorgées dans le texte libre
  // des règles/événements, trop peu fiable).
  state.stats = { challenges:0, specials:0, rulesAdded:0, targets:{}, playerChallenges:{}, playerDrinks:{} };
  const built = buildStructuredQueue(state.durationMin, state.players.length);
  state.typesQueue = built.queue;
  state.queueTierWindows = built.tierWindows;
  state.queueIndex = 0;
  // Réglage initial avant le premier advanceQueue() (countdown encore affiché) : évite un
  // court instant où l'intensité/le mode Chaos garderaient la valeur de la session d'avant.
  updateIntensityForIndex(0);
  state.sessionActive = true;
  if(typeof saveLastPlayers === 'function') saveLastPlayers();
  renderChallengeCounter();
  goTo('countdown');
  let n = 3;
  document.getElementById('cd-number').textContent = n;
  const cdInterval = setInterval(()=>{
    n--;
    if(n > 0){ document.getElementById('cd-number').textContent = n; Sound.play('tick'); }
    else { clearInterval(cdInterval); Sound.play('ding'); startMainLoop(); }
  }, 800);
}

// Relance une soirée à l'identique (mêmes joueurs, même durée) depuis l'écran de fin —
// bouton "Rejouer". Une nouvelle trame sera choisie (voir buildStructuredQueue), donc la
// partie suivante ne rejoue jamais du contenu identique dans le même ordre.
// Relance une soirée à l'identique (mêmes joueurs, même durée) depuis l'écran de fin —
// bouton "Rejouer". Une nouvelle trame sera choisie (voir buildStructuredQueue), donc la
// partie suivante ne rejoue jamais du contenu identique dans le même ordre.
function playAgainSameConfig(){ launchSession(); }

// --- Entrée "Lancer le before" et gestion des joueurs en cours de partie -----------

// Si une soirée existe déjà, on demande explicitement quoi faire plutôt que de reprendre
// ou d'écraser en silence.
function openLaunchEntry(mode){
  state.pendingLaunchMode = mode || state.sessionMode || 'full';
  const snapshot = loadSessionSnapshot();
  if(snapshot){
    const minutesLeft = Math.max(1, Math.round(snapshot.globalSecondsLeft / 60));
    document.getElementById('session-conflict-text').textContent =
      'Une soirée est en cours avec '+snapshot.players.length+' joueur'+(snapshot.players.length>1?'s':'')+' (~'+minutesLeft+' min restantes).';
    document.getElementById('session-conflict-overlay').classList.remove('hidden');
  } else {
    startNewSessionWizard();
  }
}
function startNewSessionWizard(mode){
  // Ouvre la page de configuration unique (voir setup-wizard.js). L'ancien code
  // manipulait les .step[data-step] du tunnel, qui n'existent plus.
  openSetupFor({ type:'before', game:null, mode: mode || state.pendingLaunchMode || state.sessionMode });
}
function closeSessionConflictModal(){ document.getElementById('session-conflict-overlay').classList.add('hidden'); }
function conflictResume(){ closeSessionConflictModal(); resumeSession(); }
function conflictRestart(){
  closeSessionConflictModal();
  clearSessionSnapshot();
  document.getElementById('resume-banner').classList.add('hidden');
  startNewSessionWizard(state.pendingLaunchMode);
}

// Retour \u00e0 l'accueil depuis une partie : quitter n'est PAS terminer. On fige les
// minuteurs, on sauvegarde l'\u00e9tat exact, la soir\u00e9e reste reprenable.
function quitSessionToHome(){
  state.paused = true;
  clearInterval(state.globalInterval);
  clearInterval(state.ringInterval);
  saveSessionSnapshot();
  // Le chemin est figé sur sa position : revenir à l'accueil met en pause, ne termine pas.
  if(window.Trail) Trail.freeze();
  goTo('home');
  checkForResumableSession();
}

function openAddPlayerOverlay(){
  // Partie suspendue pendant la saisie : sinon le minuteur tourne clavier ouvert.
  state.pausedForPlayers = !state.paused;
  if(state.pausedForPlayers) state.paused = true;
  renderSessionPlayersList();
  document.getElementById('add-player-field').value = '';
  document.getElementById('players-sheet').classList.add('open');
}
function closeAddPlayerOverlay(){
  document.getElementById('players-sheet').classList.remove('open');
  if(state.pausedForPlayers){ state.paused = false; state.pausedForPlayers = false; }
  saveSessionSnapshot();
}

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// Choisit les joueurs les moins sollicit\u00e9s jusqu'ici (state.stats.targets), avec une
// marge (min+1) et un tirage al\u00e9atoire dans ce sous-groupe : la participation s'\u00e9quilibre
// sans devenir m\u00e9caniquement pr\u00e9visible.
function pickPlayers(n){
  if(!state.players.length || n<=0) return [];
  const counts = state.players.map(p=> state.stats.targets[p.name]||0);
  const minCount = Math.min(...counts);
  let candidates = state.players.filter(p=> (state.stats.targets[p.name]||0) <= minCount+1);
  if(candidates.length < n) candidates = state.players;
  return shuffleArr(candidates).slice(0, n);
}

// D\u00e9marre la boucle principale apr\u00e8s le compte \u00e0 rebours de lancement.
function startMainLoop(){
  goTo('main');
  // Seule occasion où la progression du chemin repart de zéro : une nouvelle soirée.
  if(window.Trail) Trail.reset();
  clearInterval(state.globalInterval);
  state.globalInterval = setInterval(tickGlobal, 1000);
  if(typeof renderProgressPath === 'function') renderProgressPath();
  renderRulesBanner();
  advanceQueue();
}

// --- Joueurs pendant la partie (panneau depuis le bas) ---
function renderSessionPlayersList(){
  const wrap = document.getElementById('session-players-list');
  if(!wrap) return;
  // Pr\u00e9noms identiques : on autorise la saisie mais on les distingue par un indice.
  const counts = {};
  state.players.forEach(p=>{ counts[p.name] = (counts[p.name]||0) + 1; });
  const seen = {};
  wrap.innerHTML = state.players.map((p,i)=>{
    seen[p.name] = (seen[p.name]||0) + 1;
    const suffix = counts[p.name] > 1 ? ' <span class="dup-tag">'+seen[p.name]+'</span>' : '';
    return '<div class="session-player-row">'+
      '<span><span class="name-row-dot" style="background:'+p.color+'"></span>'+escapeHtml(p.name)+suffix+'</span>'+
      (state.players.length > 2 ? '<span class="remove-player-x" onclick="removeSessionPlayer('+i+')">\u2715</span>' : '')+
    '</div>';
  }).join('');
  const hint = document.getElementById('players-sheet-hint');
  if(hint) hint.textContent = state.players.length + ' joueur' + (state.players.length>1?'s':'') + ' \u00b7 la partie est en pause';
}

function addSessionPlayer(){
  const field = document.getElementById('add-player-field');
  if(!field) return;
  const name = field.value.trim();
  if(!name) return;
  const idx = state.players.length;
  state.players.push({
    name,
    uid: 'p' + Date.now() + '_' + idx,
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    avatar: PLAYER_AVATARS[idx % PLAYER_AVATARS.length]
  });
  state.playerCount = state.players.length;
  // Le champ reste ouvert et vide : on encha\u00eene plusieurs pr\u00e9noms d'affil\u00e9e.
  field.value = '';
  if(field.focus) field.focus();
  Sound.play('tick');
  renderSessionPlayersList();
  saveSessionSnapshot();
}

function removeSessionPlayer(idx){
  if(state.players.length <= 2) return;
  state.players.splice(idx, 1);
  state.playerCount = state.players.length;
  // Statistiques conserv\u00e9es : les effacer fausserait le r\u00e9capitulatif final.
  renderSessionPlayersList();
  saveSessionSnapshot();
}

function fillTemplate(text, players){
  let t = text;
  players.forEach((p,i)=>{ t = t.split('{p'+(i+1)+'}').join(p.name); });
  return t;
}
// La fenêtre de tiers vient désormais de la phase en cours dans la trame de la soirée
// (voir updateIntensityForIndex), plus d'un curseur manuel unique pour toute la
// soirée : chaque phase peut resserrer ou élargir la fenêtre, ce qui fait à la fois
// monter l'intensité (phases tardives) et respirer (phases de repli volontairement plus
// tièdes, voir les trames "montagnes russes"/"grand soir" dans content.js).
function tierWindow(){
  return state.currentTierWindow || {min:0, max:1};
}

function filterByTier(arr){
  const w = tierWindow();
  // i.tier===undefined (ex. CLIMAX_EVENTS, sans notion de tier) : toujours éligible,
  // jamais exclu par une fenêtre qui ne le concerne pas.
  const narrowed = arr.filter(i => i.tier === undefined || (i.tier >= w.min && i.tier <= w.max));
  // Repli si un stock personnalisé est trop maigre pour tenir la soirée dans la fenêtre :
  // mieux vaut des items hors registre que le même qui revient toutes les cinq minutes.
  return narrowed.length ? narrowed : arr.filter(i => i.tier === undefined || i.tier <= w.max);
}

function speedFactor(){ return 1 - (state.intensityValue/100) * 0.4; }

// Tic global d'une seconde : fait avancer le temps de la soir\u00e9e (et donc le chemin de
// progression, qui s'y adosse). Ne d\u00e9cr\u00e9mente jamais pendant une pause, ce qui rend les
// pauses r\u00e9ellement neutres sur la dur\u00e9e de jeu.
function tickGlobal(){
  if(state.paused) return;

  // Temps \u00e9coul\u00e9 et l'utilisateur n'a pas encore avanc\u00e9 : on ne coupe pas l'activit\u00e9
  // affich\u00e9e en pleine lecture. Courte gr\u00e2ce pour laisser terminer, puis on conclut.
  if(state.timeUp){
    state.timeUpGrace--;
    if(state.timeUpGrace <= 0) endSession();
    return;
  }

  state.globalSecondsLeft--;
  if(typeof renderProgressPath === 'function') renderProgressPath();
  if(state.globalSecondsLeft % 5 === 0) saveSessionSnapshot();

  // Filet de s\u00e9curit\u00e9 : si le rythme r\u00e9el du groupe a pris du retard sur le minuteur,
  // on d\u00e9clenche quand m\u00eame la finale avant la fin.
  if(!state.climaxFired && state.globalSecondsLeft > 5 && state.globalSecondsLeft <= 30){
    fireClimax();
    return;
  }

  if(state.globalSecondsLeft <= 0){
    state.timeUp = true;
    state.timeUpGrace = 20;
  }
}

function advanceQueue(){
  // Garde-fou anti-double-appui : deux taps rapides sur "Continuer"/"R\u00e9ussi" sautaient
  // deux manches d'un coup. Le verrou se lib\u00e8re d\u00e8s que la nouvelle sc\u00e8ne est pos\u00e9e.
  if(state.advanceLock) return;
  state.advanceLock = true;
  setTimeout(()=>{ state.advanceLock = false; }, 450);
  clearInterval(state.ringInterval);

  // Le temps global est écoulé (voir tickGlobal) : plutôt que d'afficher un nouvel item
  // pour l'interrompre aussitôt, on termine proprement la soirée ici, au moment où le
  // joueur avance de lui-même — jamais en pleine lecture d'un défi.
  if(state.timeUp){ endSession(); return; }

  let type;
  if(state.queueIndex < state.typesQueue.length){
    type = state.typesQueue[state.queueIndex];
  } else {
    // File épuisée avant la fin du minuteur : cela arrive dès qu'un groupe avance plus
    // vite que prévu. L'ancien repli tirait à pile ou face entre « vote » et « moment »,
    // ce qui produisait régulièrement six ou sept manches identiques d'affilée en fin de
    // soirée — exactement au moment où l'attention retombe. On puise désormais dans un
    // vrai éventail, en écartant les deux dernières familles servies.
    type = pickFallbackType();
  }
  const isClimax = (state.queueIndex === state.climaxQueueIndex);
  updateIntensityForIndex(state.queueIndex);
  state.queueIndex++;

  // Une règle arrivée à échéance est LEVÉE explicitement : une contrainte qui
  // disparaîtrait en silence laisserait le groupe dans le doute.
  const lifted = expireRules();
  if(lifted.length){
    renderRulesBanner();
    renderItem('Règle levée', lifted[0], [], 0, { lifted:true });
    return;
  }

  // Un rappel dû passe avant le contenu neuf : on revient sur ce qui a été promis.
  const due = takeDuePending();
  if(due){
    const who = state.players.find(p => p.name === due.player);
    renderItem(due.kind === 'mission' ? 'Mission — verdict' : 'Prédiction — verdict',
      due.text, who ? [who] : [], 0, { recall: due.kind });
    return;
  }

  if(type === 'special'){
    if(isClimax){ fireClimax(); } else { showSpecialEvent(); }
    return;
  }

  if(type === 'rule'){
    const r = drawFromBag('rule', getEffectiveRules());
    const players = pickPlayers(1);
    const text = fillTemplate(r.text, players);
    addActiveRule(text, r.conflict);
    state.stats.rulesAdded++;
    renderItem('Nouvelle règle', text, [], Math.round(4*speedFactor()));
  } else if(type === 'challenge'){
    const c = drawFromBag('challenge', getEffectiveChallenges());
    const players = pickPlayers(c.n);
    const text = fillTemplate(c.text, players);
    state.stats.challenges++;
    players.forEach(p=>{ state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1; });
    renderItem('Défi', text, players, Math.round(25*speedFactor()), { kind: c.kind });
  } else if(type === 'minigame'){
    const m = drawFromBag('minigame', MINIGAMES);
    // Les mini-jeux n'ont pas de champ `n` : on déduit le nombre de joueurs à tirer des
    // marqueurs présents dans le texte. Sans le cas {p2}, un mini-jeux à deux afficherait
    // le marqueur brut à l'écran.
    const needed = m.text.includes('{p2}') ? 2 : (m.text.includes('{p1}') ? 1 : 0);
    const players = needed ? pickPlayers(needed) : [];
    const text = fillTemplate(m.text, players);
    renderItem('Mini-jeu', text, players, Math.round(m.dur*speedFactor()));
  } else if(type === 'vote'){
    const v = drawFromBag('vote', VOTES);
    renderItem('Question', v.text, [], Math.round(20*speedFactor()));

  // --- Familles ajoutées : chacune a sa mécanique, donc sa scène et ses commandes ---
  } else if(type === 'quiz'){
    const q = drawFromBag('quiz', QUIZ);
    // La réponse voyage avec l'item : la scène la garde cachée jusqu'à la révélation.
    renderItem('Quiz', q.q, [], 0, { answer: q.a });
  } else if(type === 'dilemme'){
    const d = drawFromBag('dilemme', DILEMMAS);
    renderItem('Dilemme', d.a, [], 0, { optionA: d.a, optionB: d.b });
  } else if(type === 'mission'){
    const m = drawFromBag('mission', MISSIONS);
    const players = pickPlayers(1);
    players.forEach(p=>{ state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1; });
    // La mission court en arrière-plan : elle sera rappelée dans quelques manches.
    schedulePending('mission', m.text, players[0], 4 + Math.floor(Math.random()*4));
    renderItem('Mission secrète', m.text, players, 0, { secret:true });
  } else if(type === 'prediction'){
    const pr = drawFromBag('prediction', PREDICTIONS);
    const players = pickPlayers(1);
    const text = fillTemplate(pr.text, players);
    schedulePending('prediction', text, players[0], 3 + Math.floor(Math.random()*4));
    renderItem('Prédiction', text, players, 0);
  } else if(type === 'destin'){
    const d = drawFromBag('destin', DESTINS);
    const players = pickPlayers(2);
    const text = fillTemplate(d.text, players);
    // Un destin lié est une règle qui ne concerne que deux personnes : il vit et
    // expire comme les autres règles, et compte dans le plafond. Dans le panneau des
    // règles, il faut en revanche les prénoms — hors de la scène, « ils » ne désigne
    // plus personne.
    addActiveRule(players[0].name + ' et ' + players[1].name + ' sont liés : ' +
      text.charAt(0).toLowerCase() + text.slice(1), null);
    players.forEach(p=>{ state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1; });
    renderItem('Destins liés', text, players, 0);
  } else if(type === 'barman'){
    const b = drawFromBag('barman', BARMAN);
    const players = pickPlayers(1);
    const text = fillTemplate(b.text, players);
    players.forEach(p=>{ state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1; });
    renderItem('Barman', text, players, Math.round(40*speedFactor()));
  } else if(type === 'tribunal'){
    const t = drawFromBag('tribunal', TRIBUNAL);
    const players = pickPlayers(1);
    const text = fillTemplate(t.text, players);
    players.forEach(p=>{ state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1; });
    renderItem('Tribunal', text, players, Math.round(30*speedFactor()));
  } else if(type === 'roulette'){
    const r = drawFromBag('roulette', ROULETTE);
    // Le prénom n'est PAS choisi ici : la scène le tire en le faisant défiler, pour que
    // le suspense du tirage soit réel à l'écran (voir renderScene, composition roulette).
    renderItem('Roulette', r.text, [], 0);

  } else {
    const l = drawFromBag('light', LIGHT_EVENTS);
    renderItem('Moment', l.text, [], Math.round(l.dur*speedFactor()));
  }
}

// Contenu de secours quand la file est épuisée : un éventail, et jamais deux fois de
// suite la même famille. `state.recentTypes` garde les dernières servies.
const FALLBACK_TYPES = ['challenge','vote','minigame','light','quiz','dilemme','roulette','tribunal'];

function pickFallbackType(){
  const recent = state.recentTypes || [];
  const pool = FALLBACK_TYPES.filter(t => recent.indexOf(t) < 0);
  const chosen = pick(pool.length ? pool : FALLBACK_TYPES);
  state.recentTypes = [chosen].concat(recent).slice(0, 2);
  return chosen;
}

// --- RAPPELS DIFFÉRÉS ---------------------------------------------------------------
// Une mission secrète ou une prédiction n'a de sens que si l'on y revient. On note donc
// l'échéance au moment où elle est posée, et le moteur intercale le rappel quand elle
// arrive — c'est ce qui donne à la soirée une mémoire, plutôt qu'une suite de manches
// sans lien entre elles.
function schedulePending(kind, text, player, delay){
  state.pending = state.pending || [];
  state.pending.push({
    kind, text,
    player: player ? player.name : null,
    dueIndex: state.queueIndex + Math.max(2, delay)
  });
}

// Renvoie le rappel arrivé à échéance, s'il y en a un.
//
// Un seul à la fois, et jamais deux manches de suite : plusieurs missions posées coup
// sur coup arrivent à échéance ensemble, et l'on enchaînait alors trois verdicts
// d'affilée — ce qui vide le procédé de son effet de surprise. Les rappels en trop
// attendent simplement le tour suivant.
const RECALL_GAP = 2;

function takeDuePending(){
  if(!state.pending || !state.pending.length) return null;
  // Un repère resté d'une soirée précédente serait supérieur à l'index courant : il
  // bloquerait alors TOUS les rappels de la nouvelle partie. On le considère périmé.
  if(state.lastRecallIndex != null && state.lastRecallIndex > state.queueIndex) state.lastRecallIndex = null;
  if(state.lastRecallIndex != null && state.queueIndex - state.lastRecallIndex < RECALL_GAP) return null;
  const i = state.pending.findIndex(p => state.queueIndex >= p.dueIndex);
  if(i < 0) return null;
  state.lastRecallIndex = state.queueIndex;
  return state.pending.splice(i, 1)[0];
}

// Fait correspondre le libellé affiché au type de ticket (couleur définie dans app.css
// via #screen-main[data-type]) — le principe « Confetti » : la couleur du ticket annonce
// le type de moment avant même la lecture.
const EYEBROW_TO_TYPE = {
  'Défi':'defi', 'Question':'vote', 'Nouvelle règle':'regle', 'Mini-jeu':'mini', 'Moment':'moment',
  'Quiz':'quiz', 'Dilemme':'dilemme', 'Mission secrète':'mission', 'Prédiction':'prediction',
  'Destins liés':'regle', 'Barman':'barman', 'Tribunal':'tribunal', 'Roulette':'roulette',
  'Règle levée':'regle', 'Mission — verdict':'mission', 'Prédiction — verdict':'prediction'
};

function renderItem(eyebrow, text, players, seconds, meta){
  // `meta` porte ce qui est propre à la famille : la réponse d'un quiz, les deux
  // options d'un dilemme, le fait qu'un contenu soit secret ou qu'il s'agisse d'un
  // rappel. La scène et les commandes s'y adaptent.
  state.itemMeta = meta || {};
  renderScene(eyebrow, text, players, seconds);
  state.lastItem = { eyebrow, text, players, meta: state.itemMeta };
  renderMainFooter(eyebrow === 'D\u00e9fi');
  // Après la scène ET ses commandes : certaines compositions activent ou débloquent
  // leur bouton principal, qui doit donc déjà exister (voir afterSceneRendered).
  if(typeof afterSceneRendered === 'function') afterSceneRendered(state.sceneKind);
  // Le compte \u00e0 rebours de manche n'appara\u00eet que si la consigne impose r\u00e9ellement un
  // temps limite ("en 20 secondes", "avant la fin du minuteur", "chrono"). Ailleurs il
  // \u00e9tait purement d\u00e9coratif \u2014 et pire, il pressait la lecture d'une r\u00e8gle ou d'une
  // question ouverte qui n'a aucune raison d'\u00eatre chronom\u00e9tr\u00e9e.
  const timed = /minuteur|seconde|chrono|avant la fin/i.test(text);
  const ring = document.getElementById('ring-wrap');
  if(timed && seconds > 0){
    if(ring) ring.style.display = 'block';
    startRing(Math.max(4, seconds));
  } else {
    clearInterval(state.ringInterval);
    if(ring) ring.style.display = 'none';
  }
  saveSessionSnapshot();
}


// Remplace "Pause / Suivant" par "✗ Raté / ✓ Fait" quand l'item affiché est un défi, pour
// forcer une réponse qui alimente les stats par joueur (voir markChallengeResult). Les
// autres types d'item (règle, mini-jeu, vote, moment) gardent l'avancement libre.
function renderMainFooter(isChallenge){
  const wrap = document.getElementById('footer-buttons');
  const kind = state.sceneKind;
  const meta = state.itemMeta || {};
  let main;

  if(kind === 'quiz'){
    // Deux temps : on laisse le groupe trancher, PUIS on révèle. Révéler tout de suite
    // supprimerait le seul moment intéressant du quiz.
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" onclick="revealQuizAnswer()">R\u00e9v\u00e9ler la r\u00e9ponse</button>';
  } else if(kind === 'dilemme'){
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" onclick="advanceManually()">Tout le monde a choisi</button>';
  } else if(kind === 'mission' && !meta.recall){
    // Tant que la mission n'a pas \u00e9t\u00e9 lue sous le doigt, on ne passe pas : sinon elle
    // serait manqu\u00e9e par celui-l\u00e0 m\u00eame qui doit l'accomplir.
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" disabled onclick="advanceManually()">C\'est lu</button>';
  } else if(kind === 'roulette'){
    // Le bouton attend la fin du tirage : avancer pendant que les pr\u00e9noms d\u00e9filent
    // n'aurait aucun sens.
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" disabled onclick="advanceManually()">Continuer</button>';
  } else if(kind === 'prediction' && meta.recall){
    main = '<button class="ctrl ctrl-neutral" onclick="resolvePrediction(false)">Rat\u00e9</button>'+
      '<button class="ctrl ctrl-primary" onclick="resolvePrediction(true)">Vu juste</button>';
  } else if(kind === 'tribunal'){
    main = '<button class="ctrl ctrl-neutral" onclick="advanceManually()">Acquitt\u00e9</button>'+
      '<button class="ctrl ctrl-primary" onclick="advanceManually()">Coupable</button>';
  } else if(kind === 'levee'){
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" onclick="advanceManually()">Compris</button>';
  } else if(kind === 'regle' || kind === 'destin'){
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" onclick="advanceManually()">C\'est not\u00e9</button>';
  } else if(kind === 'vote'){
    // Le libell\u00e9 suit l'\u00e9tat du vote : tant que personne n'est d\u00e9sign\u00e9, on valide le
    // vote ; une fois le r\u00e9sultat r\u00e9v\u00e9l\u00e9, on continue. Jamais deux validations pour
    // la m\u00eame action.
    main = '<button class="ctrl ctrl-primary" id="vote-main-btn" onclick="advanceManually()">Valider le vote</button>';
  } else if(isChallenge){
    // Deux boutons de m\u00eame taille (flex:1 1 0 sur .ctrl), toujours dans le m\u00eame ordre :
    // Rat\u00e9 \u00e0 gauche, R\u00e9ussi \u00e0 droite, d'une manche \u00e0 l'autre.
    main = '<button class="ctrl ctrl-neutral challenge-btn-fail" onclick="markChallengeResult(false)">Rat\u00e9</button>'+
      '<button class="ctrl ctrl-primary challenge-btn-done" onclick="markChallengeResult(true)">R\u00e9ussi</button>';
  } else {
    main = '<button class="ctrl ctrl-primary" id="scene-main-btn" onclick="advanceManually()">Continuer</button>';
  }

  // Deuxi\u00e8me ligne : deux rectangles identiques, jamais des liens de texte dispers\u00e9s.
  wrap.innerHTML = '<div class="footer-main">'+main+'</div>'+
    '<div class="footer-aside">'+
      '<button class="ctrl" onclick="openPause()">Pause</button>'+
      '<button class="ctrl" onclick="skipActivity()">Passer</button>'+
    '</div>';
}

// Quiz : la r\u00e9ponse n'appara\u00eet qu'\u00e0 la demande, et le bouton passe \u00e0 « Continuer ».
function revealQuizAnswer(){
  const el = document.getElementById('quiz-answer');
  if(el) el.classList.add('shown');
  Sound.play('ding');
  Trail.signal('vote-done');
  const btn = document.getElementById('scene-main-btn');
  if(btn){
    btn.textContent = 'Continuer';
    btn.setAttribute('onclick', 'advanceManually()');
  }
}

// Pr\u00e9diction v\u00e9rifi\u00e9e : une pr\u00e9diction juste vaut une distribution, pas une gorg\u00e9e de
// plus pour celui qui a devin\u00e9 \u2014 on ne r\u00e9compense pas en faisant boire.
function resolvePrediction(right){
  const players = (state.lastItem && state.lastItem.players) || [];
  if(right && players.length && window.fireConfetti) window.fireConfetti('small');
  if(!right && players.length){
    players.forEach(p=>{
      state.stats.playerDrinks[p.name] = (state.stats.playerDrinks[p.name]||0) + 1;
    });
  }
  advanceQueue();
}

function renderChallengeCounter(){
  // Volontairement vide pendant la partie : ces compteurs encombraient l'en-t\u00eate \u00e0
  // chaque manche. L'information reste calcul\u00e9e dans state.stats et pr\u00e9sent\u00e9e dans le
  // r\u00e9capitulatif de fin (voir renderPlayerResults), l\u00e0 o\u00f9 elle est pertinente.
  const el = document.getElementById('challenge-counter');
  if(el) el.textContent = '';
}


// --- Minuteur de manche (affiché uniquement si la consigne impose un temps limite) ---
function startRing(seconds){ resumeRingFrom(seconds, seconds); }

function resumeRingFrom(total, left){
  state.ringTotal = total;
  state.ringLeft = left;
  const fg = document.getElementById('ring-fg');
  const label = document.getElementById('ring-label');
  if(!fg || !label) return;
  const circumference = 125.6;
  label.textContent = Math.max(0, left);
  fg.setAttribute('stroke-dashoffset', circumference * (1 - left/total));
  fg.style.stroke = left > 0 ? 'var(--accent)' : 'var(--sage)';
  clearInterval(state.ringInterval);
  state.ringInterval = setInterval(()=>{
    if(state.paused) return;
    state.ringLeft--;
    label.textContent = Math.max(0, state.ringLeft);
    fg.setAttribute('stroke-dashoffset', circumference * (1 - state.ringLeft / state.ringTotal));
    if(state.ringLeft <= 0){
      clearInterval(state.ringInterval);
      fg.style.stroke = 'var(--sage)';
      label.textContent = '\u2713';
      Sound.play('ding');
      if(navigator.vibrate) navigator.vibrate([60]);
    } else if(state.ringLeft <= 3){
      Sound.play('tick');
    }
  }, 1000);
}

// Réussi / Raté : seuls les défis alimentent ces compteurs.
function markChallengeResult(done){
  clearInterval(state.ringInterval);
  const players = (state.lastItem && state.lastItem.players) || [];
  players.forEach(p=>{
    const rec = state.stats.playerChallenges[p.name] || (state.stats.playerChallenges[p.name] = {done:0, failed:0});
    if(done){
      rec.done++;
      if(window.fireConfetti) window.fireConfetti('small');
    } else {
      rec.failed++;
      // Raté = tu bois, convention classique des jeux à gages.
      state.stats.playerDrinks[p.name] = (state.stats.playerDrinks[p.name]||0) + 1;
    }
  });
  advanceQueue();
}

// Passer : avance sans rien comptabiliser. Une activité passée n'est PAS un échec, elle
// ne touche donc ni playerChallenges ni playerDrinks.
function skipActivity(){
  clearInterval(state.ringInterval);
  advanceQueue();
}

function advanceManually(){
  clearInterval(state.ringInterval);
  advanceQueue();
}

// Le bandeau permanent de règles a été remplacé par un bouton compteur discret
// ("Règles · 2") qui ouvre un panneau depuis le bas. Les règles restent consultables à
// tout moment sans manger l'écran en permanence ni dupliquer la règle déjà affichée sur
// le ticket au moment où elle tombe.
function renderRulesBanner(){
  const btn = document.getElementById('rules-count-btn');
  if(!btn) return;
  const n = state.activeRules.length;
  btn.style.display = n ? 'flex' : 'none';
  btn.innerHTML = 'Règles <span class="rules-count-num">'+n+'</span>';
}

// --- GOUVERNANCE DES RÈGLES ---------------------------------------------------------
// Une règle est une contrainte qui pèse sur TOUTES les manches suivantes. Sans limite,
// elles s'empilaient jusqu'à devenir ingérables (« interdit de dire je », « interdit de
// croiser les jambes », « accent italique obligatoire »… toutes en même temps), et rien
// ne les levait jamais.
//
//   — au plus MAX_ACTIVE_RULES en vigueur simultanément ;
//   — chacune a une durée de vie en manches, et elle est LEVÉE explicitement, avec
//     une annonce : une règle qui disparaît en silence laisse le groupe dans le doute ;
//   — une nouvelle règle qui arrive alors que le plafond est atteint lève la plus
//     ancienne, jamais une au hasard ;
//   — deux règles marquées du même `conflit` ne coexistent jamais (ex. « parle
//     uniquement en chuchotant » et « parle uniquement en criant »).
const MAX_ACTIVE_RULES = 4;
const RULE_LIFESPAN = 14;   // en manches

// state.activeRules garde des objets {text, until, conflict}. Les anciennes snapshots
// contenaient de simples chaînes : on les normalise à la lecture.
function normalizeRule(r, idx){
  if(typeof r === 'string') return { text:r, until: idx + RULE_LIFESPAN, conflict:null };
  return r;
}
function ruleText(r){ return typeof r === 'string' ? r : r.text; }

function addActiveRule(text, conflict){
  state.activeRules = state.activeRules.map((r, i) => normalizeRule(r, state.queueIndex));
  // Une règle qui en contredirait une autre remplace celle-ci.
  if(conflict){
    state.activeRules = state.activeRules.filter(r => r.conflict !== conflict);
  }
  state.activeRules.push({ text, until: state.queueIndex + RULE_LIFESPAN, conflict: conflict || null });
  // Plafond : la plus ancienne saute.
  while(state.activeRules.length > MAX_ACTIVE_RULES) state.activeRules.shift();
  renderRulesBanner();
}

// Lève les règles arrivées à échéance et renvoie leurs textes, pour pouvoir l'annoncer.
function expireRules(){
  state.activeRules = state.activeRules.map((r, i) => normalizeRule(r, state.queueIndex));
  const expired = state.activeRules.filter(r => state.queueIndex >= r.until);
  if(expired.length) state.activeRules = state.activeRules.filter(r => state.queueIndex < r.until);
  return expired.map(r => r.text);
}

function openRulesSheet(){
  const list = document.getElementById('rules-sheet-list');
  list.innerHTML = state.activeRules.length
    ? state.activeRules.map(r=>{
        const txt = ruleText(r);
        // Combien de manches lui reste-t-il : une règle qui va tomber se joue autrement.
        const left = (r && r.until != null) ? Math.max(0, r.until - state.queueIndex) : null;
        return '<div class="rules-sheet-row"><span class="rules-sheet-dot"></span>'+
          '<span>'+escapeHtml(soberize(txt))+
          (left != null ? '<em class="rules-sheet-left">encore '+left+' manche'+(left>1?'s':'')+'</em>' : '')+
          '</span></div>';
      }).join('')
    : '<div class="rules-sheet-empty">Aucune règle active pour le moment.</div>';
  document.getElementById('rules-sheet').classList.add('open');
}
function closeRulesSheet(){ document.getElementById('rules-sheet').classList.remove('open'); }

function showSpecialEvent(){
  const e = drawFromBag('special', SPECIAL_EVENTS);
  const players = e.n ? pickPlayers(e.n) : [];
  const text = fillTemplate(e.text, players);
  state.stats.specials++;
  const sp = document.getElementById('screen-special');
  sp.classList.remove('climax');
  sp.dataset.scene = 'moment';
  const rc = document.getElementById('special-recap');
  if(rc) rc.classList.remove('shown');
  document.getElementById('special-eyebrow').textContent = 'Moment';
  document.getElementById('special-icon').textContent = '';
  document.getElementById('special-text').textContent = soberize(text);
  goTo('special');
  if(navigator.vibrate) navigator.vibrate([80,40,80]);
  Sound.play('ding');
  setTimeout(()=>{ goTo('main'); advanceQueue(); }, 3200);
}

function fireClimax(){
  state.climaxFired = true;
  // Signature de la finale : l'arrivée du chemin s'illumine. Posée avant le passage à
  // l'écran de moment, elle est visible au retour sur la scène.
  if(window.Trail) Trail.signal('finale');
  const text = drawFromBag('climax', CLIMAX_EVENTS);
  const screen = document.getElementById('screen-special');
  screen.classList.add('climax');
  screen.dataset.scene = 'finale';
  document.getElementById('special-eyebrow').textContent = "Dernière manche";
  document.getElementById('special-icon').textContent = '';
  document.getElementById('special-text').textContent = soberize(text);
  // Conclusion adaptée à ce qui s'est réellement passé : on reprend les compteurs de la
  // soirée en cours plutôt qu'une formule générique.
  const recap = document.getElementById('special-recap');
  if(recap){
    const s = state.stats;
    recap.innerHTML =
      '<span><b>'+s.challenges+'</b> défis</span>'+
      '<span><b>'+state.activeRules.length+'</b> règles</span>'+
      '<span><b>'+s.specials+'</b> surprises</span>';
    recap.classList.add('shown');
  }
  goTo('special');
  if(navigator.vibrate) navigator.vibrate([100,60,100,60,220]);
  Sound.play('sting');
  if(window.fireConfetti) window.fireConfetti('big');
  setTimeout(()=>{ goTo('main'); advanceQueue(); }, 5200);
}

// Pause : le chemin se fige sur sa position exacte. La reprise la retrouve telle quelle,
// sans glissement de rattrapage (voir Trail.freeze/unfreeze).
function openPause(){ state.paused = true; if(window.Trail) Trail.freeze(); goTo('pause'); }
function closePause(){ state.paused = false; goTo('main'); if(window.Trail) Trail.unfreeze(); }

// Classe les joueurs par nombre de fois ciblés (state.stats.targets) pour le podium
// MVP/Loser de fin de soirée. Renvoie null si aucun défi n'a ciblé personne (rien à
// afficher) ou si tout le monde est à égalité (pas de podium pertinent).
function computeTargetPodium(){
  const ranked = state.players
    .map(p=>({ name:p.name, color:p.color, avatar:p.avatar, count: state.stats.targets[p.name]||0 }))
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
    '<div class="podium-name"><span class="avatar-badge avatar-badge-sm" style="background:'+podium.mvp.color+'">'+(podium.mvp.avatar||'')+'</span>'+escapeHtml(podium.mvp.name)+'</div></div>'+
    '<div class="podium-count">'+podium.mvp.count+'</div>';
  wrap.appendChild(mvpCard);

  const chillCard = document.createElement('div');
  chillCard.className = 'podium-card podium-chill';
  chillCard.innerHTML = '<div class="podium-icon">😌</div><div><div class="stat-label">LE PLUS TRANQUILLE</div>'+
    '<div class="podium-name"><span class="avatar-badge avatar-badge-sm" style="background:'+podium.chill.color+'">'+(podium.chill.avatar||'')+'</span>'+escapeHtml(podium.chill.name)+'</div></div>'+
    '<div class="podium-count">'+podium.chill.count+'</div>';
  wrap.appendChild(chillCard);
}

// Détail par joueur pour l'écran de fin : nombre de défis réussis et de verres bus
// (state.stats.playerChallenges / playerDrinks, alimentés par markChallengeResult).
function renderPlayerResults(){
  const wrap = document.getElementById('player-results-wrap');
  wrap.innerHTML = '';
  if(!state.players.length) return;

  const title = document.createElement('h3');
  title.className = 'player-results-title';
  title.textContent = 'Par joueur';
  wrap.appendChild(title);

  state.players.forEach(p=>{
    const c = state.stats.playerChallenges[p.name] || {done:0, failed:0};
    const drinks = state.stats.playerDrinks[p.name] || 0;
    const row = document.createElement('div');
    row.className = 'player-result-row';
    row.innerHTML = '<div class="player-result-name"><span class="avatar-badge avatar-badge-sm" style="background:'+p.color+'">'+(p.avatar||'')+'</span>'+escapeHtml(p.name)+'</div>'+
      '<div class="player-result-stats"><span>'+c.done+' défi'+(c.done!==1?'s':'')+'</span><span>'+drinks+' verre'+(drinks!==1?'s':'')+'</span></div>';
    wrap.appendChild(row);
  });
}

// Termine la soirée avant la fin du minuteur (bouton "Terminer la soirée" depuis la
// pause). Réutilise endSession() telle quelle : le podium et les stats sont déjà
// calculés à partir de ce qui s'est réellement passé, pas de la durée prévue, donc rien
// à distinguer côté affichage — seule la durée réellement jouée (voir endSession) diffère
// de la durée planifiée.


function endSession(){
  clearInterval(state.globalInterval);
  clearInterval(state.ringInterval);
  state.sessionActive = false;
  clearSessionSnapshot();
  goTo('end');
  Sound.play('win');
  if(window.fireConfetti) window.fireConfetti('huge');

  // Durée réellement jouée plutôt que la durée planifiée (state.durationMin) : identique
  // en fin normale (le minuteur est à 0), mais plus courte si la soirée s'est terminée en
  // avance via endSessionEarly(). On met à jour state.durationMin pour que l'historique et
  // la carte-souvenir (qui le relisent) reflètent aussi la durée réelle.
  state.durationMin = Math.max(1, Math.round((state.globalSecondsTotal - state.globalSecondsLeft) / 60));
  const h = Math.floor(state.durationMin/60);
  const m = state.durationMin % 60;
  document.getElementById('end-duration').textContent = h + 'h' + (m? (m<10?'0'+m:m) : '') + ' de soirée jouée';

  renderTargetPodium();
  renderPlayerResults();

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
}

function resetAll(){
  state.sessionActive = false;
  clearSessionSnapshot();
  state.playerCount = 4; state.players = []; state.durationMin = 30; state.sessionMode = 'chaos';
  // La page de configuration unique n'a plus ni #player-count, ni #chips-wrap, ni
  // .step[data-step] : ces acc\u00e8s faisaient planter le retour \u00e0 l'accueil.

  if(typeof nameDraft !== 'undefined') nameDraft = [];
  goTo('home');
}
