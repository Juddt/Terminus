// Le paquet de 52 cartes, partagé par les jeux qui en utilisent réellement un :
// Purple, Le Bus, Le Palmier, La Cible et Le PMU.
const PALM_SUITS = ['♥','♦','♣','♠'];
const PALM_VALUES = ['A','2','3','4','5','6','7','8','9','10','V','D','R'];
function palmIsRed(s){ return s === '♥' || s === '♦'; }

// Un paquet neuf, mélangé (Fisher-Yates).
function makeShuffledDeck(){
  const d = [];
  PALM_SUITS.forEach(s => PALM_VALUES.forEach(v => d.push({ suit:s, value:v })));
  for(let i = d.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// --- Rendu d'une carte --------------------------------------------------------------
// `opts` : { width } largeur en px, { revealed } face visible d'emblée, { index } rang
// d'arrivée pour l'entrée en éventail, { id } pour pouvoir la retourner ensuite.
function cardHTML(card, opts){
  const o = opts || {};
  const red = palmIsRed(card.suit);
  const corner = '<span class="pc-corner tl">' + card.value + '<i>' + card.suit + '</i></span>' +
                 '<span class="pc-corner br">' + card.value + '<i>' + card.suit + '</i></span>';
  return '<div class="pc ' + (red ? 'pc-red' : 'pc-black') +
           (o.revealed ? ' revealed' : '') + (o.deal ? ' dealing' : '') + '"' +
         (o.id ? ' id="' + o.id + '"' : '') +
         ' style="--pc-w:' + (o.width || 64) + 'px; --i:' + (o.index || 0) + '">' +
      '<div class="pc-inner">' +
        '<div class="pc-back"></div>' +
        '<div class="pc-face">' + corner + '<span class="pc-pip">' + card.suit + '</span></div>' +
      '</div>' +
    '</div>';
}

// Une pile de dos, avec son épaisseur : on voit qu'il reste des cartes.
function deckHTML(count, opts){
  const o = opts || {};
  const w = o.width || 64;
  return '<div class="pc-deck" style="--pc-w:' + w + 'px">' +
      (count > 2 ? '<div class="pc-deck-layer"></div>' : '') +
      (count > 1 ? '<div class="pc-deck-layer"></div>' : '') +
      '<div class="pc"><div class="pc-inner"><div class="pc-back"></div></div></div>' +
      (o.label === false ? '' : '<div class="pc-deck-count">' + count + ' carte' + (count > 1 ? 's' : '') + '</div>') +
    '</div>';
}

// ===================================================================================
// LE SECRET — consultation privée sur un téléphone partagé
// -----------------------------------------------------------------------------------
// Un seul téléphone circule autour de la table : afficher un rôle ou un mot secret dès
// qu'on touche l'écran suffit à ce que le voisin le lise par-dessus l'épaule. Le secret
// reste donc MASQUÉ, et ne se dévoile que tant qu'un doigt reste appuyé dessus : on
// peut se tourner, cacher l'écran, lire, puis relâcher — et il se referme aussitôt.
//
// Le bouton « suivant » n'apparaît qu'une fois le secret réellement consulté : personne
// ne passe le téléphone sans avoir vu son rôle.
//
// secretHTML(contenu, options) pose le bloc ; secretBind() l'active après insertion.
// ===================================================================================

function secretHTML(inner, opts){
  const o = opts || {};
  return '<div class="secret" id="'+(o.id || 'secret')+'">'+
      '<div class="secret-content">'+inner+'</div>'+
      '<div class="secret-veil">'+
        '<div class="secret-lock">'+
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
            'stroke-width="1.6" aria-hidden="true">'+
            '<rect x="4" y="10" width="16" height="11" rx="2"/>'+
            '<path d="M8 10V7a4 4 0 0 1 8 0v3"/>'+
          '</svg>'+
        '</div>'+
        '<div class="secret-hint">'+(o.hint || 'Maintiens le doigt appuyé pour voir')+'</div>'+
        '<div class="secret-sub">Personne d\'autre ne regarde&nbsp;?</div>'+
      '</div>'+
    '</div>';
}

// Active un bloc secret. `onSeen` est appelé la PREMIÈRE fois qu'il est consulté.
function secretBind(id, onSeen){
  const el = document.getElementById(id || 'secret');
  if(!el) return;
  let seen = false;
  const open = (e)=>{
    if(e && e.cancelable) e.preventDefault();
    el.classList.add('open');
    if(!seen){
      seen = true;
      Sound.play('capOpen');
      if(typeof onSeen === 'function') onSeen();
    }
  };
  const close = ()=> el.classList.remove('open');
  // pointerdown/up couvre le tactile et la souris d'un seul jeu d'événements ;
  // pointercancel et pointerleave referment si le doigt glisse hors du bloc.
  el.addEventListener('pointerdown', open);
  el.addEventListener('pointerup', close);
  el.addEventListener('pointercancel', close);
  el.addEventListener('pointerleave', close);
  // Accessibilité clavier : Espace ou Entrée maintenus ouvrent aussi.
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e)=>{ if(e.key === ' ' || e.key === 'Enter') open(e); });
  el.addEventListener('keyup', close);
  el.addEventListener('blur', close);
}
