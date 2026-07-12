// Service worker minimal : réseau d'abord (network-first) pour toujours servir la
// dernière version quand une connexion est dispo, avec repli sur le cache pour jouer
// hors connexion. On avait démarré en cache-first, mais ça laissait les utilisateurs
// bloqués sur une vieille version jusqu'à un rechargement supplémentaire après chaque
// mise à jour — gênant tant que l'app change encore souvent. Bumper CACHE_NAME force
// quand même le remplacement complet du cache au prochain déploiement.
const CACHE_NAME = 'soiree-cache-v5';

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

// Network-first : tente toujours le réseau en premier pour avoir la dernière version,
// met à jour le cache au passage, et ne retombe sur le cache que si le réseau échoue
// (offline). On ignore les requêtes non-GET (ex: rien de tel ici, mais par prudence) et
// les origines externes (fonts Google) pour ne jamais bloquer un chargement sur une
// ressource qu'on ne maîtrise pas.
self.addEventListener('fetch', (event)=>{
  if(event.request.method !== 'GET') return;
  if(new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(response=>{
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache=> cache.put(event.request, clone));
      return response;
    }).catch(()=> caches.match(event.request))
  );
});
