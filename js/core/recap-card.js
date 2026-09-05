// Carte-souvenir de fin de soirée : dessine le podium MVP/Loser + les stats sur un
// <canvas> (aucune lib externe) pour produire une image téléchargeable/partageable
// (format 1080x1350, portrait, adapté aux stories/posts). Les infos viennent de
// computeTargetPodium() (session-engine.js) et state.stats, donc doivent être lues
// avant resetAll() qui vide `state`.

const RECAP_W = 1080, RECAP_H = 1350;

// Charge la police Fraunces avant de dessiner, sinon le premier rendu tombe sur la
// police système par défaut (le canvas ne réutilise pas automatiquement les fonts
// CSS tant qu'elles ne sont pas signalées "prêtes" par la Font Loading API).
async function ensureRecapFontsLoaded(){
  if(!document.fonts || !document.fonts.load) return;
  try{
    await Promise.all([
      document.fonts.load('600 64px Fraunces'),
      document.fonts.load('500 32px Fraunces'),
      document.fonts.load('500 28px Inter'),
    ]);
  }catch(e){
    // Tant pis, le canvas retombera sur la police système par défaut du navigateur.
  }
}

function drawRecapBackground(ctx){
  const grad = ctx.createRadialGradient(RECAP_W*0.7, RECAP_H*0.15, 50, RECAP_W*0.5, RECAP_H*0.4, RECAP_W*0.9);
  grad.addColorStop(0, '#3a2412');
  grad.addColorStop(1, '#17120f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RECAP_W, RECAP_H);
}

function drawRecapRow(ctx, y, icon, label, value, accentColor){
  ctx.textAlign = 'left';
  ctx.font = '44px serif';
  ctx.fillText(icon, 80, y);

  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillStyle = 'rgba(244,236,226,0.5)';
  ctx.fillText(label.toUpperCase(), 150, y - 16);

  ctx.font = '600 34px Fraunces, serif';
  ctx.fillStyle = accentColor || '#f4ece2';
  ctx.fillText(value, 150, y + 22);
}

// Construit le canvas complet. `podium` est le résultat de computeTargetPodium() (peut
// être null si personne n'a été ciblé), `stats`/`durationMin` viennent de `state`.
async function buildRecapCanvas(podium, stats, durationMin){
  await ensureRecapFontsLoaded();

  const canvas = document.createElement('canvas');
  canvas.width = RECAP_W;
  canvas.height = RECAP_H;
  const ctx = canvas.getContext('2d');

  drawRecapBackground(ctx);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4ece2';
  ctx.font = '600 76px Fraunces, serif';
  ctx.fillText('SOIRÉE', RECAP_W/2, 160);
  ctx.font = '500 26px Inter, sans-serif';
  ctx.fillStyle = '#c99a67';
  ctx.letterSpacing = '4px';
  ctx.fillText('LE RÉCAP DE LA SOIRÉE', RECAP_W/2, 210);
  ctx.letterSpacing = '0px';

  let y = 340;
  if(podium){
    ctx.textAlign = 'center';
    ctx.font = '80px serif';
    ctx.fillText('🏆', RECAP_W/2, y);
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(244,236,226,0.5)';
    ctx.fillText('MVP DE LA SOIRÉE', RECAP_W/2, y + 50);
    ctx.font = '600 56px Fraunces, serif';
    ctx.fillStyle = '#f4ece2';
    ctx.fillText((podium.mvp.avatar||'') + ' ' + podium.mvp.name, RECAP_W/2, y + 110);

    y += 190;
    ctx.font = '60px serif';
    ctx.fillText('😌', RECAP_W/2, y);
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillStyle = 'rgba(244,236,226,0.5)';
    ctx.fillText('LE PLUS TRANQUILLE', RECAP_W/2, y + 42);
    ctx.font = '600 42px Fraunces, serif';
    ctx.fillStyle = '#f4ece2';
    ctx.fillText((podium.chill.avatar||'') + ' ' + podium.chill.name, RECAP_W/2, y + 92);
    y += 160;
  } else {
    y += 60;
  }

  // Séparateur discret
  ctx.strokeStyle = 'rgba(244,236,226,0.14)';
  ctx.beginPath();
  ctx.moveTo(120, y);
  ctx.lineTo(RECAP_W-120, y);
  ctx.stroke();
  y += 80;

  drawRecapRow(ctx, y, '⏱️', 'Durée', durationMin + ' minutes');
  y += 90;
  drawRecapRow(ctx, y, '🎯', 'Défis lancés', String(stats.challenges));
  y += 90;
  drawRecapRow(ctx, y, '📜', 'Règles imposées', String(stats.rulesAdded));
  y += 90;
  drawRecapRow(ctx, y, '✨', 'Événements spéciaux', String(stats.specials));

  ctx.textAlign = 'center';
  ctx.font = '500 20px Inter, sans-serif';
  ctx.fillStyle = 'rgba(244,236,226,0.4)';
  ctx.fillText('Généré avec l\'app Soirée', RECAP_W/2, RECAP_H - 50);

  return canvas;
}

function canvasToBlob(canvas){
  return new Promise(resolve=> canvas.toBlob(resolve, 'image/png'));
}

async function openRecapScreen(){
  const podium = computeTargetPodium();
  // Copie défensive : state.stats/durationMin peuvent changer si l'utilisateur relance
  // une soirée pendant que ce screen est ouvert.
  const stats = { ...state.stats };
  const durationMin = state.durationMin;

  goTo('recap');
  const preview = document.getElementById('recap-preview');
  preview.innerHTML = '<div class="step-sub">Génération de l\'image…</div>';

  const canvas = await buildRecapCanvas(podium, stats, durationMin);
  preview.innerHTML = '';
  canvas.id = 'recap-canvas';
  preview.appendChild(canvas);
}

async function downloadRecapImage(){
  const canvas = document.getElementById('recap-canvas');
  if(!canvas) return;
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'soiree-recap.png';
  a.click();
  URL.revokeObjectURL(url);
}

async function shareRecapImage(){
  const canvas = document.getElementById('recap-canvas');
  if(!canvas) return;
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], 'soiree-recap.png', {type:'image/png'});

  // Web Share API niveau 2 (fichiers) : dispo sur mobile principalement. Sur desktop ou
  // navigateur non supporté, on retombe sur le téléchargement direct.
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file], title:'Soirée'});
      return;
    }catch(e){
      // Partage annulé par l'utilisateur ou échec silencieux : on retombe sur le
      // téléchargement plutôt que de laisser l'utilisateur sans rien.
    }
  }
  downloadRecapImage();
}
