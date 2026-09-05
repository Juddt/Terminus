// Conformité : barrière d'âge, message sanitaire, mentions légales, confidentialité, CGU.
//
// Une barrière d'âge côté client est une DÉCLARATION, pas une vérification : rien
// n'empêche de recharger la page en répondant autrement. C'est le standard du secteur
// et ce que fait la profession, mais il ne faut pas la prendre pour un contrôle.
//
// Le message sanitaire est repris de l'article L3323-4 du code de la santé publique.
// Sa formulation est imposée au mot près : on ne la reformule pas.

const AGE_GATE_KEY = 'soiree_age_ok_v1';
const MESSAGE_SANITAIRE = "L'abus d'alcool est dangereux pour la santé. À consommer avec modération.";

function isAgeConfirmed(){
  try{ return localStorage.getItem(AGE_GATE_KEY) === '1'; }catch(e){ return false; }
}

// Appelée au chargement, avant tout le reste : si la majorité n'a jamais été déclarée,
// l'écran d'accueil ne doit pas s'afficher une seule seconde.
function checkAgeGate(){
  if(isAgeConfirmed()) return false;
  goTo('age');
  return true;
}

function confirmAge(){
  try{ localStorage.setItem(AGE_GATE_KEY, '1'); }catch(e){}
  goTo('home');
  // La config partagée et la reprise de soirée sont court-circuitées tant que la
  // barrière est levée. Sans ce rattrapage, quelqu'un qui ouvre un lien de partage à
  // son tout premier lancement perdait la configuration au passage.
  const hadSharedConfig = applySharedConfigFromUrl();
  if(!hadSharedConfig) checkForResumableSession();
}

// Impasse volontaire : pas de bouton retour, pas de contournement dans l'interface.
function refuseAge(){
  document.getElementById('age-body').innerHTML =
    '<div class="age-title">Reviens dans quelques années</div>'+
    '<div class="age-text">Soirée accompagne des jeux à boire entre adultes. '+
    'La vente et l\u2019offre d\u2019alcool aux mineurs sont interdites en France '+
    '(article L3342-1 du code de la santé publique).</div>'+
    '<div class="age-text">En attendant, les mêmes jeux se jouent très bien sans alcool.</div>';
  document.getElementById('age-actions').innerHTML = '';
}

function openLegalScreen(){
  document.getElementById('legal-body').innerHTML = LEGAL_SECTIONS.map(function(s){
    return '<div class="legal-section">'+
      '<h3 class="legal-h">'+s.titre+'</h3>'+
      s.blocs.map(function(b){ return '<p class="legal-p">'+b+'</p>'; }).join('')+
    '</div>';
  }).join('');
  goTo('legal');
}

// Textes légaux. Les mentions marquées [À COMPLÉTER] doivent être renseignées avant
// toute mise en ligne publique : l'article 6-III de la LCEN les rend obligatoires pour
// un service de communication au public en ligne.
const LEGAL_SECTIONS = [
  {
    titre:'Mentions légales',
    blocs:[
      "<b>Éditeur</b><br>[À COMPLÉTER : nom ou raison sociale, forme juridique, adresse du siège, numéro SIREN si société]",
      "<b>Directeur de la publication</b><br>[À COMPLÉTER : nom]",
      "<b>Contact</b><br>[À COMPLÉTER : adresse e-mail]",
      "<b>Hébergeur</b><br>GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.",
    ]
  },
  {
    titre:'Alcool et responsabilité',
    blocs:[
      "Soirée est réservée aux personnes majeures. Elle propose des jeux qui impliquent la consommation d\u2019alcool entre adultes consentants.",
      "<b>"+MESSAGE_SANITAIRE+"</b>",
      "Aucun contenu de l\u2019application n\u2019oblige à boire. Les gorgées annoncées sont des propositions de jeu : chacun reste libre de refuser, de passer son tour ou de boire autre chose. Le mode <b>Sans alcool</b>, accessible depuis l\u2019accueil, remplace toutes les mentions de boisson par des gages.",
      "Ne jouez pas si vous êtes enceinte, si vous prenez un traitement incompatible avec l\u2019alcool, ou si vous devez conduire. Prévoyez de l\u2019eau, de quoi manger, et un moyen de rentrer.",
      "L\u2019éditeur ne peut être tenu responsable de l\u2019usage fait de l\u2019application ni de ses conséquences. Vous jouez sous votre seule responsabilité.",
      "Besoin d\u2019aide ou de conseils sur l\u2019alcool : <b>Alcool Info Service, 0 980 980 930</b> (anonyme, gratuit, 8h-2h) ou alcool-info-service.fr.",
    ]
  },
];

LEGAL_SECTIONS.push(
  {
    titre:'Vos données',
    blocs:[
      "<b>Rien de ce que vous saisissez ne quitte votre téléphone.</b> Soirée n\u2019a pas de compte, pas de serveur, pas de mesure d\u2019audience et pas de publicité. L\u2019éditeur ne reçoit aucune donnée et n\u2019en conserve aucune.",
      "Tout est enregistré dans la mémoire locale de votre navigateur, uniquement pour que l\u2019application fonctionne : les prénoms et réglages de la soirée en cours, l\u2019historique de vos parties, vos règles et défis personnalisés, vos préférences de son, de mode grand écran et de mode sans alcool, et la trace des paires de mots déjà tirées pour éviter les répétitions.",
      "Ces informations restent sur l\u2019appareil jusqu\u2019à ce que vous les effaciez. Le bouton ci-dessous les supprime toutes, immédiatement et définitivement.",
      "Le dépôt de ces informations ne nécessite pas votre consentement préalable : il est strictement nécessaire à la fourniture du service que vous demandez, cas prévu par l\u2019article 82 de la loi Informatique et Libertés. C\u2019est aussi pourquoi l\u2019application n\u2019affiche pas de bandeau cookies — elle n\u2019en dépose aucun.",
      "<b>Une exception à connaître</b> : la fonction de partage encode les prénoms de vos joueurs dans un lien. Si vous envoyez ce lien, ces prénoms transitent par le service que vous utilisez pour l\u2019envoyer (messagerie, réseau social). Cela ne se produit que si vous déclenchez le partage vous-même.",
      "Pour toute question relative à vos données : [À COMPLÉTER : adresse e-mail]. Vous pouvez également saisir la CNIL (cnil.fr).",
    ]
  },
  {
    titre:'Conditions d\u2019utilisation',
    blocs:[
      "L\u2019accès à Soirée est gratuit et réservé aux personnes majeures. En utilisant l\u2019application, vous déclarez avoir 18 ans révolus et accepter les présentes conditions.",
      "L\u2019application est fournie en l\u2019état, sans garantie de disponibilité ni d\u2019absence d\u2019erreur. L\u2019éditeur peut la modifier ou l\u2019interrompre à tout moment.",
      "Les contenus que vous ajoutez via <b>Mes ajouts</b> restent sur votre appareil et relèvent de votre seule responsabilité. Vous vous engagez à ne pas y saisir de contenu illicite, injurieux ou portant atteinte à autrui.",
      "Les textes, jeux, code et éléments graphiques de Soirée sont protégés par le droit d\u2019auteur. Toute reproduction ou réutilisation sans autorisation est interdite. Les règles des jeux traditionnels relèvent du domaine public ; leur rédaction et leur mise en œuvre dans l\u2019application ne le sont pas.",
      "Les présentes conditions sont soumises au droit français. À défaut d\u2019accord amiable, les tribunaux français sont compétents.",
      "<span class=\"legal-date\">Dernière mise à jour : [À COMPLÉTER : date de mise en ligne]</span>",
    ]
  }
);

// Suppression complète : on ne retire que nos propres clés, jamais tout le localStorage
// du domaine, qui pourrait contenir autre chose.
const SOIREE_KEYS = [
  'soiree_age_ok_v1','soiree_session_snapshot_v1','soiree_history_v1',
  'soiree_custom_content_v1','soiree_sober_mode_v1','soiree_tv_mode_v1',
  'soiree_und_wordbag_v1','terminus_sound_muted',
];

function eraseAllData(){
  const btn = document.getElementById('legal-erase-btn');
  if(btn.dataset.armed !== '1'){
    // Confirmation en deux temps plutôt qu'un confirm() bloquant, comme partout ailleurs.
    btn.dataset.armed = '1';
    btn.textContent = 'Confirmer la suppression';
    btn.classList.add('legal-erase-armed');
    return;
  }
  SOIREE_KEYS.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
  btn.textContent = 'Données effacées';
  btn.classList.remove('legal-erase-armed');
  btn.disabled = true;
  document.getElementById('legal-erase-note').textContent =
    'Tout a été supprimé de cet appareil. L\u2019application redemandera votre âge au prochain lancement.';
}

// Le message sanitaire est affiché aux trois endroits où il a du sens : la barrière
// d'âge (avant d'entrer), le bas des informations légales, et l'écran de fin de soirée
// — le moment où le groupe a le plus bu. Il est injecté depuis une constante unique
// pour qu'aucune copie ne dérive de la formulation légale.
function renderSanitaryNotices(){
  document.querySelectorAll('.sanitaire').forEach(function(el){ el.textContent = MESSAGE_SANITAIRE; });
  ['age-sanitaire','legal-sanitaire','end-sanitaire'].forEach(function(id){
    const el = document.getElementById(id);
    if(el) el.textContent = MESSAGE_SANITAIRE;
  });
}
