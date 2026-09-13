// difficulty : intensité du jeu ('Facile'|'Modéré'|'Intense'), category : type de mécanique
// ('Adresse'|'Devinette'|'Bluff'|'Rapide'). Utilisées par le filtre de screen-games-list
// (voir navigation.js) pour trouver un jeu adapté quand le groupe grandit.
const GAMES = [
  {
    id:"palmier", icon:"🌴", cardGrad:"linear-gradient(135deg,#3ADC8F,#1E8F5C)", tagline:'Empile les cartes sans tout faire tomber.', name:"Le Palmier", joueurs:"2-10", duree:"20-40 min",
    difficulty:"Modéré", category:"Adresse",
    interactive: true, launchFn: 'palmierSetup',
    desc:"Pioche une carte, applique la règle, et pose-la en équilibre sur le palmier — sans le faire s'écrouler. 5 chutes = perdu !",
    rules:[
      {card:'As', text:'Rouge = cul sec — Noir = choisis qui boit'},
      {card:'2 / 3', text:'Rouge = bois — Noir = donne'},
      {card:'4 / 5', text:'Floor to the floor ! / Five to the sky !'},
      {card:'6', text:'Dans ma valise il y a…'},
      {card:'7', text:'Maître de la question'},
      {card:'8', text:'Distribue 8 gorgées'},
      {card:'9', text:'J\'ai déjà / J\'ai jamais'},
      {card:'10', text:'Maître du freeze'},
      {card:'Valet', text:'Jeu du thème'},
      {card:'Dame', text:'Tout le monde boit'},
      {card:'Roi', text:'Invente une règle (4ème = cul sec)'},
    ]
  },
  {
    id:"bus", icon:"🚌", cardGrad:"linear-gradient(135deg,#4DA6FF,#2D5FE0)", tagline:'Devine tes cartes cachées... ou monte dans le bus.', name:"Le Bus", joueurs:"2-10", duree:"10-20 min",
    difficulty:"Modéré", category:"Devinette",
    interactive: true, launchFn: 'busSetup',
    desc:"Devine les caractéristiques de tes 4 cartes cachées. Le pire joueur monte dans le bus — et là, bonne chance.",
    rules:[
      {card:'Tour 1', text:'Rouge ou Noir ?'},
      {card:'Tour 2', text:'Plus haut ou Plus bas ?'},
      {card:'Tour 3', text:'Dedans ou Dehors ?'},
      {card:'Tour 4', text:'Devine ♥ ♦ ♣ ou ♠'},
      {card:'Erreur', text:'1 gorgée au tour 1, puis +1 par tour'},
      {card:'Bus', text:'Le pire joueur retourne 5 cartes — figure = recommence'},
    ]
  },
  {
    id:"cible", icon:"🎯", cardGrad:"linear-gradient(135deg,#FF7A59,#FF3D77)", tagline:'Vise le centre. Plus c\'est risqué, plus ça arrose.', name:"La Cible", joueurs:"2-10", duree:"15-30 min",
    difficulty:"Facile", category:"Devinette",
    interactive: true, launchFn: 'cibleSetup',
    desc:"25 cartes cachées en forme de cible. Plus tu vises le centre, plus tu risques gros. Devine juste ou bois.",
    rules:[
      {card:'Ext.', text:'Rouge ou Noir ? → 1 gorgée'},
      {card:'Cercle 2', text:'Pair ou Impair ? → 2 gorgées'},
      {card:'Cercle 3', text:'Devine le symbole → 3 gorgées'},
      {card:'Centre', text:'Devine la valeur exacte → 5 gorgées'},
      {card:'Réussi', text:'Tu distribues les gorgées'},
      {card:'Raté', text:'Tu bois les gorgées'},
    ]
  },
  {
    id:"purple", icon:"🃏", cardGrad:"linear-gradient(135deg,#B18BFF,#8B4DFF)", tagline:'Rouge, noir ou Purple : annonce et assume.', name:"Purple", joueurs:"2-10", duree:"10-20 min",
    difficulty:"Facile", category:"Bluff",
    interactive: true, launchFn: 'purpleSetup',
    desc:"Prédi la couleur des prochaines cartes. Rouge, Noir ou Purple — plus tu vises haut, plus tu risques.",
    rules:[
      {card:'Rouge', text:'Les 2 prochaines cartes sont rouges'},
      {card:'Noir', text:'Les 2 prochaines cartes sont noires'},
      {card:'Purple', text:'1 rouge + 1 noire (ordre libre)'},
      {card:'x2', text:'Double Purple — 2 rouges + 2 noires (4 cartes)'},
      {card:'x3', text:'Triple Purple — 3 rouges + 3 noires (6 cartes)'},
      {card:'Perdu', text:'Tu bois autant de gorgées que de cartes piochées'},
      {card:'Gagné', text:'Les gorgées s\'accumulent jusqu\'à ce que quelqu\'un perde'},
    ]
  },
  {
    id:"pmu", icon:"🐎", cardGrad:"linear-gradient(135deg,#FFC24D,#E0912D)", tagline:'Mise sur un cheval, regarde la course s\'emballer.', name:"Le PMU", joueurs:"2-8", duree:"5-15 min",
    difficulty:"Facile", category:"Bluff",
    interactive: true, launchFn: 'pmuSetup',
    desc:"Pariez sur le bon cheval et regardez la course. Le perdant boit sa mise, le gagnant distribue le double.",
    rules:[
      {card:'♥♦♣♠', text:'Les 4 As sont les chevaux'},
      {card:'Mise', text:'Chaque joueur parie 1 à 5 gorgées sur un As'},
      {card:'Course', text:'On retourne les cartes — le symbole avance'},
      {card:'Obstacle', text:'Quand tous passent un obstacle, il recule un cheval'},
      {card:'Gagné', text:'Tu distribues le double de ta mise'},
      {card:'Perdu', text:'Tu bois ta mise'},
    ]
  },
  {
    id:"des", icon:"🎲", cardGrad:"linear-gradient(135deg,#FF6B9E,#FF3D77)", tagline:'Un dé chacun. Le plus bas boit. Brutal.', name:"Le Duel de Dés", joueurs:"2", duree:"5-10 min",
    difficulty:"Intense", category:"Rapide",
    interactive: true, launchFn: 'desSetup', startFn: 'desStart',
    desc:"Chacun lance un dé. Le plus bas boit la multiplication des deux. Simple, brutal, rapide.",
    rules:[
      {card:'🎲', text:'Chaque joueur lance un dé'},
      {card:'Perdant', text:'Le plus bas boit le produit des deux dés'},
      {card:'Égalité', text:'On relance automatiquement'},
    ]
  },
  {
    id:"pof", icon:"🪙", cardGrad:"linear-gradient(135deg,#FFE066,#FFC24D)", tagline:'Pile ou face, en mode fun ou en mode prison.', name:"Pile ou Face", joueurs:"2+", duree:"5-15 min",
    difficulty:"Intense", category:"Rapide",
    interactive: true, launchFn: 'pofSetup',
    desc:"Parie et retourne la pièce. Mode Fun pour les timides, Mode Prison pour les téméraires.",
    rules:[
      {card:'Fun', text:'Parie 1 à 3 gorgées, choisis Pile ou Face'},
      {card:'Prison', text:'5 manches obligatoires, les gorgées doublent'},
      {card:'Manche', text:'2 → 4 → 8 → 16 → cul sec'},
      {card:'Perdu', text:'Tu bois. Gagné = l\'autre boit'},
    ]
  },
  {
    id:"underdicateur", icon:"🕵️", cardGrad:"linear-gradient(135deg,#6B5CE0,#3D2E8F)", tagline:'Un mot pour presque tout le monde... sauf pour toi.', name:"UnderDicateur", joueurs:"4-12", duree:"20-40 min",
    difficulty:"Intense", category:"Bluff",
    interactive: true, launchFn: 'underdicateurSetup',
    desc:"Presque tout le monde a le même mot. Presque. Un mot chacun par tour, un vote — et un Dictateur qui manipule la partie dans l'ombre.",
    rules:[
      {card:'Citoyen', text:'Reçoit le mot de la majorité'},
      {card:'Undercover', text:'Reçoit un mot très proche — et doit le cacher'},
      {card:'M. White', text:'Aucun mot. Il improvise et déduit'},
      {card:'Dictateur', text:'Tiré au hasard parmi tous : 3 pouvoirs à usage unique'},
      {card:'Tour', text:'Chacun dit UN seul mot pour décrire le sien'},
      {card:'Vote', text:'On pointe du doigt, on élimine, on révèle le rôle'},
      {card:'Victoire', text:'Citoyens si tous les imposteurs tombent — Undercover en majorité — M. White s\'il devine le mot'},
    ]
  },
  {
    id:"pilliers", icon:"🍻", cardGrad:"linear-gradient(135deg,#FF9433,#E0562D)", tagline:'Le loup-garou version troquet, entre amis.', name:"Les Pilliers", joueurs:"3-20", duree:"30-60 min", materiel:"1 téléphone au centre",
    interactive: true, launchFn: 'pilSetup', onlineUrl: 'pilliers-online/index.html',
    desc:"Un Loup-Garou version bar. Le camp des Pilliers élimine en secret chaque nuit, le village débat et vote le jour. Rôles cachés, alcootest, chimiste, mouchard... et une bonne dose de cul secs.",
    rules:[
      {card:'Joueurs', text:'De 3 à 20 joueurs — un seul téléphone posé au centre'},
      {card:'Attribution', text:'Chacun découvre son rôle en secret, à tour de rôle'},
      {card:'Nuit', text:'Yeux fermés. Les rôles actifs s\'approchent un par un pour agir sur l\'écran'},
      {card:'Pilliers', text:'Chaque nuit, désignent ensemble une victime — cul sec direct'},
      {card:'Éthylotest', text:'Vérifie en secret si un joueur est un Pillier'},
      {card:'Chimiste', text:'Protège un joueur de l\'élimination de la nuit'},
      {card:'Réveil', text:'L\'appli annonce les victimes de la nuit'},
      {card:'Débat', text:'90 secondes pour discuter avant le vote'},
      {card:'Vote', text:'Décompte 3-2-1, tout le monde pointe un suspect'},
      {card:'Sentence', text:'Le plus désigné boit cul sec et révèle son rôle'},
      {card:'Erreur judiciaire', text:'Si l\'éliminé n\'était pas un Pillier, tout le monde boit 2 gorgées'},
      {card:'Victoire', text:'Village = tous les Pilliers éliminés. Pilliers = ils sont à parité'},
    ]
  },
];
