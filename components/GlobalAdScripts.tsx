'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AdSettings } from '@/lib/ads-types';

export function GlobalAdScripts() {
  const { data: session } = useSession();
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    const user = session?.user as unknown as { isVip?: boolean; vipExpiry?: string } | undefined;
    const isUserVip = Boolean(
      user?.isVip || (user?.vipExpiry && new Date(user.vipExpiry).getTime() > Date.now())
    );
    setIsVip(isUserVip);
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    async function loadGlobalAds() {
      try {
        const res = await fetch('/api/ads');
        const data: { success: boolean; settings?: AdSettings } = await res.json();
        if (isMounted && data.success && data.settings) {
          setAdSettings(data.settings);
        }
      } catch (err) {
        console.error('[GlobalAdScripts] Error:', err);
      }
    }

    loadGlobalAds();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!adSettings || !adSettings.globalEnabled) return;
    if (isVip && adSettings.vipBypassAll) return;

    const scriptsToInject: Array<{ id: string; code: string; target: HTMLElement }> = [];

    if (adSettings.headerScript) {
      scriptsToInject.push({
        id: 'global-ad-header-script',
        code: adSettings.headerScript,
        target: document.head,
      });
    }

    if (adSettings.footerScript) {
      scriptsToInject.push({
        id: 'global-ad-footer-script',
        code: adSettings.footerScript,
        target: document.body,
      });
    }

    scriptsToInject.forEach(({ id, code, target }) => {
      let container = document.getElementById(id);
      if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.setAttribute('data-ad-placement', id);
        container.style.display = 'none';
        target.appendChild(container);
      }
      container.innerHTML = code;

      const scripts = container.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    });

    return () => {
      scriptsToInject.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };
  }, [adSettings, isVip]);

  return null;
}
