// Free Native & Web Push Notification Client Helper

export const isNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'default';
  return Notification.permission;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.warn('Service Worker registration skipped or failed:', err);
    return null;
  }
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      await registerServiceWorker();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
};

export interface LocalPushOptions {
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

export const sendPushNotification = async (
  title: string,
  options: LocalPushOptions
): Promise<boolean> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body: options.body,
          icon: options.icon || '/next.svg',
          badge: '/next.svg',
          tag: options.tag || 'ourdiary-alert',
          data: { url: options.url || '/dashboard' },
        });
        return true;
      }
    }

    // Direct browser fallback if SW not ready
    new Notification(title, {
      body: options.body,
      icon: options.icon || '/next.svg',
    });
    return true;
  } catch (err) {
    console.warn('Failed to dispatch notification:', err);
    return false;
  }
};
