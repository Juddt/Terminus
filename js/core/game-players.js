// ===================================================================================
// LES JOUEURS D'UN MINI-JEU
// -----------------------------------------------------------------------------------
// Le before savait accueillir un retardataire en pleine partie ; les neuf mini-jeux,
// non : il fallait quitter et tout relancer. Ce fichier leur donne le MÊME panneau —
// même marquage, même CSS, mêmes gestes — sans dupliquer son rendu.
//
// Chaque jeu range ses joueurs à sa façon : la plupart gardent des prénoms bruts, le
// PMU garde {name, horse, bet}, l'UnderDicateur {name, role, word, alive}, le Duel de
// Dés les objets complets de la page de réglages. Un adaptateur par jeu suffit à
// masquer cette différence : lire les prénoms, en poser un nouveau, en retirer un.
//
// Ce qu'on ne fait PAS : redémarrer la partie. Un ajout ne touche ni au paquet, ni au
// tour courant, ni aux scores — le nouveau venu entre dans la rotation au tour suivant,
// parce que tous ces jeux désignent le joueur actif par `index % players.length`.
// Les jeux à rôles secrets (UnderDicateur, Pilliers) distribuent au lancement : un
// prénom ajouté en cours de manche n'a pas de rôle, il est donc annoncé comme entrant
// à la manche suivante.
// ===================================================================================

// `shape` dit ce que contient le tableau : 'name' pour des prénoms bruts, 'obj' pour
// des fiches dont `make` fabrique la forme attendue par le jeu.
const GAME_ROSTERS = {
  palmier: { get:()=>palm,   shape:'name', after:()=>palmUpdateHeader() },
  bus:     { get:()=>bus,    shape:'name',
             // Le Bus tient un score par prénom : sans entrée, le nouveau ferait NaN.
             onAdd:(n)=>{ bus.scores[n] = bus.scores[n] || 0; },
             onRemove:(n)=>{ delete bus.scores[n]; } },
  cible:   { get:()=>cible,  shape:'name', after:()=>cibleUpdateHeader() },
  purple:  { get:()=>purple, shape:'name', after:()=>purpleUpdateHeader() },
  pmu:     { get:()=>pmu,    shape:'obj', make:(n)=>({ name:n, horse:null, bet:1 }) },
  pof:     { get:()=>pof,    shape:'name' },
  des:     { get:()=>des,    shape:'obj', make:(n)=>({ name:n }) },
  und:     { get:()=>und,    shape:'obj', make:(n)=>({ name:n, role:'citoyen', word:'', alive:true }) },
  pilliers:{ get:()=>pil,    shape:'name' },
};

// L'écran ouvert quand on a appuyé sur « Joueurs » : c'est lui qui décide de
// l'adaptateur, donc du tableau que le panneau modifie.
let gamePlayersKey = null;

function gameRosterAdapter(){
  return gamePlayersKey ? GAME_ROSTERS[gamePlayersKey] : null;
}

// Bornes du catalogue : « 2-10 », « 3-20 », « 2 » pour le duel. On ne laisse pas
// dépasser ce qu'un jeu sait gérer.
function gameRosterBounds(){
  const g = GAMES.find(x => x.id === (gamePlayersKey === 'und' ? 'underdicateur' : gamePlayersKey));
  const raw = String((g && g.joueurs) || '');
  const range = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
  if(range) return { min:parseInt(range[1],10), max:parseInt(range[2],10) };
  const plus = raw.match(/(\d+)\s*\+/);
  if(plus) return { min:parseInt(plus[1],10), max:20 };
  const exact = raw.match(/^\s*(\d+)\s*$/);
  if(exact) return { min:parseInt(exact[1],10), max:parseInt(exact[1],10) };
  return { min:2, max:20 };
}

// Les prénoms affichés, quelle que soit la forme interne du tableau.
function gameRosterNames(){
  const a = gameRosterAdapter();
  if(!a) return [];
  const arr = a.get().players || [];
  return a.shape === 'name' ? arr.slice() : arr.map(p => p.name);
}

function openGamePlayers(key){
  gamePlayersKey = key;
  renderGamePlayersList();
  const field = document.getElementById('game-player-field');
  if(field) field.value = '';
  document.getElementById('game-players-sheet').classList.add('open');
}

function closeGamePlayers(){
  document.getElementById('game-players-sheet').classList.remove('open');
  const a = gameRosterAdapter();
  if(a && a.after) a.after();
  gamePlayersKey = null;
}

function renderGamePlayersList(){
  const wrap = document.getElementById('game-players-list');
  if(!wrap) return;
  const names = gameRosterNames();
  const bounds = gameRosterBounds();

  // Prénoms identiques : on autorise, on distingue par un indice — comme dans le before.
  const counts = {};
  names.forEach(n => { counts[n] = (counts[n]||0) + 1; });
  const seen = {};
  wrap.innerHTML = names.map((n, i) => {
    seen[n] = (seen[n]||0) + 1;
    const suffix = counts[n] > 1 ? ' <span class="dup-tag">'+seen[n]+'</span>' : '';
    const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    return '<div class="session-player-row" style="--pc:'+color+'">'+
      '<span class="spr-id">'+
        '<span class="spr-av">'+PLAYER_AVATARS[i % PLAYER_AVATARS.length]+'</span>'+
        '<span class="spr-name">'+escapeHtml(n)+suffix+'</span>'+
      '</span>'+
      (names.length > bounds.min
        ? '<button class="spr-remove" aria-label="Retirer '+escapeHtml(n)+'" '+
            'onclick="removeGamePlayer('+i+')">'+
            '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">'+
              '<path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" stroke-width="1.7" '+
                'stroke-linecap="round" fill="none"/>'+
            '</svg>'+
          '</button>'
        : '')+
    '</div>';
  }).join('');

  const hint = document.getElementById('game-players-hint');
  if(hint){
    hint.textContent = names.length >= bounds.max
      ? names.length + ' joueurs · maximum atteint'
      : names.length + ' joueur' + (names.length > 1 ? 's' : '');
  }
  const btn = document.getElementById('game-player-add');
  if(btn) btn.disabled = names.length >= bounds.max;
}

function addGamePlayer(){
  const a = gameRosterAdapter();
  const field = document.getElementById('game-player-field');
  if(!a || !field) return;
  const name = field.value.trim();
  if(!name) return;
  if(gameRosterNames().length >= gameRosterBounds().max) return;

  const st = a.get();
  st.players.push(a.shape === 'name' ? name : a.make(name));
  if(a.onAdd) a.onAdd(name);
  // Le champ reste ouvert et vide : on enchaîne plusieurs prénoms d'affilée.
  field.value = '';
  if(field.focus) field.focus();
  Sound.play('tick');
  renderGamePlayersList();
}

function removeGamePlayer(idx){
  const a = gameRosterAdapter();
  if(!a) return;
  const names = gameRosterNames();
  if(names.length <= gameRosterBounds().min) return;

  const st = a.get();
  const name = names[idx];
  st.players.splice(idx, 1);
  if(a.onRemove) a.onRemove(name);
  // Le tour courant ne doit pas sauter à cause d'un retrait en amont : on recule d'un
  // cran si le joueur retiré se trouvait avant celui qui joue.
  if(typeof st.currentIdx === 'number' && idx < st.currentIdx) st.currentIdx--;
  Sound.play('tick');
  renderGamePlayersList();
}
