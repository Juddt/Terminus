const pmu = {
  players:[], // {name, horse, bet}
  deck:[], obstacles:[], // 7 obstacle cards
  horses:{'♥':0,'♦':0,'♣':0,'♠':0},
  currentCard:null, winner:null,
  betPlayerIdx:0
};

const PMU_SUITS = ['♥','♦','♣','♠'];

function pmuSetup(){
  pmu.players=[];
  document.getElementById('pmu-chips').innerHTML='';
  document.getElementById('pmu-name-field').value='';
  document.getElementById('pmu-start-btn').disabled=true;
  goTo('pmu-setup');
  setTimeout(()=> document.getElementById('pmu-name-field').focus(), 100);
}

document.getElementById('pmu-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && pmu.players.length<8){
      pmu.players.push({name:val, horse:null, bet:1});
      e.target.value='';
      pmuRenderChips();
    }
  }
});

function pmuRenderChips(){
  const wrap=document.getElementById('pmu-chips');
  wrap.innerHTML='';
  pmu.players.forEach((p,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=p.name+'<span class="x" onclick="pmuRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('pmu-start-btn').disabled = pmu.players.length < 2;
}
function pmuRemovePlayer(i){ pmu.players.splice(i,1); pmuRenderChips(); }

/* --- Betting phase --- */
function pmuBettingPhase(){
  if(pmu.players.length<2) return;
  pmu.betPlayerIdx = 0;
  goTo('pmu-bet');
  pmuShowBet();
}

function pmuShowBet(){
  if(pmu.betPlayerIdx >= pmu.players.length){
    pmuStartRace();
    return;
  }
  const p = pmu.players[pmu.betPlayerIdx];
  const body = document.getElementById('pmu-bet-body');
  const footer = document.getElementById('pmu-bet-footer');

  body.innerHTML =
    '<div class="palm-player-big" style="font-size:26px;">'+p.name+'</div>'+
    '<div style="font-size:14px;color:rgba(244,236,226,0.5);margin-top:6px;">Choisis ton cheval</div>'+
    '<div style="display:flex;gap:10px;margin-top:20px;">'+
      PMU_SUITS.map(s=>{
        const red = s==='♥'||s==='♦';
        const sel = p.horse===s;
        return '<div onclick="pmuSelectHorse(\''+s+'\')" style="cursor:pointer;width:60px;height:84px;background:'+(sel?'#f6f1e7':'var(--surface)')+';border-radius:8px;border:2px solid '+(sel?'var(--accent)':'var(--line)')+';display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:'+(sel?'0 4px 12px rgba(0,0,0,0.4)':'none')+';">'+
          '<div style="font-family:Fraunces,serif;font-weight:600;font-size:16px;color:'+(sel?(red?'#a82020':'#1a1a1a'):'var(--text-dim)')+';">As</div>'+
          '<div style="font-size:22px;color:'+(sel?(red?'#a82020':'#1a1a1a'):'var(--text-faint)')+';">'+s+'</div>'+
        '</div>';
      }).join('')+
    '</div>'+
    '<div style="margin-top:20px;font-size:14px;color:rgba(244,236,226,0.5);">Mise : combien de gorgées ?</div>'+
    '<div style="display:flex;gap:8px;margin-top:10px;">'+
      [1,2,3,4,5].map(n=>{
        const sel = p.bet===n;
        return '<div onclick="pmuSelectBet('+n+')" style="cursor:pointer;width:44px;height:44px;border-radius:10px;background:'+(sel?'var(--accent)':'var(--surface)')+';border:1px solid '+(sel?'var(--accent)':'var(--line)')+';display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;color:'+(sel?'#251c13':'var(--text)')+';">'+n+'</div>';
      }).join('')+
    '</div>';

  footer.innerHTML = '<button class="btn btn-primary" onclick="pmuConfirmBet()" '+(p.horse?'':'disabled')+'>Valider le pari</button>';
}

function pmuSelectHorse(suit){
  pmu.players[pmu.betPlayerIdx].horse = suit;
  pmuShowBet();
}
function pmuSelectBet(n){
  pmu.players[pmu.betPlayerIdx].bet = n;
  pmuShowBet();
}
function pmuConfirmBet(){
  if(!pmu.players[pmu.betPlayerIdx].horse) return;
  pmu.betPlayerIdx++;
  pmuShowBet();
}

/* --- Race --- */
function pmuStartRace(){
  // Build deck without aces
  const d=[];
  PALM_SUITS.forEach(s=> PALM_VALUES.forEach(v=>{
    if(v!=='A') d.push({suit:s, value:v});
  }));
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }

  pmu.deck = d.slice(7); // rest is the draw pile
  pmu.obstacles = d.slice(0,7); // 7 obstacle cards
  pmu.horses = {'♥':0,'♦':0,'♣':0,'♠':0};
  pmu.winner = null;
  pmu.currentCard = null;

  goTo('pmu');
  pmuUpdateHeader();
  pmuRenderRace();
}

function pmuUpdateHeader(){
  document.getElementById('pmu-header').innerHTML =
    '<div class="badge"><span class="bv">'+pmu.deck.length+'</span> cartes</div>';
}

function pmuRenderRace(){
  const body = document.getElementById('pmu-body');
  const footer = document.getElementById('pmu-footer');
  const FINISH = 8; // positions 0 to 8

  // Last card drawn
  let lastHTML = '';
  if(pmu.currentCard){
    const red = palmIsRed(pmu.currentCard.suit);
    lastHTML = '<div class="pmu-lastcard">'+
      '<div style="font-size:13px;color:rgba(244,236,226,0.5);">Dernière carte :</div>'+
      '<div style="width:36px;height:50px;background:#f6f1e7;border-radius:5px;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;">'+
        '<div style="font-family:Fraunces,serif;font-weight:600;font-size:14px;color:'+(red?'#a82020':'#1a1a1a')+';">'+pmu.currentCard.value+'</div>'+
        '<div style="font-size:12px;color:'+(red?'#a82020':'#1a1a1a')+';">'+pmu.currentCard.suit+'</div>'+
      '</div>'+
    '</div>';
  }

  // Race track
  let trackHTML = '<div class="pmu-track">';
  PMU_SUITS.forEach(suit=>{
    const red = suit==='♥'||suit==='♦';
    const pos = pmu.horses[suit];
    trackHTML += '<div class="pmu-row">';
    trackHTML += '<div class="pmu-label">'+suit+'</div>';
    for(let col=0; col<=FINISH; col++){
      const isFinish = col===FINISH;
      const isObstacle = col>=1 && col<=7;
      let cls = 'pmu-cell';
      if(isFinish) cls += ' finish';
      trackHTML += '<div class="'+cls+'" style="position:relative;">';
      if(pos===col){
        trackHTML += '<div class="pmu-horse '+(red?'r':'b')+'"><div style="font-size:10px;">As</div><div style="font-size:14px;">'+suit+'</div></div>';
      }
      trackHTML += '</div>';
    }
    trackHTML += '</div>';
  });

  // Obstacles row
  trackHTML += '<div class="pmu-row"><div class="pmu-label" style="font-size:10px;color:rgba(244,236,226,0.3);">⚡</div>';
  for(let col=0; col<=FINISH; col++){
    if(col>=1 && col<=7){
      const obs = pmu.obstacles[col-1];
      const flipped = obs.flipped;
      if(flipped){
        const red = palmIsRed(obs.suit);
        trackHTML += '<div class="pmu-cell obstacle flipped"><span style="font-size:9px;color:'+(red?'#a82020':'rgba(244,236,226,0.6)')+';">'+obs.value+obs.suit+'</span></div>';
      } else {
        trackHTML += '<div class="pmu-cell obstacle"><span style="font-size:8px;">?</span></div>';
      }
    } else {
      trackHTML += '<div class="pmu-cell" style="border:none;background:none;"></div>';
    }
  }
  trackHTML += '</div></div>';

  // Bets summary
  let betsHTML = '<div class="pmu-bets">';
  pmu.players.forEach(p=>{
    betsHTML += p.name+' → '+p.horse+' ('+p.bet+' gorgée'+(p.bet>1?'s':'')+')<br>';
  });
  betsHTML += '</div>';

  body.innerHTML = lastHTML + trackHTML + betsHTML;

  if(pmu.winner){
    const winSuit = pmu.winner;
    const winners = pmu.players.filter(p=>p.horse===winSuit);
    const losers = pmu.players.filter(p=>p.horse!==winSuit);

    let resultHTML = '<div style="font-family:Fraunces,serif;font-size:24px;color:var(--text);text-align:center;margin-top:10px;">'+winSuit+' gagne !</div>';
    if(winners.length>0) resultHTML += '<div style="font-size:13px;color:var(--sage);text-align:center;margin-top:6px;">'+winners.map(p=>p.name+' distribue '+(p.bet*2)).join(', ')+' gorgées</div>';
    if(losers.length>0) resultHTML += '<div style="font-size:13px;color:var(--clay);text-align:center;margin-top:4px;">'+losers.map(p=>p.name+' boit '+p.bet).join(', ')+' gorgée'+(losers.some(p=>p.bet>1)?'s':'')+'</div>';
    body.innerHTML += resultHTML;

    footer.innerHTML =
      '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>'+
      '<button class="btn btn-primary" onclick="pmuBettingPhase()" style="flex:1;">Rejouer</button>';
  } else {
    footer.innerHTML = '<button class="btn btn-primary" onclick="pmuFlipCard()">Retourner une carte</button>';
  }
}

function pmuFlipCard(){
  if(pmu.deck.length===0 || pmu.winner) return;

  const card = pmu.deck.pop();
  pmu.currentCard = card;

  // Advance the horse of that suit
  pmu.horses[card.suit] = Math.min(8, pmu.horses[card.suit] + 1);

  // Check obstacles: if ALL horses have passed obstacle col, flip it
  for(let o=0; o<7; o++){
    if(!pmu.obstacles[o].flipped){
      const col = o+1;
      const allPassed = PMU_SUITS.every(s => pmu.horses[s] >= col);
      if(allPassed){
        pmu.obstacles[o].flipped = true;
        // The horse matching obstacle suit goes back 1
        const obsSuit = pmu.obstacles[o].suit;
        pmu.horses[obsSuit] = Math.max(0, pmu.horses[obsSuit] - 1);
      }
      break; // only check the next unflipped obstacle
    }
  }

  // Check winner
  const FINISH = 8;
  PMU_SUITS.forEach(s=>{
    if(pmu.horses[s] >= FINISH && !pmu.winner) pmu.winner = s;
  });

  pmuUpdateHeader();
  pmuRenderRace();
}
