// Retour sensoriel (vibration + son) sur les transitions et fins de minuteur, pour que
// le groupe perçoive les changements d'écran même en pleine conversation bruyante.
// Le son est généré via Web Audio (oscillateur) : aucun fichier audio à charger.
// Réglages persistés en localStorage pour ne pas re-demander à chaque soirée.

const FEEDBACK_PREFS_KEY = 'soiree_feedback_prefs_v1';

function loadFeedbackPrefs(){
  try{
    const raw = localStorage.getItem(FEEDBACK_PREFS_KEY);
    return raw ? JSON.parse(raw) : { sound:true, vibration:true };
  }catch(e){
    return { sound:true, vibration:true };
  }
}

let feedbackPrefs = loadFeedbackPrefs();
let sharedAudioCtx = null;

function saveFeedbackPrefs(){
  try{ localStorage.setItem(FEEDBACK_PREFS_KEY, JSON.stringify(feedbackPrefs)); }catch(e){}
}

function toggleFeedbackPref(kind){
  feedbackPrefs[kind] = !feedbackPrefs[kind];
  saveFeedbackPrefs();
  renderFeedbackToggles();
}

function renderFeedbackToggles(){
  document.querySelectorAll('.feedback-toggle-sound').forEach(el=> el.classList.toggle('active', feedbackPrefs.sound));
  document.querySelectorAll('.feedback-toggle-vibration').forEach(el=> el.classList.toggle('active', feedbackPrefs.vibration));
}

function vibrate(pattern){
  if(feedbackPrefs.vibration && navigator.vibrate) navigator.vibrate(pattern);
}

// Joue un bip court via un oscillateur Web Audio. `freq` en Hz, `duration` en secondes.
// L'AudioContext est créé au premier appel (souvent depuis un clic utilisateur, requis
// par les navigateurs pour autoriser l'audio) puis réutilisé.
function playTone(freq, duration){
  if(!feedbackPrefs.sound) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx) return;
  if(!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
  if(sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();

  const osc = sharedAudioCtx.createOscillator();
  const gain = sharedAudioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Fondu de sortie pour éviter un clic audio désagréable en fin de note.
  gain.gain.setValueAtTime(0.15, sharedAudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + duration);
  osc.connect(gain).connect(sharedAudioCtx.destination);
  osc.start();
  osc.stop(sharedAudioCtx.currentTime + duration);
}

function playTickSound(){ playTone(660, 0.12); }
function playTimerEndSound(){ playTone(880, 0.18); }
function playClimaxSound(){
  playTone(440, 0.15);
  setTimeout(()=> playTone(660, 0.25), 160);
}
