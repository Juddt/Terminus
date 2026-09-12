// Confetti canvas — le clin d'œil visuel à l'identité « Le Confetti » : une pluie de
// tickets colorés (un rectangle par couleur de type) au lieu de ronds génériques.
(function(){
  const TYPE_COLORS = ['#E1502F', '#1D6E86', '#DA9A1F', '#6A4A82', '#2E7D57'];
  let canvas, ctx, particles = [], raf = null;

  function ensureCanvas(){
    if(canvas) return canvas;
    const frame = document.getElementById('frame');
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:absolute; inset:0; z-index:400; pointer-events:none;';
    frame.appendChild(canvas);
    resize();
    window.addEventListener('resize', resize);
    return canvas;
  }
  function resize(){
    if(!canvas) return;
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
  }

  function spawn(n, w){
    const arr = [];
    for(let i=0;i<n;i++){
      arr.push({
        x: Math.random()*w,
        y: -20 - Math.random()*80,
        w: 6+Math.random()*5,
        h: 9+Math.random()*7,
        vx: (Math.random()-0.5)*2.2,
        vy: 2.2+Math.random()*2.4,
        rot: Math.random()*Math.PI*2,
        vrot: (Math.random()-0.5)*0.25,
        color: TYPE_COLORS[Math.floor(Math.random()*TYPE_COLORS.length)],
        life: 0,
        maxLife: 100+Math.random()*40
      });
    }
    return arr;
  }

  function loop(){
    if(!ctx) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    particles.forEach(p=>{
      if(p.life >= p.maxLife) return;
      alive = true;
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rot += p.vrot;
      const fade = p.life > p.maxLife - 25 ? Math.max(0, (p.maxLife - p.life)/25) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    particles = particles.filter(p=> p.life < p.maxLife && p.y < canvas.height + 40);
    if(alive || particles.length){
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }

  // size: 'small' (défi réussi), 'big' (climax), 'huge' (fin de soirée).
  window.fireConfetti = function(size){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ensureCanvas();
    ctx = canvas.getContext('2d');
    resize();
    const counts = { small: 26, big: 60, huge: 110 };
    const n = counts[size] || counts.small;
    particles = particles.concat(spawn(n, canvas.width));
    if(!raf) raf = requestAnimationFrame(loop);
  };
})();
