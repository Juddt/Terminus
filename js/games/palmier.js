const palm = {
  players:[], currentIdx:0, deck:[], palmHeight:0, maxHeight:0,
  kingsDrawn:0, questionMaster:null, freezeMaster:null,
  currentCard:null, collapseCount:0,
  drawnCards:[], balInterval:null,
};

function palmMakeDeck(){
  const d=[];
  PALM_SUITS.forEach(s=> PALM_VALUES.forEach(v=> d.push({suit:s, value:v})));
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

/* --- Setup --- */
function palmierSetup(){
  palm.players=[];
  document.getElementById('palm-chips').innerHTML='';
  document.getElementById('palm-name-field').value='';
  document.getElementById('palm-start-btn').disabled=true;
  goTo('palmier-setup');
  setTimeout(()=> document.getElementById('palm-name-field').focus(), 100);
}

document.getElementById('palm-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && palm.players.length<10){
      palm.players.push(val);
      e.target.value='';
      palmRenderSetupChips();
    }
  }
});

function palmRenderSetupChips(){
  const wrap=document.getElementById('palm-chips');
  wrap.innerHTML='';
  palm.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=name+'<span class="x" onclick="palmRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('palm-start-btn').disabled = palm.players.length < 2;
}
function palmRemovePlayer(i){ palm.players.splice(i,1); palmRenderSetupChips(); }

function palmierStartGame(){
  if(palm.players.length<2) return;
  palm.deck = palmMakeDeck();
  palm.currentIdx = 0;
  palm.palmHeight = 0;
  palm.maxHeight = 0;
  palm.kingsDrawn = 0;
  palm.questionMaster = null;
  palm.freezeMaster = null;
  palm.currentCard = null;
  palm.collapseCount = 0;
  palm.drawnCards = [];
  goTo('palmier');
  palmUpdateHeader();
  palmNextTurn();
}

/* --- Header & status --- */
function palmUpdateHeader(){
  document.getElementById('palm-cards-left').textContent = palm.deck.length;
  document.getElementById('palm-kings-count').textContent = palm.kingsDrawn;
  document.getElementById('palm-collapse-count').textContent = palm.collapseCount;
  const bar = document.getElementById('palm-status-bar');
  let html = '';
  if(palm.questionMaster!==null) html += '<div class="master-pill">Maître Question <span class="mn">'+palm.players[palm.questionMaster]+'</span></div>';
  if(palm.freezeMaster!==null) html += '<div class="master-pill">Maître Freeze <span class="mn">'+palm.players[palm.freezeMaster]+'</span></div>';
  bar.innerHTML = html;
}
function palmPlayer(){ return palm.players[palm.currentIdx % palm.players.length]; }

/* --- Palm tree visual (fanning cards on bottle) --- */
function palmTreeHTML(){
  if(palm.drawnCards.length===0) return '<div class="palmier-visual"><div class="palmier-bottle"></div></div>';
  let h='<div class="palmier-visual"><div class="palmier-bottle"></div>';
  const cards = palm.drawnCards;
  const n = cards.length;
  cards.forEach((c,i)=>{
    const red = palmIsRed(c.suit);
    const idx = i - Math.floor(n/2);
    const baseAngle = idx * (14 + n * 1.2);
    const jitter = ((c.value.charCodeAt(0) * 7 + c.suit.charCodeAt(0) * 13 + i * 17) % 11 - 5) * 1.2;
    const angle = baseAngle + jitter;
    const lift = Math.abs(idx) * 3 + ((c.value.charCodeAt(0) * 3 + i * 11) % 5 - 2);
    const cls = red ? 'r' : 'b';
    h+='<div class="pm-card '+cls+'" style="transform:translateX(-50%) rotate('+angle.toFixed(1)+'deg) translateY(-'+lift.toFixed(0)+'px);">'+c.value+'<br>'+c.suit+'</div>';
  });
  h+='</div>';
  return h;
}

function palmCardMiniHTML(card){
  const red = palmIsRed(card.suit);
  return '<div class="palm-card '+(red?'red':'black')+'" style="width:70px;height:98px;font-size:28px;">'+
    '<div class="card-val">'+card.value+'</div>'+
    '<div class="card-suit" style="font-size:14px;">'+card.suit+'</div>'+
  '</div>';
}

/* --- Core flow: auto-draw on next turn --- */
function palmGetRule(card){
  const v = card.value;
  const red = palmIsRed(card.suit);
  const p = palmPlayer();
  switch(v){
    case 'A': return red
      ? {d:p+' boit cul sec'}
      : {d:p+' choisit qui doit boire cul sec'};
    case '2': return red
      ? {d:p+' doit boire 2 gorgées'}
      : {d:p+' donne 2 gorgées'};
    case '3': return red
      ? {d:p+' doit boire 3 gorgées'}
      : {d:p+' donne 3 gorgées'};
    case '4': return {d:'Floor to the floor !'};
    case '5': return {d:'Five to the sky !'};
    case '6': return {d:'Dans ma valise il y a…'};
    case '7': return {d:p+' devient le Maître de la question', master:'question'};
    case '8': return {d:p+' distribue 8 gorgées'};
    case '9': return {d:'J\'ai déjà / J\'ai jamais'};
    case '10': return {d:p+' devient le Maître du freeze', master:'freeze'};
    case 'V': return {d:'Jeu du thème'};
    case 'D': return {d:'Tout le monde boit une gorgée'};
    case 'R':
      palm.kingsDrawn++;
      if(palm.kingsDrawn < 4){
        const left = 4 - palm.kingsDrawn;
        return {d:p+' doit inventer une règle', kings:left};
      } else {
        return {d:p+' a tiré le 4ème Roi — CUL SEC !', gameover:true};
      }
    default: return {d:''};
  }
}

function palmNextTurn(){
  if(palm.deck.length===0){ palmEndGame(); return; }
  palm.currentCard = palm.deck.pop();
  palm.drawnCards.push(palm.currentCard);
  palmUpdateHeader();
  palmShowReveal();
}

/* --- Reveal: player name big, card, one rule line --- */
function palmShowReveal(){
  const card = palm.currentCard;
  const red = palmIsRed(card.suit);
  const rule = palmGetRule(card);
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');

  if(rule.master==='question') palm.questionMaster = palm.currentIdx % palm.players.length;
  if(rule.master==='freeze') palm.freezeMaster = palm.currentIdx % palm.players.length;
  palmUpdateHeader();

  let kingsHTML = '';
  if(rule.kings !== undefined){
    kingsHTML = '<div class="palm-kings-left">'+rule.kings+' Roi'+(rule.kings>1?'s':'')+' restant'+(rule.kings>1?'s':'')+' avant le cul sec</div>';
  }

  body.innerHTML =
    '<div class="palm-player-big">'+palmPlayer()+'</div>'+
    '<div class="palm-card '+(red?'red':'black')+'">'+
      '<div class="card-val">'+card.value+'</div>'+
      '<div class="card-suit">'+card.suit+'</div>'+
    '</div>'+
    '<div class="palm-rule-line">'+rule.d+'</div>'+
    kingsHTML;

  if(rule.gameover){
    footer.innerHTML = '<button class="btn btn-primary" onclick="palmEndGame()">Fin de partie</button>';
  } else {
    footer.innerHTML = '<button class="btn btn-primary" onclick="palmShowBalance()">Poser la carte</button>';
  }
}

/* --- Balance: cursor + floating card + palm tree --- */
function palmShowBalance(){
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');
  if(palm.balInterval) clearInterval(palm.balInterval);

  const card = palm.currentCard;
  const red = palmIsRed(card.suit);
  const difficulty = Math.min(palm.palmHeight / 30, 1);
  // Zone shrinks: 38% at start → 12% at max difficulty
  const zoneWidth = Math.max(12, 38 - difficulty * 26);
  // Base speed varies randomly each round + scales with difficulty
  const baseSpeed = 1.2 + Math.random() * 1.5 + difficulty * 2.5;
  const zoneLeft = (100 - zoneWidth) / 2;

  body.innerHTML =
    '<div class="palm-card '+(red?'red':'black')+' balance-card-float" id="palm-float-card" style="width:80px;height:112px;font-size:30px;">'+
      '<div class="card-val">'+card.value+'</div>'+
      '<div class="card-suit" style="font-size:16px;">'+card.suit+'</div>'+
    '</div>'+
    '<div class="balance-track" id="palm-track">'+
      '<div class="balance-zone" style="left:'+zoneLeft+'%;width:'+zoneWidth+'%;"></div>'+
      '<div class="balance-cursor" id="palm-cursor"></div>'+
    '</div>'+
    palmTreeHTML();

  footer.innerHTML = '<button class="btn btn-primary" id="palm-tap-btn">Poser !</button>';

  const cursor = document.getElementById('palm-cursor');
  const floatCard = document.getElementById('palm-float-card');
  let pos = Math.random() < 0.5 ? 0 : 100;
  let dir = pos === 0 ? 1 : -1;
  let tapped = false;
  const speed = baseSpeed;

  palm.balInterval = setInterval(()=>{
    if(tapped) return;
    pos += speed * dir;
    if(pos >= 100 || pos <= 0) dir *= -1;
    pos = Math.max(0, Math.min(100, pos));
    cursor.style.left = pos + '%';
    const tilt = (pos - 50) * 0.6;
    floatCard.style.transform = 'rotate('+tilt+'deg)';
  }, 16);

  function doTap(e){
    e.preventDefault();
    if(tapped) return;
    tapped = true;
    clearInterval(palm.balInterval);

    const inZone = pos >= zoneLeft && pos <= (zoneLeft + zoneWidth);
    if(inZone){
      cursor.classList.add('hit');
      floatCard.style.transform = 'rotate(0deg) scale(0.6) translateY(40px)';
      floatCard.style.transition = 'transform 0.4s ease-out, opacity 0.4s';
      floatCard.style.opacity = '0.3';
      if(navigator.vibrate) navigator.vibrate(50);
      setTimeout(()=> palmCardPlaced(), 500);
    } else {
      cursor.classList.add('miss');
      floatCard.style.transform = 'rotate('+(pos > 50 ? 45 : -45)+'deg) translateY(30px)';
      floatCard.style.transition = 'transform 0.3s ease-out';
      if(navigator.vibrate) navigator.vibrate([80,40,80,40,160]);
      setTimeout(()=> palmCollapse(), 500);
    }
  }

  document.getElementById('palm-tap-btn').addEventListener('click', doTap);
}

/* --- Card placed / collapse --- */
function palmCardPlaced(){
  palm.palmHeight++;
  palm.maxHeight = Math.max(palm.maxHeight, palm.palmHeight);
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');

  body.innerHTML =
    '<div style="color:var(--sage); font-size:18px; font-family:Fraunces,serif;">✓ Posée</div>'+
    palmTreeHTML();

  palm.currentIdx++;
  footer.innerHTML = '<button class="btn btn-primary" onclick="palmNextTurn()">Joueur suivant</button>';
}

function palmCollapse(){
  if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');
  palm.collapseCount++;
  const n = Math.max(1,Math.ceil(palm.palmHeight/3));
  const penalty = palm.palmHeight >= 15 ? 'Cul sec !' : (n+' gorgée'+(n>1?'s':''));

  body.innerHTML =
    '<div class="palm-collapse">💥</div>'+
    '<div style="font-family:Fraunces,serif; font-size:22px; color:var(--clay);">Effondrement !</div>'+
    '<div class="palm-rule-line">'+palmPlayer()+' boit '+penalty+'</div>'+
    '<div class="palm-kings-left">'+palm.collapseCount+'/5 chutes</div>';

  palm.palmHeight = 0;
  palm.currentIdx++;
  palmUpdateHeader();

  if(palm.collapseCount >= 5){
    footer.innerHTML = '<button class="btn btn-primary" onclick="palmEndGame()">Fin de partie</button>';
  } else {
    footer.innerHTML = '<button class="btn btn-primary" onclick="palmNextTurn()">Joueur suivant</button>';
  }
}

/* --- End game --- */
function palmEndGame(){
  if(palm.balInterval) clearInterval(palm.balInterval);
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');
  const won = palm.deck.length === 0 && palm.collapseCount < 5;

  let creatorsHTML = '';
  if(won){
    creatorsGlasses++;
    creatorsHTML = '<div class="creators-counter">🥂 '+creatorsGlasses+' verre'+(creatorsGlasses>1?'s':'')+' pour les créateurs</div>';
  }

  body.innerHTML =
    '<div style="font-family:Fraunces,serif; font-size:24px; color:var(--text);">'+(won?'Bravo !':'Perdu !')+'</div>'+
    '<div class="palm-rule-line" style="font-size:13px; line-height:2;">'+
      palm.drawnCards.length+' cartes · '+palm.kingsDrawn+' Rois<br>'+
      palm.collapseCount+' effondrement'+(palm.collapseCount!==1?'s':'')+'<br>'+
      'Record : '+palm.maxHeight+' cartes empilées'+
    '</div>'+
    palmTreeHTML()+
    creatorsHTML;

  footer.innerHTML =
    '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>'+
    '<button class="btn btn-primary" onclick="palmierStartGame()" style="flex:1;">Rejouer</button>';
}

function palmierQuit(){
  if(palm.balInterval) clearInterval(palm.balInterval);
  goTo('games-list');
}
