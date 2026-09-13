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
// Le chemin est le SEUL indicateur de progression globale : le temps restant n'est plus
// écrit nulle part. C'est un décor — rien n'y est cliquable, rien ne s'y collectionne, et
// le conteneur est en pointer-events:none pour ne jamais capter un geste de la scène.
//
// Trois choses sont tenues séparées, et c'est le point important :
//
//   1. LA PROGRESSION RÉELLE — `Trail.progress`, dérivée du temps activement joué
//      (globalSecondsLeft / globalSecondsTotal). tickGlobal ne décrémente pas pendant une
//      pause, donc les pauses n'avancent pas le chemin ; globalSecondsLeft fait partie de
//      la snapshot, donc une reprise retrouve exactement la position enregistrée.
//      Elle est MONOTONE : setProgress refuse tout recul (voir le garde-fou), ce qui rend
//      structurellement impossible le « saut en arrière » observé auparavant.
//
//   2. LE DÉPLACEMENT DU DÉCOR — la translation de #trail-world. Le repère reste à
//      hauteur fixe à l'écran (HEAD_SCREEN_Y) et c'est le paysage qui descend : on a la
//      sensation de monter, sans jamais faire défiler la page, et le mouvement est
//      continu (une transition linéaire d'une seconde, calée sur le tic du moteur).
//
//   3. LES EFFETS DE CATÉGORIE — Trail.signal(kind), de brèves signatures lumineuses.
//      Elles n'écrivent JAMAIS ni sur 1 ni sur 2 : changer de catégorie ne peut donc pas
//      faire sauter, reculer ou réinitialiser la progression.
//
// Le tracé lui-même est construit UNE SEULE FOIS par session (Trail.mount est idempotent,
// Trail.reset ne le reconstruit pas) : il n'est pas recréé à chaque manche.

// Géométrie, en unités SVG. La zone visible fait TRAIL_VIEW (100 × 200) ; le tracé
// complet est bien plus haut (TRAIL_SPAN) et défile au travers.
const TRAIL_VIEW_W = 100, TRAIL_VIEW_H = 200;
const TRAIL_BOTTOM = 560;   // y du départ, tout en bas du tracé
const TRAIL_TOP    = -20;   // y de l'arrivée, au-delà du haut
const TRAIL_SPAN   = TRAIL_BOTTOM - TRAIL_TOP;
const HEAD_SCREEN_Y = 150;  // hauteur du repère à l'écran : sous la bande de lecture
                            // atténuée, au-dessus des commandes — il reste visible sans
                            // jamais concurrencer la consigne.

// Serpentin régulier : il reste sur les côtés et traverse peu la bande centrale, où se
// trouvent les consignes.
const TRAIL_D = (function(){
  let d = 'M 74 ' + TRAIL_BOTTOM;
  let y = TRAIL_BOTTOM, left = true;
  while(y > TRAIL_TOP){
    const ny = y - 70;
    const x  = left ? 26 : 74;
    d += ' C ' + (left ? 74 : 26) + ' ' + (y - 34) + ', ' + x + ' ' + (ny + 34) + ', ' + x + ' ' + ny;
    y = ny; left = !left;
  }
  return d;
})();

const Trail = {
  progress: 0,
  built: false,
  frozen: false,
  _len: 0,
  _signalTimer: null,

  el(){ return document.getElementById('trail'); },

  // Construit le tracé. Idempotent : appelé à chaque rendu de scène sans rien recréer.
  mount(){
    const wrap = this.el();
    if(!wrap) return false;
    if(this.built && wrap.dataset.built === '1') return true;
    wrap.innerHTML =
      '<svg class="trail-svg" viewBox="0 0 '+TRAIL_VIEW_W+' '+TRAIL_VIEW_H+'" '+
           'preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'+
        '<g id="trail-world">'+
          '<path class="trail-todo" d="'+TRAIL_D+'"/>'+
          '<path class="trail-done-glow" id="trail-done-glow" d="'+TRAIL_D+'"/>'+
          '<path class="trail-done" id="trail-done" d="'+TRAIL_D+'"/>'+
          '<path class="fx fx-impulse" id="fx-impulse" d="'+TRAIL_D+'"/>'+
          '<g id="trail-marks"></g>'+
          '<g id="trail-finish" transform="translate(0 '+TRAIL_TOP+')">'+
            '<circle class="trail-finish-glow" id="trail-finish-glow" cx="74" cy="0" r="16"/>'+
            '<path class="trail-finish" d="M 58 0 L 90 0"/>'+
          '</g>'+
          '<g id="trail-head">'+
            '<circle class="fx fx-wide" id="fx-wide" r="30"/>'+
            '<circle class="fx fx-calm" id="fx-calm" r="17"/>'+
            '<circle class="fx fx-spark" id="fx-spark" r="13"/>'+
            '<circle class="fx fx-duel fx-duel-a" id="fx-duel-a" r="5"/>'+
            '<circle class="fx fx-duel fx-duel-b" id="fx-duel-b" r="5"/>'+
            '<circle class="trail-head-halo" r="9"/>'+
            '<circle class="trail-head-core" r="3.1"/>'+
          '</g>'+
        '</g>'+
      '</svg>';
    wrap.dataset.built = '1';
    this.built = true;

    const path = document.getElementById('trail-done');
    this._len = (path && path.getTotalLength) ? path.getTotalLength() : 0;

    if(this._len){
      // Jalons discrets, posés une fois pour toutes.
      const marks = document.getElementById('trail-marks');
      let html = '';
      for(let k=1; k<=7; k++){
        const pt = path.getPointAtLength(this._len * (k/8));
        html += '<circle class="trail-mark" cx="'+pt.x.toFixed(1)+'" cy="'+pt.y.toFixed(1)+'" r="1.6"/>';
      }
      if(marks) marks.innerHTML = html;
      // L'impulsion du défi est un court segment qui parcourt le tracé : on lui donne
      // un pointillé « un tiret puis du vide » et on anime son décalage.
      const imp = document.getElementById('fx-impulse');
      if(imp){
        imp.style.strokeDasharray = '40 ' + this._len;
        imp.style.setProperty('--imp-len', this._len);
      }
    }
    this.apply();
    return true;
  },

  // Progression réelle. Monotone par construction : `force` n'est utilisé que par reset().
  setProgress(ratio, force){
    const r = Math.max(0, Math.min(1, ratio || 0));
    if(!force && r < this.progress) return;   // jamais de recul
    this.progress = r;
    this.apply();
  },

  // Écrit la progression et le déplacement du décor dans le SVG. Ne touche à aucun effet.
  apply(){
    const wrap = this.el();
    if(!wrap || !this.built) return;
    const p = this.progress;

    // Portion parcourue : on dévoile le tracé depuis le bas.
    if(this._len){
      const off = this._len * (1 - p);
      ['trail-done','trail-done-glow'].forEach(id=>{
        const el = document.getElementById(id);
        if(!el) return;
        el.style.strokeDasharray = this._len;
        el.style.strokeDashoffset = off;
      });
      const head = document.getElementById('trail-head');
      if(head){
        const pt = document.getElementById('trail-done').getPointAtLength(this._len * p);
        head.setAttribute('transform', 'translate('+pt.x.toFixed(2)+' '+pt.y.toFixed(2)+')');
      }
    }

    // Déplacement du décor : le monde descend, le repère reste à hauteur constante.
    const world = document.getElementById('trail-world');
    if(world){
      const headY = TRAIL_BOTTOM - p * TRAIL_SPAN;
      const ty = REDUCED_MOTION ? 0 : (HEAD_SCREEN_Y - headY);
      world.setAttribute('transform', 'translate(0 '+ty.toFixed(2)+')');
    }

    // L'arrivée s'allume sur la fin, une fois, sans changer la couleur de tout le tracé.
    wrap.classList.toggle('near-end', p >= 0.94);
  },

  // Signature de catégorie : brève, non répétée, sans effet sur la progression.
  signal(kind){
    const wrap = this.el();
    if(!wrap || !kind) return;
    clearTimeout(this._signalTimer);
    wrap.removeAttribute('data-signal');
    // Un reflow force le redémarrage de l'animation même si la même signature revient.
    void wrap.offsetWidth;
    wrap.setAttribute('data-signal', kind);
    this._signalTimer = setTimeout(()=>{
      // Retirer l'attribut garantit qu'aucun effet ne reste affiché en permanence.
      if(wrap.getAttribute('data-signal') === kind) wrap.removeAttribute('data-signal');
    }, kind === 'regle' || kind === 'finale' ? 1700 : 1300);
  },

  // Pause : la progression est figée telle quelle, sans transition qui « rattrape »
  // au retour. La reprise repart de la position enregistrée.
  freeze(){ this.frozen = true; const w = this.el(); if(w) w.classList.add('frozen'); },
  unfreeze(){
    this.frozen = false;
    const w = this.el();
    if(!w) return;
    this.apply();
    // On rend la transition après avoir réappliqué la position : pas de glissement.
    requestAnimationFrame(()=> w.classList.remove('frozen'));
  },

  // Nouvelle soirée : seule occasion où la progression revient à zéro.
  reset(){
    const w = this.el();
    if(w) w.classList.add('frozen');
    this.setProgress(0, true);
    if(w){ w.removeAttribute('data-signal'); requestAnimationFrame(()=> w.classList.remove('frozen')); }
  }
};
window.Trail = Trail;

// Appelé chaque seconde par tickGlobal, et à chaque nouvelle scène. Ne fait plus qu'une
// chose : convertir le temps joué en progression. Tout le reste vit dans Trail.
function renderProgressPath(){
  if(!Trail.mount()) return;
  const total = state.globalSecondsTotal || 1;
  const left = Math.max(0, Math.min(total, state.globalSecondsLeft));
  Trail.setProgress((total - left) / total);
}

// Correspondance scène → signature lumineuse. Le vote reçoit sa confirmation plus tard,
// à la révélation (voir voteFor) : ici, seulement l'éclairage calme.
const SCENE_SIGNAL = {
  defi:'defi', duel:'duel', vote:'vote', regle:'regle',
  surprise:'surprise', collectif:'collectif', coop:'collectif', adresse:'defi'
};

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

// Chaque famille ajoutée a sa propre composition : ce sont des mécaniques différentes,
// pas des défis déguisés. L'ordre compte — le libellé tranche avant l'analyse du texte.
const EYEBROW_TO_SCENE = {
  'Nouvelle r\u00e8gle':'regle', 'Question':'vote', 'Moment':'surprise', 'Mini-jeu':'minijeu',
  'Quiz':'quiz', 'Dilemme':'dilemme', 'Mission secr\u00e8te':'mission',
  'Pr\u00e9diction':'prediction', 'Destins li\u00e9s':'destin', 'Barman':'barman',
  'Tribunal':'tribunal', 'Roulette':'roulette', 'R\u00e8gle lev\u00e9e':'levee',
  'Mission \u2014 verdict':'rappel', 'Pr\u00e9diction \u2014 verdict':'rappel'
};

function pickSceneKind(eyebrow, players, text){
  if(EYEBROW_TO_SCENE[eyebrow]) return EYEBROW_TO_SCENE[eyebrow];
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
// phrase alourdit la lecture. On retire donc l'adresse qui ouvre la phrase — mais
// seulement l'ouverture : un prénom en milieu de phrase (« fais rire Marie sans la
// toucher ») porte la grammaire et doit rester.
//
// Deux formes existent dans le contenu, et les confondre cassait la phrase :
//   « {p1}, fais rire {p2} »            -> « Fais rire Marie »                  (un acteur)
//   « {p1} et {p2} : bras de fer »      -> « Bras de fer »                      (les deux)
// Sur la seconde forme, ne retirer que le premier prénom laissait un « Et Marie : bras
// de fer » agrammatical à l'écran, alors que la scène affiche déjà les deux prénoms.
function stripNames(html, players){
  let out = html;
  if(!players || !players.length) return out;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const n1 = esc(escapeHtml(players[0].name));

  if(players.length >= 2){
    const n2 = esc(escapeHtml(players[1].name));
    // Seulement une CONJONCTION explicite (« X et Y », « X & Y ») : la virgule est
    // ambiguë — « Marie, Tom te pose une question » adresse la phrase à Marie et garde
    // Tom comme sujet, retirer les deux donnerait « Te pose une question ».
    const both = new RegExp('^'+n1+'\\s*(?:et|&amp;|&)\\s+'+n2+'\\s*[,:\u2014-]?\\s*', 'i');
    if(both.test(out)) out = out.replace(both, '');
    else out = out.replace(new RegExp('^'+n1+'\\s*[,:]?\\s*', 'i'), '');
  } else {
    out = out.replace(new RegExp('^'+n1+'\\s*[,:]?\\s*', 'i'), '');
  }
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

  const meta = state.itemMeta || {};

  // MINI-JEU — une règle du jeu à appliquer ensemble, pas une consigne à exécuter.
  // Sa composition est volontairement distincte de celle du défi : sans elle, une
  // série de quatre manches se ressemblait trait pour trait à l'écran.
  if(kind === 'minijeu'){
    const who = players && players.length
      ? '<div class="mini-players" style="--d:.06s">'+
          players.map(p => '<span class="mini-player">'+playerChip(p)+
            '<span class="mini-player-name">'+escapeHtml(p.name)+'</span></span>').join('')+
        '</div>'
      : '<div class="mini-all" style="--d:.06s">'+
          state.players.slice(0,8).map((p,i) =>
            '<span class="group-chip" style="--d:'+(0.06 + i*0.03)+'s">'+playerChip(p)+'</span>').join('')+
        '</div>';
    return ''+
      '<div class="mini-badge" style="--d:.02s">Mini-jeu</div>'+
      who+
      '<div class="'+instructionClass(text)+'" style="--d:.22s">'+
        (players && players.length ? stripNames(safe, players) : safe)+'</div>';
  }

  // QUIZ — la question d'abord, la réponse seulement après que le groupe a tranché.
  if(kind === 'quiz'){
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Quiz</div>'+
      '<div class="scene-question" style="--d:.08s">'+safe+'</div>'+
      '<div class="quiz-answer" id="quiz-answer" style="--d:.20s">'+
        '<div class="quiz-answer-label">La r\u00e9ponse</div>'+
        '<div class="quiz-answer-text">'+escapeHtml(soberize(meta.answer || ''))+'</div>'+
      '</div>';
  }

  // DILEMME — deux camps, un choix, et la minorité qui s'explique.
  if(kind === 'dilemme'){
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Il faut choisir</div>'+
      '<div class="dilemme" style="--d:.10s">'+
        '<div class="dilemme-side"><span class="dilemme-letter">A</span>'+
          '<span class="dilemme-text">'+escapeHtml(soberize(meta.optionA || safe))+'</span></div>'+
        '<div class="dilemme-or">ou</div>'+
        '<div class="dilemme-side"><span class="dilemme-letter">B</span>'+
          '<span class="dilemme-text">'+escapeHtml(soberize(meta.optionB || ''))+'</span></div>'+
      '</div>'+
      '<div class="scene-hint" style="--d:.28s">Tout le monde choisit en m\u00eame temps. La minorit\u00e9 explique.</div>';
  }

  // MISSION SECRÈTE — consultation privée : le voisin ne doit rien pouvoir lire.
  if(kind === 'mission'){
    const who = players && players.length ? players[0] : null;
    if(meta.recall){
      return ''+
        '<div class="scene-kicker light" style="--d:.02s">Mission termin\u00e9e</div>'+
        (who ? '<div class="scene-who" style="--d:.06s">'+playerChip(who,'big')+
               '<div class="scene-who-name">'+escapeHtml(who.name)+'</div></div>' : '')+
        '<div class="'+instructionClass(text)+'" style="--d:.20s">'+safe+'</div>'+
        '<div class="scene-hint" style="--d:.30s">Quelqu\'un avait remarqu\u00e9&nbsp;?</div>';
    }
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Mission secr\u00e8te</div>'+
      (who ? '<div class="mission-who" style="--d:.06s">Pour '+escapeHtml(who.name)+' seulement</div>' : '')+
      secretHTML('<div class="mission-text">'+safe+'</div>',
        { id:'scene-secret', hint:'Maintiens pour lire ta mission' })+
      '<div class="scene-hint" style="--d:.34s">Personne d\'autre ne doit la conna\u00eetre.</div>';
  }

  // PRÉDICTION — une affirmation posée maintenant, vérifiée plus tard.
  if(kind === 'prediction'){
    const who = players && players.length ? players[0] : null;
    return ''+
      '<div class="scene-kicker" style="--d:.02s">'+(meta.recall ? 'Alors, cette pr\u00e9diction\u00a0?' : 'Pr\u00e9diction')+'</div>'+
      (who ? '<div class="scene-who" style="--d:.06s">'+playerChip(who,'big')+
             '<div class="scene-who-name">'+escapeHtml(who.name)+'</div></div>' : '')+
      '<div class="'+instructionClass(text)+'" style="--d:.20s">'+stripNames(safe, players || [])+'</div>'+
      '<div class="scene-hint" style="--d:.30s">'+
        (meta.recall ? 'Le groupe tranche\u00a0: vu juste, ou pas du tout\u00a0?'
                     : 'On y reviendra tout \u00e0 l\'heure.')+'</div>';
  }

  // DESTINS LIÉS — deux joueurs attachés l'un à l'autre.
  if(kind === 'destin' && players && players.length >= 2){
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Destins li\u00e9s</div>'+
      '<div class="scene-duel" data-link="destin">'+
        '<div class="duel-side" style="--d:.06s">'+playerChip(players[0],'big')+
          '<div class="duel-name">'+escapeHtml(players[0].name)+'</div></div>'+
        '<div class="duel-vs destin-link" style="--d:.16s"><span>&amp;</span></div>'+
        '<div class="duel-side" style="--d:.10s">'+playerChip(players[1],'big')+
          '<div class="duel-name">'+escapeHtml(players[1].name)+'</div></div>'+
      '</div>'+
      '<div class="destin-bond" style="--d:.24s">Leurs destins sont li\u00e9s</div>'+
      '<div class="'+instructionClass(text)+'" style="--d:.30s">'+safe+'</div>';
  }

  // BARMAN — une création collective, autour d'une personne.
  if(kind === 'barman'){
    const who = players && players.length ? players[0] : null;
    return ''+
      '<div class="barman-badge" style="--d:.02s">Le barman</div>'+
      (who ? '<div class="scene-who" style="--d:.08s">'+playerChip(who,'big')+
             '<div class="scene-who-name">'+escapeHtml(who.name)+'</div></div>' : '')+
      '<div class="'+instructionClass(text)+'" style="--d:.22s">'+stripNames(safe, players || [])+'</div>'+
      '<div class="scene-hint" style="--d:.32s">Le groupe fabrique, le barman assume.</div>';
  }

  // TRIBUNAL — l'accusé face au groupe.
  if(kind === 'tribunal'){
    const who = players && players.length ? players[0] : null;
    const jury = state.players.filter(p => !who || p.name !== who.name).slice(0,8)
      .map((p,i) => '<span class="group-chip" style="--d:'+(0.20 + i*0.03)+'s">'+playerChip(p)+'</span>').join('');
    return ''+
      '<div class="tribunal-head" style="--d:.02s">Tribunal</div>'+
      (who ? '<div class="scene-who" style="--d:.06s">'+playerChip(who,'big')+
             '<div class="scene-who-name accuse">'+escapeHtml(who.name)+'</div>'+
             '<div class="tribunal-role">accus\u00e9\u00b7e</div></div>' : '')+
      '<div class="'+instructionClass(text)+'" style="--d:.20s">'+stripNames(safe, players || [])+'</div>'+
      '<div class="tribunal-jury" style="--d:.30s">'+jury+'</div>'+
      '<div class="scene-hint" style="--d:.36s">Le jury \u00e9coute, puis tranche.</div>';
  }

  // ROULETTE — le prénom est tiré À L'ÉCRAN : c'est le tirage qui fait la scène.
  if(kind === 'roulette'){
    return ''+
      '<div class="scene-kicker" style="--d:.02s">Roulette des pr\u00e9noms</div>'+
      '<div class="roulette" id="roulette"><div class="roulette-name" id="roulette-name">&nbsp;</div></div>'+
      '<div class="'+instructionClass(text)+'" style="--d:.24s" id="roulette-task">'+safe+'</div>';
  }

  // RÈGLE LEVÉE — une contrainte qui tombe se dit, elle ne disparaît pas en silence.
  if(kind === 'levee'){
    return ''+
      '<div class="scene-rule">'+
        '<div class="rule-flash lifted" style="--d:.02s">R\u00e8gle lev\u00e9e</div>'+
        '<div class="rule-text lifted" style="--d:.14s">'+safe+'</div>'+
        '<div class="rule-hint" style="--d:.30s">Elle ne s\'applique plus.</div>'+
      '</div>';
  }

  // RAPPEL générique (mission arrivée à échéance sans joueur retrouvé).
  if(kind === 'rappel'){
    return ''+
      '<div class="scene-kicker light" style="--d:.02s">On y revient</div>'+
      '<div class="'+instructionClass(text)+'" style="--d:.18s">'+safe+'</div>';
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

  scene.innerHTML = buildSceneHTML(kind, text, players);
  scene.classList.remove('entering');
  void scene.offsetWidth; // force le redémarrage de l'animation d'entrée
  scene.classList.add('entering');

  // La progression est relue (elle n'a pas changé du fait de la scène), puis la
  // catégorie pose sa signature lumineuse — deux opérations distinctes, dans cet ordre.
  renderProgressPath();
  Trail.signal(SCENE_SIGNAL[kind] || 'defi');

  if(kind === 'duel' && navigator.vibrate) navigator.vibrate([30,40,30]);
  if(kind === 'surprise' && window.fireConfetti && !REDUCED_MOTION) setTimeout(()=> window.fireConfetti('small'), 120);
}

// Ce qui doit se produire APRÈS que la scène ET ses commandes sont posées.
//
// L'ordre compte, et il a déjà piégé une fois : appelées depuis renderScene, ces
// fonctions s'exécutaient avant que renderMainFooter n'ait créé le bouton. En rythme
// normal la roulette met une seconde et demie à s'arrêter, donc le bouton existait à
// temps ; mais avec la réduction des animations elle se pose IMMÉDIATEMENT, cherchait
// un bouton pas encore né, et le bouton naissait ensuite désactivé — bloquant
// définitivement toute personne ayant activé cette préférence système.
// Elles sont donc appelées depuis renderItem, une fois les commandes en place.
function afterSceneRendered(kind){
  if(kind === 'mission' && !(state.itemMeta && state.itemMeta.recall)){
    // La mission ne se lit que sous le doigt, et on ne peut pas avancer avant.
    secretBind('scene-secret', function(){
      const b = document.getElementById('scene-main-btn');
      if(b) b.disabled = false;
    });
  }
  if(kind === 'roulette') spinRoulette();
}

// --- LA ROULETTE --------------------------------------------------------------------
// Le prénom défile puis ralentit jusqu'à s'arrêter : c'est le tirage lui-même qui fait
// la scène, pas le résultat. Le tirage est équitable — on privilégie les joueurs les
// moins sollicités (pickPlayers), et l'animation ne fait que montrer le nom déjà choisi.
function spinRoulette(){
  const el = document.getElementById('roulette-name');
  const box = document.getElementById('roulette');
  if(!el || !state.players.length) return;

  const chosen = (typeof pickPlayers === 'function' ? pickPlayers(1)[0] : null) || state.players[0];
  if(state.stats && state.stats.targets){
    state.stats.targets[chosen.name] = (state.stats.targets[chosen.name] || 0) + 1;
  }

  const land = function(){
    el.textContent = chosen.name;
    if(box) box.classList.add('landed');
    state.rouletteName = chosen.name;
    const task = document.getElementById('roulette-task');
    if(task) task.textContent = chosen.name + ' ' + task.textContent;
    const b = document.getElementById('scene-main-btn');
    if(b) b.disabled = false;
    Sound.play('ding');
    if(navigator.vibrate) navigator.vibrate([40]);
    saveSessionSnapshot();
  };

  if(REDUCED_MOTION || state.players.length === 1){ land(); return; }

  // Le défilement ralentit progressivement, comme une roue qui s'arrête.
  clearInterval(state.rouletteInterval);
  let i = 0, delay = 55, elapsed = 0;
  const tick = function(){
    el.textContent = state.players[i % state.players.length].name;
    i++;
    elapsed += delay;
    Sound.play('tick');
    if(elapsed > 1500){ clearInterval(state.rouletteInterval); land(); return; }
    if(elapsed > 900){
      delay = Math.min(240, delay * 1.35);
      clearInterval(state.rouletteInterval);
      state.rouletteInterval = setInterval(tick, delay);
    }
  };
  state.rouletteInterval = setInterval(tick, delay);
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
  Trail.signal('vote-done');
  Sound.play('ding');
  saveSessionSnapshot();
}
