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
    d: state.durationMin
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
// pré-remplit le wizard (joueurs + durée) et on saute directement à l'étape des
// prénoms, prêts à valider — la personne qui reçoit le lien n'a plus qu'à passer à
// la durée puis lancer.
// Renvoie true si une config partagée a été trouvée et appliquée (auquel cas l'appelant
// n'a pas besoin de proposer par-dessus le bandeau de reprise de session).
function applySharedConfigFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const payload = params.get('c');
  if(!payload) return false;
  const cfg = decodeShareConfig(payload);
  if(!cfg || !Array.isArray(cfg.n) || !cfg.n.length) return false;

  // Le payload vient d'une URL : n'importe qui peut en fabriquer une et l'envoyer. On ne
  // fait donc jamais confiance à son contenu — coercition en chaîne, longueur et nombre
  // de joueurs bornés, entrées vides écartées. L'échappement à l'affichage (escapeHtml)
  // est la seconde ligne de défense, pas la seule.
  const noms = cfg.n
    .map(n=> String(n == null ? '' : n).trim().slice(0, 24))
    .filter(Boolean)
    .slice(0, 12);
  if(!noms.length) return false;

  state.players = noms.map((name, idx)=>({
    name,
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    avatar: PLAYER_AVATARS[idx % PLAYER_AVATARS.length]
  }));
  state.playerCount = state.players.length;
  state.durationMin = DURATIONS.some(d=>d.min===cfg.d) ? cfg.d : state.durationMin;

  // Nettoie l'URL pour ne pas re-appliquer la config si l'utilisateur recharge
  // après avoir modifié ses joueurs.
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('c');
  window.history.replaceState({}, '', cleanUrl.toString());

  // Bascule sur la page de configuration unique avec les pr\u00e9noms partag\u00e9s d\u00e9j\u00e0
  // pr\u00e9remplis. L'ancien code pointait sur le tunnel en \u00e9tapes (#player-count,
  // .step[data-step]) qui n'existe plus : il aurait plant\u00e9 \u00e0 l'ouverture du lien.
  nameDraft = state.players.map(p => p.name);
  openSetupFor({ type:'before', game:null });
  return true;
}
