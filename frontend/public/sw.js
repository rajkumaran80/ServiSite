// Service Worker for Web Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ServiSite', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'servisite-notification',
    renotify: true,
    data: { url: data.url || '/dashboard/ordering' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'ServiSite', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard/ordering';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
