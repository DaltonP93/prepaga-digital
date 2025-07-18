
// Service Worker para modo offline y notificaciones push
const CACHE_NAME = 'prepaga-digital-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Archivos estáticos principales
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  // Recursos offline esenciales
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Sonidos de notificaciones
  '/sounds/notification.mp3',
  '/sounds/success.mp3',
  '/sounds/info.mp3',
  '/sounds/error.mp3'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache anterior:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - devolver respuesta
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Verificar si recibimos una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Si falla la petición, mostrar página offline
          if (event.request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Manejo de mensajes push mejorado
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || data.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      image: data.image,
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.id || '1',
        url: data.action_url
      },
      actions: data.action_url ? [
        {
          action: 'view',
          title: 'Ver',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/icons/close-icon.png'
        }
      ] : [],
      requireInteraction: data.type === 'signature_completed' || data.type === 'signature_pending',
      silent: false,
      tag: data.tag || 'default-notification'
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Manejo de clicks en notificaciones mejorado
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'close') {
    // Solo cerrar la notificación
    return;
  } else if (event.notification.data.url) {
    // Click en el cuerpo de la notificación
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sincronización en segundo plano mejorada
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

function doBackgroundSync() {
  return new Promise((resolve) => {
    console.log('Sincronización en segundo plano ejecutada');
    
    // Sincronizar datos offline
    fetch('/api/sync-offline-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: Date.now()
      })
    }).then(() => {
      console.log('Datos sincronizados exitosamente');
      resolve();
    }).catch((error) => {
      console.error('Error en sincronización:', error);
      resolve();
    });
  });
}

function syncNotifications() {
  return new Promise((resolve) => {
    console.log('Sincronizando notificaciones...');
    
    // Obtener notificaciones pendientes
    fetch('/api/notifications/pending')
      .then(response => response.json())
      .then(notifications => {
        notifications.forEach(notification => {
          self.registration.showNotification(notification.title, {
            body: notification.message,
            icon: '/icons/icon-192x192.png',
            data: notification.data
          });
        });
        resolve();
      })
      .catch(error => {
        console.error('Error sincronizando notificaciones:', error);
        resolve();
      });
  });
}

// Manejo de eventos de visibilidad para optimizar rendimiento
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Limpiar notificaciones antiguas cada 24 horas
setInterval(() => {
  self.registration.getNotifications().then(notifications => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    notifications.forEach(notification => {
      if (notification.data.dateOfArrival < oneDayAgo) {
        notification.close();
      }
    });
  });
}, 24 * 60 * 60 * 1000); // 24 horas
