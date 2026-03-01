// Nova Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("[Nova SW] Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[Nova SW] Activated");
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[Nova SW] Push received", event);

  const data = event.data?.json() ?? {};
  const title = data.title || "Nova";
  const options = {
    body: data.body || "You have a new message",
    icon: "/nova-icon.png",
    badge: "/nova-badge.png",
    tag: data.tag || "nova-message",
    requireInteraction: data.type === "reminder",
    actions: data.actions || [],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[Nova SW] Notification clicked", event);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

// Handle message from main thread (for testing)
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
