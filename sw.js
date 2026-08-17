// sw.js — precisa ficar na raiz do site (mesmo nível do painel.html)

self.addEventListener('push', (event) => {
  let data = { title: 'Novo pedido!', body: 'Você tem um novo pedido no Comanda.' };
  try {
    data = event.data.json();
  } catch (e) {
    // usa o padrão acima se não vier JSON
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: data.order_id ? `pedido-${data.order_id}` : undefined,
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/painel.html');
    })
  );
});