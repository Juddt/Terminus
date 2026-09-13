const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

const screens=new Set([...html.matchAll(/id="screen-([a-z0-9-]+)"/g)].map(m=>m[1]));
const sources={'index.html':html};
[...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m=>m[1]).forEach(f=>{
  sources[f]=fs.readFileSync(path.join(root,f),'utf8');
});

let ok=true;
const seen=new Set();
Object.entries(sources).forEach(([file,src])=>{
  [...src.matchAll(/goTo\(\s*'([a-z0-9-]+)'\s*\)/g)].forEach(m=>{
    seen.add(m[1]);
    if(!screens.has(m[1])){ console.error("ÉCHEC : "+file+" appelle goTo('"+m[1]+"') — #screen-"+m[1]+" n'existe pas"); ok=false; }
  });
});

// Les fonctions référencées dans les attributs onclick doivent exister quelque part.
const jsAll=Object.entries(sources).filter(([f])=>f!=='index.html').map(([,s])=>s).join('\n');
const declared=new Set([...jsAll.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
const builtins=new Set(['goTo','event','Sound','window','this','alert','confirm','Trail','open']);
[...html.matchAll(/on(?:click|change|input|submit)="([^"]+)"/g)].forEach(m=>{
  // (?<![.\w$]) : on ignore les appels de méthode (event.stopPropagation(), el.focus()…),
  // qui ne sont pas des fonctions globales à déclarer.
  [...m[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].forEach(c=>{
    const fn=c[1];
    if(builtins.has(fn)||declared.has(fn)) return;
    if(/^(Sound|Math|JSON|Object|Array|String|Number)$/.test(fn)) return;
    if(jsAll.includes('window.'+fn+' =')||jsAll.includes(fn+' = function')||jsAll.includes('const '+fn)) return;
    console.error("ÉCHEC : index.html appelle "+fn+"() — fonction introuvable dans les scripts");
    ok=false;
  });
});

console.log('Écrans déclarés :', screens.size, '— cibles de goTo :', seen.size);
console.log(ok ? '\nNAVIGATION COHÉRENTE' : '\nDES CIBLES SONT MORTES');
process.exit(ok?0:1);
