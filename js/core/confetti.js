// ===================================================================================
// EFFETS DE MOMENT — flash, impact, glitch, néon
// -----------------------------------------------------------------------------------
// Les confettis colorés d'origine tiraient l'app vers l'anniversaire d'enfant : petits
// rectangles pastel qui tombent doucement, à contre-emploi d'un before nocturne.
//
// Ici, le vocabulaire est celui d'une salle : une lumière qui claque, une onde qui
// traverse l'écran, un décrochage vidéo d'un dixième de seconde, un halo qui monte.
// Tout est dessiné sur un canvas plein écran en pointer-events:none — jamais un pixel
// n'intercepte un geste destiné aux commandes.
//
// Règles tenues : durées courtes (400 à 900 ms), jamais de boucle infinie, jamais de
// stroboscope (aucune alternance rapide clair/sombre), et rien du tout si l'utilisateur
// a demandé la réduction des animations.
//
// window.fireConfetti(taille) reste le point d'entrée : le nom est conservé pour ne pas
// toucher aux sept endroits qui l'appellent, mais il ne tombe plus de confettis.
(function(){
  let canvas = null, ctx = null, raf = null;
  let effects = [];
  let W = 0, H = 0;

  const ACCENT = [232, 255, 61];     // jaune acide, la signature
  const CLAY   = [255, 59, 92];      // rose vif, les ruptures

  function ensureCanvas(){
    if(canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'fx-canvas';
    canvas.style.cssText = 'position:fixed; inset:0; z-index:9999; pointer-events:none;';
    document.body.appendChild(canvas);
    window.addEventListener('resize', resize);
  }

  // Dimensions de la fenêtre, ou 0 si l'environnement ne les expose pas.
  function vw(){ return window.innerWidth || (document.documentElement||{}).clientWidth || 0; }
  function vh(){ return window.innerHeight || (document.documentElement||{}).clientHeight || 0; }

  function resize(){
    if(!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = vw(), h = vh();
    if(!w || !h) return;
    W = canvas.width = Math.floor(w * dpr);
    H = canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rgba(c, a){ return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a.toFixed(3)+')'; }
  // Courbe d'extinction : vif tout de suite, puis retombée douce. C'est ce profil qui
  // fait « impact » plutôt que « fondu ».
  function decay(t){ return Math.pow(1 - t, 2.2); }

  // --- LE FLASH : la lumière de la salle qui claque une fois. ------------------------
  function flash(intensity){
    return { life: 320, t: 0, draw(p){
      const a = decay(p) * intensity;
      const g = ctx.createRadialGradient(vw()/2, vh()*0.42, 0,
                                         vw()/2, vh()*0.42, vh()*0.75);
      g.addColorStop(0, rgba(ACCENT, a * 0.5));
      g.addColorStop(0.45, rgba(ACCENT, a * 0.12));
      g.addColorStop(1, rgba(ACCENT, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw(), vh());
    }};
  }

  // --- L'ONDE : un anneau net qui s'ouvre depuis le centre. -------------------------
  function shockwave(color, delay){
    return { life: 620, t: -(delay || 0), draw(p){
      const r = vh() * 0.08 + p * vh() * 0.62;
      ctx.save();
      ctx.strokeStyle = rgba(color, decay(p) * 0.7);
      ctx.lineWidth = 2 + (1 - p) * 4;
      ctx.beginPath();
      ctx.arc(vw()/2, vh()*0.44, r, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }};
  }

  // --- LES BARRES NÉON : des traits horizontaux qui balaient l'écran. ---------------
  function neonBars(count, color){
    const bars = Array.from({length: count}, ()=>({
      y: Math.random() * vh(),
      h: 1 + Math.random() * 3,
      dir: Math.random() < 0.5 ? -1 : 1,
      speed: 0.6 + Math.random() * 1.6,
      off: Math.random() * 0.35
    }));
    return { life: 700, t: 0, draw(p){
      bars.forEach(b=>{
        const bp = Math.max(0, Math.min(1, (p - b.off) / (1 - b.off)));
        if(bp <= 0) return;
        const a = decay(bp) * 0.85;
        const w = vw() * (0.25 + bp * 1.1);
        const x = b.dir > 0 ? -vw()*0.2 + bp * vw() * b.speed
                            : vw()*1.2 - bp * vw() * b.speed - w;
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, rgba(color, 0));
        g.addColorStop(0.5, rgba(color, a));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, b.y, w, b.h);
      });
    }};
  }

  // --- LE GLITCH : trois décrochages horizontaux, très courts. ----------------------
  // Volontairement bref et peu nombreux : répété, ce serait du bruit ; une fois, c'est
  // une coupure de courant.
  function glitch(){
    const slices = Array.from({length: 3}, ()=>({
      y: vh() * (0.25 + Math.random() * 0.5),
      h: 6 + Math.random() * 26,
      dx: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 40),
      at: Math.random() * 0.5
    }));
    return { life: 260, t: 0, draw(p){
      slices.forEach(s=>{
        if(p < s.at || p > s.at + 0.3) return;
        const a = 0.5 * (1 - (p - s.at) / 0.3);
        ctx.fillStyle = rgba(ACCENT, a * 0.55);
        ctx.fillRect(s.dx, s.y, vw(), s.h * 0.5);
        ctx.fillStyle = rgba(CLAY, a * 0.4);
        ctx.fillRect(-s.dx * 0.6, s.y + s.h * 0.5, vw(), s.h * 0.4);
      });
    }};
  }

  // --- LA MONTÉE : des éclats qui filent vers le haut, comme des étincelles. --------
  function embers(count, color){
    const parts = Array.from({length: count}, ()=>({
      x: vw() * (0.1 + Math.random() * 0.8),
      y: vh() * (0.55 + Math.random() * 0.4),
      vy: 1.6 + Math.random() * 3.4,
      vx: (Math.random() - 0.5) * 1.2,
      r: 1 + Math.random() * 2.4,
      off: Math.random() * 0.3
    }));
    return { life: 900, t: 0, draw(p){
      parts.forEach(s=>{
        const sp = Math.max(0, (p - s.off) / (1 - s.off));
        if(sp <= 0) return;
        const y = s.y - sp * s.vy * vh() * 0.34;
        const x = s.x + Math.sin(sp * 6 + s.x) * 8 * s.vx;
        ctx.fillStyle = rgba(color, decay(sp) * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, s.r * (1 - sp * 0.4), 0, Math.PI*2);
        ctx.fill();
      });
    }};
  }

  function loop(ts){
    if(!ctx){ raf = null; return; }
    if(!loop.last) loop.last = ts;
    const dt = Math.min(48, ts - loop.last);
    loop.last = ts;
    ctx.clearRect(0, 0, vw(), vh());
    // Les effets s'additionnent : c'est ce qui donne l'impression d'un seul moment fort
    // plutôt que d'une succession de petites animations.
    ctx.globalCompositeOperation = 'lighter';
    effects = effects.filter(e=>{
      e.t += dt;
      if(e.t < 0) return true;
      const p = e.t / e.life;
      if(p >= 1) return false;
      e.draw(p);
      return true;
    });
    ctx.globalCompositeOperation = 'source-over';
    if(effects.length){ raf = requestAnimationFrame(loop); }
    else { raf = null; loop.last = 0; ctx.clearRect(0, 0, vw(), vh()); }
  }

  // taille : 'small' (une réussite), 'big' (la finale), 'huge' (fin de soirée).
  // Le nom est hérité de l'ancienne implémentation à confettis ; les sept appels
  // existants n'ont pas eu à changer.
  window.fireConfetti = function(size){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ensureCanvas();
    resize();
    if(size === 'huge'){
      effects.push(flash(1), shockwave(ACCENT, 0), shockwave(CLAY, 120),
                   neonBars(9, ACCENT), embers(34, ACCENT), glitch());
    } else if(size === 'big'){
      effects.push(flash(0.8), shockwave(ACCENT, 0), neonBars(6, ACCENT), embers(20, ACCENT));
    } else {
      effects.push(flash(0.45), shockwave(ACCENT, 0), neonBars(3, ACCENT));
    }
    if(!raf) raf = requestAnimationFrame(loop);
  };

  // Un décrochage seul, pour les ratés et les ruptures — sans la lumière de victoire.
  window.fireGlitch = function(){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ensureCanvas();
    resize();
    effects.push(glitch(), neonBars(2, CLAY));
    if(!raf) raf = requestAnimationFrame(loop);
  };
})();
