// Historique cumulé des soirées jouées sur cet appareil (localStorage). Contrairement à
// `state`, qui est remis à zéro à chaque partie, ceci persiste d'une session à l'autre pour
// donner des records ("groupe le plus chaotique", etc) qui donnent envie de rejouer.

const HISTORY_KEY = 'soiree_history_v1';
const HISTORY_MAX_ENTRIES = 100; // borne la taille du localStorage sur le long terme

function loadHistory(){
  try{
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

function saveHistoryEntry(entry){
  const history = loadHistory();
  history.push(entry);
  if(history.length > HISTORY_MAX_ENTRIES) history.splice(0, history.length - HISTORY_MAX_ENTRIES);
  try{
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }catch(e){
    // Quota localStorage dépassé ou navigation privée : on abandonne silencieusement,
    // l'historique n'est qu'un bonus, pas une fonctionnalité critique.
  }
}

// Construit l'entrée d'historique à partir de la session qui vient de se terminer.
// Appelé depuis endSession() dans session-engine.js.
function recordSessionInHistory(){
  const eventsPerMinute = state.durationMin > 0
    ? (state.stats.challenges + state.stats.specials + state.stats.rulesAdded) / state.durationMin
    : 0;
  saveHistoryEntry({
    date: new Date().toISOString(),
    durationMin: state.durationMin,
    playerCount: state.players.length,
    intensityValue: state.intensityValue,
    challenges: state.stats.challenges,
    specials: state.stats.specials,
    rulesAdded: state.stats.rulesAdded,
    eventsPerMinute: Math.round(eventsPerMinute * 100) / 100,
    topTarget: Object.keys(state.stats.targets).reduce((best, name)=>
      (state.stats.targets[name] > (state.stats.targets[best]||0)) ? name : best, null)
  });
}

// Calcule les records mis en avant sur l'écran Historique. Chaque record garde une
// référence lisible (date + valeur) plutôt qu'un simple total, pour rester parlant
// après plusieurs mois d'utilisation.
function computeHistoryRecords(history){
  if(!history.length) return null;

  const totalSessions = history.length;
  const totalChallenges = history.reduce((s,h)=>s + h.challenges, 0);
  const totalMinutes = history.reduce((s,h)=>s + h.durationMin, 0);

  const chaosSession = history.reduce((best,h)=> (!best || h.eventsPerMinute > best.eventsPerMinute) ? h : best, null);
  const biggestGroup = history.reduce((best,h)=> (!best || h.playerCount > best.playerCount) ? h : best, null);
  const mostChallenges = history.reduce((best,h)=> (!best || h.challenges > best.challenges) ? h : best, null);

  return {
    totalSessions, totalChallenges, totalMinutes,
    chaosSession, biggestGroup, mostChallenges
  };
}

function formatHistoryDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:'numeric'});
}

function openHistoryScreen(){
  const history = loadHistory();
  const wrap = document.getElementById('history-wrap');
  wrap.innerHTML = '';

  const records = computeHistoryRecords(history);
  if(!records){
    wrap.innerHTML = '<div class="step-sub">Aucune soirée enregistrée pour l\'instant. Lance ta première partie !</div>';
    goTo('history');
    return;
  }

  const cards = [
    {label:'Soirées jouées', value: records.totalSessions},
    {label:'Défis lancés au total', value: records.totalChallenges},
    {label:'Temps de jeu cumulé', value: Math.floor(records.totalMinutes/60) + 'h' + String(records.totalMinutes%60).padStart(2,'0')},
    {label:'Groupe le plus chaotique', value: records.chaosSession.eventsPerMinute + ' évènements/min', sub: formatHistoryDate(records.chaosSession.date) + ' · ' + records.chaosSession.playerCount + ' joueurs'},
    {label:'Plus grand groupe', value: records.biggestGroup.playerCount + ' joueurs', sub: formatHistoryDate(records.biggestGroup.date)},
    {label:'Record de défis en une soirée', value: records.mostChallenges.challenges, sub: formatHistoryDate(records.mostChallenges.date)},
  ];

  cards.forEach(c=>{
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = '<div><div class="stat-label">'+c.label.toUpperCase()+'</div>'+(c.sub?'<div class="stat-sub">'+c.sub+'</div>':'')+'</div><div class="stat-value">'+c.value+'</div>';
    wrap.appendChild(card);
  });

  goTo('history');
}

function clearHistory(){
  if(!confirm('Effacer tout l\'historique des soirées ?')) return;
  localStorage.removeItem(HISTORY_KEY);
  openHistoryScreen();
}
