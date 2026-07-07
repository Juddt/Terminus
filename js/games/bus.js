const bus = {
  players:[], currentIdx:0, round:0,
  playerCards:[], revealedCards:[],
  scores:{}, deck:[],
  busCards:[], busIdx:0, busAttempts:0,
  phase:'guess' // guess, reveal, busRide
};

function busMakeDeck(){
  const d=[];
  PALM_SUITS.forEach(s=> PALM_VALUES.forEach(v=> d.push({suit:s, value:v})));
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

function busCardVal(card){
  const order = {A:1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,V:11,D:12,R:13};
  return order[card.value]||0;
}

function busCardHTML(card, hidden){
  if(hidden) return '<div style="width:56px;height:80px;background:var(--surface);border:1px solid var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--text-faint);">?</div>';
  const red = palmIsRed(card.suit);
  return '<div style="width:56px;height:80px;background:#f6f1e7;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;">'+
    '<div style="font-family:Fraunces,serif;font-weight:600;font-size:18px;color:'+(red?'#a82020':'#1a1a1a')+';">'+card.value+'</div>'+
    '<div style="font-size:14px;color:'+(red?'#a82020':'#1a1a1a')+';">'+card.suit+'</div>'+
  '</div>';
}

/* --- Setup --- */
function busSetup(){
  bus.players=[];
  document.getElementById('bus-chips').innerHTML='';
  document.getElementById('bus-name-field').value='';
  document.getElementById('bus-start-btn').disabled=true;
  goTo('bus-setup');
  setTimeout(()=> document.getElementById('bus-name-field').focus(), 100);
}

document.getElementById('bus-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && bus.players.length<10){
      bus.players.push(val);
      e.target.value='';
      busRenderChips();
    }
  }
});

function busRenderChips(){
  const wrap=document.getElementById('bus-chips');
  wrap.innerHTML='';
  bus.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=name+'<span class="x" onclick="busRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('bus-start-btn').disabled = bus.players.length < 2;
}
function busRemovePlayer(i){ bus.players.splice(i,1); busRenderChips(); }

function busStartGame(){
  if(bus.players.length<2) return;
  bus.deck = busMakeDeck();
  bus.currentIdx = 0;
  bus.scores = {};
  bus.players.forEach(p=> bus.scores[p]=0);
  goTo('bus');
  busNextPlayer();
}

function busPlayer(){ return bus.players[bus.currentIdx]; }

function busUpdateHeader(){
  document.getElementById('bus-header-info').innerHTML =
    '<div class="badge">Joueur <span class="bv">'+(bus.currentIdx+1)+'/'+bus.players.length+'</span></div>';
}

/* --- Player turn: 4 rounds --- */
function busNextPlayer(){
  if(bus.currentIdx >= bus.players.length){ busShowResults(); return; }
  bus.round = 0;
  bus.playerCards = [bus.deck.pop(), bus.deck.pop(), bus.deck.pop(), bus.deck.pop()];
  bus.revealedCards = [];
  busUpdateHeader();
  busShowRound();
}

function busShowRound(){
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');
  const p = busPlayer();
  const r = bus.round;

  // Show revealed cards so far
  let cardsRow = '<div style="display:flex;gap:6px;margin-bottom:8px;">';
  for(let i=0;i<4;i++){
    cardsRow += i < bus.revealedCards.length ? busCardHTML(bus.revealedCards[i]) : busCardHTML(null,true);
  }
  cardsRow += '</div>';

  const questions = [
    {q:'Rouge ou Noir ?', opts:['Rouge','Noir']},
    {q:'Plus haut ou Plus bas ?', opts:['Plus haut','Plus bas']},
    {q:'Dedans ou Dehors ?', opts:['Dedans','Dehors']},
    {q:'Devine la couleur', opts:['♥','♦','♣','♠']},
  ];

  body.innerHTML =
    '<div class="palm-player-big">'+p+'</div>'+
    cardsRow+
    '<div class="palm-rule-line">'+questions[r].q+'</div>';

  const opts = questions[r].opts;
  footer.innerHTML = opts.map(o=>
    '<button class="btn btn-primary" onclick="busGuess(\''+o+'\')" style="flex:1;">'+o+'</button>'
  ).join('');
}

function busGuess(guess){
  const card = bus.playerCards[bus.round];
  bus.revealedCards.push(card);
  const r = bus.round;
  let correct = false;

  if(r===0){
    const isRed = palmIsRed(card.suit);
    correct = (guess==='Rouge' && isRed) || (guess==='Noir' && !isRed);
  } else if(r===1){
    const prev = busCardVal(bus.revealedCards[0]);
    const cur = busCardVal(card);
    correct = (guess==='Plus haut' && cur > prev) || (guess==='Plus bas' && cur < prev) || cur===prev;
  } else if(r===2){
    const v1 = busCardVal(bus.revealedCards[0]);
    const v2 = busCardVal(bus.revealedCards[1]);
    const lo = Math.min(v1,v2), hi = Math.max(v1,v2);
    const cur = busCardVal(card);
    const inside = cur > lo && cur < hi;
    correct = (guess==='Dedans' && inside) || (guess==='Dehors' && !inside);
  } else if(r===3){
    correct = (guess===card.suit);
  }

  const penalty = r + 1;
  if(!correct) bus.scores[busPlayer()] += penalty;

  busShowRoundResult(correct, penalty);
}

function busShowRoundResult(correct, penalty){
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');
  const card = bus.revealedCards[bus.revealedCards.length-1];

  let cardsRow = '<div style="display:flex;gap:6px;margin-bottom:8px;">';
  for(let i=0;i<4;i++){
    cardsRow += i < bus.revealedCards.length ? busCardHTML(bus.revealedCards[i]) : busCardHTML(null,true);
  }
  cardsRow += '</div>';

  body.innerHTML =
    '<div class="palm-player-big">'+busPlayer()+'</div>'+
    cardsRow+
    '<div class="palm-rule-line" style="color:'+(correct?'var(--sage)':'var(--clay)')+';">'
      +(correct ? '✓ Bien joué !' : '✗ Raté ! '+penalty+' gorgée'+(penalty>1?'s':''))+'</div>';

  bus.round++;
  if(bus.round >= 4){
    footer.innerHTML = '<button class="btn btn-primary" onclick="busNextPlayerAdvance()">Joueur suivant</button>';
  } else {
    footer.innerHTML = '<button class="btn btn-primary" onclick="busShowRound()">Question suivante</button>';
  }
}

function busNextPlayerAdvance(){
  bus.currentIdx++;
  busNextPlayer();
}

/* --- Results + Bus ride --- */
function busShowResults(){
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');

  let worst = '', worstScore = -1;
  bus.players.forEach(p=>{
    if(bus.scores[p] > worstScore){ worstScore = bus.scores[p]; worst = p; }
  });

  let scoreHTML = '<div style="font-size:13px; line-height:2; color:var(--text-dim);">';
  bus.players.forEach(p=>{
    const s = bus.scores[p];
    const highlight = p===worst ? ' style="color:var(--clay); font-weight:700;"' : '';
    scoreHTML += '<div'+highlight+'>'+p+' : '+s+' erreur'+(s!==1?'s':'')+'</div>';
  });
  scoreHTML += '</div>';

  document.getElementById('bus-header-info').textContent = 'Résultats';

  body.innerHTML =
    '<div style="font-family:Fraunces,serif; font-size:22px; color:var(--text);">Résultats</div>'+
    scoreHTML+
    '<div class="palm-rule-line" style="color:var(--clay); margin-top:8px;">'+worst+' monte dans le bus !</div>';

  footer.innerHTML = '<button class="btn btn-primary" onclick="busStartRide(\''+worst+'\')">Monter dans le bus</button>';
}

/* --- The Bus Ride --- */
function busStartRide(player){
  bus.busCards = [bus.deck.pop(),bus.deck.pop(),bus.deck.pop(),bus.deck.pop(),bus.deck.pop()];
  bus.busIdx = 0;
  bus.busAttempts = 0;
  bus.busPlayer = player;
  busShowRideCard();
}

function busShowRideCard(){
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');

  document.getElementById('bus-header-info').textContent = 'Le Bus — Tentative '+(bus.busAttempts+1);

  let cardsRow = '<div style="display:flex;gap:4px;margin-bottom:10px;">';
  for(let i=0;i<5;i++){
    if(i < bus.busIdx){
      cardsRow += busCardHTML(bus.busCards[i]);
    } else if(i === bus.busIdx){
      cardsRow += busCardHTML(null,true);
    } else {
      cardsRow += busCardHTML(null,true);
    }
  }
  cardsRow += '</div>';

  body.innerHTML =
    '<div class="palm-player-big">'+bus.busPlayer+'</div>'+
    cardsRow+
    '<div class="palm-rule-line">Carte '+(bus.busIdx+1)+'/5 — Retourne !</div>';

  footer.innerHTML = '<button class="btn btn-primary" onclick="busFlipRideCard()">Retourner</button>';
}

function busFlipRideCard(){
  const card = bus.busCards[bus.busIdx];
  const isFace = card.value==='V' || card.value==='D' || card.value==='R';
  const body = document.getElementById('bus-body');
  const footer = document.getElementById('bus-footer');

  let cardsRow = '<div style="display:flex;gap:4px;margin-bottom:10px;">';
  for(let i=0;i<5;i++){
    if(i <= bus.busIdx){
      cardsRow += busCardHTML(bus.busCards[i]);
    } else {
      cardsRow += busCardHTML(null,true);
    }
  }
  cardsRow += '</div>';

  if(isFace){
    if(navigator.vibrate) navigator.vibrate([80,40,80]);
    body.innerHTML =
      '<div class="palm-player-big">'+bus.busPlayer+'</div>'+
      cardsRow+
      '<div class="palm-rule-line" style="color:var(--clay);">Figure ! '+bus.busPlayer+' boit et recommence</div>';

    // Reset with new cards
    bus.busAttempts++;
    bus.busCards = [bus.deck.pop()||bus.busCards[0],bus.deck.pop()||bus.busCards[1],bus.deck.pop()||bus.busCards[2],bus.deck.pop()||bus.busCards[3],bus.deck.pop()||bus.busCards[4]];
    bus.busIdx = 0;
    footer.innerHTML = '<button class="btn btn-primary" onclick="busShowRideCard()">Recommencer</button>';
  } else {
    bus.busIdx++;
    if(bus.busIdx >= 5){
      creatorsGlasses++;
      body.innerHTML =
        '<div class="palm-player-big" style="color:var(--sage);">'+bus.busPlayer+' descend du bus !</div>'+
        cardsRow+
        '<div class="palm-rule-line">Après '+(bus.busAttempts+1)+' tentative'+(bus.busAttempts>0?'s':'')+'</div>'+
        '<div class="creators-counter">🥂 '+creatorsGlasses+' verre'+(creatorsGlasses>1?'s':'')+' pour les créateurs</div>';
      footer.innerHTML =
        '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>'+
        '<button class="btn btn-primary" onclick="busStartGame()" style="flex:1;">Rejouer</button>';
    } else {
      body.innerHTML =
        '<div class="palm-player-big">'+bus.busPlayer+'</div>'+
        cardsRow+
        '<div class="palm-rule-line" style="color:var(--sage);">✓ Ouf !</div>';
      footer.innerHTML = '<button class="btn btn-primary" onclick="busShowRideCard()">Carte suivante</button>';
    }
  }
}

function busQuit(){ goTo('games-list'); }
