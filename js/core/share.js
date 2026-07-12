// Partage de configuration de soirée : encode joueurs / durée / intensité dans l'URL
// (?c=<payload>) pour qu'un lien ou un QR code permette de relancer la même config
// sans tout retaper. Le payload est le JSON de la config, encodé en base64 "URL-safe"
// (btoa + remplacement des caractères réservés) : pas besoin de backend, tout tient
// dans l'URL.

function encodeShareConfig(cfg){
  const json = JSON.stringify(cfg);
  // encodeURIComponent/unescape avant btoa : gère proprement les accents (é, è...)
  // qu'un simple btoa(json) ferait planter (Latin1 uniquement).
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decodeShareConfig(payload){
  try{
    let b64 = payload.replace(/-/g,'+').replace(/_/g,'/');
    while(b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  }catch(e){
    return null;
  }
}

function buildShareUrl(){
  const cfg = {
    n: state.players.map(p=>p.name),
    d: state.durationMin,
    i: state.intensityValue
  };
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('c', encodeShareConfig(cfg));
  return url.toString();
}

// Génère le QR code dans le conteneur donné avec la librairie vendue js/lib/qrcode.js.
// Niveau de correction d'erreur 'M' : bon compromis lisibilité/densité pour ces URLs
// (souvent 60-120 caractères avec plusieurs prénoms).
function renderShareQrCode(containerEl, url){
  containerEl.innerHTML = '';
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  containerEl.innerHTML = qr.createSvgTag(4, 8);
}

function openShareScreen(){
  const url = buildShareUrl();
  document.getElementById('share-url-field').value = url;
  renderShareQrCode(document.getElementById('share-qr-wrap'), url);
  document.getElementById('share-copy-feedback').textContent = '';
  goTo('share');
}

function copyShareUrl(){
  const field = document.getElementById('share-url-field');
  field.select();
  field.setSelectionRange(0, 99999);
  const feedback = document.getElementById('share-copy-feedback');
  navigator.clipboard.writeText(field.value).then(()=>{
    feedback.textContent = 'Lien copié !';
  }).catch(()=>{
    // Fallback si l'API Clipboard est indisponible (contexte non sécurisé, vieux navigateur...)
    document.execCommand('copy');
    feedback.textContent = 'Lien copié !';
  });
}

// Au chargement de la page, si l'URL contient une config partagée (?c=...), on
// pré-remplit le wizard (joueurs + durée + intensité) et on saute directement à
// l'étape "intensité" pour confirmer/lancer — la personne qui reçoit le lien n'a
// qu'à valider.
// Renvoie true si une config partagée a été trouvée et appliquée (auquel cas l'appelant
// n'a pas besoin de proposer par-dessus le bandeau de reprise de session).
function applySharedConfigFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const payload = params.get('c');
  if(!payload) return false;
  const cfg = decodeShareConfig(payload);
  if(!cfg || !Array.isArray(cfg.n) || !cfg.n.length) return false;

  state.players = cfg.n.map((name, idx)=>({name, color: PLAYER_COLORS[idx % PLAYER_COLORS.length]}));
  state.playerCount = state.players.length;
  state.durationMin = DURATIONS.some(d=>d.min===cfg.d) ? cfg.d : state.durationMin;
  state.intensityValue = Number.isFinite(cfg.i) ? Math.max(0, Math.min(100, cfg.i)) : state.intensityValue;

  // Nettoie l'URL pour ne pas re-appliquer la config si l'utilisateur recharge
  // après avoir modifié ses joueurs.
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('c');
  window.history.replaceState({}, '', cleanUrl.toString());

  goTo('setup');
  document.getElementById('player-count').value = state.playerCount;
  // Synchronise aussi le slider d'intensité et son libellé : sans ça, l'input DOM garde
  // sa valeur par défaut (50) même si state.intensityValue a été mis à jour.
  document.getElementById('intensity-slider').value = state.intensityValue;
  updateIntensityLabel(state.intensityValue);
  state.step = 1;
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.querySelector('.step[data-step="1"]').classList.add('active');
  document.querySelectorAll('#setup-progress div').forEach((d,i)=> d.classList.toggle('done', i < state.step));
  renderChips();
  return true;
}
