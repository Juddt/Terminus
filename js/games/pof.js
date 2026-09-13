// ===================================================================================
// PILE OU FACE — signature : LE HASARD PUR
// -----------------------------------------------------------------------------------
// Règles (inchangées, voir GAMES['pof'] dans games-catalog.js) :
//   Mode Fun    — on parie 1 à 3 gorgées, on appelle Pile ou Face. Gagné : l'adversaire
//                 boit. Perdu : on boit.
//   Mode Prison — 5 manches imposées, l'enjeu double à chaque fois :
//                 2 → 4 → 8 → 16 → cul sec. Pas d'échappatoire.
//   La pièce est toujours à 50/50.
//
// Le résultat est tiré AVANT l'animation ; la rotation se termine exactement dessus.
// ===================================================================================

const pof = {
  players:[], currentIdx:0, mode:'fun',
  round:0, maxRounds:5, currentBet:1, playerChoice:null,
  busy:false,          // verrou anti-double-appui pendant un lancer
  token:0, timers:[]   // invalidation des minuteurs quand on quitte
};

// Saisie des prénoms : page de configuration unique, bornée par le champ `joueurs`
// du catalogue (voir playerBounds).
function pofSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'pof') });
}

function pofStartFromSetup(players){
  pof.players = (players || []).map(p => p.name);
  pofChooseMode();
}

function pofChooseMode(){
  goTo('pof-mode');
  const body = document.getElementById('pof-mode-body');
  const footer = document.getElementById('pof-mode-footer');
  body.innerHTML =
    '<h2 style="font-size:24px; margin-bottom:16px;">Choisis ton mode</h2>'+
    '<div class="pof-mode-card'+(pof.mode==='fun'?' selected':'')+'" onclick="pofSetMode(\'fun\')">'+
      '<h3>Mode Fun</h3><p>Tu paries 1 à 3 gorgées par lancer. Tranquille.</p>'+
    '</div>'+
    '<div class="pof-mode-card'+(pof.mode==='prison'?' selected':'')+'" onclick="pofSetMode(\'prison\')">'+
      '<h3>Mode Prison</h3><p>5 manches imposées. 2 → 4 → 8 → 16 → cul sec. Pas d\'échappatoire.</p>'+
    '</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="pofStartGame()">Lancer</button>';
}
function pofSetMode(m){ pof.mode = m; Sound.play('tick'); pofChooseMode(); }

function pofStartGame(){
  pofClearTimers();
  pof.busy = false;
  pof.currentIdx = 0;
  pof.round = 0;
  pof.currentBet = 1;
  pof.playerChoice = null;
  goTo('pof');
  pofShowTurn();
}

function pofPlayer(){ return pof.players[pof.currentIdx % pof.players.length]; }
function pofOpponent(){ return pof.players[(pof.currentIdx+1) % pof.players.length]; }

// Enjeu de la manche. En Prison il est imposé et double à chaque manche ; en Fun c'est
// la mise choisie par le joueur.
function pofGetStake(){
  if(pof.mode === 'prison'){
    if(pof.round >= 4) return 'cul sec';
    return Math.pow(2, pof.round + 1);
  }
  return pof.currentBet;
}
function pofStakeText(stake){
  return stake === 'cul sec' ? 'Cul sec' : stake + ' gorgée' + (stake > 1 ? 's' : '');
}

function pofUpdateHeader(){
  const el = document.getElementById('pof-header');
  if(!el) return;
  el.innerHTML = '<div class="badge">'+pofRoundLabel()+'</div>';
}

// « Manche 3 / 5 · 4 gorgées en jeu » : la position dans la partie, puis l'enjeu.
function pofRoundLabel(){
  const n = pof.round + 1;
  const manche = pof.mode === 'prison'
    ? 'Manche <span class="bv">'+Math.min(n, 5)+'</span>/5'
    : 'Manche <span class="bv">'+n+'</span>';
  return manche + ' &middot; ' + pofStakeText(pofGetStake()).toLowerCase() + ' en jeu';
}

// Les deux rôles de la manche, dits explicitement : l'un appelle et mise, l'autre
// encaisse. Sans ça, « Joueur 1 contre Joueur 2 » ne disait pas qui fait quoi.
function pofRolesHTML(){
  return '<div class="pof-roles">'+
      '<div class="pof-role caller">'+
        '<span class="pof-role-name">'+escapeHtml(pofPlayer())+'</span>'+
        '<span class="pof-role-what">appelle et mise</span>'+
      '</div>'+
      '<span class="pof-role-vs">contre</span>'+
      '<div class="pof-role">'+
        '<span class="pof-role-name">'+escapeHtml(pofOpponent())+'</span>'+
        '<span class="pof-role-what">encaisse si c\'est juste</span>'+
      '</div>'+
    '</div>';
}

// --- LA PIÈCE ----------------------------------------------------------------------
// Un vrai cylindre : deux faces frappées ET une tranche. La tranche est faite de
// segments plats posés sur la circonférence — sans elle, la pièce disparaîtrait
// complètement à chaque quart de tour, ce qui trahissait l'ancienne version.
const POF_EDGE_SEGMENTS = 36;
const POF_RADIUS = 62;   // à garder en accord avec .coin-scene dans pof.css

function pofEdgeHTML(){
  let out = '';
  for(let i = 0; i < POF_EDGE_SEGMENTS; i++){
    const angle = (360 / POF_EDGE_SEGMENTS) * i;
    out += '<div class="coin-edge-seg" style="transform:rotateZ('+angle.toFixed(2)+'deg) '+
           'translateY(-'+POF_RADIUS+'px) rotateX(90deg)"></div>';
  }
  return out;
}

// `spin` : rotation en degrés. La pièce se pose exactement sur le résultat déjà tiré.
function pofCoinHTML(spin){
  return '<div class="coin-scene" id="pof-coin-scene">'+
      '<div class="coin" id="pof-coin" style="--spin:'+(spin || 0)+'deg">'+
        pofEdgeHTML()+
        '<div class="coin-side coin-heads">PILE</div>'+
        '<div class="coin-side coin-tails">FACE</div>'+
      '</div>'+
      '<div class="coin-shadow"></div>'+
    '</div>';
}

// --- LA MANCHE ----------------------------------------------------------------------
function pofShowTurn(){
  pof.busy = false;
  pofUpdateHeader();
  const body = document.getElementById('pof-body');
  const footer = document.getElementById('pof-footer');
  const stake = pofGetStake();

  body.innerHTML =
    pofRolesHTML()+
    pofCoinHTML(-68)+
    (pof.mode === 'fun'
      ? '<div class="pof-bets">'+
          '<span class="pof-bets-label">Tu mises</span>'+
          [1,2,3].map(n =>
            '<div class="pof-bet-btn'+(pof.currentBet === n ? ' selected' : '')+'" '+
                 'onclick="pofSetBet('+n+')">'+n+'</div>').join('')+
        '</div>'
      : '<div class="pof-forced">Enjeu imposé &middot; '+pofStakeText(stake)+'</div>');

  // Appeler Pile ou Face n'est pas un choix hiérarchisé : deux boutons strictement
  // identiques, chacun portant sa face. Le jaune sur l'un des deux laissait croire
  // qu'il y avait une bonne réponse.
  footer.innerHTML =
    '<div class="pof-calls">'+
      '<button class="pof-call" onclick="pofFlip(\'pile\')"><span class="pof-call-coin">P</span>Pile</button>'+
      '<button class="pof-call" onclick="pofFlip(\'face\')"><span class="pof-call-coin">F</span>Face</button>'+
    '</div>';
}

function pofSetBet(n){
  if(pof.busy) return;
  pof.currentBet = n;
  Sound.play('tick');
  pofShowTurn();
}

function pofFlip(choice){
  if(pof.busy) return;            // verrou anti-double-appui
  if(pof.players.length < 2) return;
  pof.busy = true;
  pof.playerChoice = choice;

  // Tirage MAINTENANT, à 50/50. L'animation ne décide de rien.
  const result = Math.random() < 0.5 ? 'pile' : 'face';
  const won = choice === result;
  const stake = pofGetStake();
  // Cinq tours complets, plus un demi-tour si la pièce doit finir sur face.
  const spin = 360 * 5 + (result === 'face' ? 180 : 0);

  const body = document.getElementById('pof-body');
  const footer = document.getElementById('pof-footer');

  body.innerHTML =
    '<div class="pof-duel">'+
      '<div class="pof-name">'+escapeHtml(pofPlayer())+'</div>'+
      '<div class="pof-vs">appelle</div>'+
      '<div class="pof-opp">'+(choice === 'pile' ? 'Pile' : 'Face')+'</div>'+
    '</div>'+
    pofCoinHTML(-14)+
    '<div class="pof-forced">'+pofStakeText(stake)+' en jeu</div>';
  footer.innerHTML = '<div class="duel-hint">La pièce est en l\'air…</div>';

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coin = document.getElementById('pof-coin');
  const scene = document.getElementById('pof-coin-scene');
  if(coin){
    if(reduced){
      coin.style.setProperty('--spin', (result === 'face' ? 180 : 0) + 'deg');
    } else {
      if(scene) scene.classList.add('tossing');
      // Le navigateur doit voir l'état de départ avant la valeur finale, sinon il
      // n'interpole pas et la pièce saute directement sur son résultat.
      requestAnimationFrame(()=>{ coin.style.setProperty('--spin', spin + 'deg'); });
    }
  }

  if(navigator.vibrate) navigator.vibrate([25,60,25,60,70]);
  Sound.play('coin');

  pofLater(()=>{
    const sc = document.getElementById('pof-coin-scene');
    if(sc) sc.classList.remove('tossing');
    pofResolve(result, won, stake, spin);
  }, reduced ? 160 : 1150);
}

function pofResolve(result, won, stake, spin){
  const body = document.getElementById('pof-body');
  const footer = document.getElementById('pof-footer');
  const loser = won ? pofOpponent() : pofPlayer();

  Sound.play(won ? 'success' : 'fail');
  if(navigator.vibrate) navigator.vibrate(won ? [60] : [90,50,90]);

  body.innerHTML =
    pofCoinHTML(spin)+
    '<div class="pof-verdict">'+
      '<div class="pof-landed">Elle tombe sur '+result+'</div>'+
      '<div class="pof-outcome '+(won ? 'win' : 'lose')+'">'+(won ? 'Gagné' : 'Perdu')+'</div>'+
      '<div class="pof-drinks">'+escapeHtml(loser)+' boit '+pofStakeText(stake).toLowerCase()+'</div>'+
    '</div>';

  if(pof.mode === 'prison'){
    pof.round++;
    if(pof.round >= 5){
      // Les cinq manches sont faites : plus de lancer possible, on rejoue ou on sort.
      pof.busy = true;
      footer.innerHTML =
        '<button class="btn btn-primary" onclick="pofStartGame()">Rejouer</button>'+
        '<button class="btn btn-ghost" onclick="pofQuit()">Quitter</button>';
      return;
    }
    pof.currentIdx++;
    footer.innerHTML = '<button class="btn btn-primary" onclick="pofShowTurn()">Manche suivante</button>';
  } else {
    pof.round++;
    pof.currentIdx++;
    footer.innerHTML =
      '<button class="btn btn-primary" onclick="pofShowTurn()">Manche suivante</button>'+
      '<button class="btn btn-ghost" onclick="pofQuit()">Quitter</button>';
  }
  pof.busy = false;
}

// --- Cycle de vie -------------------------------------------------------------------
// Les minuteurs sont annulés dès qu'on quitte : sans cela, un résultat en attente
// continuait de s'écrire dans un écran déjà quitté.
function pofClearTimers(){
  pof.token++;
  pof.timers.forEach(t => clearTimeout(t));
  pof.timers = [];
}
function pofLater(fn, ms){
  const token = pof.token;
  const t = setTimeout(()=>{ if(pof.token === token) fn(); }, ms);
  pof.timers.push(t);
  return t;
}
function pofQuit(){
  pofClearTimers();
  pof.busy = false;
  goTo('games-list');
}
registerScreenCleanup('pof', function(){
  pofClearTimers();
  pof.busy = false;
});
