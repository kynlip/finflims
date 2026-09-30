"use client";

import { useEffect, useRef } from "react";

const LOADVID_AD_SCRIPT_ID = "loadvid-ad-script";
const LOADVID_AD_SCRIPT_SRC = "https://cdn.loadvid.com/video-cdn.js";
const LOADVID_AD_ZONE_ID = "10355310";

interface LoadVidAdLibrary {
  runPop: (options: { zoneId: string }) => void;
}

declare global {
  interface Window {
    aclib?: LoadVidAdLibrary;
  }
}

/**
 * LoadVid uses aclib (video-cdn.js) to manage popunders / popups for its videos.
 *
 * How aclib works:
 * 1. The script `https://cdn.loadvid.com/video-cdn.js` must be loaded.
 * 2. `aclib.runPop({ zoneId })` must be called to initialize the ad zone and
 *    attach gesture listeners (click, touchstart, pointerdown) to `window`.
 * 3. Once initialized, aclib will automatically trigger the popup / popunder
 *    when the user interacts with the page or video player.
 */
export function LoadVidAd({ enabled }: { enabled: boolean }) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;

    const initAclib = () => {
      if (disposed || initializedRef.current) return;
      if (typeof window !== "undefined" && window.aclib?.runPop) {
        initializedRef.current = true;
        try {
          console.log(
            "[LoadVidAd] Initializing aclib.runPop with zoneId:",
            LOADVID_AD_ZONE_ID,
          );
          window.aclib.runPop({ zoneId: LOADVID_AD_ZONE_ID });
        } catch (error) {
          initializedRef.current = false;
          console.warn("[LoadVidAd] Failed to runPop:", error);
        }
      }
    };

    // If aclib is already loaded on window, initialize it immediately
    if (typeof window !== "undefined" && window.aclib?.runPop) {
      initAclib();
      return () => {
        disposed = true;
      };
    }

    // Check if the script is already in the document
    let script = document.getElementById(
      LOADVID_AD_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = LOADVID_AD_SCRIPT_ID;
      script.src = LOADVID_AD_SCRIPT_SRC;
      script.async = true;
      script.dataset.provider = "loadvid";
      script.onload = () => {
        initAclib();
        // Backup retry in case aclib initialization takes a tick
        if (!initializedRef.current) {
          setTimeout(initAclib, 50);
        }
      };
      script.onerror = (e) => {
        console.warn(
          "[LoadVidAd] Failed to load video-cdn.js (likely blocked by AdBlocker/DNS):",
          e,
        );
      };
      document.head.appendChild(script);
    } else {
      // Script already exists in DOM
      if (window.aclib?.runPop) {
        initAclib();
      } else {
        script.addEventListener("load", initAclib, { once: true });
        setTimeout(initAclib, 300);
      }
    }

    return () => {
      disposed = true;
    };
  }, [enabled]);

  // Start downloading the provider library from the server-rendered HTML so
  // fast desktop clicks do not happen before runPop has attached its listeners.
  return enabled ? (
    <link rel="preload" as="script" href={LOADVID_AD_SCRIPT_SRC} />
  ) : null;
}
