const pmu = {
  players:[], // {name, horse, bet}
  deck:[], obstacles:[], // 7 obstacle cards
  horses:{'♥':0,'♦':0,'♣':0,'♠':0},
  currentCard:null, winner:null,
  betPlayerIdx:0,
  // La course se déroule seule : `timer` porte le prochain retournement, `running` dit
  // qu'elle est en cours. Les deux doivent être remis à zéro dès qu'on quitte l'écran,
  // sinon la course continue de tourner dans le vide pour le reste de la soirée.
  timer:null, running:false
};

// Suffixes ASCII pour les identifiants : les symboles de couleur ne font pas des id
// utilisables.
const PMU_SLUG = {'♥':'h', '♦':'d', '♣':'c', '♠':'s'};

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
    '<div class="pmu-bet-step">Paris &middot; joueur '+(pmu.betPlayerIdx+1)+' sur '+pmu.players.length+'</div>'+
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
    (pmu.betPlayerIdx === pmu.players.length - 1 ? 'Tout le monde a misé — au départ' : 'Joueur suivant')+'</button>';
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
  // Les paris sont faits : plus rien à décider, donc plus rien à cliquer. On laisse un
  // battement au départ — le temps de voir les quatre as alignés — puis ça part.
  pmuLater(pmuRunRace, 900);
}

/* --- LA COURSE, TOUTE SEULE --------------------------------------------------------
   Il fallait appuyer sur « Retourner une carte » à chaque case : une course de 20 à 30
   clics, où l'on regardait son pouce au lieu de la piste. Elle se déroule maintenant
   d'elle-même, et le rythme fait la tension — les cartes tombent vite au milieu du
   peloton, puis la cadence se casse dès qu'un as approche de l'arrivée.             */
const PMU_TICK_FAST = 560;   // rythme de croisière
const PMU_TICK_NEAR = 820;   // un as à deux cases de l'arrivée
const PMU_TICK_EDGE = 1150;  // un as sur le point de gagner

function pmuRaceDelay(){
  const lead = PMU_SUITS.reduce((m, s) => Math.max(m, pmu.horses[s]), 0);
  if(lead >= PMU_FINISH - 1) return PMU_TICK_EDGE;
  if(lead >= PMU_FINISH - 2) return PMU_TICK_NEAR;
  return PMU_TICK_FAST;
}

function pmuRunRace(){
  if(pmu.winner) return;
  pmu.running = true;
  pmuRenderFooter();
  pmuStepRace();
}

function pmuStepRace(){
  if(!pmu.running || pmu.winner) return;
  if(!pmu.deck.length){ pmu.running = false; pmuRenderFooter(); return; }
  pmuFlipCard();
  if(pmu.winner || !pmu.running) return;
  pmu.timer = pmuLater(pmuStepRace, pmuRaceDelay());
}

// Pour les impatients : le seul clic utile pendant la course. On déroule le reste sans
// animation et on arrive directement au verdict.
function pmuSkipToFinish(){
  pmuStopRace();
  let guard = 0;
  while(!pmu.winner && pmu.deck.length && guard++ < 400) pmuFlipCard();
  pmuRenderRace();
}

function pmuStopRace(){
  pmu.running = false;
  if(pmu.timer){ clearTimeout(pmu.timer); pmu.timer = null; }
}

function pmuLater(fn, ms){
  const t = setTimeout(fn, ms);
  pmu.timer = t;
  return t;
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
  const ex = PMU_SUITS.filter(s => pmu.horses[s] === pmu.horses[lead]).length > 1;
  el.innerHTML = pmu.winner
    ? '<div class="badge">Arrivée <span class="bv">'+pmu.winner+'</span></div>'
    : '<div class="badge">'+(ex ? 'À égalité' : 'En tête <span class="bv">'+lead+'</span>')+'</div>'+
      '<div class="badge"><span class="bv">'+pmu.horses[lead]+'</span>/'+PMU_FINISH+'</div>';
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
    const backers = pmu.players.filter(p => p.horse === suit);
    const names = backers.length
      ? backers.map(p => '<span class="pmu-backer">'+escapeHtml(p.name)+
          '<i>'+p.bet+'</i></span>').join('')
      : '<span class="pmu-backer empty">personne</span>';
    return '<div class="pmu-lane'+(isWinner ? ' winner' : '')+'" id="pmu-lane-'+PMU_SLUG[suit]+'">'+
        '<div class="pmu-lane-head">'+
          '<div class="pmu-lane-suit '+(red ? 'red' : 'black')+'">'+suit+'</div>'+
          '<div class="pmu-lane-backers">'+names+'</div>'+
        '</div>'+
        '<div class="pmu-rail">'+
          '<div class="pmu-rail-marks">'+
            Array.from({length: PMU_FINISH - 1}, (_, i) =>
              '<span style="left:'+(((i + 1) / PMU_FINISH) * 100).toFixed(2)+'%"></span>').join('')+
          '</div>'+
          '<div class="pmu-runner '+(red ? 'red' : 'black')+'" id="pmu-runner-'+PMU_SLUG[suit]+'" '+
            'style="left:'+pct.toFixed(2)+'%">'+
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
            return '<div class="pmu-obs" id="pmu-obs-'+i+'" style="left:'+pct+'%"><span>?</span></div>';
          }
          const red = palmIsRed(o.suit);
          return '<div class="pmu-obs flipped '+(red ? 'red' : 'black')+'" id="pmu-obs-'+i+'" '+
              'style="left:'+pct+'%"><span>'+o.value+o.suit+'</span></div>';
        }).join('')+
      '</div>'+
    '</div>';

  // La dernière carte retournée, en évidence : c'est elle qui vient de faire avancer.
  const last = '<div class="pmu-last" id="pmu-last">'+
    (pmu.currentCard
      ? cardHTML(pmu.currentCard, { width:52, revealed:true })
      : '<span class="pmu-last-empty">Les as sont au départ…</span>')+
    '</div>';

  body.innerHTML = last +
    '<div class="pmu-track">'+lanes+obstacles+
      '<div class="pmu-finish-label">Arrivée</div>'+
    '</div>';

  if(pmu.winner){
    const winners = pmu.players.filter(p => p.horse === pmu.winner);
    const losers  = pmu.players.filter(p => p.horse !== pmu.winner);
    body.innerHTML +=
      '<div class="pmu-result">'+
        '<div class="pmu-result-title">'+pmu.winner+' l\'emporte</div>'+
        (winners.length
          ? '<div class="pmu-result-line win">'+winners.map(p => escapeHtml(p.name)+' distribue '+(p.bet * 2)+' gorgées').join(' · ')+'</div>'
          : '<div class="pmu-result-line">Personne n\'avait misé dessus</div>')+
        (losers.length
          ? '<div class="pmu-result-line lose">'+losers.map(p => escapeHtml(p.name)+' boit '+p.bet+(p.bet > 1 ? ' gorgées' : ' gorgée')).join(' · ')+'</div>'
          : '')+
      '</div>';
  }
  pmuRenderFooter();
}

// Le pied d'écran suit l'état de la course : rien à faire pendant qu'elle court (sinon
// abréger si l'on n'a pas la patience), tout à faire une fois qu'elle est finie.
function pmuRenderFooter(){
  const footer = document.getElementById('pmu-footer');
  if(!footer) return;
  if(pmu.winner){
    footer.innerHTML =
      '<button class="btn btn-primary" onclick="pmuBettingPhase()">Rejouer</button>'+
      '<button class="btn btn-ghost" onclick="pmuQuit()">Quitter</button>';
  } else if(pmu.running){
    footer.innerHTML =
      '<div class="duel-hint">La course est lancée…</div>'+
      '<button class="btn btn-ghost" onclick="pmuSkipToFinish()">Aller à l\'arrivée</button>';
  } else if(!pmu.deck.length){
    footer.innerHTML = '<button class="btn btn-primary" onclick="pmuBettingPhase()">Paquet épuisé — rejouer</button>';
  } else {
    footer.innerHTML = '<div class="duel-hint">Les as prennent le départ…</div>';
  }
}

function pmuQuit(){ pmuStopRace(); goTo('games-list'); }

// Sans cela, une course quittée en cours continuait de retourner des cartes et d'écrire
// dans un écran qu'on avait déjà remplacé.
registerScreenCleanup('pmu', function(){ pmuStopRace(); });

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
  // Reconstruire toute la piste à chaque carte replaçait les as d'un bond : le
  // navigateur n'a rien à interpoler entre deux éléments qu'il vient de créer. On met
  // donc à jour les positions SUR PLACE, et la transition CSS fait enfin voir la
  // course — les dépassements, les reculs sur obstacle, le sprint final.
  if(pmu.winner){
    pmuStopRace();
    pmuRenderRace();
    if(window.fireConfetti) window.fireConfetti('big');
  } else {
    pmuSyncRace();
  }
}

// Met à jour ce qui a bougé, sans toucher à la structure de la piste.
function pmuSyncRace(){
  PMU_SUITS.forEach(suit => {
    const el = document.getElementById('pmu-runner-' + PMU_SLUG[suit]);
    if(el) el.style.left = ((pmu.horses[suit] / PMU_FINISH) * 100).toFixed(2) + '%';
  });
  pmu.obstacles.forEach((o, i) => {
    const el = document.getElementById('pmu-obs-' + i);
    if(!el || !o.flipped || el.classList.contains('flipped')) return;
    el.classList.add('flipped', palmIsRed(o.suit) ? 'red' : 'black');
    el.innerHTML = '<span>' + o.value + o.suit + '</span>';
  });
  const last = document.getElementById('pmu-last');
  if(last && pmu.currentCard){
    last.innerHTML = cardHTML(pmu.currentCard, { width:52, revealed:true });
  }
}
