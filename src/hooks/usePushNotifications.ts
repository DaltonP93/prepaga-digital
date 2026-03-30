
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          // Ensure service worker is registered before checking
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length === 0) {
            await navigator.serviceWorker.register('/sw.js');
          }
          setIsSupported(true);
          checkSubscription();
        } catch (error) {
          setIsSupported(true); // Still allow user to try
        }
      }
    };
    check();
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        setIsSubscribed(true);
        setSubscription({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
          }
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      toast({
        title: "No soportado",
        description: "Las notificaciones push no están soportadas en este navegador",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: "Permisos denegados",
          description: "Para recibir notificaciones, por favor permite el acceso en la configuración del navegador",
          variant: "destructive"
        });
        return;
      }

      // Ensure service worker is registered
      let registration: ServiceWorkerRegistration;
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) {
          registration = await navigator.serviceWorker.register('/sw.js');
          // Wait for the SW to be ready
          await navigator.serviceWorker.ready;
        } else {
          registration = await navigator.serviceWorker.ready;
        }
      } catch (swError) {
        console.error('Service Worker registration failed:', swError);
        toast({
          title: "Error",
          description: "No se pudo registrar el Service Worker. Intenta recargar la página.",
          variant: "destructive"
        });
        return;
      }

      const pushSubscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NkhVCXoNWQRGBx3mLDqjSjrn8BXGMVfWLksNGh0bJ4lWGbwvbIFYmM'
        )
      });

      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(pushSubscription.getKey('auth')!)))
        }
      };

      setIsSubscribed(true);
      setSubscription(subscriptionData);
      localStorage.setItem('pushSubscription', JSON.stringify(subscriptionData));

      toast({
        title: "¡Notificaciones activadas!",
        description: "Recibirás notificaciones sobre el estado de las firmas"
      });

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Error",
        description: "No se pudieron activar las notificaciones. Verifica que tu navegador las soporte.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        setSubscription(null);
        localStorage.removeItem('pushSubscription');
        
        toast({
          title: "Notificaciones desactivadas",
          description: "Ya no recibirás notificaciones push"
        });
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Error",
        description: "No se pudieron desactivar las notificaciones",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = () => {
    if (isSubscribed && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification('Notificación de prueba', {
          body: 'Las notificaciones están funcionando correctamente',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'test-notification',
        });
      });
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
};

// Función auxiliar para convertir VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
