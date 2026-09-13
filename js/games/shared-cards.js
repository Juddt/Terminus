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
