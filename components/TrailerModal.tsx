"use client";

import { useEffect, useCallback, useState } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { X } from "lucide-react";

interface TrailerModalProps {
  videoUrl: string;
  onClose: () => void;
}

export function TrailerModal({ videoUrl, onClose }: TrailerModalProps) {
  const [isReady, setIsReady] = useState(false);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    // Delay mounting to ensure DOM is ready
    const timer = setTimeout(() => setIsReady(true), 100);

    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [handleEsc]);

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const isYouTube = embedUrl.includes("youtube.com/embed");

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex h-dvh items-center justify-center overflow-y-auto bg-black/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-4"
      onClick={onClose}
    >
      <div
        className="relative aspect-video max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-hidden rounded-xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/50 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white md:top-4 md:right-4"
          aria-label="Đóng"
        >
          <X className="h-6 w-6" />
        </button>

        {isReady && (
          <>
            {isYouTube ? (
              // Use iframe for YouTube videos (more stable)
              <iframe
                src={embedUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Trailer"
              />
            ) : (
              // Use MediaPlayer for other video sources
              <MediaPlayer
                title="Trailer"
                src={videoUrl}
                autoPlay
                playsInline
                crossOrigin
                className="h-full w-full"
              >
                <MediaProvider />
                <DefaultVideoLayout icons={defaultLayoutIcons} />
              </MediaPlayer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
