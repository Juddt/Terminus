// ===================================================================================
// PURPLE — signature : LE TIRAGE
// -----------------------------------------------------------------------------------
// Règles (inchangées, voir GAMES['purple'] dans games-catalog.js) :
//   Rouge         — les 2 prochaines cartes sont rouges
//   Noir          — les 2 prochaines sont noires
//   Purple        — 1 rouge + 1 noire, ordre libre
//   Double Purple — 2 rouges + 2 noires (4 cartes)
//   Triple Purple — 3 rouges + 3 noires (6 cartes)
//   Réussi : les gorgées tirées s'ajoutent à la cagnotte, qui reste en jeu.
//   Raté   : le joueur boit la cagnotte PLUS les cartes de ce tirage, et la cagnotte
//            repart à zéro.
//   La partie s'arrête quand le paquet ne permet plus le plus gros tirage.
//
// Toute la tension du jeu est dans l'instant où les cartes se retournent : elles sont
// donc retournées UNE PAR UNE, pas toutes d'un coup. Le résultat est déterminé dès le
// tirage ; la révélation ne fait que le dévoiler.
// ===================================================================================

const purple = {
  players:[], currentIdx:0, deck:[], sipPot:0, potCards:[],
  busy:false, token:0, timers:[]
};

// Ce que chaque annonce demande : combien de cartes, et quelle répartition.
const PURPLE_CALLS = {
  rouge:  { cards:2, reds:2, label:'Rouge',         hint:'2 rouges' },
  noir:   { cards:2, reds:0, label:'Noir',          hint:'2 noires' },
  purple: { cards:2, reds:1, label:'Purple',        hint:'1 rouge + 1 noire' },
  double: { cards:4, reds:2, label:'Double Purple', hint:'2 rouges + 2 noires' },
  triple: { cards:6, reds:3, label:'Triple Purple', hint:'3 rouges + 3 noires' }
};
const PURPLE_MAX_DRAW = 6;   // le plus gros tirage possible (Triple Purple)

function purpleSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'purple') });
}
function purpleStart(players){
  purple.players = (players || []).map(p => p.name);
  purpleStartGame();
}

function purpleStartGame(){
  if(purple.players.length < 2) return;
  purpleClearTimers();
  purple.deck = makeShuffledDeck();
  purple.currentIdx = 0;
  purple.sipPot = 0;
  purple.potCards = [];
  purple.busy = false;
  goTo('purple');
  purpleShowTurn();
}

function purplePlayer(){ return purple.players[purple.currentIdx % purple.players.length]; }

function purpleUpdateHeader(){
  const el = document.getElementById('purple-header');
  if(!el) return;
  el.innerHTML = '<div class="badge"><span class="bv">'+purple.deck.length+'</span> cartes</div>'+
    (purple.sipPot > 0 ? '<div class="badge">Cagnotte <span class="bv">'+purple.sipPot+'</span></div>' : '');
}

// --- Le tour ------------------------------------------------------------------------
function purpleShowTurn(){
  purple.busy = false;
  purpleUpdateHeader();
  if(purple.deck.length < PURPLE_MAX_DRAW){
    purpleEndGame();
    return;
  }
  const body = document.getElementById('purple-body');
  const footer = document.getElementById('purple-footer');

  body.innerHTML =
    '<div class="pur-table">'+
      // Le paquet, avec son épaisseur : c'est de là que vient le danger.
      deckHTML(purple.deck.length, { width:74, label:false })+
      // La cagnotte en jeu, matérialisée par les cartes déjà gagnées.
      purplePotHTML()+
    '</div>'+
    '<div class="pur-who">'+escapeHtml(purplePlayer())+'</div>'+
    '<div class="pur-prompt">Annonce les deux prochaines cartes</div>';

  // Les cinq annonces, du plus sûr au plus risqué, avec ce qu'elles demandent.
  footer.innerHTML =
    '<div class="pur-calls">'+
      ['rouge','noir','purple'].map(k => purpleCallBtn(k)).join('')+
    '</div>'+
    '<div class="pur-calls">'+
      ['double','triple'].map(k => purpleCallBtn(k)).join('')+
    '</div>';
}

function purpleCallBtn(key){
  const c = PURPLE_CALLS[key];
  return '<button class="pur-call pur-call-'+key+'" onclick="purpleGuess(\''+key+'\')">'+
      '<span class="pur-call-name">'+c.label+'</span>'+
      '<span class="pur-call-hint">'+c.hint+'</span>'+
    '</button>';
}

// La cagnotte n'est pas qu'un nombre : ce sont les cartes déjà arrachées au paquet,
// posées en éventail. Plus elle grossit, plus on hésite à relancer.
function purplePotHTML(){
  if(purple.sipPot <= 0){
    return '<div class="pur-pot pur-pot-empty">'+
        '<div class="pur-pot-value">0</div>'+
        '<div class="pur-pot-label">cagnotte</div>'+
      '</div>';
  }
  const fan = purple.potCards.slice(-6).map((c, i) =>
    '<span class="pur-fan-card" style="--k:'+i+'">'+cardHTML(c, { width:34, revealed:true })+'</span>').join('');
  return '<div class="pur-pot">'+
      '<div class="pur-fan">'+fan+'</div>'+
      '<div class="pur-pot-value">'+purple.sipPot+'</div>'+
      '<div class="pur-pot-label">gorgée'+(purple.sipPot > 1 ? 's' : '')+' en jeu</div>'+
    '</div>';
}

// --- Le tirage ----------------------------------------------------------------------
function purpleGuess(choice){
  if(purple.busy) return;                    // verrou anti-double-appui
  const call = PURPLE_CALLS[choice];
  if(!call) return;
  if(purple.deck.length < call.cards){ purpleEndGame(); return; }
  purple.busy = true;

  // Tirage et verdict calculés MAINTENANT. La révélation ne fait que les montrer.
  const drawn = [];
  for(let i = 0; i < call.cards; i++) drawn.push(purple.deck.pop());
  const reds = drawn.filter(c => palmIsRed(c.suit)).length;
  const correct = reds === call.reds;

  const body = document.getElementById('purple-body');
  const footer = document.getElementById('purple-footer');

  // La largeur des cartes suit leur nombre : six cartes à 60 px déborderaient de
  // l'écran et les deux cartes des extrémités seraient rognées.
  const cardW = call.cards >= 6 ? 44 : (call.cards >= 4 ? 58 : 70);

  body.innerHTML =
    '<div class="pur-announce">'+escapeHtml(purplePlayer())+' annonce <b>'+call.label+'</b></div>'+
    '<div class="pc-row" id="pur-draw">'+
      drawn.map((c, i) => cardHTML(c, { width:cardW, index:i, deal:true, id:'pur-card-'+i })).join('')+
    '</div>'+
    '<div class="pur-verdict" id="pur-verdict"></div>';
  footer.innerHTML = '<div class="duel-hint">On retourne…</div>';

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = reduced ? 0 : 320;            // une carte toutes les 320 ms

  // Retournement une par une : c'est là que se joue le suspense, surtout sur un
  // Triple Purple où les six cartes tombent l'une après l'autre.
  drawn.forEach((c, i) => {
    purpleLater(()=>{
      const el = document.getElementById('pur-card-'+i);
      if(el) el.classList.add('revealed');
      Sound.play('cardFlip');
      if(navigator.vibrate) navigator.vibrate([18]);
    }, reduced ? 0 : 240 + i * step);
  });

  purpleLater(()=> purpleResolve(choice, drawn, correct),
    reduced ? 120 : 240 + drawn.length * step + 340);
}

function purpleResolve(choice, drawn, correct){
  const call = PURPLE_CALLS[choice];
  const verdict = document.getElementById('pur-verdict');
  const footer = document.getElementById('purple-footer');
  let main, sub;

  if(correct){
    purple.sipPot += call.cards;
    purple.potCards = purple.potCards.concat(drawn);
    main = 'Gagné';
    sub = '+'+call.cards+' gorgée'+(call.cards > 1 ? 's' : '')+' dans la cagnotte — elle reste en jeu';
    Sound.play('success');
    if(window.fireConfetti && choice === 'triple') window.fireConfetti('small');
  } else {
    const total = purple.sipPot + call.cards;
    main = 'Perdu';
    sub = escapeHtml(purplePlayer())+' boit '+total+' gorgée'+(total > 1 ? 's' : '');
    purple.sipPot = 0;
    purple.potCards = [];
    Sound.play('fail');
    if(navigator.vibrate) navigator.vibrate([90,50,90]);
  }

  if(verdict){
    verdict.innerHTML =
      '<div class="pur-verdict-main '+(correct ? 'win' : 'lose')+'">'+main+'</div>'+
      '<div class="pur-verdict-sub">'+sub+'</div>';
    verdict.classList.add('shown');
  }

  purple.currentIdx++;
  purpleUpdateHeader();
  purple.busy = false;
  if(footer) footer.innerHTML = '<button class="btn btn-primary" onclick="purpleShowTurn()">Suivant</button>';
}

function purpleEndGame(){
  const body = document.getElementById('purple-body');
  const footer = document.getElementById('purple-footer');
  body.innerHTML =
    '<div class="pur-end">'+
      '<div class="pur-end-title">Paquet épuisé</div>'+
      '<div class="pur-end-sub">Il ne reste plus assez de cartes pour une annonce.</div>'+
      (purple.sipPot > 0
        ? '<div class="pur-end-pot">'+purple.sipPot+' gorgée'+(purple.sipPot > 1 ? 's' : '')+' restaient en jeu</div>'
        : '')+
    '</div>';
  footer.innerHTML =
    '<button class="btn btn-primary" onclick="purpleStartGame()">Rejouer</button>'+
    '<button class="btn btn-ghost" onclick="purpleQuit()">Quitter</button>';
}

// --- Cycle de vie -------------------------------------------------------------------
// Les retournements sont programmés à l'avance : quitter en plein tirage doit les
// annuler, sinon ils continuent d'écrire dans un écran déjà quitté.
function purpleClearTimers(){
  purple.token++;
  purple.timers.forEach(t => clearTimeout(t));
  purple.timers = [];
}
function purpleLater(fn, ms){
  const token = purple.token;
  const t = setTimeout(()=>{ if(purple.token === token) fn(); }, ms);
  purple.timers.push(t);
  return t;
}
function purpleQuit(){
  purpleClearTimers();
  purple.busy = false;
  goTo('games-list');
}
registerScreenCleanup('purple', function(){
  purpleClearTimers();
  purple.busy = false;
});
