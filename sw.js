// Service worker minimal : cache-first pour jouer hors connexion une fois l'app
// ouverte au moins une fois. Bumper CACHE_NAME force le remplacement de tous les
// fichiers au prochain déploiement (sinon un vieux JS resterait servi indéfiniment
// depuis le cache).
const CACHE_NAME = 'soiree-cache-v1';

const PRECACHE_URLS = [
  './terminus.html',
  './manifest.json',
  './css/base.css',
  './css/app.css',
  './css/games-shared.css',
  './css/games/palmier.css',
  './css/games/bus.css',
  './css/games/cible.css',
  './css/games/pmu.css',
  './css/games/dice.css',
  './css/games/pof.css',
  './js/data/content.js',
  './js/data/games-catalog.js',
  './js/core/state.js',
  './js/core/navigation.js',
  './js/core/setup-wizard.js',
  './js/core/custom-content.js',
  './js/core/feedback.js',
  './js/core/sober-mode.js',
  './js/core/session-engine.js',
  './js/core/persistence.js',
  './js/core/history.js',
  './js/core/display-mode.js',
  './js/lib/qrcode.js',
  './js/core/share.js',
  './js/core/recap-card.js',
  './js/games/shared-cards.js',
  './js/games/palmier.js',
  './js/games/bus.js',
  './js/games/cible.js',
  './js/games/purple.js',
  './js/games/pmu.js',
  './js/games/pof.js',
  './js/games/des.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=> cache.addAll(PRECACHE_URLS)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k !== CACHE_NAME).map(k=> caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

// Cache-first : sert le cache immédiatement si présent (offline-friendly), va sur le
// réseau sinon et met à jour le cache pour la prochaine fois. On ignore les requêtes
// non-GET (ex: rien de tel ici, mais par prudence) et les origines externes (fonts
// Google) pour ne jamais bloquer un chargement sur une ressource qu'on ne maîtrise pas.
self.addEventListener('fetch', (event)=>{
  if(event.request.method !== 'GET') return;
  if(new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(response=>{
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache=> cache.put(event.request, clone));
        return response;
      }).catch(()=> cached);
    })
  );
});
