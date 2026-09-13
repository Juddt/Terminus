// Silhouettes SVG dessinées pour l'application, une par jeu : les emojis système
// changeaient d'aspect selon le téléphone (Apple/Google/Samsung rendent le même
// caractère très différemment) et donnaient un rendu enfantin et hétérogène. Ces objets
// partagent une grammaire commune — aplat sombre, une seule teinte d'accent par jeu,
// reflet localisé en haut à gauche — pour rester cohérents entre eux tout en gardant
// chacun sa silhouette reconnaissable.
//
// Chaque entrée renvoie une chaîne SVG autonome (viewBox 0 0 64 64), insérée telle
// quelle dans la scène de sélection et dans l'index compact (voir navigation.js).


// Bloc de définitions partagé : mêmes rampes de lumière et même ombre de contact pour
// tous les objets, afin que la bibliothèque paraisse éclairée par une source unique
// (haut-gauche) plutôt que par neuf éclairages différents.
const ART_DEFS = `
<defs>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>
    <stop offset="0.28" stop-color="#D8D8D8"/>
    <stop offset="0.55" stop-color="#8A8A8A"/>
    <stop offset="0.78" stop-color="#EDEDED"/>
    <stop offset="1" stop-color="#6E6E6E"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="#FFF9C4"/>
    <stop offset="0.3" stop-color="#E8FF3D"/>
    <stop offset="0.7" stop-color="#B8CC1F"/>
    <stop offset="1" stop-color="#7A8A12"/>
  </linearGradient>
  <linearGradient id="smoke" x1="0" y1="0" x2="0.5" y2="1">
    <stop offset="0" stop-color="#4A4A55" stop-opacity="0.95"/>
    <stop offset="0.5" stop-color="#23232B"/>
    <stop offset="1" stop-color="#141418"/>
  </linearGradient>
  <linearGradient id="ivory" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/>
    <stop offset="0.6" stop-color="#F3EEE2"/>
    <stop offset="1" stop-color="#CFC8B8"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="contact" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#000000" stop-opacity="0.75"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>
</defs>`;

// Ombre de contact posée sous chaque objet : c'est elle qui donne l'impression que
// l'objet repose sur une surface plutôt que de flotter.
const ART_SHADOW = `<ellipse cx="50" cy="90" rx="30" ry="6" fill="url(#contact)"/>`;

const GAME_ART = {
  // Palmier : tronc incliné + palmes, un empilement de cartes à sa base.
  palmier: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <g transform="translate(50 50)">
    <path d="M2 38 C0 18 -2 6 -6 -8" stroke="#5C4326" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M1 38 C-1 18 -3 6 -7 -8" stroke="#7A5B3A" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M-7-8C-20-18-32-14-36-6c8-4 18-3 29 2z" fill="#1E8F5C"/>
    <path d="M-7-8C4-22 18-22 24-14c-9-2-18 1-31 6z" fill="#3ADC8F"/>
    <path d="M-7-8c-3-13 2-22 11-26-5 8-6 17-5 26z" fill="#2FBF6B"/>
    <path d="M-7-8C2 2 14 6 22 4 14 0 5-5-7-8z" fill="#188A52"/>
    <g transform="translate(6 34)">
      <rect x="-19" y="-2" width="38" height="9" rx="3" fill="#9A9386"/>
      <rect x="-20" y="-4" width="38" height="9" rx="3" fill="url(#ivory)"/>
      <rect x="-16" y="-11" width="32" height="8" rx="3" fill="#C6BFAE"/>
      <rect x="-17" y="-12" width="32" height="8" rx="3" fill="url(#ivory)"/>
    </g>
  </g>
</svg>`,

  // Bus : caisse trapue, bandeau de vitres fumées, deux roues.
  bus: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <g transform="translate(50 50)">
    <path d="M-34 -4 L-28 -20 L28 -20 L34 -4 Z" fill="#1E5FB0"/>
    <rect x="-34" y="-4" width="68" height="30" rx="6" fill="#2D7FE0"/>
    <rect x="-34" y="-4" width="68" height="11" rx="5" fill="url(#sheen)" opacity="0.45"/>
    <rect x="-27" y="-16" width="24" height="14" rx="3" fill="url(#smoke)"/>
    <rect x="3" y="-16" width="24" height="14" rx="3" fill="url(#smoke)"/>
    <path d="M-27 -16 h24 l-9 6 h-15z" fill="#FFFFFF" opacity="0.16"/>
    <rect x="-30" y="12" width="60" height="3" rx="1.5" fill="#0D0D0D" opacity="0.4"/>
    <ellipse cx="-18" cy="27" rx="8" ry="8" fill="#141418"/>
    <circle cx="-18" cy="27" r="3.4" fill="url(#metal)"/>
    <ellipse cx="20" cy="27" rx="8" ry="8" fill="#141418"/>
    <circle cx="20" cy="27" r="3.4" fill="url(#metal)"/>
  </g>
</svg>`,

  // Cible : anneaux concentriques + fléchette plantée hors centre.
  cible: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <!-- Cible inclinée (ellipses, pas des cercles) : la perspective donne la profondeur,
       et le bord épais montre que le panneau a une tranche. -->
  <g transform="translate(50 48)">
    <ellipse cx="0" cy="6" rx="34" ry="22" fill="#161619"/>
    <ellipse cx="0" cy="2" rx="34" ry="22" fill="#23232B"/>
    <ellipse cx="0" cy="2" rx="34" ry="22" fill="none" stroke="#4A4A55" stroke-width="1.5"/>
    <ellipse cx="0" cy="2" rx="25" ry="16" fill="none" stroke="#FF3B5C" stroke-width="3" opacity="0.9"/>
    <ellipse cx="0" cy="2" rx="16" ry="10" fill="none" stroke="#FF3B5C" stroke-width="2.6" opacity="0.65"/>
    <ellipse cx="0" cy="2" rx="7" ry="4.4" fill="#FF3B5C"/>
    <ellipse cx="-12" cy="-6" rx="13" ry="6" fill="url(#sheen)" opacity="0.5"/>
    <!-- Fléchette plantée : sa hampe traverse le plan, d'où l'impact visible. -->
    <path d="M30 -26 L10 -1" stroke="url(#metal)" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M30 -26 l9 -10 -2 12 -11 2z" fill="#E8FF3D"/>
    <circle cx="10" cy="-1" r="2.4" fill="#FFF8ED"/>
  </g>
</svg>`,

  // Purple : deux cartes en éventail, l'une rouge l'autre noire.
  purple: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <!-- Éventail de cartes : chaque carte a une tranche (bande sombre décalée) pour que
       l'épaisseur du paquet soit perceptible. -->
  <g transform="translate(50 50)">
    <g transform="rotate(-20)"><rect x="-16" y="-27" width="30" height="47" rx="4" fill="#9A9386"/>
      <rect x="-17" y="-28" width="30" height="47" rx="4" fill="url(#ivory)"/></g>
    <g transform="rotate(-3)"><rect x="-14" y="-29" width="30" height="47" rx="4" fill="#9A9386"/>
      <rect x="-15" y="-30" width="30" height="47" rx="4" fill="url(#ivory)"/>
      <path d="M0 -14c2.6-4 8-1.4 5.4 2.6L0 -4l-5.4-6.8C-8-15.4-2.6-18 0-14z" fill="#8B4DFF"/></g>
    <g transform="rotate(15)"><rect x="-12" y="-27" width="30" height="47" rx="4" fill="#9A9386"/>
      <rect x="-13" y="-28" width="30" height="47" rx="4" fill="url(#ivory)"/>
      <path d="M2 -10 l6 9h-12z" fill="#1A1A1A"/>
      <rect x="-13" y="-28" width="30" height="18" rx="4" fill="url(#sheen)" opacity="0.55"/></g>
  </g>
</svg>`,

  // PMU : silhouette de cheval stylisée à la course + ligne d'arrivée.
  pmu: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <g transform="translate(50 52)">
    <path d="M-30 30 C-30 8 -18 -6 -2 -11 L4 -26 L15 -19 L28 -22 L24 -8 C31 -1 34 12 34 30 L18 30 L14 14 L2 30 Z" fill="#C77F1E"/>
    <path d="M-30 30 C-30 8 -18 -6 -2 -11 L4 -26 L15 -19 L20 -20 C14 -8 2 0 -12 6 -20 12 -25 20 -26 30 Z" fill="#FFC24D"/>
    <path d="M4 -26 L15 -19 L11 -14 Z" fill="#8A5A10"/>
    <circle cx="15" cy="-19" r="2" fill="#0D0D0D"/>
    <rect x="34" y="-34" width="4" height="28" rx="2" fill="url(#metal)"/>
    <path d="M38 -33 h16 v11 h-16z" fill="#E8FF3D"/>
    <path d="M38 -33 h8 v5.5h-8z M46 -27.5 h8 v5.5h-8z" fill="#0D0D0D" opacity="0.85"/>
  </g>
</svg>`,

  // Duel de dés : deux dés opposés, l'un clair l'autre sombre.
  des: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <!-- Dé arrière, verre fumé : faces séparées pour donner le volume (dessus éclairé,
       flanc dans l'ombre), arêtes adoucies par un liseré clair. -->
  <g transform="translate(50 14)">
    <path d="M0 8 L22 20 L22 46 L0 58 L-22 46 L-22 20 Z" fill="url(#smoke)"/>
    <path d="M0 8 L22 20 L0 32 L-22 20 Z" fill="#5A5A68"/>
    <path d="M0 8 L22 20 L0 32 L-22 20 Z" fill="url(#sheen)"/>
    <path d="M0 32 L22 20 L22 46 L0 58 Z" fill="#1B1B21"/>
    <path d="M0 8 L-22 20 L-22 46 L0 58 Z" fill="#2E2E38"/>
    <circle cx="0" cy="19" r="2.6" fill="#E8FF3D"/>
    <circle cx="-9" cy="15" r="2.2" fill="#E8FF3D" opacity="0.85"/>
    <circle cx="9" cy="24" r="2.2" fill="#E8FF3D" opacity="0.85"/>
    <circle cx="11" cy="31" r="2.4" fill="#C9E035"/><circle cx="11" cy="41" r="2.4" fill="#C9E035"/>
    <circle cx="-11" cy="33" r="2.4" fill="#9BAA2A"/>
  </g>
  <!-- Dé avant, ivoire satiné : plus petit, légèrement en avant, il crée la profondeur. -->
  <g transform="translate(34 44)">
    <path d="M0 6 L17 15 L17 35 L0 44 L-17 35 L-17 15 Z" fill="url(#ivory)"/>
    <path d="M0 6 L17 15 L0 24 L-17 15 Z" fill="#FFFFFF"/>
    <path d="M0 24 L17 15 L17 35 L0 44 Z" fill="#C6BFAE"/>
    <path d="M0 6 L-17 15 L-17 35 L0 44 Z" fill="#E5DFD1"/>
    <circle cx="0" cy="15" r="2.2" fill="#1A1A1A"/>
    <circle cx="8" cy="24" r="1.9" fill="#1A1A1A"/><circle cx="8" cy="32" r="1.9" fill="#1A1A1A"/>
    <circle cx="-8" cy="26" r="1.9" fill="#2A2A2A"/>
  </g>
</svg>`,

  // Pile ou face : pièce de profil en rotation, tranche visible.
  pof: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <!-- Pièce vue de trois quarts : la tranche (rectangle entre les deux ellipses) lui
       donne une vraie épaisseur, le biseau de la tranche capte la lumière. -->
  <g transform="translate(50 48)">
    <path d="M-26 4 A26 34 0 0 0 26 4 L26 -4 A26 34 0 0 1 -26 -4 Z" fill="#8A7A12"/>
    <ellipse cx="0" cy="-2" rx="26" ry="34" fill="url(#gold)"/>
    <ellipse cx="0" cy="-2" rx="26" ry="34" fill="none" stroke="#FFFDE0" stroke-width="1.2" opacity="0.6"/>
    <ellipse cx="0" cy="-2" rx="19" ry="26" fill="none" stroke="#8A7A12" stroke-width="1.4" opacity="0.5"/>
    <path d="M0 -22 L0 18 M-9 -12 L9 -12" stroke="#3E3A08" stroke-width="3.4" stroke-linecap="round"/>
    <!-- Reflet localisé en haut à gauche, cohérent avec les autres objets. -->
    <ellipse cx="-10" cy="-18" rx="7" ry="12" fill="#FFFFFF" opacity="0.42" transform="rotate(-18 -10 -18)"/>
  </g>
</svg>`,

  // UnderDicateur : silhouette au chapeau, un mot masqué devant le visage.
  underdicateur: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <g transform="translate(50 50)">
    <path d="M-28 38 C-28 20 -14 10 0 10 C14 10 28 20 28 38 Z" fill="#4A3EA8"/>
    <path d="M-28 38 C-28 20 -14 10 0 10 C4 10 8 11 12 13 -4 18 -16 26 -20 38 Z" fill="#6B5CE0"/>
    <circle cx="0" cy="-4" r="15" fill="#7E6FE8"/>
    <path d="M-15 -4 A15 15 0 0 1 6 -18 C-2 -14 -8 -9 -15 -4z" fill="#9B8FF0"/>
    <path d="M-19 -16 h38 l-6 -11 H-13 z" fill="#141418"/>
    <ellipse cx="0" cy="-16" rx="23" ry="3.6" fill="#1F1F26"/>
    <ellipse cx="-6" cy="-24" rx="6" ry="2.2" fill="#FFFFFF" opacity="0.18"/>
    <rect x="-12" y="-8" width="24" height="7" rx="2.5" fill="#0D0D0D"/>
    <circle cx="-6" cy="-4.5" r="1.7" fill="#E8FF3D"/><circle cx="6" cy="-4.5" r="1.7" fill="#E8FF3D"/>
  </g>
</svg>`,

  // Pilliers : trois chopes serrées, mousse débordante.
  pilliers: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ART_DEFS}${ART_SHADOW}
  <g transform="translate(50 50)">
    <g transform="translate(-24 6)">
      <rect x="-11" y="-6" width="22" height="34" rx="3" fill="#B86A18"/>
      <rect x="-11" y="-6" width="10" height="34" rx="3" fill="#E0912D"/>
      <ellipse cx="0" cy="-6" rx="11" ry="3.6" fill="#FFF8ED"/>
    </g>
    <g transform="translate(24 6)">
      <rect x="-11" y="-6" width="22" height="34" rx="3" fill="#B86A18"/>
      <rect x="-11" y="-6" width="10" height="34" rx="3" fill="#E0912D"/>
      <ellipse cx="0" cy="-6" rx="11" ry="3.6" fill="#FFF8ED"/>
    </g>
    <g transform="translate(0 -2)">
      <rect x="-13" y="-10" width="26" height="40" rx="3" fill="#D97B1E"/>
      <rect x="-13" y="-10" width="11" height="40" rx="3" fill="#FF9433"/>
      <rect x="-13" y="-10" width="26" height="14" rx="3" fill="url(#sheen)" opacity="0.4"/>
      <ellipse cx="0" cy="-10" rx="13" ry="4.4" fill="#FFFFFF"/>
      <ellipse cx="-4" cy="-11" rx="5" ry="2" fill="#FFFDF6"/>
      <path d="M13 2 h5 a5 5 0 0 1 0 10 h-5z" fill="#C06A14"/>
    </g>
  </g>
</svg>`,
};
