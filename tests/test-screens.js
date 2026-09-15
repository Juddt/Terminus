// Garde-fou contre un piège qui a déjà coûté deux fois au projet.
//
// Tous les écrans suivent la convention `.screen{display:none}` / `.screen.active{display:flex}`.
// Or un sélecteur d'ID a une spécificité supérieure à celle d'une classe : écrire
//
//     #screen-xxx{ display:flex; }
//
// bat `.screen{display:none}` et laisse l'écran affiché EN PERMANENCE, superposé à tous
// les autres. Le symptôme est déroutant : le DOM de l'écran attendu est correct, son
// innerText est correct, mais l'utilisateur ne voit qu'un écran vide — celui qui recouvre
// tout. Seul un rendu réel (ou ce test) le révèle.
//
// La règle : `display` sur un écran ciblé par son id n'est autorisé que scopé à `.active`.
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');

const cssFiles=[];
(function walk(dir){
  fs.readdirSync(dir,{withFileTypes:true}).forEach(e=>{
    const full=path.join(dir,e.name);
    if(e.isDirectory()) walk(full);
    else if(e.name.endsWith('.css')) cssFiles.push(full);
  });
})(path.join(root,'css'));

let ok=true;
cssFiles.forEach(file=>{
  const src=fs.readFileSync(file,'utf8');
  // Chaque règle : sélecteur { corps }
  [...src.matchAll(/([^{}]+)\{([^}]*)\}/g)].forEach(m=>{
    const selector=m[1].trim().split('\n').pop().trim();
    const bodyText=m[2];
    if(!/(^|[\s,])#screen-[a-z0-9-]+\s*(?:,|$)/.test(selector+',')) return;  // ne vise pas un écran nu
    if(!/(^|[;\s])display\s*:/.test(bodyText)) return;                        // ne touche pas à display
    if(/#screen-[a-z0-9-]+\s*\.active/.test(selector)) return;                // correctement scopé
    console.error('ÉCHEC : '+path.relative(root,file)+' — "'+selector+'" pose `display` sur un écran');
    console.error('        sans le scoper à .active : l\'écran restera affiché en permanence.');
    ok=false;
  });
});

// La convention elle-même doit rester en place.
const base=fs.readFileSync(path.join(root,'css','base.css'),'utf8');
if(!/\.screen\{[^}]*display:none/.test(base)){ console.error('ÉCHEC : .screen{display:none} a disparu de base.css'); ok=false; }
if(!/\.screen\.active\{display:flex/.test(base)){ console.error('ÉCHEC : .screen.active{display:flex} a disparu de base.css'); ok=false; }


// --- Un conteneur à défilement horizontal ne doit pas pouvoir être comprimé ----------
// `.games-scene` défile horizontalement (overflow-x:auto), ce qui force le navigateur à
// calculer overflow-y en `auto` : tout ce qui dépasse est ROGNÉ, pas reporté. Or c'est
// un élément flex dans une colonne — sans flex-shrink:0 il se laisse écraser par ce qui
// le suit, et le bas des fiches (nom du jeu, boutons Jouer/Règles) disparaît. Le défaut
// ne se voyait que sur un vrai téléphone : getBoundingClientRect situe correctement un
// élément même rogné, donc une vérification géométrique le manquait.
const appCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
const sceneRule = (appCss.match(/\.games-scene\{[^}]*\}/) || [''])[0];
const sceneOK = /overflow-x:\s*auto/.test(sceneRule) && /flex-shrink:\s*0/.test(sceneRule);
console.log('Scène de la bibliothèque non compressible :', sceneOK ? 'OK' : 'ÉCHEC — flex-shrink:0 manquant');
if(!sceneOK) ok = false;

console.log('Feuilles de style inspectées :', cssFiles.length);
console.log(ok ? '\nCONVENTION DES ÉCRANS RESPECTÉE' : '\nUN ÉCRAN RISQUE DE RECOUVRIR LES AUTRES');
process.exit(ok?0:1);
