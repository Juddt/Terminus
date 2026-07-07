const pof = {
  players:[], currentIdx:0, mode:'fun',
  round:0, maxRounds:5, currentBet:1, playerChoice:null
};

function pofSetup(){
  pof.players=[];
  document.getElementById('pof-chips').innerHTML='';
  document.getElementById('pof-name-field').value='';
  document.getElementById('pof-start-btn').disabled=true;
  goTo('pof-setup');
  setTimeout(()=> document.getElementById('pof-name-field').focus(), 100);
}

document.getElementById('pof-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && pof.players.length<10){
      pof.players.push(val);
      e.target.value='';
      pofRenderChips();
    }
  }
});

function pofRenderChips(){
  const wrap=document.getElementById('pof-chips');
  wrap.innerHTML='';
  pof.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=name+'<span class="x" onclick="pofRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('pof-start-btn').disabled = pof.players.length < 2;
}
function pofRemovePlayer(i){ pof.players.splice(i,1); pofRenderChips(); }

function pofChooseMode(){
  goTo('pof-mode');
  const body = document.getElementById('pof-mode-body');
  const footer = document.getElementById('pof-mode-footer');

  body.innerHTML =
    '<div style="font-family:Fraunces,serif;font-size:24px;margin-bottom:16px;">Choisis ton mode</div>'+
    '<div class="pof-mode-card'+(pof.mode==='fun'?' selected':'')+'" onclick="pof.mode=\'fun\';pofChooseMode()">'+
      '<h3>Mode Fun</h3><p>Parie 1 à 3 gorgées par lancer. Tranquille.</p>'+
    '</div>'+
    '<div class="pof-mode-card'+(pof.mode==='prison'?' selected':'')+'" onclick="pof.mode=\'prison\';pofChooseMode()">'+
      '<h3>Mode Prison</h3><p>5 manches obligatoires. 2 → 4 → 8 → 16 → cul sec. Pas d\'échappatoire.</p>'+
    '</div>';

  footer.innerHTML = '<button class="btn btn-primary" onclick="pofStartGame()">Lancer</button>';
}

function pofStartGame(){
  pof.currentIdx = 0;
  pof.round = 0;
  pof.currentBet = 1;
  pof.playerChoice = null;
  goTo('pof');
  pofShowTurn();
}

function pofPlayer(){ return pof.players[pof.currentIdx % pof.players.length]; }
function pofOpponent(){ return pof.players[(pof.currentIdx+1) % pof.players.length]; }

function pofGetStake(){
  if(pof.mode==='prison'){
    if(pof.round >= 4) return 'cul sec';
    return Math.pow(2, pof.round + 1);
  }
  return pof.currentBet;
}

function pofUpdateHeader(){
  let h = '';
  if(pof.mode==='prison'){
    h = '<div class="badge">Prison <span class="bv">'+(pof.round+1)+'/5</span></div>';
  } else {
    h = '<div class="badge">Fun</div>';
  }
  document.getElementById('pof-header').innerHTML = h;
}

function pofCoinHTML(){
  return '<div class="coin-scene"><div class="coin" id="pof-coin">'+
    '<div class="coin-face coin-pile">PILE</div>'+
    '<div class="coin-face coin-face-back">FACE</div>'+
  '</div></div>';
}

function pofShowTurn(){
  pofUpdateHeader();
  const body = document.getElementById('pof-body');
  const footer = document.getElementById('pof-footer');
  const stake = pofGetStake();
  const stakeText = stake === 'cul sec' ? 'CUL SEC' : stake+' gorgée'+(stake>1?'s':'');

  if(pof.mode==='fun'){
    // Show bet selection + pile/face choice
    body.innerHTML =
      '<div class="palm-player-big" style="font-size:24px;">'+pofPlayer()+'</div>'+
      '<div style="font-size:13px;color:rgba(244,236,226,0.5);margin-top:4px;">contre '+pofOpponent()+'</div>'+
      pofCoinHTML()+
      '<div style="font-size:13px;color:rgba(244,236,226,0.5);margin-top:10px;">Mise :</div>'+
      '<div style="display:flex;gap:10px;margin-top:6px;">'+
        [1,2,3].map(n=>{
          const sel = pof.currentBet===n;
          return '<div class="pof-bet-btn" onclick="pof.currentBet='+n+';pofShowTurn()" style="background:'+(sel?'var(--accent)':'var(--surface)')+';border:1px solid '+(sel?'var(--accent)':'var(--line)')+';color:'+(sel?'#251c13':'var(--text)')+';">'+n+'</div>';
        }).join('')+
      '</div>';

    footer.innerHTML =
      '<button class="btn btn-primary" onclick="pofFlip(\'pile\')" style="flex:1;background:linear-gradient(135deg,#b8814a,#967034);color:#1a1208;">Pile</button>'+
      '<button class="btn btn-primary" onclick="pofFlip(\'face\')" style="flex:1;background:var(--surface);color:var(--text);border:1px solid var(--line);">Face</button>';
  } else {
    // Prison mode - show round info
    body.innerHTML =
      '<div class="pof-round-badge">Manche '+(pof.round+1)+' / 5</div>'+
      '<div class="palm-player-big" style="font-size:24px;">'+pofPlayer()+'</div>'+
      '<div style="font-size:13px;color:rgba(244,236,226,0.5);margin-top:4px;">contre '+pofOpponent()+'</div>'+
      pofCoinHTML()+
      '<div style="font-family:Fraunces,serif;font-size:22px;color:var(--accent);margin-top:10px;">'+stakeText+'</div>';

    footer.innerHTML =
      '<button class="btn btn-primary" onclick="pofFlip(\'pile\')" style="flex:1;background:linear-gradient(135deg,#b8814a,#967034);color:#1a1208;">Pile</button>'+
      '<button class="btn btn-primary" onclick="pofFlip(\'face\')" style="flex:1;background:var(--surface);color:var(--text);border:1px solid var(--line);">Face</button>';
  }
}

function pofFlip(choice){
  pof.playerChoice = choice;
  const result = Math.random() < 0.5 ? 'pile' : 'face';
  const won = choice === result;
  const stake = pofGetStake();
  const stakeText = stake === 'cul sec' ? 'CUL SEC' : stake+' gorgée'+(typeof stake==='number'&&stake>1?'s':'');

  const body = document.getElementById('pof-body');
  const footer = document.getElementById('pof-footer');
  footer.innerHTML = '';

  // Coin flip animation
  const animClass = result === 'pile' ? 'flipping' : 'flipping-tails';

  body.innerHTML =
    (pof.mode==='prison' ? '<div class="pof-round-badge">Manche '+(pof.round+1)+' / 5</div>' : '')+
    '<div class="palm-player-big" style="font-size:22px;">'+pofPlayer()+' choisit '+choice+'</div>'+
    '<div class="coin-scene"><div class="coin '+animClass+'" id="pof-coin">'+
      '<div class="coin-face coin-pile">PILE</div>'+
      '<div class="coin-face coin-face-back">FACE</div>'+
    '</div></div>';

  if(navigator.vibrate) navigator.vibrate([40,30,40,30,40,30,80]);

  setTimeout(()=>{
    const loser = won ? pofOpponent() : pofPlayer();

    body.innerHTML =
      (pof.mode==='prison' ? '<div class="pof-round-badge">Manche '+(pof.round+1)+' / 5</div>' : '')+
      '<div class="coin-scene"><div class="coin" style="transform:rotateY('+(result==='pile'?'1800':'1980')+'deg);">'+
        '<div class="coin-face coin-pile">PILE</div>'+
        '<div class="coin-face coin-face-back">FACE</div>'+
      '</div></div>'+
      '<div style="font-family:Fraunces,serif;font-size:20px;color:rgba(244,236,226,0.5);margin-top:14px;">La pièce tombe sur '+result+'</div>'+
      '<div style="font-family:Fraunces,serif;font-size:28px;color:'+(won?'var(--sage)':'var(--clay)')+';margin-top:10px;">'+(won?'Gagné':'Perdu')+'</div>'+
      '<div style="font-size:16px;color:var(--text);margin-top:6px;">'+loser+' boit '+stakeText+'</div>';

    if(pof.mode==='prison'){
      pof.round++;
      if(pof.round >= 5){
        footer.innerHTML =
          '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>'+
          '<button class="btn btn-primary" onclick="pofStartGame()" style="flex:1;">Rejouer</button>';
      } else {
        pof.currentIdx++;
        footer.innerHTML = '<button class="btn btn-primary" onclick="pofShowTurn()">Manche suivante</button>';
      }
    } else {
      pof.currentIdx++;
      footer.innerHTML =
        '<button class="btn btn-primary" onclick="pofShowTurn()" style="flex:2;">Joueur suivant</button>'+
        '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>';
    }
  }, 1100);
}
