/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Import Firebase scripts for background handling
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyDmKrv3-pOLUMeVKXJkpg6IEN0AOQXQ--s",
  authDomain: "playground-428410.firebaseapp.com",
  projectId: "playground-428410",
  storageBucket: "playground-428410.firebasestorage.app",
  messagingSenderId: "277290577442",
  appId: "1:277290577442:web:829f43da4ba71ac8f9247b",
  measurementId: "G-0B04P6NW6J"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon_web_PWA192_192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files  // everything in `static`
];

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous caches
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			return cache.match(event.request);
		}

		// for everything else, try the network first, but
		// fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch {
			return cache.match(event.request);
		}
	}

	event.respondWith(respond());
});

// self.addEventListener('push', (event) => {
//     const data = event.data ? event.data.json() : {};
//     const title = data.title || 'Galaxy Empire';
//     const options = {
//         body: data.body || 'New notification',
//         icon: data.icon || '/icons/icon_web_PWA192_192x192.png',
//         badge: '/icons/icon_web_PWA192_192x192.png'
//     };

//     event.waitUntil(self.registration.showNotification(title, options));
// });

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
