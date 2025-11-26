import { ref, onMounted } from 'vue';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const isSupported = ref(false);
const isSubscribed = ref(false);
const permission = ref('default');
const subscription = ref(null);
const vapidPublicKey = ref(null);

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const checkSupport = () => {
    // Check for service worker, PushManager, and Notification API
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;

    console.log('Push notification support check:', {
      serviceWorker: hasServiceWorker,
      pushManager: hasPushManager,
      notification: hasNotification,
      userAgent: navigator.userAgent
    });

    isSupported.value = hasServiceWorker && hasPushManager && hasNotification;

    if (isSupported.value && hasNotification) {
      permission.value = Notification.permission;
    }

    return isSupported.value;
  };

  const fetchVapidPublicKey = async () => {
    if (!vapidPublicKey.value) {
      try {
        const response = await fetch(`${API_URL}/push/vapid-public-key`);
        const data = await response.json();
        vapidPublicKey.value = data.publicKey;
      } catch (error) {
        console.error('Error fetching VAPID public key:', error);
        throw new Error('Failed to fetch VAPID public key');
      }
    }
    return vapidPublicKey.value;
  };

  const requestPermission = async () => {
    if (!isSupported.value) {
      throw new Error('Push notifications not supported');
    }

    const result = await Notification.requestPermission();
    permission.value = result;
    return result === 'granted';
  };

  const subscribe = async () => {
    if (!isSupported.value) {
      throw new Error('Push notifications not supported');
    }

    if (permission.value !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        throw new Error('Permission denied');
      }
    }

    try {
      // Fetch VAPID public key from server
      const publicKey = await fetchVapidPublicKey();

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let sub = await registration.pushManager.getSubscription();

      if (!sub) {
        // Subscribe to push notifications
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      subscription.value = sub;

      // Send subscription to server
      const response = await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub.toJSON())
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }

      isSubscribed.value = true;
      startHealthCheck(); // Start periodic health checks
      return sub;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    if (!subscription.value) {
      return;
    }

    try {
      // Unsubscribe from push notifications
      await subscription.value.unsubscribe();

      // Remove subscription from server
      await fetch(`${API_URL}/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription.value.toJSON())
      });

      subscription.value = null;
      isSubscribed.value = false;
      stopHealthCheck(); // Stop health checks
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  };

  const checkSubscription = async () => {
    if (!isSupported.value) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        // Check if subscription has expirationTime and if it's expired or expiring soon
        const now = Date.now();
        const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours

        // If subscription is expired or will expire soon, renew it
        if (sub.expirationTime && sub.expirationTime - now < gracePeriod) {
          console.log('Push subscription expiring soon, renewing...');
          await sub.unsubscribe();
          // Re-subscribe
          return await subscribe();
        }

        subscription.value = sub;
        isSubscribed.value = true;

        // Re-sync subscription with server to ensure it exists in DB
        // (Useful if server database was reset or during migration)
        fetch(`${API_URL}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sub.toJSON())
        }).catch(err => console.error('Error syncing subscription:', err));

        return true;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    isSubscribed.value = false;
    subscription.value = null;
    return false;
  };

  // Periodically check subscription health (every 30 minutes)
  let healthCheckInterval = null;
  const startHealthCheck = () => {
    if (healthCheckInterval) return;

    healthCheckInterval = setInterval(async () => {
      if (isSupported.value && isSubscribed.value) {
        await checkSubscription();
      }
    }, 30 * 60 * 1000); // 30 minutes
  };

  const stopHealthCheck = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  };

  onMounted(async () => {
    checkSupport();
    if (isSupported.value) {
      const hasSubscription = await checkSubscription();
      if (hasSubscription) {
        startHealthCheck(); // Start health checks if subscribed
      }
    }
  });

  return {
    isSupported,
    isSubscribed,
    permission,
    subscription,
    checkSupport,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
    stopHealthCheck
  };
}
