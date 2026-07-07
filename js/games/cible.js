const cible = {
  players:[], currentIdx:0, cards:[], selectedIdx:null, direction:1, sipPot:0
};

function cibleSetup(){
  cible.players=[];
  document.getElementById('cible-chips').innerHTML='';
  document.getElementById('cible-name-field').value='';
  document.getElementById('cible-start-btn').disabled=true;
  goTo('cible-setup');
  setTimeout(()=> document.getElementById('cible-name-field').focus(), 100);
}

document.getElementById('cible-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && cible.players.length<10){
      cible.players.push(val);
      e.target.value='';
      cibleRenderChips();
    }
  }
});

function cibleRenderChips(){
  const wrap=document.getElementById('cible-chips');
  wrap.innerHTML='';
  cible.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=name+'<span class="x" onclick="cibleRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('cible-start-btn').disabled = cible.players.length < 2;
}
function cibleRemovePlayer(i){ cible.players.splice(i,1); cibleRenderChips(); }

function cibleStartGame(){
  if(cible.players.length<2) return;
  cible.currentIdx = 0;
  cible.direction = 1;
  cible.sipPot = 0;
  goTo('cible');
  cibleNewTarget();
}

function ciblePlayer(){ return cible.players[cible.currentIdx]; }

function cibleMakeDeck(){
  const d=[];
  PALM_SUITS.forEach(s=> PALM_VALUES.forEach(v=> d.push({suit:s, value:v})));
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

function cibleNewTarget(){
  const deck = cibleMakeDeck();
  cible.cards = [];
  cible.selectedIdx = null;
  // Zone 1: 12 cards, Zone 2: 8 cards, Zone 3: 4 cards, Zone 4: 1 card
  const zones = [
    {z:1,n:10,sips:1,r:165,offset:0},
    {z:2,n:6,sips:2,r:108,offset:Math.PI/6},
    {z:3,n:4,sips:3,r:54,offset:Math.PI/4},
    {z:4,n:1,sips:5,r:0,offset:0}
  ];
  let di = 0;
  zones.forEach(zone=>{
    for(let i=0;i<zone.n;i++){
      const card = deck[di++];
      const angle = (i / zone.n) * Math.PI * 2 - Math.PI/2 + zone.offset;
      cible.cards.push({
        ...card, zone:zone.z, sips:zone.sips, revealed:false,
        x: 180 + Math.cos(angle) * zone.r,
        y: 180 + Math.sin(angle) * zone.r,
      });
    }
  });
  cibleUpdateHeader();
  cibleRenderTarget();
}

function cibleUpdateHeader(){
  document.getElementById('cible-header').innerHTML =
    '<div class="badge">Joueur <span class="bv">'+(cible.currentIdx+1)+'/'+cible.players.length+'</span></div>';
}

function cibleRenderTarget(){
  const body = document.getElementById('cible-body');
  const footer = document.getElementById('cible-footer');
  let h = '';
  if(cible.sipPot > 0){
    h += '<div class="sip-pot">'+cible.sipPot+'</div><div class="sip-pot-label">gorgée'+(cible.sipPot>1?'s':'')+' en jeu</div>';
  }
  h += '<div class="palm-player-big" style="font-size:22px;margin-bottom:2px;">'+ciblePlayer()+', choisis une carte</div>';
  h += '<div class="cible-wrap">';
  h += '<div class="cible-ring z1"></div><div class="cible-ring z2"></div><div class="cible-ring z3"></div><div class="cible-ring z4"></div>';
  cible.cards.forEach((c,i)=>{
    const zClass = 'z'+c.zone;
    if(c.revealed){
      const col = palmIsRed(c.suit) ? 'red-card' : 'black-card';
      h += '<div class="cc '+zClass+' revealed '+col+'" style="left:'+c.x+'px;top:'+c.y+'px;"><span class="cc-val">'+c.value+'</span><span class="cc-suit">'+c.suit+'</span></div>';
    } else {
      h += '<div class="cc '+zClass+' hidden-card" style="left:'+c.x+'px;top:'+c.y+'px;" onclick="cibleSelectCard('+i+')"><span class="cc-val">'+c.sips+'</span><span class="cc-sip">gorgée'+(c.sips>1?'s':'')+'</span></div>';
    }
  });
  h += '</div>';
  body.innerHTML = h;
  footer.innerHTML = '<button class="btn btn-ghost" onclick="cibleNewTarget()">Nouvelle cible</button>';
}

function cibleSelectCard(idx){
  const card = cible.cards[idx];
  if(card.revealed) return;
  cible.selectedIdx = idx;
  const body = document.getElementById('cible-body');
  const footer = document.getElementById('cible-footer');
  const z = card.zone;

  let question = '', btns = '';
  if(z === 1){
    question = 'Rouge ou Noir ?';
    btns = '<button class="btn btn-primary" onclick="cibleGuess(\'rouge\')" style="flex:1;background:#A3503A;">Rouge</button>'+
           '<button class="btn btn-primary" onclick="cibleGuess(\'noir\')" style="flex:1;background:#2a2a2a;color:var(--text);">Noir</button>';
  } else if(z === 2){
    question = 'Pair ou Impair ?';
    btns = '<button class="btn btn-primary" onclick="cibleGuess(\'pair\')" style="flex:1;">Pair</button>'+
           '<button class="btn btn-primary" onclick="cibleGuess(\'impair\')" style="flex:1;">Impair</button>';
  } else if(z === 3){
    question = 'Devine le symbole';
    btns = ['♥','♦','♣','♠'].map(s=>
      '<button class="btn btn-primary" onclick="cibleGuess(\''+s+'\')" style="flex:1;padding:14px 8px;font-size:18px;">'+s+'</button>'
    ).join('');
  } else {
    question = 'Devine la valeur';
    btns = '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    PALM_VALUES.forEach(v=>{
      btns += '<button class="btn btn-ghost" onclick="cibleGuess(\''+v+'\')" style="width:auto;padding:10px 14px;flex:0;">'+v+'</button>';
    });
    btns += '</div>';
  }

  body.innerHTML =
    '<div class="palm-player-big" style="font-size:22px;">'+ciblePlayer()+'</div>'+
    '<div class="cible-question">'+question+'</div>';
  footer.innerHTML = '<div style="display:flex;gap:8px;width:100%;">'+btns+'</div>';
}

function cibleGuess(answer){
  const idx = cible.selectedIdx;
  const card = cible.cards[idx];
  const z = card.zone;
  let correct = false;

  if(z === 1){
    const isRed = palmIsRed(card.suit);
    correct = (answer==='rouge' && isRed) || (answer==='noir' && !isRed);
  } else if(z === 2){
    const numVal = parseInt(card.value);
    if(isNaN(numVal)){
      correct = Math.random() < 0.5; // figures: coin flip
    } else {
      correct = (answer==='pair' && numVal%2===0) || (answer==='impair' && numVal%2!==0);
    }
  } else if(z === 3){
    correct = (answer === card.suit);
  } else {
    correct = (answer === card.value);
  }

  card.revealed = true;

  // Special effects
  let special = '';
  if(card.value==='A') special = 'As — tout le monde boit 1 gorgée';
  else if(card.value==='R') special = 'Roi 👑 — invente une règle';
  else if(card.value==='D') special = 'Dame — duel avec le joueur de ton choix';
  else if(card.value==='V') special = 'Valet — ton voisin de gauche boit';
  else if(card.value==='7') special = '7 — sens de jeu inversé !';
  else if(card.value==='10') special = '10 — double ou rien !';

  if(card.value==='7') cible.direction *= -1;

  let resultTitle = '', resultSub = '';
  if(correct){
    cible.sipPot += card.sips;
    resultTitle = 'Gagné';
    resultSub = '+'+card.sips+' gorgée'+(card.sips>1?'s':'')+' au compteur';
  } else {
    const totalDrink = cible.sipPot + card.sips;
    resultTitle = 'Perdu';
    resultSub = ciblePlayer()+' boit '+totalDrink+' gorgée'+(totalDrink>1?'s':'');
    cible.sipPot = 0;
  }

  const body = document.getElementById('cible-body');
  const footer = document.getElementById('cible-footer');
  const red = palmIsRed(card.suit);

  body.innerHTML =
    '<div class="palm-card '+(red?'red':'black')+'" style="width:70px;height:98px;font-size:28px;">'+
      '<div class="card-val">'+card.value+'</div>'+
      '<div class="card-suit" style="font-size:14px;">'+card.suit+'</div>'+
    '</div>'+
    '<div style="font-family:Fraunces,serif;font-size:28px;color:'+(correct?'var(--sage)':'var(--clay)')+';">'+resultTitle+'</div>'+
    '<div style="font-size:14px;color:var(--text-dim);">'+resultSub+'</div>'+
    (special ? '<div class="cible-special">'+special+'</div>' : '');

  footer.innerHTML = '<button class="btn btn-primary" onclick="cibleNextPlayer()">Joueur suivant</button>';
}

function cibleNextPlayer(){
  cible.currentIdx = (cible.currentIdx + cible.direction + cible.players.length) % cible.players.length;
  cibleUpdateHeader();
  cibleRenderTarget();
}
