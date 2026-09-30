'use client';

import { useEffect } from 'react';
import { registerServiceWorker, unregisterAdServiceWorker } from '@/lib/register-sw';

/**
 * PWA Service Worker Lifecycle Manager
 */
export function ServiceWorkerUpdater() {
  useEffect(() => {
    // 1. Clean up any legacy ad service worker if detected
    void unregisterAdServiceWorker();

    // 2. Register native PWA service worker
    registerServiceWorker();
  }, []);

  return null;
}
