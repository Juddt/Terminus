// ===================================================================================
// LE BUS — signature : LA MONTÉE, puis LE COULOIR
// -----------------------------------------------------------------------------------
// Règles (inchangées, voir GAMES['bus'] dans games-catalog.js) :
//   Quatre questions par joueur, sur ses quatre cartes cachées :
//     1. Rouge ou Noir ?          erreur = 1 gorgée
//     2. Plus haut ou Plus bas ?  erreur = 2 gorgées   (égalité = réussite)
//     3. Dedans ou Dehors ?       erreur = 3 gorgées   (bornes exclues)
//     4. Devine la couleur ♥♦♣♠   erreur = 4 gorgées
//   Celui qui a bu le plus monte dans le bus : il retourne 5 cartes d'affilée. Une
//   figure (V, D, R) et il boit puis repart de la première. Cinq cartes sans figure,
//   il descend.
//
// Deux moments, deux mises en scène : une MONTÉE en quatre paliers dont l'enjeu grossit
// à vue d'œil, puis un COULOIR de cinq cases où l'on avance — et d'où l'on retombe au
// départ. L'ancienne version montrait les mêmes quatre cartes dans les deux cas.
// ===================================================================================

const bus = {
  players:[], currentIdx:0, round:0,
  playerCards:[], revealedCards:[],
  scores:{}, deck:[],
  busCards:[], busIdx:0, busAttempts:0, busPlayer:null,
  busy:false, token:0, timers:[]
};

// Ordre des valeurs, As bas — utilisé par « plus haut / plus bas » et « dedans / dehors ».
const BUS_ORDER = {A:1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,V:11,D:12,R:13};
function busCardVal(card){ return BUS_ORDER[card.value] || 0; }

// Les quatre paliers : la question, les réponses possibles, et l'enjeu.
const BUS_STEPS = [
  { q:'Rouge ou noir ?',        opts:['Rouge','Noir'],                 sips:1 },
  { q:'Plus haut ou plus bas ?', opts:['Plus haut','Plus bas'],        sips:2 },
  { q:'Dedans ou dehors ?',      opts:['Dedans','Dehors'],             sips:3 },
  { q:'Et la couleur ?',         opts:['♥','♦','♣','♠'],               sips:4 }
];

function busSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'bus') });
}
function busStartFromSetup(players){
  bus.players = (players || []).map(p => p.name);
  busStartGame();
}

function busStartGame(){
  if(bus.players.length < 2) return;
  busClearTimers();
  bus.deck = makeShuffledDeck();
  bus.scores = {};
  bus.players.forEach(p => bus.scores[p] = 0);
  bus.currentIdx = 0;
  bus.busPlayer = null;
  bus.busy = false;
  goTo('bus');
  busNextPlayer();
}

function busPlayer(){ return bus.players[bus.currentIdx]; }

function busUpdateHeader(txt){
  const el = document.getElementById('bus-header-info');
  if(!el) return;
  el.innerHTML = txt || ('<div class="badge">Joueur <span class="bv">'+
    Math.min(bus.currentIdx + 1, bus.players.length)+'</span>/'+bus.players.length+'</div>');
}

// --- LA MONTÉE ----------------------------------------------------------------------
// Quatre paliers empilés : celui qu'on joue est éclairé, ceux qui sont faits portent
// leur carte, ceux à venir restent éteints. On voit d'un coup d'œil où on en est et ce
// que coûte la marche suivante.
function busLadderHTML(activeIdx){
  return '<div class="bus-ladder">'+ BUS_STEPS.map((step, i) => {
    const done = i < bus.revealedCards.length;
    const state = done ? ' done' : (i === activeIdx ? ' active' : '');
    const slot = done
      ? cardHTML(bus.revealedCards[i], { width:40, revealed:true })
      : '<div class="bus-slot-empty">?</div>';
    return '<div class="bus-step'+state+'">'+
        '<div class="bus-step-card">'+slot+'</div>'+
        '<div class="bus-step-text">'+
          '<div class="bus-step-q">'+step.q+'</div>'+
          '<div class="bus-step-sips">'+step.sips+' gorgée'+(step.sips > 1 ? 's' : '')+' si tu te trompes</div>'+
        '</div>'+
      '</div>';
  }).join('') + '</div>';
}

function busNextPlayer(){
  if(bus.currentIdx >= bus.players.length){ busShowResults(); return; }
  bus.round = 0;
  bus.playerCards = [bus.deck.pop(), bus.deck.pop(), bus.deck.pop(), bus.deck.pop()];
  bus.revealedCards = [];
  busUpdateHeader();
  busShowRound();
}

function busShowRound(){
  bus.busy = false;
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');
  const step = BUS_STEPS[bus.round];

  body.innerHTML =
    '<div class="bus-who">'+escapeHtml(busPlayer())+'</div>'+
    busLadderHTML(bus.round);

  footer.innerHTML = '<div class="bus-answers'+(step.opts.length > 2 ? ' four' : '')+'">'+
    step.opts.map(o => '<button class="btn '+(o === 'Noir' ? 'btn-ghost' : 'btn-primary')+'" '+
      'onclick="busGuess(\''+o+'\')">'+o+'</button>').join('')+'</div>';
}

function busGuess(guess){
  if(bus.busy) return;                    // verrou anti-double-appui
  bus.busy = true;
  const card = bus.playerCards[bus.round];
  const r = bus.round;
  let correct = false;

  if(r === 0){
    const isRed = palmIsRed(card.suit);
    correct = (guess === 'Rouge' && isRed) || (guess === 'Noir' && !isRed);
  } else if(r === 1){
    const prev = busCardVal(bus.revealedCards[0]);
    const cur = busCardVal(card);
    // Égalité : on ne punit pas un coup où le joueur ne pouvait rien faire.
    correct = cur === prev || (guess === 'Plus haut' && cur > prev) || (guess === 'Plus bas' && cur < prev);
  } else if(r === 2){
    const v1 = busCardVal(bus.revealedCards[0]);
    const v2 = busCardVal(bus.revealedCards[1]);
    const lo = Math.min(v1, v2), hi = Math.max(v1, v2);
    const cur = busCardVal(card);
    const inside = cur > lo && cur < hi;     // bornes exclues
    correct = (guess === 'Dedans' && inside) || (guess === 'Dehors' && !inside);
  } else {
    correct = guess === card.suit;
  }

  bus.revealedCards.push(card);
  const penalty = BUS_STEPS[r].sips;
  if(!correct) bus.scores[busPlayer()] += penalty;
  busShowRoundResult(correct, penalty);
}

function busShowRoundResult(correct, penalty){
  Sound.play(correct ? 'success' : 'fail');
  if(navigator.vibrate) navigator.vibrate(correct ? [40] : [80,40,80]);
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');

  body.innerHTML =
    '<div class="bus-who">'+escapeHtml(busPlayer())+'</div>'+
    busLadderHTML(-1)+
    '<div class="bus-verdict '+(correct ? 'win' : 'lose')+'">'+
      (correct ? 'Bien vu' : penalty+' gorgée'+(penalty > 1 ? 's' : ''))+
    '</div>';

  bus.round++;
  bus.busy = false;
  footer.innerHTML = bus.round >= 4
    ? '<button class="btn btn-primary" onclick="busNextPlayerAdvance()">Joueur suivant</button>'
    : '<button class="btn btn-primary" onclick="busShowRound()">Continuer</button>';
}

function busNextPlayerAdvance(){
  bus.currentIdx++;
  busNextPlayer();
}

// --- QUI MONTE DANS LE BUS ----------------------------------------------------------
function busShowResults(){
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');

  let worst = bus.players[0], worstScore = -1;
  bus.players.forEach(p => { if(bus.scores[p] > worstScore){ worstScore = bus.scores[p]; worst = p; } });
  const maxScore = Math.max(1, worstScore);

  // Classement lisible : une barre par joueur, à l'échelle du pire score.
  const rows = [...bus.players]
    .sort((a, b) => bus.scores[b] - bus.scores[a])
    .map(p => {
      const s = bus.scores[p];
      return '<div class="bus-score-row'+(p === worst ? ' worst' : '')+'">'+
          '<div class="bus-score-name">'+escapeHtml(p)+'</div>'+
          '<div class="bus-score-bar"><span style="width:'+Math.round((s / maxScore) * 100)+'%"></span></div>'+
          '<div class="bus-score-val">'+s+'</div>'+
        '</div>';
    }).join('');

  busUpdateHeader('<div class="badge">Classement</div>');
  body.innerHTML =
    '<div class="bus-section-title">Gorgées bues</div>'+
    '<div class="bus-scores">'+rows+'</div>'+
    '<div class="bus-boarding">'+escapeHtml(worst)+' monte dans le bus</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="busStartRide()">Monter dans le bus</button>';
}

// --- LE COULOIR ---------------------------------------------------------------------
// Cinq cases à franchir. Une figure et on retombe à la première : le couloir se rallume
// du début, et le compteur de tentatives monte. C'est ce retour en arrière visible qui
// fait le sel du jeu.
function busStartRide(){
  let worst = bus.players[0], worstScore = -1;
  bus.players.forEach(p => { if(bus.scores[p] > worstScore){ worstScore = bus.scores[p]; worst = p; } });
  bus.busPlayer = worst;
  bus.busAttempts = 0;
  busDealRide();
  busShowRideCard();
}

function busDealRide(){
  // Le paquet peut s'épuiser sur une longue série de figures : on en reprend un neuf
  // plutôt que de rejouer indéfiniment les mêmes cinq cartes (l'ancienne version
  // réutilisait la carte précédente quand la pioche était vide, ce qui pouvait bloquer
  // le joueur sur une figure impossible à passer).
  if(bus.deck.length < 5) bus.deck = makeShuffledDeck();
  bus.busCards = [bus.deck.pop(), bus.deck.pop(), bus.deck.pop(), bus.deck.pop(), bus.deck.pop()];
  bus.busIdx = 0;
}

function busCorridorHTML(revealUpTo){
  return '<div class="bus-corridor">'+ [0,1,2,3,4].map(i => {
    const shown = i < revealUpTo;
    const current = i === bus.busIdx;
    return '<div class="bus-cell'+(shown ? ' passed' : '')+(current ? ' current' : '')+'">'+
        (shown ? cardHTML(bus.busCards[i], { width:46, revealed:true })
               : '<div class="bus-cell-empty">'+(i + 1)+'</div>')+
      '</div>';
  }).join('') + '</div>';
}

function busShowRideCard(){
  bus.busy = false;
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');
  busUpdateHeader('<div class="badge">Le Bus</div><div class="badge">Tentative <span class="bv">'+(bus.busAttempts + 1)+'</span></div>');

  body.innerHTML =
    '<div class="bus-who">'+escapeHtml(bus.busPlayer)+'</div>'+
    busCorridorHTML(bus.busIdx)+
    '<div class="bus-corridor-hint">Case '+(bus.busIdx + 1)+' sur 5 — une figure et tu repars du début</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="busFlipRideCard()">Retourner</button>';
}

function busFlipRideCard(){
  if(bus.busy) return;
  bus.busy = true;
  Sound.play('cardFlip');
  const card = bus.busCards[bus.busIdx];
  const isFigure = card.value === 'V' || card.value === 'D' || card.value === 'R';
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');
  const revealed = bus.busIdx + 1;

  if(isFigure){
    if(navigator.vibrate) navigator.vibrate([90,50,90]);
    Sound.play('fail');
    body.innerHTML =
      '<div class="bus-who">'+escapeHtml(bus.busPlayer)+'</div>'+
      busCorridorHTML(revealed)+
      '<div class="bus-verdict lose">Figure — tu bois et tu repars du début</div>';
    bus.busAttempts++;
    busDealRide();
    bus.busy = false;
    footer.innerHTML = '<button class="btn btn-primary" onclick="busShowRideCard()">Recommencer</button>';
    return;
  }

  bus.busIdx++;
  if(bus.busIdx >= 5){
    Sound.play('win');
    creatorsGlasses++;
    if(window.fireConfetti) window.fireConfetti('big');
    body.innerHTML =
      '<div class="bus-free">'+escapeHtml(bus.busPlayer)+' descend du bus</div>'+
      busCorridorHTML(5)+
      '<div class="bus-corridor-hint">Après '+(bus.busAttempts + 1)+' tentative'+(bus.busAttempts > 0 ? 's' : '')+'</div>';
    bus.busy = false;
    footer.innerHTML =
      '<button class="btn btn-primary" onclick="busStartGame()">Rejouer</button>'+
      '<button class="btn btn-ghost" onclick="busQuit()">Quitter</button>';
    return;
  }

  Sound.play('success');
  body.innerHTML =
    '<div class="bus-who">'+escapeHtml(bus.busPlayer)+'</div>'+
    busCorridorHTML(revealed)+
    '<div class="bus-verdict win">Passé</div>';
  bus.busy = false;
  footer.innerHTML = '<button class="btn btn-primary" onclick="busShowRideCard()">Carte suivante</button>';
}

// --- Cycle de vie -------------------------------------------------------------------
function busClearTimers(){
  bus.token++;
  bus.timers.forEach(t => clearTimeout(t));
  bus.timers = [];
}
function busQuit(){
  busClearTimers();
  bus.busy = false;
  goTo('games-list');
}
registerScreenCleanup('bus', function(){
  busClearTimers();
  bus.busy = false;
});
