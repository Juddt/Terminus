const purple = {
  players:[], currentIdx:0, deck:[], sipPot:0, drawnCards:[], cardsLeft:52
};

function purpleMakeDeck(){
  const d=[];
  PALM_SUITS.forEach(s=> PALM_VALUES.forEach(v=> d.push({suit:s, value:v})));
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

function purpleSetup(){
  purple.players=[];
  document.getElementById('purple-chips').innerHTML='';
  document.getElementById('purple-name-field').value='';
  document.getElementById('purple-start-btn').disabled=true;
  goTo('purple-setup');
  setTimeout(()=> document.getElementById('purple-name-field').focus(), 100);
}

document.getElementById('purple-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && purple.players.length<10){
      purple.players.push(val);
      e.target.value='';
      purpleRenderChips();
    }
  }
});

function purpleRenderChips(){
  const wrap=document.getElementById('purple-chips');
  wrap.innerHTML='';
  purple.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=name+'<span class="x" onclick="purpleRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('purple-start-btn').disabled = purple.players.length < 2;
}
function purpleRemovePlayer(i){ purple.players.splice(i,1); purpleRenderChips(); }

function purpleStartGame(){
  if(purple.players.length<2) return;
  purple.deck = purpleMakeDeck();
  purple.currentIdx = 0;
  purple.sipPot = 0;
  purple.drawnCards = [];
  purple.cardsLeft = 52;
  goTo('purple');
  purpleShowTurn();
}

function purplePlayer(){ return purple.players[purple.currentIdx % purple.players.length]; }

function purpleUpdateHeader(){
  document.getElementById('purple-header').innerHTML =
    '<div class="badge"><span class="bv">'+purple.deck.length+'</span> cartes</div>';
}

function purpleCardHTML(card){
  const red = palmIsRed(card.suit);
  return '<div style="width:52px;height:74px;background:#f6f1e7;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">'+
    '<div style="font-family:Fraunces,serif;font-weight:600;font-size:18px;color:'+(red?'#a82020':'#1a1a1a')+';">'+card.value+'</div>'+
    '<div style="font-size:14px;color:'+(red?'#a82020':'#1a1a1a')+';">'+card.suit+'</div>'+
  '</div>';
}

function purpleShowTurn(){
  purpleUpdateHeader();
  if(purple.deck.length < 6){
    purpleEndGame();
    return;
  }
  const body = document.getElementById('purple-body');
  const footer = document.getElementById('purple-footer');

  let potHTML = '';
  if(purple.sipPot > 0){
    potHTML = '<div class="sip-pot">'+purple.sipPot+'</div><div class="sip-pot-label">gorgée'+(purple.sipPot>1?'s':'')+' en jeu</div>';
  }

  // Show last drawn cards if any
  let lastCardsHTML = '';
  if(purple.drawnCards.length > 0){
    lastCardsHTML = '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;justify-content:center;">';
    purple.drawnCards.forEach(c => lastCardsHTML += purpleCardHTML(c));
    lastCardsHTML += '</div>';
  }

  body.innerHTML =
    potHTML+
    '<div class="palm-player-big" style="font-size:26px;">'+purplePlayer()+'</div>'+
    '<div style="font-size:14px;color:rgba(244,236,226,0.5);margin-top:4px;">Fais ta prédiction</div>'+
    lastCardsHTML;

  footer.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px;width:100%;">'+
      '<div style="display:flex;gap:8px;">'+
        '<button class="btn btn-primary" onclick="purpleGuess(\'rouge\')" style="flex:1;background:#a82020;color:#fff;padding:16px;">Rouge</button>'+
        '<button class="btn btn-primary" onclick="purpleGuess(\'noir\')" style="flex:1;background:#1a1a1a;color:#fff;padding:16px;border:1px solid rgba(244,236,226,0.2);">Noir</button>'+
        '<button class="btn btn-primary" onclick="purpleGuess(\'purple\')" style="flex:1;background:#7B2D8E;color:#fff;padding:16px;">Purple</button>'+
      '</div>'+
      '<div style="display:flex;gap:8px;">'+
        '<button class="btn btn-ghost" onclick="purpleGuess(\'double\')" style="flex:1;padding:14px;font-size:13px;">Double Purple</button>'+
        '<button class="btn btn-ghost" onclick="purpleGuess(\'triple\')" style="flex:1;padding:14px;font-size:13px;">Triple Purple</button>'+
      '</div>'+
    '</div>';
}

function purpleGuess(choice){
  let numCards = 2;
  if(choice === 'double') numCards = 4;
  if(choice === 'triple') numCards = 6;

  if(purple.deck.length < numCards){
    purpleEndGame();
    return;
  }

  // Draw cards
  const drawn = [];
  for(let i=0;i<numCards;i++) drawn.push(purple.deck.pop());

  const reds = drawn.filter(c => palmIsRed(c.suit)).length;
  const blacks = numCards - reds;

  let correct = false;
  if(choice === 'rouge') correct = (reds === 2 && blacks === 0);
  else if(choice === 'noir') correct = (blacks === 2 && reds === 0);
  else if(choice === 'purple') correct = (reds === 1 && blacks === 1);
  else if(choice === 'double') correct = (reds === 2 && blacks === 2);
  else if(choice === 'triple') correct = (reds === 3 && blacks === 3);

  // Show result
  const body = document.getElementById('purple-body');
  const footer = document.getElementById('purple-footer');

  let cardsHTML = '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;justify-content:center;">';
  drawn.forEach(c => cardsHTML += purpleCardHTML(c));
  cardsHTML += '</div>';

  let resultTitle, resultSub;
  if(correct){
    purple.sipPot += numCards;
    purple.drawnCards = purple.drawnCards.concat(drawn);
    resultTitle = 'Gagné';
    resultSub = '+'+numCards+' gorgée'+(numCards>1?'s':'')+' au compteur';
  } else {
    const total = purple.sipPot + numCards;
    resultTitle = 'Perdu';
    resultSub = purplePlayer()+' boit '+total+' gorgée'+(total>1?'s':'');
    purple.sipPot = 0;
    purple.drawnCards = [];
  }

  body.innerHTML =
    cardsHTML+
    '<div style="font-family:Fraunces,serif;font-size:30px;color:'+(correct?'var(--sage)':'var(--clay)')+';margin-top:16px;">'+resultTitle+'</div>'+
    '<div style="font-size:15px;color:rgba(244,236,226,0.6);margin-top:6px;">'+resultSub+'</div>';

  purple.currentIdx++;
  purpleUpdateHeader();

  footer.innerHTML = '<button class="btn btn-primary" onclick="purpleShowTurn()">Joueur suivant</button>';
}

function purpleEndGame(){
  const body = document.getElementById('purple-body');
  const footer = document.getElementById('purple-footer');

  body.innerHTML =
    '<div style="font-family:Fraunces,serif;font-size:26px;color:var(--text);">Partie terminée</div>'+
    '<div style="font-size:14px;color:rgba(244,236,226,0.5);margin-top:8px;">Plus assez de cartes dans le paquet</div>';

  footer.innerHTML =
    '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>'+
    '<button class="btn btn-primary" onclick="purpleStartGame()" style="flex:1;">Rejouer</button>';
}
