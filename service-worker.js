const CACHE='regal-voice-v1-1';
const ASSETS=['./','./index.html','./css/styles.css','./js/app.js','./js/audio-engine.js','./js/pitch-detector.js','./js/scoring-engine.js','./js/speech-analysis.js','./js/game-renderer.js','./js/profiles.js','./js/exercises.js','./js/storage.js','./manifest.json','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))));
