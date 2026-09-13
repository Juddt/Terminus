// Vérifie la cohérence entre index.html, le disque et PRECACHE_URLS du service worker.
// Motivation : cache.addAll() est atomique — une seule URL qui renvoie 404 fait échouer
// l'installation du service worker, et l'app perd tout son mode hors connexion sans le
// moindre message. C'est arrivé avec js/core/history.js, supprimé du HTML mais laissé
// dans la liste.
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1])
  .concat([...html.matchAll(/<link[^>]+href="((?!https?:)[^"]+\.css)"/g)].map(m=>m[1]));
const precache=[...sw.matchAll(/'\.\/([^']*)'/g)].map(m=>m[1]).filter(u=>u);

let ok=true;
function fail(msg){ console.error('ÉCHEC : '+msg); ok=false; }

// 1. Tout ce que le HTML charge existe sur le disque.
refs.forEach(r=>{ if(!fs.existsSync(path.join(root,r))) fail('index.html charge '+r+' — fichier absent'); });
// 2. Tout ce que le service worker précache existe sur le disque.
precache.forEach(u=>{ if(!fs.existsSync(path.join(root,u))) fail('sw.js précache '+u+' — fichier absent'); });
// 3. Tout ce que le HTML charge est précaché (sinon : pas de hors connexion).
refs.forEach(r=>{ if(!precache.includes(r)) fail(r+' est chargé par index.html mais absent de PRECACHE_URLS'); });
// 4. Les polices auto-hébergées sont précachées (sinon la typographie saute hors ligne).
fs.readdirSync(path.join(root,'fonts')).filter(f=>f.endsWith('.woff2')).forEach(f=>{
  if(!precache.includes('fonts/'+f)) fail('fonts/'+f+' absent de PRECACHE_URLS');
});
// 5. Les fichiers référencés par css/fonts.css existent.
const fcss=fs.readFileSync(path.join(root,'css','fonts.css'),'utf8');
[...fcss.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]).forEach(u=>{
  if(!fs.existsSync(path.join(root,'css',u))) fail('css/fonts.css référence '+u+' — fichier absent');
});

console.log('Scripts et styles d\'index.html :', refs.length);
console.log('Entrées du précache :', precache.length);
console.log(ok ? '\nPRÉCACHE ET RÉFÉRENCES COHÉRENTS' : '\nDES INCOHÉRENCES SUBSISTENT');
process.exit(ok?0:1);
