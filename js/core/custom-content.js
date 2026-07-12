// Mode "solo custom" : l'utilisateur ajoute ses propres règles/défis en texte libre
// (supportant {p1}/{p2} comme le contenu natif), stockés en localStorage. Ils sont
// injectés dans les pools RULES/CHALLENGES au lancement d'une session (voir
// getEffectiveRules/getEffectiveChallenges, utilisées par session-engine.js à la place
// de RULES/CHALLENGES directement), pour personnaliser sans toucher au code source.

const CUSTOM_CONTENT_KEY = 'soiree_custom_content_v1';

function loadCustomContent(){
  try{
    const raw = localStorage.getItem(CUSTOM_CONTENT_KEY);
    return raw ? JSON.parse(raw) : { rules:[], challenges:[] };
  }catch(e){
    return { rules:[], challenges:[] };
  }
}

function saveCustomContent(data){
  try{
    localStorage.setItem(CUSTOM_CONTENT_KEY, JSON.stringify(data));
  }catch(e){
    // localStorage indisponible (navigation privée, quota) : les ajouts restent en mémoire
    // pour la session en cours mais ne survivront pas au rechargement.
  }
}

function addCustomRule(text, tier){
  if(!text.trim()) return;
  const data = loadCustomContent();
  data.rules.push({text: text.trim(), tier: tier, custom:true});
  saveCustomContent(data);
  renderCustomContentList();
}

function addCustomChallenge(text, playersNeeded, tier){
  if(!text.trim()) return;
  const data = loadCustomContent();
  data.challenges.push({text: text.trim(), n: playersNeeded, tier: tier, custom:true});
  saveCustomContent(data);
  renderCustomContentList();
}

function removeCustomItem(kind, index){
  const data = loadCustomContent();
  data[kind].splice(index, 1);
  saveCustomContent(data);
  renderCustomContentList();
}

// Pools "effectifs" utilisés par le moteur de session : contenu natif + ajouts perso.
// Séparées de RULES/CHALLENGES (js/data/content.js) pour ne jamais modifier les
// données natives, seulement les compléter.
function getEffectiveRules(){
  return RULES.concat(loadCustomContent().rules);
}
function getEffectiveChallenges(){
  return CHALLENGES.concat(loadCustomContent().challenges);
}

function renderCustomContentList(){
  const data = loadCustomContent();

  const rulesWrap = document.getElementById('custom-rules-list');
  rulesWrap.innerHTML = '';
  if(!data.rules.length){
    rulesWrap.innerHTML = '<div class="step-sub">Aucune règle perso pour l\'instant.</div>';
  }
  data.rules.forEach((r, idx)=>{
    const row = document.createElement('div');
    row.className = 'chip';
    row.style.width = '100%';
    row.innerHTML = '<span style="flex:1;">'+r.text+'</span><span class="x" onclick="removeCustomItem(\'rules\','+idx+')">×</span>';
    rulesWrap.appendChild(row);
  });

  const challWrap = document.getElementById('custom-challenges-list');
  challWrap.innerHTML = '';
  if(!data.challenges.length){
    challWrap.innerHTML = '<div class="step-sub">Aucun défi perso pour l\'instant.</div>';
  }
  data.challenges.forEach((c, idx)=>{
    const row = document.createElement('div');
    row.className = 'chip';
    row.style.width = '100%';
    row.innerHTML = '<span style="flex:1;">'+c.text+'</span><span class="x" onclick="removeCustomItem(\'challenges\','+idx+')">×</span>';
    challWrap.appendChild(row);
  });
}

function submitCustomRule(){
  const field = document.getElementById('custom-rule-field');
  const tier = parseInt(document.getElementById('custom-rule-tier').value);
  addCustomRule(field.value, tier);
  field.value = '';
}

function submitCustomChallenge(){
  const field = document.getElementById('custom-challenge-field');
  const tier = parseInt(document.getElementById('custom-challenge-tier').value);
  const withSecondPlayer = field.value.includes('{p2}');
  addCustomChallenge(field.value, withSecondPlayer ? 2 : 1, tier);
  field.value = '';
}

function openCustomScreen(){
  renderCustomContentList();
  goTo('custom');
}
