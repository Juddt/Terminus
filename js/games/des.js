// ===================================================================================
// LE DUEL DE DÉS
// -----------------------------------------------------------------------------------
// Règles (inchangées, voir GAMES['des'] dans games-catalog.js) :
//   — chaque joueur lance un dé à six faces, équiprobable ;
//   — le plus BAS boit le PRODUIT des deux dés ;
//   — égalité : on relance automatiquement.
//
// Principe de mise en scène : le moteur tire les deux valeurs AVANT l'animation, et
// l'animation se contente de les montrer. Le tumble se termine exactement sur la face
// tirée. Rien dans le rendu ne peut donc modifier le résultat ni ses probabilités.
// ===================================================================================

const des = {
  players: [],       // [{name}, {name}]
  values: [1, 1],
  rolling: false,    // verrou anti-double-appui
  token: 0,          // invalide les minuteurs en cours dès qu'on quitte ou qu'on relance
  timers: [],
  ties: 0            // relances consécutives pour égalité, affichées au joueur
};

// Points allumés, de gauche à droite et de haut en bas, pour chaque face.
const DIE_PIPS = {
  1:[0,0,0, 0,1,0, 0,0,0],
  2:[1,0,0, 0,0,0, 0,0,1],
  3:[1,0,0, 0,1,0, 0,0,1],
  4:[1,0,1, 0,0,0, 1,0,1],
  5:[1,0,1, 0,1,0, 1,0,1],
  6:[1,0,1, 1,0,1, 1,0,1],
};

// Rotation qui amène une face donnée face au joueur. Le cube est construit avec la
// face 1 devant, la 6 derrière, la 3 à droite, la 4 à gauche, la 5 en haut, la 2 en bas
// (les faces opposées totalisent 7, comme sur un vrai dé).
const FACE_ROTATION = {
  1:{x:0,   y:0},
  2:{x:90,  y:0},
  3:{x:0,   y:-90},
  4:{x:0,   y:90},
  5:{x:-90, y:0},
  6:{x:0,   y:180},
};
// Léger dévers permanent : sans lui le cube se lit comme un carré. Assez faible pour
// que la face avant reste parfaitement lisible.
const DIE_TILT_X = -13, DIE_TILT_Y = 17;

function desDieHTML(side){
  return '<div class="die-stage" id="die-stage-'+side+'">'+
      '<div class="die-shadow"></div>'+
      '<div class="die-3d" id="die-'+side+'">'+
        [1,2,3,4,5,6].map(v =>
          '<div class="die-face die-face-'+v+'">'+
            DIE_PIPS[v].map(on => '<div class="die-pip'+(on ? ' on' : '')+'"></div>').join('')+
          '</div>').join('')+
      '</div>'+
    '</div>';
}

function desFaceTransform(value, spins){
  const r = FACE_ROTATION[value] || FACE_ROTATION[1];
  // Les tours supplémentaires sont des multiples de 360° : ils font tourner le dé sans
  // changer la face sur laquelle il se pose.
  const turns = spins ? 360 * spins : 0;
  return 'rotateX('+DIE_TILT_X+'deg) rotateY('+DIE_TILT_Y+'deg) '+
         'rotateY('+(r.y + turns)+'deg) rotateX('+(r.x + turns + (spins ? 360 : 0))+'deg)';
}

// --- Cycle de vie -------------------------------------------------------------------
// Tout minuteur est enregistré et annulé quand on quitte : sans cela, une relance
// d'égalité programmée continuait d'écrire dans un écran qu'on avait déjà quitté.
function desClearTimers(){
  des.timers.forEach(t => clearTimeout(t));
  des.timers = [];
}
function desLater(fn, ms){
  const token = des.token;
  const t = setTimeout(()=>{ if(des.token === token) fn(); }, ms);
  des.timers.push(t);
  return t;
}

// Entrée depuis la bibliothèque : la saisie des prénoms passe par la page de
// configuration unique, bornée à 2 joueurs par le catalogue (champ `joueurs`).
function desSetup(){
  openSetupFor({ type:'game', game: GAMES.find(g => g.id === 'des') });
}

// Appelé par launchFromSetup() avec les joueurs collectés.
function desStart(players){
  des.token++;
  desClearTimers();
  des.players = (players || []).slice(0, 2);
  des.rolling = false;
  des.ties = 0;
  des.values = [1, 1];
  goTo('des');
  desRenderBoard({ phase:'ready' });
}

function desQuit(){
  des.token++;
  desClearTimers();
  des.rolling = false;
  goTo('games-list');
}
registerScreenCleanup('des', function(){
  des.token++;
  desClearTimers();
  des.rolling = false;
});

// --- Rendu ---------------------------------------------------------------------------
// Une seule fonction construit le plateau, quel que soit le moment de la partie : les
// deux moitiés existent toujours, aux mêmes places. Ce qui change, ce sont les états
// (is-winner / is-loser) et les textes — jamais la structure, qui bougerait sous les
// doigts entre deux manches.
function desRenderBoard(opts){
  const o = opts || {};
  const body = document.getElementById('des-body');
  if(!body) return;

  function half(side){
    const p = des.players[side];
    const name = escapeHtml(p ? p.name : ('Joueur ' + (side + 1)));
    const cls = o.outcome === side ? ' is-loser' : (o.outcome != null && o.outcome !== side ? ' is-winner' : '');
    const verdict = o.verdicts && o.verdicts[side];
    return '<div class="duel-half duel-half-'+(side === 0 ? 'a' : 'b')+cls+'">'+
      (side === 1 ? '' : '<div class="duel-name">'+name+'</div>')+
      desDieHTML(side)+
      '<div class="duel-value'+(o.showValues ? ' shown' : '')+'" id="duel-value-'+side+'">'+
        (o.showValues ? des.values[side] : '')+'</div>'+
      '<div class="duel-verdict'+(verdict ? ' shown' : '')+'">'+
        (verdict ? (verdict.sub ? '<div class="duel-verdict-sub">'+verdict.sub+'</div>' : '')+
                   '<div class="duel-verdict-main">'+verdict.main+'</div>' : '')+
      '</div>'+
      (side === 1 ? '<div class="duel-name">'+name+'</div>' : '')+
    '</div>';
  }

  body.className = 'duel' + (o.phase === 'result' ? ' is-result' : '') + (o.phase === 'tie' ? ' is-tie' : '');
  body.innerHTML =
    half(0)+
    '<div class="duel-seam">'+
      '<div class="duel-seam-line"></div>'+
      '<div class="duel-seam-mark">'+(o.seam || '&times;')+'</div>'+
      '<div class="duel-seam-note" id="duel-seam-note">'+(o.note || '')+'</div>'+
      '<div class="duel-seam-line"></div>'+
    '</div>'+
    half(1);

  // Les dés sont posés sur leur face courante sans transition : au (re)dessin, on ne
  // rejoue pas un lancer qui n'a pas eu lieu.
  [0,1].forEach(side=>{
    const die = document.getElementById('die-' + side);
    if(die) die.style.transform = desFaceTransform(o.showValues ? des.values[side] : 1, 0);
  });

  desRenderFooter(o.phase);
}

function desRenderFooter(phase){
  const footer = document.getElementById('des-footer');
  if(!footer) return;
  const enCours = (phase === 'rolling' || phase === 'tie');
  const label = enCours
    ? (phase === 'tie' ? 'Double — on relance' : 'Les dés roulent…')
    : (phase === 'result' ? 'Relancer les dés' : 'Lancer les dés');
  footer.innerHTML =
    '<div class="footer-main">'+
      '<button class="ctrl ctrl-primary'+(enCours ? ' is-waiting' : '')+'" '+
        (enCours ? 'disabled' : 'onclick="desRoll()"')+'>'+label+'</button>'+
    '</div>'+
    '<div class="footer-main">'+
      '<button class="ctrl" onclick="desQuit()">Quitter</button>'+
    '</div>';
}

// Message posé dans la couture centrale, entre les deux dés : c'est là que se joue la
// comparaison, donc là qu'on explique ce qui vient de se passer.
function desSetSeamNote(text){
  const el = document.getElementById('duel-seam-note');
  if(el) el.textContent = text;
}

// --- Le lancer -----------------------------------------------------------------------
function desRoll(){
  if(des.rolling) return;            // verrou anti-double-appui
  if(des.players.length !== 2) return;
  des.rolling = true;

  // Le résultat est tiré MAINTENANT : l'animation ne fait que le montrer.
  des.values = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];

  desRenderBoard({ phase:'rolling' });
  Sound.play('dice');

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 120 : 1050;

  [0,1].forEach(side=>{
    const die = document.getElementById('die-' + side);
    const stage = document.getElementById('die-stage-' + side);
    if(!die) return;
    if(reduced){
      die.style.transform = desFaceTransform(des.values[side], 0);
      return;
    }
    if(stage) stage.classList.add('tossing');
    // Un nombre de tours différent par dé : les deux ne retombent pas en miroir.
    const spins = side === 0 ? 3 : 4;
    // Le navigateur doit voir l'état de départ avant la nouvelle valeur, sinon il
    // n'interpole pas et le dé saute directement sur sa face.
    requestAnimationFrame(()=>{ die.style.transform = desFaceTransform(des.values[side], spins); });
  });

  desLater(()=>{
    [0,1].forEach(side=>{
      const stage = document.getElementById('die-stage-' + side);
      if(stage) stage.classList.remove('tossing');
    });
    desResolve();
  }, duration);
}

function desResolve(){
  const [a, b] = des.values;

  if(a === b){
    des.ties++;
    desRenderBoard({ phase:'tie', showValues:true, seam:'=' });
    if(navigator.vibrate) navigator.vibrate([35, 45, 35]);
    Sound.play('tick');
    // La relance est automatique (c'est la règle) : on l'annonce en clair, sinon on ne
    // comprend pas pourquoi les dés repartent tout seuls. Le verrou reste posé pendant
    // l'attente — un appui ne déclenche pas un second lancer.
    desSetSeamNote('Même face des deux côtés : personne ne boit, on relance');
    desLater(()=>{ des.rolling = false; desRoll(); }, 1500);
    return;
  }

  const loser = a < b ? 0 : 1;
  const winner = 1 - loser;
  const sips = a * b;
  const verdicts = [];
  verdicts[loser]  = { main: sips + ' gorgée' + (sips > 1 ? 's' : ''), sub:'boit' };
  verdicts[winner] = { main: 'Sauvé', sub:'' };

  desRenderBoard({ phase:'result', showValues:true, outcome:loser, verdicts, seam:'&times;' });
  if(navigator.vibrate) navigator.vibrate([70, 40, 70]);
  Sound.play('win');
  des.ties = 0;
  des.rolling = false;
}
