const palm = {
  players:[], currentIdx:0, deck:[], palmHeight:0, maxHeight:0,
  kingsDrawn:0, questionMaster:null, freezeMaster:null,
  currentCard:null, collapseCount:0,
  // `stack` = les cartes RÉELLEMENT posées sur la bouteille en ce moment. Elle se vide
  // à chaque effondrement. `drawnCards` garde l'historique complet de la partie, pour
  // le récapitulatif de fin. Les confondre faisait que le palmier ne s'effondrait
  // jamais à l'écran : il continuait de grandir alors que la tour venait de tomber.
  stack:[], drawnCards:[], balInterval:null, collapsing:false,
};

function palmMakeDeck(){
  const d=[];
  PALM_SUITS.forEach(s=> PALM_VALUES.forEach(v=> d.push({suit:s, value:v})));
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

/* --- Setup --- */
// Saisie des prénoms : page de configuration unique, bornée par le champ `joueurs`
// du catalogue (voir playerBounds). L'écran de saisie propre à ce jeu a été retiré —
// il faisait doublon, avec ses propres bornes et ses propres règles de validation.
function palmierSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'palmier') });
}

// Reçoit les joueurs collectés par la page de configuration (objets {name, uid, …}) ;
// ce jeu ne manipule que des prénoms.
function palmStart(players){
  palm.players = (players || []).map(p => p.name);
  palmierStartGame();
}

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
  palm.stack = [];
  palm.collapsing = false;
  goTo('palmier');
  palmUpdateHeader();
  palmNextTurn();
}

/* --- Header & status --- */
function palmUpdateHeader(){
  document.getElementById('palm-kings-count').textContent = palm.kingsDrawn;
  document.getElementById('palm-collapse-count').textContent = palm.collapseCount;
  const bar = document.getElementById('palm-status-bar');
  let html = '';
  if(palm.questionMaster!==null) html += palmRoleHTML('🎤', 'Maître de la Question', palm.players[palm.questionMaster]);
  if(palm.freezeMaster!==null)   html += palmRoleHTML('❄️', 'Maître du Freeze', palm.players[palm.freezeMaster]);
  bar.innerHTML = html;
}

// Un rôle en cours, pas un bouton : aucune ombre, aucun relief cliquable, mais assez
// de présence pour qu'on se souvienne qui le détient une heure plus tard.
function palmRoleHTML(symbol, role, name){
  return '<div class="palm-role">'+
      '<span class="palm-role-sym">'+symbol+'</span>'+
      '<span class="palm-role-label">'+role+'</span>'+
      '<span class="palm-role-sep">·</span>'+
      '<span class="palm-role-name">'+escapeHtml(name)+'</span>'+
    '</div>';
}
function palmPlayer(){ return palm.players[palm.currentIdx % palm.players.length]; }

/* --- LE PALMIER --------------------------------------------------------------------
   Une bouteille en verre fumé, et les cartes RÉELLEMENT posées dessus. Chaque carte
   s'appuie sur la précédente, un peu plus penchée, un peu plus haut : la tour grandit
   vraiment sous les yeux, et son inclinaison dit à elle seule qu'elle devient
   instable. La classe `falling` la fait s'écrouler.                                   */
function palmTreeHTML(falling){
  const cards = palm.stack;
  let h = '<div class="palm-scene'+(falling ? ' falling' : '')+'">'+
      '<div class="palm-bottle">'+
        '<div class="palm-bottle-neck"></div>'+
        '<div class="palm-bottle-body"><span class="palm-bottle-shine"></span></div>'+
      '</div>';
  cards.forEach((c, i) => {
    // Les cartes RAYONNENT depuis le goulot, comme les palmes d'un palmier : elles
    // s'ouvrent alternativement à gauche et à droite, de plus en plus inclinées. Avec
    // un empilement vertical serré, elles se superposaient en un simple tas illisible.
    const side = i % 2 === 0 ? 1 : -1;
    const rank = Math.floor(i / 2);
    const angle = side * Math.min(74, 9 + rank * 15);
    const lift = 2 + i * 2.5;
    const shift = side * Math.min(rank * 2.5, 14);
    h += '<div class="palm-stack-card '+(palmIsRed(c.suit) ? 'red' : 'black')+'" '+
         'style="--k:'+i+'; transform:translateX(calc(-50% + '+shift.toFixed(1)+'px)) '+
         'translateY(-'+lift+'px) rotate('+angle.toFixed(1)+'deg);">'+
        '<span class="psc-val">'+c.value+'</span><span class="psc-suit">'+c.suit+'</span>'+
      '</div>';
  });
  h += '<div class="palm-height">'+cards.length+'</div></div>';
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
  switch(v){
    case 'A': return red
      ? {d:'Tu bois cul sec'}
      : {d:'Tu choisis qui boit cul sec'};
    case '2': return red
      ? {d:'Tu bois 2 gorgées'}
      : {d:'Tu donnes 2 gorgées'};
    case '3': return red
      ? {d:'Tu bois 3 gorgées'}
      : {d:'Tu donnes 3 gorgées'};
    case '4': return {d:'Floor to the floor !'};
    case '5': return {d:'Five to the sky !'};
    case '6': return {d:'Dans ma valise il y a…'};
    case '7': return {d:'Tu deviens le Maître de la Question', master:'question'};
    case '8': return {d:'Tu distribues 8 gorgées'};
    case '9': return {d:'J\'ai déjà / J\'ai jamais'};
    case '10': return {d:'Tu deviens le Maître du Freeze', master:'freeze'};
    case 'V': return {d:'Jeu du thème'};
    case 'D': return {d:'Tout le monde boit une gorgée'};
    case 'R':
      palm.kingsDrawn++;
      if(palm.kingsDrawn < 4){
        const left = 4 - palm.kingsDrawn;
        return {d:'Tu inventes une règle', kings:left};
      } else {
        return {d:'4ème Roi — CUL SEC !', gameover:true};
      }
    default: return {d:''};
  }
}

function palmNextTurn(){
  if(palm.deck.length===0){ palmEndGame(); return; }
  palm.currentCard = palm.deck.pop();
  palm.drawnCards.push(palm.currentCard);
  Sound.play('cardFlip');
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
  palm.collapsing = false;

  const card = palm.currentCard;
  const red = palmIsRed(card.suit);
  const difficulty = Math.min(palm.palmHeight / 30, 1);
  // Zone shrinks: 38% at start → 12% at max difficulty
  const zoneWidth = Math.max(12, 38 - difficulty * 26);
  // Base speed varies randomly each round + scales with difficulty
  const baseSpeed = 1.2 + Math.random() * 1.5 + difficulty * 2.5;
  const zoneLeft = (100 - zoneWidth) / 2;

  body.innerHTML =
    '<div class="palm-balance-hint">Relâche dans la zone verte</div>'+
    '<div class="palm-float" id="palm-float-card">'+cardHTML(card, { width:72, revealed:true })+'</div>'+
    '<div class="balance-track" id="palm-track">'+
      '<div class="balance-zone" style="left:'+zoneLeft+'%;width:'+zoneWidth+'%;"></div>'+
      '<div class="balance-cursor" id="palm-cursor"></div>'+
    '</div>'+
    palmTreeHTML(false);

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
      Sound.play('success');
      setTimeout(()=> palmCardPlaced(), 500);
    } else {
      cursor.classList.add('miss');
      floatCard.style.transform = 'rotate('+(pos > 50 ? 45 : -45)+'deg) translateY(30px)';
      floatCard.style.transition = 'transform 0.3s ease-out';
      if(navigator.vibrate) navigator.vibrate([80,40,80,40,160]);
      Sound.play('fail');
      setTimeout(()=> palmCollapse(), 500);
    }
  }

  // Créé juste avant par le rendu du jeu, mais on garde par sécurité : un accès direct
  // non gardé fait planter tout le script si le rendu a échoué.
  const tapBtn = document.getElementById('palm-tap-btn');
  if(tapBtn) tapBtn.addEventListener('click', doTap);
}

/* --- Card placed / collapse --- */
function palmCardPlaced(){
  palm.palmHeight++;
  palm.stack.push(palm.currentCard);
  palm.maxHeight = Math.max(palm.maxHeight, palm.palmHeight);
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');

  body.innerHTML =
    '<div class="palm-verdict win">Posée</div>'+
    '<div class="palm-height-line">'+palm.palmHeight+' carte'+(palm.palmHeight > 1 ? 's' : '')+' en équilibre</div>'+
    palmTreeHTML(false);

  palm.currentIdx++;
  footer.innerHTML = '<button class="btn btn-primary" onclick="palmNextTurn()">Suivant</button>';
}

function palmCollapse(){
  if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
  Sound.play('collapse');
  const body = document.getElementById('palm-body');
  const footer = document.getElementById('palm-footer');
  palm.collapseCount++;
  const n = Math.max(1,Math.ceil(palm.palmHeight/3));
  const penalty = palm.palmHeight >= 15 ? 'Cul sec !' : (n+' gorgée'+(n>1?'s':''));

  // La tour s'écroule à l'écran AVANT d'être vidée : on montre la chute, puis on
  // repart de la bouteille nue.
  body.innerHTML =
    '<div class="palm-verdict lose">Ça s\'écroule</div>'+
    '<div class="palm-height-line">'+escapeHtml(palmPlayer())+' boit '+penalty+' — '+
      palm.collapseCount+' chute'+(palm.collapseCount > 1 ? 's' : '')+' sur 5</div>'+
    palmTreeHTML(true);

  palm.palmHeight = 0;
  palm.stack = [];
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
  Sound.play(won ? 'win' : 'fail');

  let creatorsHTML = '';
  if(won){
    creatorsGlasses++;
    creatorsHTML = '<div class="creators-counter">🥂 '+creatorsGlasses+' verre'+(creatorsGlasses>1?'s':'')+' pour les créateurs</div>';
  }

  body.innerHTML =
    '<div class="palm-end-title">'+(won ? 'Le palmier tient' : 'Le palmier est tombé')+'</div>'+
    '<div class="palm-end-stats">'+
      '<span><b>'+palm.maxHeight+'</b>record</span>'+
      '<span><b>'+palm.drawnCards.length+'</b>cartes</span>'+
      '<span><b>'+palm.collapseCount+'</b>chute'+(palm.collapseCount !== 1 ? 's' : '')+'</span>'+
    '</div>'+
    palmTreeHTML(false)+
    creatorsHTML;

  footer.innerHTML =
    '<button class="btn btn-primary" onclick="palmierStartGame()">Rejouer</button>'+
    '<button class="btn btn-ghost" onclick="palmierQuit()">Quitter</button>';
}

function palmierQuit(){
  if(palm.balInterval) clearInterval(palm.balInterval);
  goTo('games-list');
}

// Le bouton « Accueil » de l'en-tête appelle goTo() directement, sans passer par
// palmierQuit() : sans ce nettoyage, la boucle de balance (16 ms) continuait à tourner
// pour le reste de la soirée.
registerScreenCleanup('palmier', function(){
  if(palm.balInterval) clearInterval(palm.balInterval);
});
