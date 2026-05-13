// Gamgee Web Push handlers. Imported by the Workbox-generated SW via the
// `workbox.importScripts` option in vite.config.ts — install/activate
// lifecycle is owned by Workbox, so we only add push + notificationclick.
//
// All notifications, regardless of kind, route to the in-app Notifications
// tab when clicked. The tab is selected via the ?tab=notifications URL param
// that WorkoutTracker already understands.

const NOTIF_TAG = "gamgee-notification";

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "Gamgee", body: event.data.text() };
    }
  }

  const title = payload.title || "Gamgee";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.notification_id ? `${NOTIF_TAG}-${payload.notification_id}` : NOTIF_TAG,
    data: { url: payload.url || "/?tab=notifications", kind: payload.kind || null },
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/?tab=notifications";

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const targetUrl = new URL(target, self.location.origin);

    for (const client of all) {
      const clientUrl = new URL(client.url);
      // Same origin & path -> just focus & message it
      if (clientUrl.origin === targetUrl.origin) {
        await client.focus();
        client.postMessage({ type: "open-notifications", url: target });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
