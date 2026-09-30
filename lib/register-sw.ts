// PWA Service Worker Registration & Lifecycle

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Only register in production or when explicitly enabled
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const startRegistration = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Periodically check for service worker updates (every 30 minutes)
      setInterval(() => {
        registration.update().catch(() => {});
      }, 30 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New version ready: skip waiting to activate
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (error) {
      console.warn('[PWA] Service worker registration notice:', error);
    }
  };

  if (document.readyState === 'complete') {
    void startRegistration();
  } else {
    window.addEventListener('load', () => void startRegistration(), { once: true });
  }
}

export async function unregisterAdServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. Clean localStorage & sessionStorage from Monetag / ad leftovers
  try {
    delete (window as unknown as Record<string, unknown>).__phimhayMonetagZones;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /monetag|zovidree|popunder|11579645/i.test(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // 2. Unregister any 3rd-party ad service workers
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const legacyWorkers = registrations.filter((r) => {
      const url = r.active?.scriptURL || r.installing?.scriptURL || '';
      return (
        url.includes('5gvci') ||
        url.includes('monetag') ||
        url.includes('zovidree') ||
        url.includes('tag.min.js')
      );
    });

    if (legacyWorkers.length === 0) return false;
    const results = await Promise.all(legacyWorkers.map((r) => r.unregister()));
    return results.some(Boolean);
  } catch {
    return false;
  }
}
