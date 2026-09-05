/* Lightweight synthesized sound effects (Web Audio API, no audio files needed) */
const Sound = (function(){
  let ctx = null;
  // localStorage jette (pas seulement renvoie null) en navigation privée iOS : sans
  // garde, le module entier échouait au chargement et plus aucun son ne fonctionnait.
  let muted = false;
  try{ muted = localStorage.getItem('terminus_sound_muted') === 'true'; }catch(e){}

  function getCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, opts){
    opts = opts || {};
    const c = getCtx();
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if(opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + duration);
    const peak = opts.volume !== undefined ? opts.volume : 0.16;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  function noiseBurst(duration, opts){
    opts = opts || {};
    const c = getCtx();
    const t0 = c.currentTime;
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++){ data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.value = opts.filterFreq || 1200;
    filter.Q.value = opts.q || 0.8;
    const gain = c.createGain();
    gain.gain.setValueAtTime(opts.volume !== undefined ? opts.volume : 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
  }

  const effects = {
    click(){ tone(720, 0.045, {type:'square', volume:0.05}); },
    tick(){ tone(1000, 0.035, {type:'sine', volume:0.08}); },
    ding(){ tone(1320, 0.5, {type:'sine', volume:0.14}); setTimeout(()=> tone(1980, 0.4, {type:'sine', volume:0.08}), 60); },
    cardFlip(){ noiseBurst(0.09, {filterType:'highpass', filterFreq:1800, volume:0.16}); },
    dice(){
      [0, 70, 140].forEach((delay, i)=>{
        setTimeout(()=> noiseBurst(0.045, {filterType:'bandpass', filterFreq:2200 + i * 300, volume:0.18}), delay);
      });
    },
    coin(){ tone(1600, 0.25, {type:'sine', volume:0.1, slideTo:400}); },
    success(){ tone(660, 0.11, {type:'sine', volume:0.14}); setTimeout(()=> tone(880, 0.16, {type:'sine', volume:0.16}), 90); },
    fail(){ tone(220, 0.22, {type:'sawtooth', volume:0.11, slideTo:110}); },
    collapse(){ noiseBurst(0.28, {filterType:'lowpass', filterFreq:400, volume:0.28}); tone(90, 0.3, {type:'sine', volume:0.14, slideTo:40}); },
    win(){ [523,659,784,1047].forEach((f,i)=> setTimeout(()=> tone(f, 0.22, {type:'sine', volume:0.14}), i * 110)); },
    sting(){ tone(180, 0.5, {type:'sawtooth', volume:0.09, slideTo:900}); noiseBurst(0.4, {filterType:'highpass', filterFreq:1500, volume:0.1}); },
    capOpen(){ noiseBurst(0.05, {filterType:'highpass', filterFreq:3000, volume:0.15}); setTimeout(()=> tone(1800, 0.05, {type:'sine', volume:0.09}), 20); },
    powerConfirm(){
      const c = getCtx(); const t0 = c.currentTime;
      const osc = c.createOscillator(); const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.linearRampToValueAtTime(200, t0 + 0.08);
      osc.frequency.linearRampToValueAtTime(320, t0 + 0.16);
      osc.frequency.linearRampToValueAtTime(220, t0 + 0.24);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(gain).connect(c.destination);
      osc.start(t0); osc.stop(t0 + 0.3);
      setTimeout(()=> tone(80, 0.18, {type:'sine', volume:0.16, slideTo:50}), 260);
    },
    alarm(){ [0,220,440,660].forEach((delay,i)=> setTimeout(()=> tone(i % 2 === 0 ? 1200 : 900, 0.18, {type:'square', volume:0.11}), delay)); },
    gong(){ tone(110, 1.1, {type:'sine', volume:0.18, slideTo:60}); noiseBurst(0.5, {filterType:'lowpass', filterFreq:800, volume:0.16}); },
  };

  let ambianceTimer = null;
  let ambianceDrone = null;

  function heartbeatPulse(){
    tone(55, 0.12, {type:'sine', volume:0.12});
    setTimeout(()=> tone(50, 0.16, {type:'sine', volume:0.09}), 140);
  }

  function startAmbiance(){
    if(muted || ambianceTimer) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 3200;
    gain.gain.value = 0.008;
    osc.connect(gain).connect(c.destination);
    osc.start();
    ambianceDrone = osc;
    heartbeatPulse();
    ambianceTimer = setInterval(heartbeatPulse, 1000);
  }

  function stopAmbiance(){
    if(ambianceTimer){ clearInterval(ambianceTimer); ambianceTimer = null; }
    if(ambianceDrone){ try{ ambianceDrone.stop(); }catch(e){} ambianceDrone = null; }
  }

  function ambiance(on){ on ? startAmbiance() : stopAmbiance(); }

  function play(name){
    if(muted) return;
    const fn = effects[name];
    if(fn) fn();
  }

  function updateToggleUI(){
    const btn = document.getElementById('sound-toggle-btn');
    if(btn) btn.textContent = muted ? '🔇' : '🔊';
  }

  function setMuted(v){
    muted = v;
    try{ localStorage.setItem('terminus_sound_muted', muted ? 'true' : 'false'); }catch(e){}
    if(muted) stopAmbiance();
    updateToggleUI();
  }

  function toggle(){ setMuted(!muted); if(!muted) play('click'); }

  document.addEventListener('click', function(e){
    const el = e.target.closest('button, [onclick], .choice');
    if(el && el.id !== 'sound-toggle-btn') play('click');
  }, true);

  document.addEventListener('DOMContentLoaded', updateToggleUI);

  return { play, toggle, ambiance };
})();
