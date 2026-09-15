// ===================================================================================
// LA GROTTE À COCKTAILS
// -----------------------------------------------------------------------------------
// Écran bonus, indépendant du before et des jeux : deux onglets, une mosaïque de six
// tuiles par onglet. Les cocktails ouvrent une fiche (base + une variante tirée au
// hasard, pour que la fiche « bouge » d'une visite à l'autre). Les mocktails n'ouvrent
// jamais de fiche : n'importe quelle tuile déclenche la blague (voir MOCKTAIL_TROLL_LINES
// dans js/data/cocktails.js).
// ===================================================================================

let cocktailTab = 'cocktails';
// Cyclique et non aléatoire : la toute première pression tombe TOUJOURS sur la ligne
// demandée mot pour mot ; les suivantes ne font que varier pour ne pas lasser si
// quelqu'un s'entête à retenter sa chance.
let cocktailTrollIdx = 0;

function openCocktailsScreen(){
  cocktailTab = 'cocktails';
  renderCocktailScreen();
  goTo('cocktails');
}

function setCocktailTab(tab){
  if(tab === cocktailTab) return;
  cocktailTab = tab;
  Sound.play('tick');
  renderCocktailScreen();
}

function renderCocktailScreen(){
  document.querySelectorAll('.cocktail-tab').forEach(el=>{
    el.classList.toggle('selected', el.dataset.tab === cocktailTab);
  });
  const grid = document.getElementById('cocktail-grid');
  if(!grid) return;

  if(cocktailTab === 'cocktails'){
    grid.innerHTML = COCKTAILS.map((c, i)=>
      '<button class="cocktail-tile" style="--tier-color:'+cocktailTierColor(c.tier)+'" '+
        'onclick="openCocktailDetail('+i+')">'+
        '<span class="cocktail-tile-art"><span class="cocktail-tile-glass">'+c.glass+'</span></span>'+
        '<span class="cocktail-tile-name">'+escapeHtml(c.name)+'</span>'+
      '</button>'
    ).join('');
  } else {
    grid.innerHTML = MOCKTAILS.map(m=>
      '<button class="cocktail-tile cocktail-tile-mocktail" onclick="openMocktailTroll()">'+
        '<span class="cocktail-tile-art"><span class="cocktail-tile-glass">'+m.glass+'</span></span>'+
        '<span class="cocktail-tile-name">'+escapeHtml(m.name)+'</span>'+
      '</button>'
    ).join('');
  }
}

function cocktailTierColor(tier){
  return { Soft:'var(--sage)', Malin:'#5AA8FF', Culotté:'#FFA33D', Chaos:'#FF6B4A' }[tier] || 'var(--accent)';
}

// --- La fiche d'un cocktail ---------------------------------------------------------
function openCocktailDetail(i){
  const c = COCKTAILS[i];
  if(!c) return;
  const twist = pick(c.twists);
  document.getElementById('cocktail-sheet-glass').textContent = c.glass;
  document.getElementById('cocktail-sheet-name').textContent = c.name;
  const tier = document.getElementById('cocktail-sheet-tier');
  tier.textContent = c.tier;
  tier.style.color = cocktailTierColor(c.tier);
  document.getElementById('cocktail-sheet-base').textContent = c.base;
  document.getElementById('cocktail-sheet-garnish').textContent = c.garnish;
  document.getElementById('cocktail-sheet-twist').textContent = twist;
  document.getElementById('cocktail-sheet').classList.add('open');
}
function closeCocktailSheet(){
  document.getElementById('cocktail-sheet').classList.remove('open');
}

// --- La blague des mocktails ---------------------------------------------------------
function openMocktailTroll(){
  document.getElementById('mocktail-troll-text').textContent =
    MOCKTAIL_TROLL_LINES[cocktailTrollIdx % MOCKTAIL_TROLL_LINES.length];
  cocktailTrollIdx++;
  Sound.play('fail');
  if(navigator.vibrate) navigator.vibrate([40, 40, 40]);
  if(window.fireGlitch) window.fireGlitch();
  document.getElementById('mocktail-troll-overlay').classList.remove('hidden');
}
function closeMocktailTroll(){
  document.getElementById('mocktail-troll-overlay').classList.add('hidden');
}
