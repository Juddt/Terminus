// ===================================================================================
// LA CIBLE — signature : VISER, ET L'IMPACT
// -----------------------------------------------------------------------------------
// Règles (mécanique inchangée) :
//   21 cartes face cachée, disposées en cible. Plus on vise le centre, plus la question
//   est dure et plus l'enjeu monte :
//     Couronne extérieure — 10 cartes — Rouge ou noir ?        1 gorgée
//     Deuxième cercle     —  6 cartes — Pair ou impair ?       2 gorgées
//     Troisième cercle    —  4 cartes — Devine le symbole      3 gorgées
//     Centre              —  1 carte  — Devine la valeur       5 gorgées
//   Réussi : l'enjeu s'ajoute à la cagnotte, qui reste en jeu.
//   Raté   : le joueur boit la cagnotte plus l'enjeu, et la cagnotte repart à zéro.
//   Certaines cartes déclenchent en plus un effet (As, Roi, Dame, Valet, 7, 10). Le 7
//   inverse le sens du jeu.
//
// La carte visée est choisie AVANT la question : c'est le geste de visée qui engage, et
// c'est l'impact au moment du retournement qui conclut.
// ===================================================================================

const cible = {
  players:[], currentIdx:0, cards:[], selectedIdx:null, sipPot:0, direction:1,
  busy:false
};

// Les quatre couronnes : combien de cartes, quel rayon (en % du plateau), quel enjeu,
// quelle question. Le rayon est relatif, donc la cible s'adapte à la largeur de l'écran.
// Rayons et tailles calibrés pour qu'AUCUNE carte n'en chevauche une autre ni ne
// dépasse du feutre : chaque couronne occupe une bande radiale qui lui est propre
// (voir tests/test-games.js, qui vérifie la géométrie).
const CIBLE_ZONES = [
  { z:1, n:10, sips:1, radius:44,  question:'Rouge ou noir ?',      cardW:26 },
  { z:2, n:6,  sips:2, radius:31,  question:'Pair ou impair ?',     cardW:30 },
  { z:3, n:4,  sips:3, radius:17,  question:'Devine le symbole',    cardW:30 },
  { z:4, n:1,  sips:5, radius:0,   question:'Devine la valeur',     cardW:34 }
];
const CIBLE_TOTAL_CARDS = CIBLE_ZONES.reduce((a, z) => a + z.n, 0);   // 21

function cibleSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'cible') });
}
function cibleStart(players){
  cible.players = (players || []).map(p => p.name);
  cibleStartGame();
}

function cibleStartGame(){
  if(cible.players.length < 2) return;
  cible.currentIdx = 0;
  cible.sipPot = 0;
  cible.direction = 1;
  cible.busy = false;
  goTo('cible');
  cibleNewTarget();
}

function ciblePlayer(){ return cible.players[cible.currentIdx]; }

function cibleNewTarget(){
  const deck = makeShuffledDeck();
  cible.cards = [];
  cible.selectedIdx = null;
  cible.busy = false;
  let di = 0;
  CIBLE_ZONES.forEach(zone => {
    for(let i = 0; i < zone.n; i++){
      // Chaque couronne est décalée d'un demi-pas : les cartes ne s'alignent pas
      // radialement d'une couronne à l'autre, la cible respire.
      const angle = (i / zone.n) * Math.PI * 2 - Math.PI / 2 + (zone.z * Math.PI / 7);
      cible.cards.push(Object.assign({}, deck[di++], {
        zone: zone.z, sips: zone.sips, revealed: false,
        // Positions en POURCENTAGE du plateau : la cible suit la largeur de l'écran au
        // lieu d'être figée à 360 px, où elle débordait sur un téléphone étroit.
        x: 50 + Math.cos(angle) * zone.radius,
        y: 50 + Math.sin(angle) * zone.radius
      }));
    }
  });
  cibleUpdateHeader();
  cibleRenderTarget();
}

function cibleUpdateHeader(){
  const el = document.getElementById('cible-header');
  if(!el) return;
  el.innerHTML = (cible.direction < 0 ? '<div class="badge">Sens inversé</div>' : '');
}

// --- LE PLATEAU ---------------------------------------------------------------------
function cibleBoardHTML(highlightIdx){
  let h = '<div class="cible-board">'+
    '<div class="cible-ring z1"></div>'+
    '<div class="cible-ring z2"></div>'+
    '<div class="cible-ring z3"></div>'+
    '<div class="cible-bull"></div>';
  cible.cards.forEach((c, i) => {
    const sel = highlightIdx === i;
    const dim = highlightIdx != null && highlightIdx !== i;
    const style = 'left:'+c.x.toFixed(2)+'%; top:'+c.y.toFixed(2)+'%; --cw:'+
      CIBLE_ZONES[c.zone - 1].cardW+'px';
    if(c.revealed){
      h += '<div class="cible-slot z'+c.zone+' revealed'+(sel ? ' hit' : '')+'" style="'+style+'">'+
        cardHTML(c, { width: CIBLE_ZONES[c.zone - 1].cardW, revealed:true })+'</div>';
    } else {
      h += '<button class="cible-slot z'+c.zone+(dim ? ' dim' : '')+(sel ? ' aimed' : '')+'" style="'+style+'" '+
        'onclick="cibleSelectCard('+i+')" aria-label="Carte à '+c.sips+' gorgées">'+
        '<span class="cible-slot-sips">'+c.sips+'</span>'+
      '</button>';
    }
  });
  return h + '</div>';
}

function ciblePotHTML(){
  const n = cible.sipPot;
  return '<div class="cible-pot'+(n > 0 ? ' live' : '')+'">'+
      '<div class="cible-pot-value">'+n+'</div>'+
      '<div class="cible-pot-label">gorgée'+(n > 1 ? 's' : '')+' dans la cagnotte</div>'+
    '</div>';
}

function cibleRenderTarget(){
  const body = document.getElementById('cible-body');
  const footer = document.getElementById('cible-footer');
  cible.busy = false;
  body.innerHTML =
    '<div class="cible-aim">'+escapeHtml(ciblePlayer())+'</div>'+
    '<div class="cible-legend">Vise une carte — plus c\'est au centre, plus la question est dure</div>'+
    ciblePotHTML()+
    cibleBoardHTML(null);
  footer.innerHTML = '<button class="btn btn-ghost" onclick="cibleNewTarget()">Nouvelle cible</button>';
}

// --- LA VISÉE -----------------------------------------------------------------------
function cibleSelectCard(idx){
  if(cible.busy) return;
  const card = cible.cards[idx];
  if(!card || card.revealed) return;
  cible.selectedIdx = idx;
  Sound.play('tick');

  const zone = CIBLE_ZONES[card.zone - 1];
  const body = document.getElementById('cible-body');
  const footer = document.getElementById('cible-footer');

  // La carte visée reste à sa place sur la cible, les autres s'effacent : on garde le
  // repère de ce qu'on a choisi, au lieu de basculer sur un écran sans contexte.
  body.innerHTML =
    '<div class="cible-aim">'+escapeHtml(ciblePlayer())+'</div>'+
    '<div class="cible-question">'+zone.question+'</div>'+
    '<div class="cible-stake">'+zone.sips+' gorgée'+(zone.sips > 1 ? 's' : '')+' en jeu</div>'+
    cibleBoardHTML(idx);

  let btns;
  if(card.zone === 1){
    btns = '<button class="btn btn-primary cible-rouge" onclick="cibleGuess(\'rouge\')">Rouge</button>'+
           '<button class="btn btn-ghost" onclick="cibleGuess(\'noir\')">Noir</button>';
  } else if(card.zone === 2){
    btns = '<button class="btn btn-primary" onclick="cibleGuess(\'pair\')">Pair</button>'+
           '<button class="btn btn-ghost" onclick="cibleGuess(\'impair\')">Impair</button>';
  } else if(card.zone === 3){
    btns = '<div class="cible-suits">'+['♥','♦','♣','♠'].map(s =>
      '<button class="btn '+(palmIsRed(s) ? 'btn-primary cible-rouge' : 'btn-ghost')+'" '+
        'onclick="cibleGuess(\''+s+'\')">'+s+'</button>').join('')+'</div>';
  } else {
    btns = '<div class="cible-values">'+PALM_VALUES.map(v =>
      '<button class="cible-val-btn" onclick="cibleGuess(\''+v+'\')">'+v+'</button>').join('')+'</div>';
  }
  footer.innerHTML = btns;
}

// --- L'IMPACT -----------------------------------------------------------------------
function cibleGuess(answer){
  if(cible.busy) return;                    // verrou anti-double-appui
  cible.busy = true;
  const idx = cible.selectedIdx;
  const card = cible.cards[idx];
  if(!card){ cible.busy = false; return; }

  let correct = false;
  let luck = false;
  if(card.zone === 1){
    correct = (answer === 'rouge') === palmIsRed(card.suit);
  } else if(card.zone === 2){
    const n = parseInt(card.value, 10);
    if(isNaN(n)){
      // Une figure (As, Valet, Dame, Roi) n'est ni paire ni impaire : le sort tranche,
      // à 50/50. C'est la mécanique d'origine — on la DIT au joueur dans le résultat
      // plutôt que de la laisser passer pour une erreur de sa part.
      correct = Math.random() < 0.5;
      luck = true;
    } else {
      correct = (answer === 'pair') === (n % 2 === 0);
    }
  } else if(card.zone === 3){
    correct = answer === card.suit;
  } else {
    correct = answer === card.value;
  }

  card.revealed = true;
  Sound.play('cardFlip');

  // Effets de carte : inchangés.
  const SPECIALS = {
    A:  'As — tout le monde boit une gorgée',
    R:  'Roi — invente une règle pour la suite',
    D:  'Dame — duel avec le joueur de ton choix',
    V:  'Valet — ton voisin de gauche boit',
    '7':'7 — le sens du jeu s\'inverse',
    '10':'10 — double ou rien'
  };
  const special = SPECIALS[card.value] || '';
  if(card.value === '7') cible.direction *= -1;

  let main, sub;
  if(correct){
    cible.sipPot += card.sips;
    main = 'Touché';
    sub = '+'+card.sips+' gorgée'+(card.sips > 1 ? 's' : '')+' dans la cagnotte';
    Sound.play('success');
  } else {
    const total = cible.sipPot + card.sips;
    main = 'Manqué';
    sub = 'Tu bois '+total+' gorgée'+(total > 1 ? 's' : '');
    cible.sipPot = 0;
    Sound.play('fail');
    if(navigator.vibrate) navigator.vibrate([90,50,90]);
  }

  const body = document.getElementById('cible-body');
  const footer = document.getElementById('cible-footer');
  body.innerHTML =
    '<div class="cible-aim">'+escapeHtml(ciblePlayer())+'</div>'+
    '<div class="cible-impact-card">'+cardHTML(card, { width:76, revealed:true })+'</div>'+
    '<div class="cible-outcome '+(correct ? 'win' : 'lose')+'">'+main+'</div>'+
    '<div class="cible-outcome-sub">'+sub+'</div>'+
    (luck ? '<div class="cible-luck">Une figure : ni paire ni impaire — le sort a tranché</div>' : '')+
    (special ? '<div class="cible-special">'+special+'</div>' : '');

  cibleUpdateHeader();
  cible.busy = false;
  footer.innerHTML = '<button class="btn btn-primary" onclick="cibleNextPlayer()">Suivant</button>';
}

function cibleNextPlayer(){
  cible.currentIdx = (cible.currentIdx + cible.direction + cible.players.length) % cible.players.length;
  // La cible se renouvelle quand toutes les cartes ont été retournées ; sinon on garde
  // le plateau en cours, avec ses trous — c'est la mémoire de la partie.
  const left = cible.cards.filter(c => !c.revealed).length;
  if(left === 0){ cibleNewTarget(); return; }
  cibleUpdateHeader();
  cibleRenderTarget();
}

function cibleQuit(){ cible.busy = false; goTo('games-list'); }
registerScreenCleanup('cible', function(){ cible.busy = false; });
