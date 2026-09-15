// ===================================================================================
// LA GROTTE À COCKTAILS
// -----------------------------------------------------------------------------------
// Un espace bonus, à part du before et des jeux : personne n'a besoin d'y aller pour
// jouer. Six cocktails originaux, thème gare/dernier arrêt façon Terminus, avec pour
// chacun une petite variante tirée au hasard à l'ouverture — c'est ce qui les fait
// « changer » d'une visite à l'autre, à l'image du reste de l'app (voir le moteur de
// contenu du before, qui ne sert jamais deux fois la même chose d'affilée).
//
// Les mocktails, eux, n'ont volontairement PAS de fiche recette : ce ne sont que des
// noms qui font envie. Toucher n'importe lequel déclenche la blague — voir
// MOCKTAIL_TROLL_LINES plus bas et js/core/cocktails.js.
// ===================================================================================

const COCKTAILS = [
  {
    id: 'terminus',
    name: 'Le Terminus',
    tier: 'Chaos',
    glass: '🥃',
    base: 'Vodka, jus de fruit de la passion, gingembre frais, citron vert',
    garnish: 'Zeste de citron vert flambé au-dessus du verre',
    twists: [
      'Variante du jour : une pointe de piment dans le shaker, pour ceux qui ne comptent pas s’arrêter là.',
      'Variante du jour : sans le gingembre, pour les palais qui veulent juste finir le trajet.',
      'Variante du jour : servi directement du shaker, cul sec. Pas de correspondance.'
    ]
  },
  {
    id: 'correspondance',
    name: 'Correspondance',
    tier: 'Malin',
    glass: '🍸',
    base: 'Gin, pamplemousse rose, romarin frais, un trait de sirop d’agave',
    garnish: 'Brin de romarin brûlé quelques secondes avant de servir',
    twists: [
      'Variante du jour : pamplemousse remplacé par de l’orange sanguine.',
      'Variante du jour : le romarin infuse 10 minutes dans le gin avant le service.',
      'Variante du jour : une lichette de miel pour ceux qui trouvent ça trop sec.'
    ]
  },
  {
    id: 'dernier-wagon',
    name: 'Dernier Wagon',
    tier: 'Culotté',
    glass: '🍹',
    base: 'Rhum ambré, ananas rôti, jus de citron vert, sucre de canne',
    garnish: 'Rhum brun flambé en surface, éteint avant de servir (obligatoire)',
    twists: [
      'Variante du jour : ananas caramélisé à la poêle avant d’être pressé.',
      'Variante du jour : une pointe de cannelle dans le sucre de canne.',
      'Variante du jour : double dose de rhum ambré. Le wagon ne freine pas.'
    ]
  },
  {
    id: 'salle-attente',
    name: 'Salle d’Attente',
    tier: 'Soft',
    glass: '🥂',
    base: 'Vin blanc pétillant, sirop de fleur de sureau, rondelle de concombre',
    garnish: 'Fine tranche de concombre posée sur le bord du verre',
    twists: [
      'Variante du jour : une feuille de menthe froissée dans le verre.',
      'Variante du jour : sirop de sureau remplacé par du sirop de pêche de vigne.',
      'Variante du jour : un trait de citron vert pour réveiller l’attente.'
    ]
  },
  {
    id: 'voie-13',
    name: 'Voie 13',
    tier: 'Chaos',
    glass: '🌶️',
    base: 'Tequila, jus de betterave, jalapeño, citron vert',
    garnish: 'Rondelle de jalapeño posée sur le rebord, pour ceux qui doutent encore',
    twists: [
      'Variante du jour : betterave remplacée par de la carotte, pour un faux air sage.',
      'Variante du jour : le jalapeño infuse direct dans la tequila depuis le matin.',
      'Variante du jour : double dose de citron vert. Personne ne prend jamais cette voie sobre.'
    ]
  },
  {
    id: 'controleur',
    name: 'Contrôleur',
    tier: 'Malin',
    glass: '🥃',
    base: 'Whisky, miel, citron, gingembre chauffé à la vapeur',
    garnish: 'Rondelle de citron piquée d’un clou de girofle',
    twists: [
      'Variante du jour : servi tiède, comme un vrai grog de fin de service.',
      'Variante du jour : une touche de cannelle dans le miel chaud.',
      'Variante du jour : whisky tourbé, pour ceux qui veulent sentir le passage du contrôleur.'
    ]
  }
];

// Aucune recette ici : ce sont des noms, pas des cocktails. Voir MOCKTAIL_TROLL_LINES.
const MOCKTAILS = [
  { id: 'le-sage',        name: 'Le Sage',         glass: '🧘' },
  { id: 'permis-valide',  name: 'Permis Valide',   glass: '🚗' },
  { id: 'neuf-mois',      name: 'Neuf Mois',       glass: '🤰' },
  { id: 'merci-corinne',  name: 'Merci Corinne',   glass: '👵' },
  { id: 'foie-tranquille',name: 'Foie Tranquille', glass: '🍃' },
  { id: 'lendemain-leger',name: 'Lendemain Léger', glass: '☀️' }
];

// La première ligne est celle voulue mot pour mot ; les suivantes ne servent qu'à ne
// pas répéter exactement la même blague si quelqu'un s'entête à retaper.
const MOCKTAIL_TROLL_LINES = [
  'Hop hop hop, petit tricheur. Tu pensais vraiment vouloir tricher une nouvelle fois ? Pas de cocktail sans alcool pour toi — sauf si tu conduis, si t’es enceinte, ou si ta maman s’appelle Corinne et a 25 ans.',
  'Toujours là ? Le bar sans alcool est fermé. Fermé depuis l’ouverture, en fait.',
  'On a vérifié : ni permis à assumer, ni ventre qui s’arrondit, ni maman prénommée Corinne. Cocktail avec alcool, ou rien.'
];
