/**
 * Cloudflare Turnstile Client Component
 * 
 * Captain Media Ecosystem Standard
 * Copy file này sang các site: Phim, Anime, Truyện
 * 
 * Features:
 * - Explicit render mode (recommended for SPAs)
 * - Dark theme (ecosystem standard)
 * - Callback handlers (onVerify, onError, onExpire)
 * - Exposes reset function via ref
 * - Prevents double-render in React Strict Mode
 * 
 * Requires: NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env
 * 
 * @see https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */
"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export interface TurnstileRef {
  reset: () => void;
  getResponse: () => string | undefined;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          execution?: "render" | "execute";
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

// Use explicit render mode as recommended by Cloudflare for SPAs
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  function Turnstile({ onVerify, onError, onExpire }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isRenderedRef = useRef(false);
    
    // Store callbacks in refs to avoid re-renders
    const onVerifyRef = useRef(onVerify);
    const onErrorRef = useRef(onError);
    const onExpireRef = useRef(onExpire);
    
    // Expose reset and getResponse methods via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
      getResponse: () => {
        if (widgetIdRef.current && window.turnstile) {
          return window.turnstile.getResponse(widgetIdRef.current);
        }
        return undefined;
      },
    }));
    
    // Update refs when callbacks change
    useEffect(() => {
      onVerifyRef.current = onVerify;
      onErrorRef.current = onError;
      onExpireRef.current = onExpire;
    }, [onVerify, onError, onExpire]);

    useEffect(() => {
      // Prevent double render in Strict Mode
      if (isRenderedRef.current) return;
      
      const renderWidget = () => {
        if (!containerRef.current || !window.turnstile || isRenderedRef.current) return;
        
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (!siteKey) {
          console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured");
          return;
        }

        isRenderedRef.current = true;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerifyRef.current(token),
          "error-callback": () => onErrorRef.current?.(),
          "expired-callback": () => onExpireRef.current?.(),
          theme: "dark",
          size: "normal",
        });
      };

      // Load Turnstile script with explicit render mode
      if (!document.getElementById("turnstile-script")) {
        // Set up callback before loading script
        window.onTurnstileLoad = () => {
          renderWidget();
        };
        
        const script = document.createElement("script");
        script.id = "turnstile-script";
        script.src = TURNSTILE_SCRIPT_URL;
        script.defer = true;
        document.head.appendChild(script);
      } else if (window.turnstile) {
        // Script already loaded
        renderWidget();
      } else {
        // Script loading but not ready - wait for callback
        const originalCallback = window.onTurnstileLoad;
        window.onTurnstileLoad = () => {
          originalCallback?.();
          renderWidget();
        };
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
            isRenderedRef.current = false;
            widgetIdRef.current = null;
          } catch {
            // Ignore cleanup errors
          }
        }
      };
    }, []);

    return (
      <div 
        ref={containerRef} 
        className="flex justify-center"
      />
    );
  }
);
