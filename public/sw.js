// OurDiary Service Worker (100% Free Web Push & Offline Support)
const CACHE_NAME = 'ourdiary-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push Notifications (Standard Free W3C Web Push)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'OurDiary 💕',
    body: 'You have a new sweet message from your partner!',
    icon: '/next.svg',
    url: '/dashboard',
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/next.svg',
    badge: '/next.svg',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: payload.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: 'Open OurDiary 💕' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Handle clicking on notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
