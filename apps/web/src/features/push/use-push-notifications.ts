import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../auth/store.js';

const VAPID_PUBLIC_KEY = 'BEl62iW5gMjFh4jRfXvJQOVjLq8hHGx2Rk7m3pVn9wAqYtZc4dFgHjKlMnOpQrStUvWxYz1234567890';

interface PushSubscriptionState {
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [state, setState] = useState<PushSubscriptionState>({
    subscribed: false,
    loading: false,
    error: null,
  });

  const subscribeToPush = useCallback(async () => {
    if (!session) return;

    setState({ subscribed: false, loading: true, error: null });

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState({ subscribed: false, loading: false, error: t('push.notSupported') });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState({ subscribed: false, loading: false, error: t('push.permissionDenied') });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = subscription.toJSON();

      const { session: currentSession } = useAuthStore.getState();
      if (!currentSession?.accessToken) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.accessToken}`,
      };

      await fetch('/api/v1/push-subscriptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys!.p256dh,
            auth: subJson.keys!.auth,
          },
        }),
      });

      setState({ subscribed: true, loading: false, error: null });
    } catch (err) {
      setState({ subscribed: false, loading: false, error: (err as Error).message });
    }
  }, [session, t]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!session) return;

    setState({ subscribed: true, loading: true, error: null });

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const subJson = subscription.toJSON();
        const { session: currentSession } = useAuthStore.getState();
        if (currentSession?.accessToken) {
          await fetch('/api/v1/push-subscriptions', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentSession.accessToken}`,
            },
            body: JSON.stringify({ endpoint: subJson.endpoint }),
          });
        }
      }

      setState({ subscribed: false, loading: false, error: null });
    } catch (err) {
      setState({ subscribed: true, loading: false, error: (err as Error).message });
    }
  }, [session]);

  useEffect(() => {
    if (!session || !('serviceWorker' in navigator)) return;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState((prev) => ({ ...prev, subscribed: !!subscription }));
      } catch {
        // silent - push may not be available
      }
    })();
  }, [session]);

  return { ...state, subscribeToPush, unsubscribeFromPush };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
