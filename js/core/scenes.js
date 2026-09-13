// ---------------------------------------------------------------------------------
// SCÈNES DU MODE BEFORE
// ---------------------------------------------------------------------------------
// Remplace l'ancien « grand ticket » unique (un rectangle coloré contenant un titre et
// un texte, identique pour tous les types de moments) par une scène qui se recompose à
// chaque activité, plus un parcours de progression.
//
// Principes appliqués ici :
//  - Pendant une manche, l'activité occupe l'écran : pas de rectangle qui l'encadre.
//    Les éléments (prénom, consigne, zones interactives) sont posés directement sur le
//    fond et apparaissent dans un ordre qui aide à comprendre (voir --d, le délai
//    d'entrée de chaque élément).
//  - Entre deux manches, le parcours passe brièvement au premier plan (classe
//    .travelling sur #progress-path) : on quitte une étape, on avance, la suivante se
//    révèle. Aucun clic supplémentaire, ~620 ms, et court-circuité si l'utilisateur a
//    demandé la réduction des animations.
//  - Le parcours ne montre JAMAIS la nature des étapes à venir : les jalons futurs sont
//    des points neutres. Le moteur tire son contenu au fil de l'eau (voir
//    buildStructuredQueue) et une partie de la file peut encore changer, donc annoncer
//    « duel ici, surprise là » serait mentir au joueur.
//
// Le moteur (session-engine.js) n'est pas modifié dans sa logique : il appelle toujours
// renderItem(eyebrow, text, players, seconds), qui délègue désormais ici.

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- CHEMIN DE PROGRESSION (décor d'arrière-plan) -----------------------------------
// Remplace la barre horizontale par un tracé vertical sinueux qui monte au fil de la
// soirée. C'est un DÉCOR, pas un écran de sélection : aucun jalon n'est cliquable, rien
// n'est verrouillé, rien ne se collectionne, et le conteneur est en pointer-events:none
// pour ne jamais capter un geste destiné à la scène.
//
// L'avancement suit le temps réellement joué (globalSecondsLeft / globalSecondsTotal).
// Comme tickGlobal ne décrémente pas quand state.paused est vrai, les pauses sont
// naturellement exclues, et une reprise de session retrouve la bonne position puisque
// globalSecondsLeft fait partie de la snapshot.

// Tracé en coordonnées SVG (viewBox 0 0 100 420) : il serpente d'un bord à l'autre en
// restant sur les côtés, et évite la bande centrale où se trouvent les consignes.
const TRAIL_D = 'M 78 420 C 78 384, 22 372, 22 336 C 22 300, 80 292, 80 256 C 80 220, 20 212, 20 176 C 20 140, 78 132, 78 96 C 78 60, 24 52, 24 16 C 24 4, 26 -2, 26 -12';

function buildTrail(){
  const wrap = document.getElementById('trail');
  if(!wrap || wrap.dataset.built) return;
  wrap.innerHTML =
    '<svg class="trail-svg" viewBox="0 0 100 420" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">'+
      '<defs>'+
        '<linearGradient id="trailDone" x1="0" y1="1" x2="0" y2="0">'+
          '<stop offset="0" stop-color="#E8FF3D" stop-opacity="0.10"/>'+
          '<stop offset="0.75" stop-color="#E8FF3D" stop-opacity="0.55"/>'+
          '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0.85"/>'+
        '</linearGradient>'+
        '<filter id="trailBlur" x="-60%" y="-20%" width="220%" height="140%">'+
          '<feGaussianBlur stdDeviation="3.2"/>'+
        '</filter>'+
      '</defs>'+
      '<g id="trail-shift">'+
        '<path class="trail-todo" d="'+TRAIL_D+'"/>'+
        '<path class="trail-done-glow" id="trail-done-glow" d="'+TRAIL_D+'" filter="url(#trailBlur)"/>'+
        '<path class="trail-done" id="trail-done" d="'+TRAIL_D+'"/>'+
        '<g id="trail-marks"></g>'+
        '<g id="trail-head"><circle class="trail-head-halo" r="9"/><circle class="trail-head-core" r="3.2"/></g>'+
      '</g>'+
    '</svg>';
  wrap.dataset.built = '1';
}

function renderProgressPath(){
  const wrap = document.getElementById('trail');
  if(!wrap) return;
  buildTrail();
  const total = state.globalSecondsTotal || 1;
  const left = Math.max(0, Math.min(total, state.globalSecondsLeft));
  const ratio = (total - left) / total;

  // Le temps restant est mis à jour en premier : il ne doit pas dépendre de la
  // disponibilité du tracé SVG (getTotalLength n'existe pas tant que le path n'est pas
  // mesurable, ce qui gelait l'affichage du temps).
  const mins0 = Math.floor(left / 60), secs0 = left % 60;
  const remaining0 = document.getElementById('trail-remaining');
  if(remaining0) remaining0.textContent = (mins0 > 0 ? mins0 + ' min' : secs0 + ' s') + ' restantes';
  wrap.classList.toggle('near-end', left <= 60);

  const pathEl = document.getElementById('trail-done');
  if(!pathEl || !pathEl.getTotalLength) return;

  const len = pathEl.getTotalLength();
  // Le tracé est dessiné depuis le BAS : on dévoile la portion parcourue en réduisant
  // l'offset du pointillé, ce qui fait « monter » la lumière.
  [pathEl, document.getElementById('trail-done-glow')].forEach(el=>{
    if(!el) return;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len * (1 - ratio);
  });

  // Jalons discrets : de simples entailles perpendiculaires au tracé, pas des pastilles.
  const marks = document.getElementById('trail-marks');
  if(marks && !marks.dataset.built){
    let html = '';
    for(let i=1; i<=5; i++){
      const p = pathEl.getPointAtLength(len * (i/6));
      html += '<circle class="trail-mark" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="1.7"/>';
    }
    marks.innerHTML = html;
    marks.dataset.built = '1';
  }

  // Repère lumineux : notre position exacte sur le tracé.
  const head = document.getElementById('trail-head');
  if(head){
    const p = pathEl.getPointAtLength(len * ratio);
    head.setAttribute('transform', 'translate('+p.x.toFixed(2)+' '+p.y.toFixed(2)+')');
  }

  // Déplacement doux du décor : le tracé glisse vers le bas à mesure qu'on avance, ce
  // qui donne la sensation de monter sans jamais faire défiler la page.
  const shift = document.getElementById('trail-shift');
  if(shift && !REDUCED_MOTION) shift.setAttribute('transform', 'translate(0 '+(ratio*86).toFixed(1)+')');

}

// Avancée légère du chemin au changement de manche, puis arrivée du contenu.
function playPathTransition(){
  const wrap = document.getElementById('trail');
  if(!wrap || REDUCED_MOTION) return 0;
  wrap.classList.add('advancing');
  setTimeout(()=> wrap.classList.remove('advancing'), 560);
  return 300;
}

// --- Compositions ------------------------------------------------------------------
// Chaque moment choisit sa composition. Le type est déduit du libellé fourni par le
// moteur, avec un cas particulier : un moment à deux joueurs devient un DUEL, quel que
// soit son libellé d'origine (défi ou mini-jeu), parce que l'opposition est ce qui
// structure la scène.
// Marqueurs de mécanique réelle. Deux joueurs ne font pas un duel : « fais une
// déclaration dramatique à {p2} » est une action ADRESSÉE (un acteur, un destinataire),
// pas un affrontement — y afficher un « VS » serait trompeur.
const DUEL_RE = /duel|affronte|contre |bras de fer|plus vite que|le premier des deux|celui qui perd|pierre.feuille|qui c\u00e8de|d\u00e9fie/i;
const COOP_RE = /ensemble|\u00e0 deux|en bin\u00f4me|coop\u00e8re|tous les deux|\u00e0 tour de r\u00f4le avec/i;
const GROUP_RE = /tout le monde|le groupe|chacun|chaque joueur|tous ceux/i;

function pickSceneKind(eyebrow, players, text){
  if(eyebrow === 'Nouvelle r\u00e8gle') return 'regle';
  if(eyebrow === 'Question') return 'vote';
  if(eyebrow === 'Moment') return 'surprise';
  const t = text || '';
  if(players && players.length === 2){
    if(DUEL_RE.test(t)) return 'duel';       // opposition r\u00e9elle
    if(COOP_RE.test(t)) return 'coop';       // deux joueurs associ\u00e9s
    return 'adresse';                         // acteur \u2192 destinataire (cas le plus courant)
  }
  if((!players || !players.length) && GROUP_RE.test(t)) return 'collectif';
  return 'defi';
}

// Les prénoms figurent déjà en grand au-dessus de la consigne : les répéter dans la
// phrase alourdit la lecture. On les remplace par un pronom court quand la phrase
// commence par eux, sinon on les laisse (retirer un prénom en milieu de phrase casserait
// la grammaire).
function stripNames(html, players){
  let out = html;
  players.forEach((p,i)=>{
    const n = escapeHtml(p.name);
    if(i === 0) out = out.replace(new RegExp('^'+n+',?\\s*', 'i'), '');
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function playerChip(p, size){
  return '<span class="scene-avatar '+(size||'')+'" style="background:'+p.color+'">'+(p.avatar||'')+'</span>';
}

// Taille de consigne adaptée à sa longueur : une phrase courte claque en très gros,
// une phrase longue passe en corps intermédiaire plutôt que d'occuper huit lignes en
// énormes caractères.
function instructionClass(text){
  const n = (text || '').length;
  if(n <= 42) return 'scene-instruction xl';
  if(n <= 95) return 'scene-instruction lg';
  return 'scene-instruction md';
}

function buildSceneHTML(kind, text, players){
  const safe = escapeHtml(soberize(text));

  if(kind === 'duel' || kind === 'coop' || kind === 'adresse'){
    const a = players[0], b = players[1];
    // Le connecteur central dit la nature du lien : affrontement, coop\u00e9ration, ou
    // action adress\u00e9e (fl\u00e8che orient\u00e9e de l'acteur vers le destinataire).
    const link = kind === 'duel' ? '<span>VS</span>'
               : kind === 'coop' ? '<span class="link-amp">&amp;</span>'
               : '<span class="link-arrow">\u2192</span>';
    const roleA = kind === 'adresse' ? '<div class="duel-role">agit</div>' : '';
    const roleB = kind === 'adresse' ? '<div class="duel-role">destinataire</div>' : '';
    return ''+
      '<div class="scene-duel" data-link="'+kind+'">'+
        '<div class="duel-side duel-a" style="--d:.05s">'+
          playerChip(a,'big')+'<div class="duel-name">'+escapeHtml(a.name)+'</div>'+roleA+
        '</div>'+
        '<div class="duel-vs" style="--d:.18s">'+link+'</div>'+
        '<div class="duel-side duel-b" style="--d:.11s">'+
          playerChip(b,'big')+'<div class="duel-name">'+escapeHtml(b.name)+'</div>'+roleB+
        '</div>'+
      '</div>'+
      '<div class="'+instructionClass(text)+'" style="--d:.30s">'+stripNames(safe, players)+'</div>';
  }

  if(kind === 'collectif'){
    const heads = state.players.slice(0,8).map((p,i)=>
      '<span class="group-chip" style="--d:'+(0.06 + i*0.03)+'s">'+playerChip(p)+'</span>').join('');
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Tout le groupe</div>'+
      '<div class="group-ring" style="--d:.06s">'+heads+'</div>'+
      '<div class="scene-instruction big" style="--d:.24s">'+safe+'</div>';
  }

  if(kind === 'vote'){
    // Zones tactiles : un bloc par joueur. Le groupe désigne, puis on révèle d'un coup
    // (scene-vote-reveal) — la révélation est collective, pas un décompte individuel.
    const zones = state.players.map((p,i)=>
      '<button class="vote-zone" style="--d:'+(0.14 + i*0.035)+'s" onclick="voteFor('+i+')">'+
        playerChip(p)+'<span class="vote-zone-name">'+escapeHtml(p.name)+'</span>'+
      '</button>'
    ).join('');
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Le groupe tranche</div>'+
      '<div class="scene-question" style="--d:.08s">'+safe+'</div>'+
      '<div class="vote-zones" id="vote-zones">'+zones+'</div>'+
      '<div class="scene-vote-reveal" id="vote-reveal"></div>';
  }

  if(kind === 'regle'){
    // Annonce lisible à son rythme : pas de minuteur qui tourne pendant la lecture, et
    // une validation explicite qui range ensuite la règle dans le bouton « Règles ».
    return ''+
      '<div class="scene-rule">'+
        '<div class="rule-flash" style="--d:.02s">Nouvelle règle</div>'+
        '<div class="rule-text" style="--d:.14s">'+safe+'</div>'+
        '<div class="rule-hint" style="--d:.30s">Elle reste active jusqu\'à la fin</div>'+
      '</div>';
  }

  if(kind === 'surprise'){
    return ''+
      '<div class="scene-surprise">'+
        '<div class="surprise-burst" style="--d:.02s"></div>'+
        '<div class="scene-kicker light" style="--d:.16s">Surprise</div>'+
        '<div class="'+instructionClass(text)+'" style="--d:.24s">'+safe+'</div>'+
      '</div>';
  }

  // Défi express : prénom au premier plan, consigne juste dessous.
  const who = players && players.length
    ? '<div class="scene-who" style="--d:.05s">'+playerChip(players[0],'big')+
      '<div class="scene-who-name">'+escapeHtml(players[0].name)+'</div></div>'
    : '<div class="scene-kicker" style="--d:.05s">Tout le monde</div>';
  // Le prénom est déjà en grand au-dessus : on ne le répète pas dans la consigne.
  const body = players && players.length ? stripNames(safe, players) : safe;
  return who + '<div class="'+instructionClass(text)+'" style="--d:.20s">'+body+'</div>';
}

// Point d'entrée appelé par le moteur à chaque nouvelle activité.
function renderScene(eyebrow, text, players, seconds){
  const kind = pickSceneKind(eyebrow, players, text);
  const screen = document.getElementById('screen-main');
  const scene = document.getElementById('scene');
  screen.dataset.type = EYEBROW_TO_TYPE[eyebrow] || 'defi';
  screen.dataset.scene = kind;

  state.sceneKind = kind;
  const delay = playPathTransition();
  setTimeout(()=>{
    scene.innerHTML = buildSceneHTML(kind, text, players);
    scene.classList.remove('entering');
    void scene.offsetWidth; // force le redémarrage de l'animation d'entrée
    scene.classList.add('entering');
    renderProgressPath();
  }, delay);

  if(state.sessionMode !== 'chill' && kind === 'duel' && navigator.vibrate) navigator.vibrate([30,40,30]);
  if(kind === 'surprise' && window.fireConfetti && !REDUCED_MOTION) setTimeout(()=> window.fireConfetti('small'), delay + 120);
}

// Vote : marque le joueur désigné, révèle le résultat, et laisse le groupe avancer.
function voteFor(idx){
  const p = state.players[idx];
  if(!p) return;
  const zones = document.getElementById('vote-zones');
  const reveal = document.getElementById('vote-reveal');
  if(!zones || !reveal || zones.classList.contains('done')) return;
  zones.classList.add('done');
  zones.querySelectorAll('.vote-zone')[idx].classList.add('chosen');
  state.stats.targets[p.name] = (state.stats.targets[p.name]||0) + 1;
  reveal.innerHTML = '<span class="vote-reveal-name">'+escapeHtml(p.name)+'</span><span class="vote-reveal-tag">désigné·e par le groupe</span>';
  reveal.classList.add('shown');
  Sound.play('ding');
  saveSessionSnapshot();
}
