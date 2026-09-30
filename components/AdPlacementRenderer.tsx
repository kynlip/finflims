'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { AdPlacement, AdPosition, AdSettings } from '@/lib/ads-types';

interface AdPlacementRendererProps {
  position: AdPosition;
  className?: string;
}

export function AdPlacementRenderer({ position, className = '' }: AdPlacementRendererProps) {
  const { data: session } = useSession();
  const [placement, setPlacement] = useState<AdPlacement | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [vipBypassAll, setVipBypassAll] = useState(true);
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

    async function loadAds() {
      try {
        const res = await fetch('/api/ads');
        const data: { success: boolean; settings?: AdSettings } = await res.json();
        if (isMounted && data.success && data.settings) {
          setGlobalEnabled(Boolean(data.settings.globalEnabled));
          setVipBypassAll(Boolean(data.settings.vipBypassAll));

          const matched = data.settings.placements.find(
            (p) => p.position === position && p.enabled
          );
          setPlacement(matched || null);
        }
      } catch (err) {
        console.error(`[AdPlacement] Failed to load ads for ${position}:`, err);
      }
    }

    loadAds();
    return () => {
      isMounted = false;
    };
  }, [position]);

  // If ads are disabled globally or no matching active placement, render nothing
  if (!globalEnabled || !placement || !placement.enabled) {
    return null;
  }

  // If user is VIP and VIP bypass is active
  if (isVip && (vipBypassAll || placement.vipBypass)) {
    return null;
  }

  // Render Banner Image with Link
  if (placement.type === 'banner' && placement.bannerImageUrl) {
    return (
      <div
        data-ad-placement={placement.id}
        className={`my-3 sm:my-4 flex w-full justify-center overflow-hidden rounded-xl bg-black/20 ${className}`}
      >
        {placement.bannerTargetUrl ? (
          <a
            href={placement.bannerTargetUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group block max-w-full transition-opacity hover:opacity-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={placement.bannerImageUrl}
              alt={placement.bannerAlt || 'Quảng cáo'}
              className="max-h-[120px] w-auto max-w-full rounded-xl object-contain shadow-md"
              loading="lazy"
            />
          </a>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={placement.bannerImageUrl}
            alt={placement.bannerAlt || 'Quảng cáo'}
            className="max-h-[120px] w-auto max-w-full rounded-xl object-contain shadow-md"
            loading="lazy"
          />
        )}
      </div>
    );
  }

  // Render HTML / Script Code
  if (placement.code) {
    return <AdCodeContainer placement={placement} className={className} />;
  }

  return null;
}

function AdCodeContainer({
  placement,
  className,
}: {
  placement: AdPlacement;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !placement.code) return;

    // Clear previous elements
    containerRef.current.innerHTML = '';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.innerHTML = placement.code;

    // Execute any script tags dynamically
    const scripts = wrapper.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    containerRef.current.appendChild(wrapper);
  }, [placement.code]);

  return (
    <div
      ref={containerRef}
      data-ad-placement={placement.id}
      className={`my-3 sm:my-4 flex w-full justify-center overflow-hidden text-center ${className}`}
    />
  );
}
