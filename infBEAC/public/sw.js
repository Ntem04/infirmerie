// public/sw.js

const CACHE_NAME = "infirmerie-beac-cache-v1";

// Événement d'installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installation en cours...");
  self.skipWaiting();
});

// Événement d'activation
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activé et prêt à gérer le mode hors-ligne.");
  event.waitUntil(self.clients.claim());
});

// Interception des requêtes réseau (Préparation pour Dexie.js et la synchro PWA)
self.addEventListener("fetch", (event) => {
  // Pour l'instant en mode développement, on laisse passer toutes les requêtes normalement.
  // La logique de cache et de file d'attente (syncQueue) sera implémentée ici.
  event.respondWith(fetch(event.request));
});
