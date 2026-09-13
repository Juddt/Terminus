// ===================================================================================
// LES AFFICHES DE LA BIBLIOTHÈQUE
// -----------------------------------------------------------------------------------
// Chaque jeu est présenté par SON PROPRE OBJET, celui-là même qu'on manipulera en
// jouant : le cube du Duel de Dés, la pièce à tranche de Pile ou Face, le paquet de
// Purple, la cible, la piste du PMU, le cercle de cartes du Palmier…
//
// C'est un choix délibéré plutôt qu'une série d'icônes dessinées à part. D'abord parce
// qu'un objet réel, avec sa matière, son volume et son ombre de contact, est bien plus
// convaincant qu'un pictogramme agrandi. Ensuite parce que la bibliothèque tient alors
// une promesse exacte : ce qu'on voit est ce qu'on va manipuler. Et enfin parce que ces
// objets sont déjà construits en CSS — aucune image à charger, tout est net à toutes
// les tailles, et une retouche du jeu se répercute sur son affiche.
//
// Chaque affiche est posée dans une scène (voir .poster dans app.css) : un sol, une
// lumière rasante venue du haut-gauche, une ombre de contact.

// Reprend la construction de la tranche de la pièce (voir pof.js), en réduction.
function posterCoinEdge(radius, segments){
  let out = '';
  for(let i = 0; i < segments; i++){
    out += '<div class="coin-edge-seg" style="transform:rotateZ('+((360 / segments) * i).toFixed(1)+
           'deg) translateY(-'+radius+'px) rotateX(90deg)"></div>';
  }
  return out;
}

// Un dé figé sur une valeur, dans l'orientation utilisée en jeu.
function posterDie(value, extra){
  const PIPS = {1:[0,0,0,0,1,0,0,0,0], 2:[1,0,0,0,0,0,0,0,1], 3:[1,0,0,0,1,0,0,0,1],
                4:[1,0,1,0,0,0,1,0,1], 5:[1,0,1,0,1,0,1,0,1], 6:[1,0,1,1,0,1,1,0,1]};
  const ROT = {1:'', 2:'rotateX(90deg)', 3:'rotateY(-90deg)', 4:'rotateY(90deg)',
               5:'rotateX(-90deg)', 6:'rotateY(180deg)'};
  return '<div class="die-stage" style="'+(extra || '')+'">'+
      '<div class="die-shadow"></div>'+
      '<div class="die-3d" style="transform:rotateX(-13deg) rotateY(17deg) '+ROT[value]+'">'+
        [1,2,3,4,5,6].map(v => '<div class="die-face die-face-'+v+'">'+
          PIPS[v].map(on => '<div class="die-pip'+(on ? ' on' : '')+'"></div>').join('')+
        '</div>').join('')+
      '</div>'+
    '</div>';
}

function posterCard(value, suit, style, cls){
  const red = suit === '♥' || suit === '♦';
  return '<div class="pc '+(red ? 'pc-red' : 'pc-black')+' revealed '+(cls || '')+'" '+
         'style="--pc-w:52px;'+(style || '')+'">'+
      '<div class="pc-inner"><div class="pc-back"></div>'+
        '<div class="pc-face">'+
          '<span class="pc-corner tl">'+value+'<i>'+suit+'</i></span>'+
          '<span class="pc-corner br">'+value+'<i>'+suit+'</i></span>'+
          '<span class="pc-pip">'+suit+'</span>'+
        '</div>'+
      '</div>'+
    '</div>';
}

const GAME_POSTERS = {

  // Deux cubes face à face : l'affrontement, littéralement.
  des: '<div class="poster-duo">'+
      posterDie(5, 'transform:scale(0.86) rotate(-7deg)')+
      posterDie(2, 'transform:scale(0.86) rotate(6deg)')+
    '</div>',

  // La pièce, sa tranche visible, prise en plein basculement.
  pof: '<div class="poster-coin">'+
      '<div class="coin-scene" style="width:112px; height:112px;">'+
        '<div class="coin" style="--spin:-32deg">'+
          posterCoinEdge(53, 30)+
          '<div class="coin-side coin-heads">PILE</div>'+
          '<div class="coin-side coin-tails">FACE</div>'+
        '</div>'+
        '<div class="coin-shadow"></div>'+
      '</div>'+
    '</div>',

  // Le paquet et trois cartes retournées : l'annonce, puis le verdict.
  purple: '<div class="poster-spread">'+
      '<div class="pc-deck" style="--pc-w:58px; transform:rotate(-8deg);">'+
        '<div class="pc-deck-layer"></div><div class="pc-deck-layer"></div>'+
        '<div class="pc"><div class="pc-inner"><div class="pc-back"></div></div></div>'+
      '</div>'+
      posterCard('7', '♥', 'transform:rotate(6deg) translateY(-6px);')+
      posterCard('D', '♠', 'transform:rotate(15deg) translate(-14px, 4px);')+
    '</div>',

  // Le Bus : LA MONTÉE. Quatre barreaux gris avec des points d'interrogation, c'était
  // un schéma, pas un objet — plat, sans matière, et ça ne disait pas ce qu'on joue.
  // Ce sont maintenant les quatre cartes de la manche, posées en escalier : la première
  // déjà retournée, la suivante éclairée (c'est celle qu'on devine), les deux dernières
  // encore fermées, chacune plus haute et plus penchée que la précédente. On lit la
  // progression, l'enjeu qui monte, et la carte qui vient.
  bus: '<div class="poster-climb">'+
      '<span class="climb-beam" aria-hidden="true"></span>'+
      posterCard('9', '\u2666', '--pc-w:40px;', 'climb-card climb-1')+
      '<div class="pc pc-black climb-card climb-2 climb-next" style="--pc-w:40px;">'+
        '<div class="pc-inner"><div class="pc-back"></div></div>'+
      '</div>'+
      '<div class="pc pc-black climb-card climb-3" style="--pc-w:40px;">'+
        '<div class="pc-inner"><div class="pc-back"></div></div>'+
      '</div>'+
      '<div class="pc pc-black climb-card climb-4" style="--pc-w:40px;">'+
        '<div class="pc-inner"><div class="pc-back"></div></div>'+
      '</div>'+
    '</div>',

  // La cible, avec ses couronnes et quelques cartes posées.
  cible: '<div class="poster-target">'+
      '<div class="cible-board" style="width:156px;">'+
        '<div class="cible-ring z1"></div><div class="cible-ring z2"></div>'+
        '<div class="cible-ring z3"></div><div class="cible-bull"></div>'+
        '<div class="poster-chip" style="left:50%; top:50%; --cw:26px;">5</div>'+
        '<div class="poster-chip" style="left:22%; top:38%; --cw:19px;">1</div>'+
        '<div class="poster-chip" style="left:76%; top:64%; --cw:19px;">1</div>'+
        '<div class="poster-chip" style="left:64%; top:24%; --cw:22px;">2</div>'+
        '<div class="poster-chip" style="left:30%; top:72%; --cw:22px;">2</div>'+
      '</div>'+
    '</div>',

  // La piste : quatre couloirs, un as détaché en tête.
  pmu: '<div class="poster-track">'+
      ['♥','♦','♣','♠'].map((s, i) => {
        const pos = [42, 66, 88, 30][i];
        const red = s === '♥' || s === '♦';
        return '<div class="poster-lane">'+
            '<div class="poster-rail"><div class="poster-runner '+(red ? 'red' : 'black')+'" '+
              'style="left:'+pos+'%">'+
              '<span class="pmu-runner-rank">A</span><span class="pmu-runner-suit">'+s+'</span>'+
            '</div></div>'+
          '</div>';
      }).join('')+
    '</div>',

  // Le Palmier : LE CERCLE. Le jeu, c'est le cercle de cartes autour de la table — et
  // les cartes qui rayonnent depuis le centre, comme les palmes qui donnent son nom au
  // jeu. La bouteille a disparu : elle occupait le centre, écrasait la moitié basse de
  // l'affiche et n'était pas ce qu'on manipule. Le cercle complet, lui, se reconnaît
  // d'un coup d'œil et dit la règle : on tourne, chacun tire.
  palmier: '<div class="poster-ring">'+
      '<span class="ring-core" aria-hidden="true"></span>'+
      (function(){
        const FACES = { 0:['A','\u2660'], 4:['7','\u2665'], 8:['R','\u2663'], 12:['4','\u2666'] };
        let out = '';
        for(let i = 0; i < 16; i++){
          const angle = i * 22.5;
          const face = FACES[i];
          // Chaque carte est tournée vers l'extérieur puis poussée sur le cercle : elles
          // rayonnent au lieu de s'empiler, et aucune n'en recouvre une autre.
          const pos = 'transform:rotate('+angle+'deg) translateY(-66px);';
          if(face){
            out += posterCard(face[0], face[1], '--pc-w:30px;'+pos, 'ring-card');
          } else {
            out += '<div class="pc pc-black ring-card" style="--pc-w:30px;'+pos+'">'+
                     '<div class="pc-inner"><div class="pc-back"></div></div>'+
                   '</div>';
          }
        }
        return out;
      })()+
    '</div>',


  // UnderDicateur : un mot sous scellé, et le doute.
  underdicateur: '<div class="poster-secret">'+
      '<div class="poster-word">Parfum</div>'+
      '<div class="poster-veil">'+
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'+
          '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'+
        '</svg>'+
      '</div>'+
      '<div class="poster-word alt">?</div>'+
    '</div>',

  // Les Pilliers : trois rôles, dont un qu'on ne voit pas.
  pilliers: '<div class="poster-roles">'+
      '<div class="poster-role village">Village</div>'+
      '<div class="poster-role hidden">?</div>'+
      '<div class="poster-role pilliers">Pillier</div>'+
    '</div>'
};
