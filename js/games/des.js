const des = { players:[] };

function desSetup(){
  des.players=[];
  document.getElementById('des-chips').innerHTML='';
  document.getElementById('des-name-field').value='';
  document.getElementById('des-start-btn').disabled=true;
  goTo('des-setup');
  setTimeout(()=> document.getElementById('des-name-field').focus(), 100);
}

document.getElementById('des-name-field').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val && des.players.length<2){
      des.players.push(val);
      e.target.value='';
      desRenderChips();
    }
  }
});

function desRenderChips(){
  const wrap=document.getElementById('des-chips');
  wrap.innerHTML='';
  des.players.forEach((name,i)=>{
    const chip=document.createElement('div');
    chip.className='chip';
    chip.innerHTML=name+'<span class="x" onclick="desRemovePlayer('+i+')">×</span>';
    wrap.appendChild(chip);
  });
  document.getElementById('des-start-btn').disabled = des.players.length !== 2;
}
function desRemovePlayer(i){ des.players.splice(i,1); desRenderChips(); }

function desDieHTML(value, rolling){
  const pips = {
    1:[0,0,0,0,1,0,0,0,0],
    2:[0,0,1,0,0,0,1,0,0],
    3:[0,0,1,0,1,0,1,0,0],
    4:[1,0,1,0,0,0,1,0,1],
    5:[1,0,1,0,1,0,1,0,1],
    6:[1,0,1,1,0,1,1,0,1],
  };
  const p = pips[value] || pips[1];
  return '<div class="die'+(rolling?' rolling':'')+'">'
    + p.map(on => '<div class="pip'+(on?' on':'')+'"></div>').join('')
    + '</div>';
}

function desStartGame(){
  if(des.players.length!==2) return;
  goTo('des');
  desShowReady();
}

function desShowReady(){
  const body = document.getElementById('des-body');
  const footer = document.getElementById('des-footer');
  body.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;">'+
      '<div class="die-wrap"><div class="die-name">'+des.players[0]+'</div>'+desDieHTML(1,false)+'</div>'+
      '<div class="die-vs">VS</div>'+
      '<div class="die-wrap"><div class="die-name">'+des.players[1]+'</div>'+desDieHTML(1,false)+'</div>'+
    '</div>';
  footer.innerHTML = '<button class="btn btn-primary" onclick="desRoll()">Lancer les dés</button>';
}

function desRoll(){
  const body = document.getElementById('des-body');
  const footer = document.getElementById('des-footer');
  footer.innerHTML = '';

  // Animate random faces for 700ms
  let rollCount = 0;
  const rollInterval = setInterval(()=>{
    const r1 = Math.floor(Math.random()*6)+1;
    const r2 = Math.floor(Math.random()*6)+1;
    body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;">'+
        '<div class="die-wrap"><div class="die-name">'+des.players[0]+'</div>'+desDieHTML(r1,true)+'</div>'+
        '<div class="die-vs">×</div>'+
        '<div class="die-wrap"><div class="die-name">'+des.players[1]+'</div>'+desDieHTML(r2,true)+'</div>'+
      '</div>';
    rollCount++;
  }, 80);

  setTimeout(()=>{
    clearInterval(rollInterval);
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    const product = d1 * d2;

    if(d1 === d2){
      // Tie — show briefly then auto-reroll
      body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;">'+
          '<div class="die-wrap"><div class="die-name">'+des.players[0]+'</div>'+desDieHTML(d1,false)+
            '<div style="font-family:Fraunces,serif;font-size:28px;margin-top:6px;">'+d1+'</div></div>'+
          '<div class="die-vs">=</div>'+
          '<div class="die-wrap"><div class="die-name">'+des.players[1]+'</div>'+desDieHTML(d2,false)+
            '<div style="font-family:Fraunces,serif;font-size:28px;margin-top:6px;">'+d2+'</div></div>'+
        '</div>'+
        '<div style="font-family:Fraunces,serif;font-size:24px;color:var(--accent);margin-top:16px;">Égalité !</div>'+
        '<div style="font-size:14px;color:rgba(244,236,226,0.5);margin-top:6px;">On relance...</div>';
      if(navigator.vibrate) navigator.vibrate([40,30,40,30,40]);
      setTimeout(()=> desRoll(), 1200);
      return;
    }

    const loser = d1 < d2 ? 0 : 1;
    const winner = 1 - loser;

    body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;">'+
        '<div class="die-wrap"><div class="die-name" style="color:'+(loser===0?'var(--clay)':'var(--sage)')+';">'+des.players[0]+'</div>'+desDieHTML(d1,false)+
          '<div style="font-family:Fraunces,serif;font-size:28px;margin-top:6px;">'+d1+'</div></div>'+
        '<div class="die-vs">×</div>'+
        '<div class="die-wrap"><div class="die-name" style="color:'+(loser===1?'var(--clay)':'var(--sage)')+';">'+des.players[1]+'</div>'+desDieHTML(d2,false)+
          '<div style="font-family:Fraunces,serif;font-size:28px;margin-top:6px;">'+d2+'</div></div>'+
      '</div>'+
      '<div style="font-family:Fraunces,serif;font-size:28px;color:var(--clay);margin-top:20px;">'+des.players[loser]+' perd</div>'+
      '<div style="font-family:Fraunces,serif;font-size:22px;color:var(--text);margin-top:8px;">'+product+' gorgée'+(product>1?'s':'')+'</div>';

    if(navigator.vibrate) navigator.vibrate([80,40,80]);
    footer.innerHTML =
      '<button class="btn btn-primary" onclick="desRoll()" style="flex:2;">Relancer</button>'+
      '<button class="btn btn-ghost" onclick="goTo(\'games-list\')" style="flex:1;">Quitter</button>';
  }, 700);
}
