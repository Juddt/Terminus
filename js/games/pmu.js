const pmu = {
  players:[], // {name, horse, bet}
  deck:[], obstacles:[], // 7 obstacle cards
  horses:{'♥':0,'♦':0,'♣':0,'♠':0},
  currentCard:null, winner:null,
  betPlayerIdx:0
};

const PMU_SUITS = ['♥','♦','♣','♠'];

/* --- Betting phase --- */
// Saisie des prénoms : page de configuration unique, bornée par le champ `joueurs`
// du catalogue (voir playerBounds). L'écran de saisie propre à ce jeu a été retiré —
// il faisait doublon, avec ses propres bornes et ses propres règles de validation.
function pmuSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'pmu') });
}

// Reçoit les joueurs collectés par la page de configuration (objets {name, uid, …}) ;
// ce jeu ne manipule que des prénoms.
function pmuStartFromSetup(players){
  // Le PMU garde un objet par joueur : il y range le cheval choisi et la mise.
  pmu.players = (players || []).map(p => ({ name: p.name, horse: null, bet: 1 }));
  pmuBettingPhase();
}

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
    '<div class="pmu-bet-who">'+escapeHtml(p.name)+'</div>'+
    '<div class="pmu-bet-prompt">Sur quel as tu mises ?</div>'+
    '<div class="pmu-horses">'+ PMU_SUITS.map(suit =>
      '<div class="pmu-horse-pick'+(p.horse === suit ? ' selected' : '')+(palmIsRed(suit) ? ' red' : '')+'" '+
           'onclick="pmuSelectHorse(\''+suit+'\')">'+
        '<span class="rank">A</span><span class="suit">'+suit+'</span>'+
      '</div>').join('') +'</div>'+
    '<div class="pmu-bet-prompt" style="margin-top:12px;">Combien de gorgées ?</div>'+
    '<div class="pmu-amounts">'+ [1,2,3,4,5].map(n =>
      '<div class="pmu-amount'+(p.bet === n ? ' selected' : '')+'" onclick="pmuSelectBet('+n+')">'+n+'</div>'
    ).join('') +'</div>';

  footer.innerHTML = '<button class="btn btn-primary" onclick="pmuConfirmBet()" '+
    (p.horse ? '' : 'disabled')+'>'+
    (pmu.betPlayerIdx === pmu.players.length - 1 ? 'Lancer la course' : 'Joueur suivant')+'</button>';
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

// ===================================================================================
// LE PMU — signature : LA COURSE
// -----------------------------------------------------------------------------------
// Règles (inchangées) : quatre as, un par couleur, alignés au départ. On retourne une
// carte, l'as de cette couleur avance d'une case. Sept obstacles sont posés face cachée
// le long de la piste : dès que TOUS les as ont dépassé un obstacle, il se retourne et
// l'as de sa couleur RECULE d'une case. Premier arrivé à la huitième case : ses parieurs
// distribuent le double de leur mise, les autres boivent la leur.
//
// Ce qui manquait : on ne VOYAIT pas la course. Les as glissent maintenant le long de
// leur couloir — les dépassements et les reculs se lisent au moment où ils arrivent.
// ===================================================================================

const PMU_FINISH = 8;        // nombre de cases à franchir
const PMU_OBSTACLES = 7;     // un obstacle par case intermédiaire

function pmuUpdateHeader(){
  const el = document.getElementById('pmu-header');
  if(!el) return;
  const lead = PMU_SUITS.reduce((a, s) => pmu.horses[s] > pmu.horses[a] ? s : a, PMU_SUITS[0]);
  el.innerHTML = '<div class="badge"><span class="bv">'+pmu.deck.length+'</span> cartes</div>'+
    (pmu.winner ? '' : '<div class="badge">En tête <span class="bv">'+lead+'</span></div>');
}

function pmuRenderRace(){
  const body = document.getElementById('pmu-body');
  const footer = document.getElementById('pmu-footer');

  // Les couloirs. La position de chaque as est un POURCENTAGE de la piste : la
  // transition CSS fait le reste, et l'on voit réellement l'as avancer ou reculer.
  const lanes = PMU_SUITS.map(suit => {
    const pos = pmu.horses[suit];
    const pct = (pos / PMU_FINISH) * 100;
    const red = palmIsRed(suit);
    const isWinner = pmu.winner === suit;
    return '<div class="pmu-lane'+(isWinner ? ' winner' : '')+'">'+
        '<div class="pmu-lane-suit '+(red ? 'red' : 'black')+'">'+suit+'</div>'+
        '<div class="pmu-rail">'+
          '<div class="pmu-rail-marks">'+
            Array.from({length: PMU_FINISH - 1}, (_, i) =>
              '<span style="left:'+(((i + 1) / PMU_FINISH) * 100).toFixed(2)+'%"></span>').join('')+
          '</div>'+
          '<div class="pmu-runner '+(red ? 'red' : 'black')+'" style="left:'+pct.toFixed(2)+'%">'+
            '<span class="pmu-runner-rank">A</span>'+
            '<span class="pmu-runner-suit">'+suit+'</span>'+
          '</div>'+
        '</div>'+
      '</div>';
  }).join('');

  // Les obstacles, alignés sous la piste, à la case qu'ils gardent.
  const obstacles = '<div class="pmu-obstacles">'+
      '<div class="pmu-lane-suit dim">!</div>'+
      '<div class="pmu-rail obstacles-rail">'+
        pmu.obstacles.map((o, i) => {
          const pct = (((i + 1) / PMU_FINISH) * 100).toFixed(2);
          if(!o.flipped){
            return '<div class="pmu-obs" style="left:'+pct+'%"><span>?</span></div>';
          }
          const red = palmIsRed(o.suit);
          return '<div class="pmu-obs flipped '+(red ? 'red' : 'black')+'" style="left:'+pct+'%">'+
              '<span>'+o.value+o.suit+'</span></div>';
        }).join('')+
      '</div>'+
    '</div>';

  // Qui a misé sur quoi : c'est ce qui donne son enjeu à chaque carte retournée.
  const bets = '<div class="pmu-bets">'+ pmu.players.map(p =>
      '<div class="pmu-bet'+(pmu.winner && p.horse === pmu.winner ? ' won' : '')+
        (pmu.winner && p.horse !== pmu.winner ? ' lost' : '')+'">'+
        '<span class="pmu-bet-name">'+escapeHtml(p.name)+'</span>'+
        '<span class="pmu-bet-horse '+(palmIsRed(p.horse) ? 'red' : 'black')+'">'+p.horse+'</span>'+
        '<span class="pmu-bet-amount">'+p.bet+'</span>'+
      '</div>').join('')+'</div>';

  // La dernière carte retournée, en évidence : c'est elle qui vient de faire avancer.
  const last = pmu.currentCard
    ? '<div class="pmu-last">'+cardHTML(pmu.currentCard, { width:52, revealed:true })+'</div>'
    : '<div class="pmu-last pmu-last-empty">Retourne la première carte</div>';

  body.innerHTML = last +
    '<div class="pmu-track">'+lanes+obstacles+
      '<div class="pmu-finish-label">Arrivée</div>'+
    '</div>' + bets;

  if(pmu.winner){
    const winners = pmu.players.filter(p => p.horse === pmu.winner);
    const losers  = pmu.players.filter(p => p.horse !== pmu.winner);
    body.innerHTML +=
      '<div class="pmu-result">'+
        '<div class="pmu-result-title">'+pmu.winner+' l\'emporte</div>'+
        (winners.length
          ? '<div class="pmu-result-line win">'+winners.map(p => escapeHtml(p.name)+' distribue '+(p.bet * 2)).join(' · ')+' gorgées</div>'
          : '<div class="pmu-result-line">Personne n\'avait misé dessus</div>')+
        (losers.length
          ? '<div class="pmu-result-line lose">'+losers.map(p => escapeHtml(p.name)+' boit '+p.bet).join(' · ')+'</div>'
          : '')+
      '</div>';
    footer.innerHTML =
      '<button class="btn btn-primary" onclick="pmuBettingPhase()">Rejouer</button>'+
      '<button class="btn btn-ghost" onclick="pmuQuit()">Quitter</button>';
  } else {
    footer.innerHTML = '<button class="btn btn-primary" onclick="pmuFlipCard()">Retourner une carte</button>';
  }
}

function pmuQuit(){ goTo('games-list'); }

function pmuFlipCard(){
  if(pmu.deck.length===0 || pmu.winner) return;
  Sound.play('cardFlip');

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
  const hadWinner = !!pmu.winner;
  PMU_SUITS.forEach(s=>{
    if(pmu.horses[s] >= FINISH && !pmu.winner) pmu.winner = s;
  });
  if(!hadWinner && pmu.winner) Sound.play('win');

  pmuUpdateHeader();
  pmuRenderRace();
}
