// Mode "grand écran" : agrandit le texte de l'écran principal et passe en plein écran,
// pour poser le téléphone/laptop au centre de la table et lire de loin. Purement visuel
// (classe CSS sur #frame) + Fullscreen API en best-effort (peut être refusée par le
// navigateur hors d'un geste utilisateur direct, d'où le try/catch).

const TV_MODE_KEY = 'soiree_tv_mode_v1';

function isTvModeOn(){
  return localStorage.getItem(TV_MODE_KEY) === '1';
}

function applyTvModeClass(){
  document.getElementById('frame').classList.toggle('tv-mode', isTvModeOn());
  document.querySelectorAll('.tv-mode-toggle').forEach(el=> el.classList.toggle('active', isTvModeOn()));
}

async function toggleTvMode(){
  const next = !isTvModeOn();
  localStorage.setItem(TV_MODE_KEY, next ? '1' : '0');
  applyTvModeClass();

  try{
    if(next && document.documentElement.requestFullscreen){
      await document.documentElement.requestFullscreen();
    } else if(!next && document.fullscreenElement){
      await document.exitFullscreen();
    }
  }catch(e){
    // Le plein écran est refusé (hors geste utilisateur direct, iOS Safari, etc.) :
    // le mode grand écran reste actif visuellement, seul le plein écran est ignoré.
  }
}
