"use client";

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { createAdBlockPlaylistLoader } from "@/lib/hlsAdBlockLoader";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Maximize,
  SkipForward,
  VolumeX,
  Minimize,
  PictureInPicture2,
  Settings,
  Loader2,
  Sun,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { isLikelyPlaylistUrl, removeAdElements } from "@/lib/adBlocker";
import { saveWatchProgress } from "@/lib/continue-watching";
import { LoadVidAd } from "@/components/LoadVidAd";
import { FRANCHISE_PLAYER_THEMES, type FranchiseType } from "@/lib/player-franchises";
import { extractDirectStreamUrl, getEpNumber } from "@/lib/utils";

// Playlist loader clean quảng cáo ngay trong response, không qua blob URL.
const AdBlockPlaylistLoader = createAdBlockPlaylistLoader(
  Hls.DefaultConfig.pLoader ?? Hls.DefaultConfig.loader,
);
const SEEK_RECOVERY_DELAY_MS = 750;

function isVideoTimeBuffered(video: HTMLVideoElement | null, time: number) {
  if (!video) return false;
  const { buffered } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (time >= buffered.start(i) - 0.5 && time <= buffered.end(i)) return true;
  }
  return false;
}

function settlePendingSeekIfBuffered(
  video: HTMLVideoElement | null,
  pendingSeekRef: { current: number | null },
  seekWatchdogRef: { current: ReturnType<typeof setTimeout> | null },
) {
  const target = pendingSeekRef.current;
  if (target !== null && !isVideoTimeBuffered(video, target)) return false;
  pendingSeekRef.current = null;
  if (seekWatchdogRef.current) {
    clearTimeout(seekWatchdogRef.current);
    seekWatchdogRef.current = null;
  }
  return true;
}

// Playlist phải luôn lấy bản mới; segment thì để cache bình thường.
function hlsFetchSetup(
  context: { url: string },
  initParams: RequestInit,
): Request {
  initParams.cache = isLikelyPlaylistUrl(context.url) ? "no-store" : "default";
  return new Request(context.url, initParams);
}

interface Episode {
  server_name: string;
  items?: {
    name: string;
    slug: string;
    embed?: string;
    m3u8?: string;
  }[];
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenContainer = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export interface VideoPlayerRef {
  seekRelative: (seconds: number) => void;
  seekTo: (time: number) => void;
  togglePlay: () => void;
  toggleFullscreen: () => void;
  skipIntro: (seconds?: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  nextEpisodeHref?: string;
  onEnded?: () => void;
  // New Props for Crawler
  episodes?: Episode[];
  currentEpisode?: string;
  currentServer?: string;
  movieSlug?: string;
  movieName?: string;
  movieThumb?: string;
  /** VIP (ad-free) viewers get provider ads stripped as well. */
  isAdFree?: boolean;
  franchise?: FranchiseType;
  onEpisodeChange?: (episode: string, server?: string) => void;
  onPlayingChange?: (playing: boolean) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer(
    {
      src,
      poster,
      autoPlay = false,
      className = "",
      nextEpisodeHref,
      episodes,
      currentEpisode,
      currentServer,
      movieSlug,
      movieName,
      movieThumb,
      isAdFree = false,
      franchise = null,
      onPlayingChange,
      ...props
    },
    ref,
  ) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const episodeListRef = useRef<HTMLDivElement>(null);

  // Filter episodes for current server
  const serverData =
    episodes?.find((s) => s.server_name === currentServer) || episodes?.[0];
  const episodeItems = serverData?.items || [];

  // Determine current episode index and next episode item
  const currentEpIndex = episodeItems.findIndex(
    (ep) =>
      ep.slug === currentEpisode ||
      getEpNumber(ep.slug) === getEpNumber(currentEpisode || ""),
  );
  const nextEpisodeItem =
    currentEpIndex >= 0 && currentEpIndex < episodeItems.length - 1
      ? episodeItems[currentEpIndex + 1]
      : null;
  const hasNextEpisode = !!nextEpisodeItem || !!nextEpisodeHref;

  // Local state for UI
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(false);

  // Gesture State
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastTapTime = useRef<number>(0);

  // Visual Feedback State
  const [brightness, setBrightness] = useState(1);
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: "volume" | "brightness" | "seek" | null;
    value: number | string;
    initialValue?: number;
  }>({ type: null, value: 0 });
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    type: "forward" | "backward" | null;
    id: number;
  }>({ type: null, id: 0 });

  const [showEpisodeToast, setShowEpisodeToast] = useState(false);
  const [dismissNextPrompt, setDismissNextPrompt] = useState(false);

  // Refs for gesture calculations and progress saving
  const initialVolume = useRef(1);
  const initialBrightness = useRef(1);
  const initialTimeRef = useRef(0);
  const isDragging = useRef(false);
  const lastSaveTimeRef = useRef(0);

  // HLS instance + seek recovery bookkeeping
  const hlsRef = useRef<Hls | null>(null);
  const seekWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const wasPlayingBeforeSeekRef = useRef<boolean>(false);

  // Progress bar scrubbing (pointer-driven, independent of native range drag)
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  // Touch gestures must ignore taps that start on the controls layer,
  // otherwise the swipe-to-seek gesture fights the progress bar.
  const isControlsTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest(
      "button, input, a, [role='slider'], .video-player-controls-inner",
    );

  // Helper to save current watch progress
  const saveCurrentProgress = () => {
    if (!movieSlug || !videoRef.current) return;
    const video = videoRef.current;
    if (video.currentTime > 3 && (video.duration > 10 || duration > 10)) {
      saveWatchProgress({
        slug: movieSlug,
        name: movieName || movieSlug,
        poster_url: poster || movieThumb,
        thumb_url: movieThumb || poster,
        episode: currentEpisode || "tap-1",
        episodeName: currentEpisode
          ? `Tập ${getEpNumber(currentEpisode)}`
          : "Tập 1",
        server: currentServer || "server-1",
        currentTime: video.currentTime,
        duration: video.duration || duration,
      });
    }
  };

  // Check start time from URL ?t=123
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const timeParam = params.get("t");
      if (timeParam) {
        const startSec = parseFloat(timeParam);
        if (!isNaN(startSec) && startSec > 0 && videoRef.current) {
          const video = videoRef.current;
          const handleSeekOnLoad = () => {
            if (video.duration && startSec < video.duration) {
              video.currentTime = startSec;
              setCurrentTime(startSec);
            }
          };
          if (video.readyState >= 1) {
            handleSeekOnLoad();
          } else {
            video.addEventListener("loadedmetadata", handleSeekOnLoad, {
              once: true,
            });
          }
        }
      }
    }
  }, [src]);

  // Show "Current Episode" toast when episode changes
  useEffect(() => {
    if (currentEpisode) {
      const showTimer = setTimeout(() => setShowEpisodeToast(true), 0);
      const hideTimer = setTimeout(() => setShowEpisodeToast(false), 3000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [currentEpisode]);

  // Reset next episode prompt on episode switch or when seeking backward
  useEffect(() => {
    setDismissNextPrompt(false);
  }, [src, currentEpisode]);

  useEffect(() => {
    if (duration > 0 && duration - currentTime > 95 && dismissNextPrompt) {
      setDismissNextPrompt(false);
    }
  }, [currentTime, duration, dismissNextPrompt]);

  // Auto-scroll to current episode
  useEffect(() => {
    if (showControls && episodeListRef.current && currentEpisode) {
      const activeBtn = episodeListRef.current.querySelector(
        '[data-active="true"]',
      ) as HTMLElement;
      if (activeBtn) {
        episodeListRef.current.scrollTo({
          left:
            activeBtn.offsetLeft -
            episodeListRef.current.offsetWidth / 2 +
            activeBtn.offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }, [showControls, currentEpisode]);

  // Auto-hide double tap feedback
  useEffect(() => {
    if (doubleTapFeedback.type) {
      const timer = setTimeout(() => {
        setDoubleTapFeedback((prev) => ({ ...prev, type: null }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [doubleTapFeedback]);

  // Auto extract direct stream URL if wrapped in player.phimapi.com/player/?url=...
  const cleanSrc = extractDirectStreamUrl(src);

  // Detect LoadVid URL
  const isLoadVid =
    !!cleanSrc &&
    (cleanSrc.includes("loadvid.com/videos/play/") ||
      cleanSrc.includes("/api/stream/loadvid"));

  // Effective stream source
  const effectiveSrc = isLoadVid
    ? cleanSrc.startsWith("/api/stream/loadvid")
      ? cleanSrc
      : `/api/stream/loadvid?url=${encodeURIComponent(cleanSrc)}`
    : cleanSrc;

  // Remove DOM ad elements periodically, except for provider-owned LoadVid ads.
  useEffect(() => {
    if (isLoadVid && !isAdFree) return;

    const cleanup = () => removeAdElements(undefined, cleanSrc, { isAdFree });
    cleanup();
    const interval = setInterval(cleanup, 5000);
    return () => clearInterval(interval);
  }, [isLoadVid, isAdFree, cleanSrc]);

  // Detect embed URL (e.g. Youtube, external iframe players, but NOT LoadVid or direct m3u8/mp4)
  const isEmbed =
    !!cleanSrc &&
    !isLoadVid &&
    !cleanSrc.includes(".m3u8") &&
    !cleanSrc.includes(".mp4") &&
    !cleanSrc.startsWith("blob:") &&
    !cleanSrc.startsWith("/api/stream/");

  // Initialize HLS with ad blocking
  useEffect(() => {
    setIsPlaying(false);

    if (isEmbed) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let isMounted = true;

    const initializeVideo = () => {
      setIsLoading(true);

      const processedSrc = effectiveSrc;
      const shouldFilterAds = !isLoadVid || isAdFree;

      if (!isMounted) return;

      if (
        Hls.isSupported() &&
        (processedSrc.includes(".m3u8") ||
          isLoadVid ||
          processedSrc.includes("/api/stream/") ||
          processedSrc.startsWith("blob:"))
      ) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          ...(shouldFilterAds ? { pLoader: AdBlockPlaylistLoader } : {}),
          fetchSetup: hlsFetchSetup,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 1.0,
          maxFragLookUpTolerance: 0.5,
          nudgeMaxRetry: 10,
          nudgeOffset: 0.2,
          highBufferWatchdogPeriod: 2,
          testBandwidth: false,
          abrEwmaDefaultEstimate: 3_000_000,
          capLevelToPlayerSize: true,
          capLevelOnFPSDrop: true,
          startFragPrefetch: true,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 4,
          fragLoadingTimeOut: 45000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
        });
        hlsRef.current = hls;
        hls.loadSource(processedSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay && isMounted) {
            video.play().catch(() => setIsPlaying(false));
          }
          if (
            settlePendingSeekIfBuffered(video, pendingSeekRef, seekWatchdogRef)
          ) {
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (isMounted) {
            if (
              settlePendingSeekIfBuffered(
                video,
                pendingSeekRef,
                seekWatchdogRef,
              )
            ) {
              setIsLoading(false);
              if (wasPlayingBeforeSeekRef.current && video.paused) {
                video
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {});
              }
            }
          }
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          if (isMounted && video.readyState >= 2) {
            if (
              settlePendingSeekIfBuffered(
                video,
                pendingSeekRef,
                seekWatchdogRef,
              )
            ) {
              setIsLoading(false);
              if (wasPlayingBeforeSeekRef.current && video.paused) {
                video
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {});
              }
            }
          }
        });

        let recoveryAttempts = 0;
        const MAX_RECOVERY = 3;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (
            !data.fatal &&
            (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
              data.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE ||
              data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL)
          ) {
            const stalledAt = pendingSeekRef.current ?? video.currentTime;
            try {
              hls!.startLoad(stalledAt);
              if (wasPlayingBeforeSeekRef.current || !video.paused) {
                if (video.paused && video.readyState >= 2) {
                  video.play().catch(() => {});
                }
              }
            } catch {
              /* ignore */
            }
            return;
          }

          if (data.fatal) {
            recoveryAttempts++;
            if (recoveryAttempts > MAX_RECOVERY) {
              hls!.destroy();
              return;
            }
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setTimeout(() => {
                  if (isMounted) {
                    hls!.startLoad(pendingSeekRef.current ?? video.currentTime);
                  }
                }, 1000);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setTimeout(() => {
                  if (isMounted) hls!.recoverMediaError();
                }, 1000);
                break;
              default:
                hls!.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = processedSrc;
        if (autoPlay) {
          video.play().catch(() => setIsPlaying(false));
        }
        setIsLoading(false);
      } else {
        // Regular video
        video.src = processedSrc;
        if (autoPlay) {
          video.play().catch(() => setIsPlaying(false));
        }
        setIsLoading(false);
      }
    };

    initializeVideo();

    return () => {
      isMounted = false;
      if (seekWatchdogRef.current) {
        clearTimeout(seekWatchdogRef.current);
        seekWatchdogRef.current = null;
      }
      pendingSeekRef.current = null;
      hlsRef.current = null;
      if (hls) {
        try {
          hls.destroy();
        } catch {
          /* ignore */
        }
      }
    };
  }, [src, autoPlay, effectiveSrc, isEmbed, isLoadVid, isAdFree]);

  // Event Handlers
  const onPlay = () => {
    setIsPlaying(true);
    if (
      settlePendingSeekIfBuffered(
        videoRef.current,
        pendingSeekRef,
        seekWatchdogRef,
      )
    ) {
      setIsLoading(false);
    }
  };

  const onPlaying = () => {
    setIsPlaying(true);
    pendingSeekRef.current = null;
    wasPlayingBeforeSeekRef.current = false;
    clearSeekWatchdog();
    setIsLoading(false);
  };

  const onPause = () => {
    // Only mark as paused if not actively in the middle of a seek or scrub
    if (!pendingSeekRef.current && !isScrubbing) {
      setIsPlaying(false);
      saveCurrentProgress();
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 5000) {
        lastSaveTimeRef.current = now;
        saveCurrentProgress();
      }
    }
  };

  const syncDuration = () => {
    const video = videoRef.current;
    if (!video) return;
    const value = video.duration;
    if (Number.isFinite(value) && value > 0) {
      setDuration(value);
    }
  };

  const onDurationChange = syncDuration;

  const onVolumeChange = () => {
    if (videoRef.current) {
      setVolume(videoRef.current.volume);
      setIsMuted(videoRef.current.muted);
    }
  };

  const onWaiting = () => {
    if (videoRef.current && videoRef.current.readyState < 3) {
      setIsLoading(true);
    }
  };

  const onCanPlay = () => {
    const buffered = settlePendingSeekIfBuffered(
      videoRef.current,
      pendingSeekRef,
      seekWatchdogRef,
    );
    setIsLoading(!buffered);
    syncDuration();
    if (
      videoRef.current &&
      wasPlayingBeforeSeekRef.current &&
      videoRef.current.paused
    ) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const onCanPlayThrough = () => {
    const buffered = settlePendingSeekIfBuffered(
      videoRef.current,
      pendingSeekRef,
      seekWatchdogRef,
    );
    setIsLoading(!buffered);
    if (
      videoRef.current &&
      wasPlayingBeforeSeekRef.current &&
      videoRef.current.paused
    ) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const onLoadedData = () => {
    setIsLoading(
      !settlePendingSeekIfBuffered(
        videoRef.current,
        pendingSeekRef,
        seekWatchdogRef,
      ),
    );
    syncDuration();
    if (
      videoRef.current &&
      wasPlayingBeforeSeekRef.current &&
      videoRef.current.paused
    ) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const clearSeekWatchdog = () => {
    if (seekWatchdogRef.current) {
      clearTimeout(seekWatchdogRef.current);
      seekWatchdogRef.current = null;
    }
  };

  function isTimeBuffered(time: number) {
    return isVideoTimeBuffered(videoRef.current, time);
  }

  function requestSeekLoad(target: number) {
    const hls = hlsRef.current;
    if (!hls) return false;
    try {
      hls.startLoad(target);
      return true;
    } catch {
      return false;
    }
  }

  function scheduleSeekRecovery(target: number) {
    clearSeekWatchdog();
    seekWatchdogRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (
        !video ||
        pendingSeekRef.current === null ||
        Math.abs(pendingSeekRef.current - target) > 0.5
      ) {
        return;
      }

      if (isTimeBuffered(target)) {
        pendingSeekRef.current = null;
        seekWatchdogRef.current = null;
        setIsLoading(false);
        if (wasPlayingBeforeSeekRef.current && video.paused) {
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        }
        return;
      }

      if (!requestSeekLoad(target)) {
        video.currentTime = target;
      }
      seekWatchdogRef.current = null;
    }, SEEK_RECOVERY_DELAY_MS);
  }

  const onSeeked = () => {
    const video = videoRef.current;
    if (!video) return;

    const pendingTarget = pendingSeekRef.current;
    if (
      pendingTarget === null ||
      settlePendingSeekIfBuffered(video, pendingSeekRef, seekWatchdogRef)
    ) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
      scheduleSeekRecovery(pendingTarget);
    }
    setCurrentTime(video.currentTime);

    // Continue playback smoothly if it was playing
    if (wasPlayingBeforeSeekRef.current && video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const watchdogRef = seekWatchdogRef;
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const onSeeking = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    const target = pendingSeekRef.current ?? video.currentTime;
    if (!isTimeBuffered(target)) {
      setIsLoading(true);
      if (pendingSeekRef.current !== null) {
        scheduleSeekRecovery(target);
      }
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    if (props.onEnded) props.onEnded();
  };

  // Controls Handlers
  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  };

  const getSeekableDuration = () => {
    const video = videoRef.current;
    const fromVideo = video?.duration;
    if (
      typeof fromVideo === "number" &&
      Number.isFinite(fromVideo) &&
      fromVideo > 0
    ) {
      return fromVideo;
    }
    if (Number.isFinite(duration) && duration > 0) return duration;

    const seekable = video?.seekable;
    if (seekable && seekable.length > 0) {
      const end = seekable.end(seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
    return 0;
  };

  // Single entry point for every seek (buttons, progress bar, gestures).
  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;

    const total = getSeekableDuration();
    if (total <= 0) return;

    const target = Math.min(Math.max(time, 0), Math.max(0, total - 0.3));
    if (!Number.isFinite(target)) return;

    const wasPlaying = isPlaying || (!video.paused && !video.ended);
    wasPlayingBeforeSeekRef.current = wasPlaying;

    const targetIsBuffered = isTimeBuffered(target);
    pendingSeekRef.current = targetIsBuffered ? null : target;

    if (!targetIsBuffered) {
      setIsLoading(true);
    } else {
      clearSeekWatchdog();
      setIsLoading(false);
    }

    video.currentTime = target;
    setCurrentTime(target);
    setShowSettings(false);

    if (!targetIsBuffered) {
      requestSeekLoad(target);
      scheduleSeekRecovery(target);
    }

    // Auto resume if it was playing before seek
    if (wasPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Buffer will trigger canplay and continue playback
          });
      }
    }
  };

  const seekRelative = (seconds: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const current = pendingSeekRef.current ?? video.currentTime;
    seekTo(current + seconds);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    if (newVolume > 0 && isMuted) video.muted = false;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const timeFromPointer = (clientX: number) => {
    const bar = progressBarRef.current;
    const video = videoRef.current;
    if (!bar || !video) return null;
    const total = getSeekableDuration();
    if (total <= 0) return null;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * total;
  };

  const handleScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const targetTime = timeFromPointer(e.clientX);
    if (targetTime === null) return;
    if (videoRef.current) {
      wasPlayingBeforeSeekRef.current = !videoRef.current.paused;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    setScrubTime(targetTime);
  };

  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    const targetTime = timeFromPointer(e.clientX);
    if (targetTime === null) return;
    setScrubTime(targetTime);
  };

  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const targetTime = timeFromPointer(e.clientX) ?? scrubTime;
    setIsScrubbing(false);
    seekTo(targetTime);
  };

  const toggleFullscreen = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const container = containerRef.current as FullscreenContainer | null;
    const video = videoRef.current as FullscreenVideo | null;
    if (!container) return;

    try {
      const fullscreenDocument = document as FullscreenDocument;
      const activeFullscreenElement =
        document.fullscreenElement ||
        fullscreenDocument.webkitFullscreenElement;

      if (activeFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (fullscreenDocument.webkitExitFullscreen) {
          await fullscreenDocument.webkitExitFullscreen();
        }
        try {
          screen.orientation?.unlock();
        } catch {
          /* ignore */
        }
      } else {
        if (video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
          try {
            await (
              screen.orientation as ScreenOrientation & {
                lock?: (o: string) => Promise<void>;
              }
            )?.lock?.("landscape");
          } catch {
            /* ignore */
          }
          return;
        }
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else {
          return;
        }
        try {
          await (
            screen.orientation as ScreenOrientation & {
              lock?: (o: string) => Promise<void>;
            }
          )?.lock?.("landscape");
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP Error", err);
    }
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSettings(false);
  };

  const handleRewind10 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    seekRelative(-10);
  };

  const handleForward10 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    seekRelative(10);
  };

  const handleNextEpisodeClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (nextEpisodeItem && props.onEpisodeChange) {
      props.onEpisodeChange(nextEpisodeItem.slug, currentServer);
    } else if (nextEpisodeHref) {
      window.location.href = nextEpisodeHref;
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      seekRelative: (seconds: number) => {
        seekRelative(seconds);
      },
      seekTo: (time: number) => {
        seekTo(time);
      },
      togglePlay: () => {
        togglePlay();
      },
      toggleFullscreen: () => {
        toggleFullscreen({
          stopPropagation: () => {},
        } as React.MouseEvent<HTMLButtonElement>);
      },
      skipIntro: (seconds = 85) => {
        seekRelative(seconds);
      },
      getVideoElement: () => videoRef.current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // --- Gesture Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isControlsTarget(e.target)) {
      touchStartX.current = null;
      touchStartY.current = null;
      isDragging.current = false;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();

    const video = videoRef.current;
    if (video) {
      initialVolume.current = video.volume;
      initialTimeRef.current = video.currentTime;
      wasPlayingBeforeSeekRef.current = !video.paused;
    }
    initialBrightness.current = brightness;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (isControlsTarget(e.target)) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (!isDragging.current && (absDeltaX > 10 || absDeltaY > 10)) {
      isDragging.current = true;
    }

    if (isDragging.current) {
      const width = e.currentTarget.clientWidth;
      const height = e.currentTarget.clientHeight;

      if (!gestureFeedback.type) {
        if (absDeltaX > absDeltaY) {
          setGestureFeedback({
            type: "seek",
            value: initialTimeRef.current,
            initialValue: initialTimeRef.current,
          });
        } else {
          if (touchStartX.current < width / 2) {
            setGestureFeedback({
              type: "brightness",
              value: initialBrightness.current,
              initialValue: initialBrightness.current,
            });
          } else {
            setGestureFeedback({
              type: "volume",
              value: initialVolume.current,
              initialValue: initialVolume.current,
            });
          }
        }
      }

      if (gestureFeedback.type === "seek") {
        const total = getSeekableDuration();
        const seekPercent = deltaX / width;
        const seekTime = Math.max(
          0,
          Math.min(total, initialTimeRef.current + seekPercent * 90),
        );
        setGestureFeedback((prev) => ({ ...prev, value: seekTime }));
      } else if (gestureFeedback.type === "volume") {
        const volChange = -(deltaY / height) * 1.5;
        const newVol = Math.max(
          0,
          Math.min(1, initialVolume.current + volChange),
        );
        const video = videoRef.current;
        if (video) video.volume = newVol;
        setGestureFeedback((prev) => ({ ...prev, value: newVol }));
        if (newVol > 0 && isMuted) setIsMuted(false);
      } else if (gestureFeedback.type === "brightness") {
        const brightChange = -(deltaY / height) * 1.5;
        const newBright = Math.max(
          0.2,
          Math.min(1, initialBrightness.current + brightChange),
        );
        setBrightness(newBright);
        setGestureFeedback((prev) => ({ ...prev, value: newBright }));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.target as Element | null;
    if (target?.closest("button, input, a")) {
      touchStartX.current = null;
      touchStartY.current = null;
      isDragging.current = false;
      return;
    }

    const now = Date.now();

    if (isDragging.current) {
      if (
        gestureFeedback.type === "seek" &&
        typeof gestureFeedback.value === "number"
      ) {
        seekTo(gestureFeedback.value);
      }
      setGestureFeedback({ type: null, value: 0, initialValue: 0 });
      isDragging.current = false;
    } else {
      const timeSinceLastTap = now - lastTapTime.current;

      if (timeSinceLastTap < 300) {
        const width = e.currentTarget.clientWidth;
        const x = e.changedTouches[0].clientX;
        const rect = e.currentTarget.getBoundingClientRect();
        const relativeX = x - rect.left;

        if (relativeX < width * 0.35) {
          seekRelative(-10);
          setDoubleTapFeedback({ type: "backward", id: now });
        } else if (relativeX > width * 0.65) {
          seekRelative(10);
          setDoubleTapFeedback({ type: "forward", id: now });
        } else {
          togglePlay();
        }
        lastTapTime.current = now;
      } else {
        lastTapTime.current = now;
        const width = e.currentTarget.clientWidth;
        const x = e.changedTouches[0].clientX;
        const rect = e.currentTarget.getBoundingClientRect();
        const relativeX = x - rect.left;

        if (relativeX > width * 0.35 && relativeX < width * 0.65) {
          togglePlay();
        } else {
          setShowControls((prev) => !prev);
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Sync isFullscreen state, lock body scroll & orientation
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenDocument = document as FullscreenDocument;
      const isNowFullscreen = Boolean(
        document.fullscreenElement ||
        fullscreenDocument.webkitFullscreenElement ||
        (videoRef.current as FullscreenVideo | null)
          ?.webkitDisplayingFullscreen,
      );
      setIsFullscreen(isNowFullscreen);
      if (!isNowFullscreen) {
        try {
          screen.orientation?.unlock();
        } catch {
          /* ignore */
        }
        document.body.style.overflow = "";
        document.body.style.overscrollBehavior = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.overscrollBehavior = "";
      } else {
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehavior = "none";
      }
    };

    const handleWebkitStart = () => setIsFullscreen(true);
    const handleWebkitEnd = () => {
      setIsFullscreen(false);
      try {
        screen.orientation?.unlock();
      } catch {
        /* ignore */
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    const video = videoRef.current;
    if (video)
      video.addEventListener("webkitbeginfullscreen", handleWebkitStart);
    if (video) video.addEventListener("webkitendfullscreen", handleWebkitEnd);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (video)
        video.removeEventListener("webkitbeginfullscreen", handleWebkitStart);
      if (video)
        video.removeEventListener("webkitendfullscreen", handleWebkitEnd);
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, []);

  // Native touch listeners (passive: false) — critical for iOS scroll prevention
  useEffect(() => {
    if (isEmbed) return;
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a")
      )
        return;
      if (e.cancelable) e.preventDefault();
      handleTouchStart(e as unknown as React.TouchEvent);
    };
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a")
      )
        return;
      if (e.cancelable) e.preventDefault();
      handleTouchMove(e as unknown as React.TouchEvent);
    };
    const onTouchEnd = (e: TouchEvent) => {
      handleTouchEnd(e as unknown as React.TouchEvent);
    };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbed, gestureFeedback.type]);

  // Keyboard Shortcuts (Desktop)
  useEffect(() => {
    if (isEmbed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekRelative(10);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen({
            stopPropagation: () => {},
          } as React.MouseEvent<HTMLButtonElement>);
          break;
        case "m":
          e.preventDefault();
          toggleMute({
            stopPropagation: () => {},
          } as React.MouseEvent<HTMLButtonElement>);
          break;
        case "s":
          e.preventDefault();
          seekRelative(85);
          break;
        case "n":
          if (e.shiftKey) {
            e.preventDefault();
            handleNextEpisodeClick();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbed, isPlaying, isMuted, isFullscreen, duration, nextEpisodeHref]);

  // Auto hide controls
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showControls && isPlaying && !showSettings && !isScrubbing) {
      timer = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
    return () => clearTimeout(timer);
  }, [showControls, isPlaying, showSettings, isScrubbing]);

  const formatTime = (timeInSeconds: number) => {
    if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const totalSeconds = Math.floor(timeInSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${remainingMinutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${remainingMinutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const maxDisplayDuration = duration > 0 ? duration : 100;
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent =
    duration > 0
      ? Math.min(100, Math.max(0, (displayTime / duration) * 100))
      : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`group relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-black ${className} ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen max-h-none max-w-none rounded-none"
          : "relative rounded-2xl"
      }`}
      style={{
        filter: brightness < 1 ? `brightness(${brightness})` : undefined,
      }}
    >
      {/* Provider Ads / LoadVid popup initialization */}
      <LoadVidAd enabled={isLoadVid && !isAdFree} />

      {/* Embed Fallback */}
      {isEmbed ? (
        <iframe
          src={src}
          className="h-full w-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      ) : (
        <>
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="true"
            onPlay={onPlay}
            onPlaying={onPlaying}
            onPause={onPause}
            onTimeUpdate={onTimeUpdate}
            onDurationChange={onDurationChange}
            onVolumeChange={onVolumeChange}
            onWaiting={onWaiting}
            onCanPlay={onCanPlay}
            onCanPlayThrough={onCanPlayThrough}
            onLoadedData={onLoadedData}
            onSeeked={onSeeked}
            onSeeking={onSeeking}
            onEnded={onEnded}
            onClick={togglePlay}
            className="h-full w-full object-contain cursor-pointer"
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#0ea5e9] dark:text-[#fac000]" />
                <span className="text-xs font-semibold text-white/80 tracking-wide drop-shadow">
                  Đang tải video...
                </span>
              </div>
            </div>
          )}

          {/* Gesture Visual Feedback */}
          {gestureFeedback.type && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/75 px-6 py-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-90">
                {gestureFeedback.type === "seek" && (
                  <>
                    <div className="flex items-center gap-2 text-[#0ea5e9] dark:text-[#fac000]">
                      {typeof gestureFeedback.value === "number" &&
                      typeof gestureFeedback.initialValue === "number" &&
                      gestureFeedback.value < gestureFeedback.initialValue ? (
                        <RotateCcw className="h-8 w-8" />
                      ) : (
                        <RotateCw className="h-8 w-8" />
                      )}
                      <span className="text-xl font-bold tracking-tight text-white">
                        {formatTime(Number(gestureFeedback.value))}
                      </span>
                    </div>
                    <span className="text-xs text-white/60">
                      / {formatTime(duration)}
                    </span>
                  </>
                )}
                {gestureFeedback.type === "volume" && (
                  <>
                    {Number(gestureFeedback.value) === 0 ? (
                      <VolumeX className="h-8 w-8 text-rose-400" />
                    ) : (
                      <Volume2 className="h-8 w-8 text-[#0ea5e9] dark:text-[#fac000]" />
                    )}
                    <span className="text-lg font-bold text-white">
                      {Math.round(Number(gestureFeedback.value) * 100)}%
                    </span>
                  </>
                )}
                {gestureFeedback.type === "brightness" && (
                  <>
                    <Sun className="h-8 w-8 text-amber-400" />
                    <span className="text-lg font-bold text-white">
                      {Math.round(Number(gestureFeedback.value) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Double Tap Ripple Feedback */}
          {doubleTapFeedback.type && (
            <div
              className={`pointer-events-none absolute top-0 bottom-0 z-30 flex w-1/3 items-center justify-center bg-white/5 transition-opacity ${
                doubleTapFeedback.type === "backward" ? "left-0" : "right-0"
              }`}
            >
              <div className="flex flex-col items-center gap-1 text-white">
                {doubleTapFeedback.type === "backward" ? (
                  <>
                    <ChevronLeft className="h-10 w-10 animate-pulse text-[#0ea5e9] dark:text-[#fac000]" />
                    <span className="text-xs font-bold">-10s</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-10 w-10 animate-pulse text-[#0ea5e9] dark:text-[#fac000]" />
                    <span className="text-xs font-bold">+10s</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Big Center Play/Pause Button on Pause */}
          {!isPlaying && !isLoading && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Phát video"
              className="absolute inset-0 z-20 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-[#0ea5e9] dark:hover:bg-[#fac000] dark:hover:text-black sm:h-20 sm:w-20"
            >
              <Play className="h-8 w-8 fill-current translate-x-0.5 sm:h-10 sm:w-10" />
            </button>
          )}

          {/* Video Controls Overlay */}
          <div
            className={`video-player-controls-inner pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3 transition-opacity duration-300 sm:p-5 ${
              showControls || !isPlaying
                ? "opacity-100 [&>*]:pointer-events-auto"
                : "opacity-0"
            }`}
          >
            {/* Top Bar (Movie Title & Episode - Only Shown in Fullscreen to prevent duplicate info) */}
            {isFullscreen ? (
              <div className="flex items-center justify-between text-white drop-shadow -mx-3 -mt-3 sm:-mx-5 sm:-mt-5 p-3 sm:p-4 bg-linear-to-b from-black/85 via-black/40 to-transparent rounded-t-2xl">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <span className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    Đang xem
                  </span>

                  <h3 className="truncate font-serif text-xs sm:text-sm md:text-base font-black text-white tracking-tight max-w-[50vw] sm:max-w-xl">
                    {movieName || movieSlug}
                  </h3>

                  {currentEpisode && (
                    <span className="shrink-0 font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md text-[11px] sm:text-xs">
                      Tập {getEpNumber(currentEpisode)}
                    </span>
                  )}

                  {currentServer && (
                    <span className="hidden md:inline-block shrink-0 text-[11px] text-white/70 bg-white/10 px-2 py-0.5 rounded-md border border-white/10 uppercase">
                      {currentServer}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 text-xs font-semibold text-white/85 transition-colors hover:bg-white/20 hover:text-white shrink-0 cursor-pointer shadow-lg backdrop-blur-md"
                  title="Thoát toàn màn hình (Esc)"
                >
                  <Minimize className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Thoát</span>
                </button>
              </div>
            ) : (
              /* Non-fullscreen empty top anchor for flex-between spacing */
              <div className="h-0" />
            )}

            {/* Bottom Controls Area */}
            <div className="flex flex-col gap-2">
              {/* Episodes Quick Selector Bar */}
              {episodeItems.length > 1 && (
                <div
                  ref={episodeListRef}
                  className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1 scroll-smooth"
                >
                  {episodeItems.map((ep) => {
                    const isActive =
                      ep.slug === currentEpisode ||
                      getEpNumber(ep.slug) ===
                        getEpNumber(currentEpisode || "");
                    return (
                      <Link
                        key={ep.slug}
                        href={
                          movieSlug
                            ? `/xem/${movieSlug}/${currentServer || "server-1"}/${ep.slug}`
                            : "#"
                        }
                        data-active={isActive}
                        className={`flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[#0ea5e9] text-white shadow-md shadow-[#0ea5e9]/30 dark:bg-[#fac000] dark:text-black dark:shadow-[#fac000]/30"
                            : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                        }`}
                        onClick={(e) => {
                          if (props.onEpisodeChange) {
                            e.preventDefault();
                            props.onEpisodeChange(ep.slug, currentServer);
                          }
                        }}
                      >
                        {getEpNumber(ep.name)}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Time Slider */}
              <div
                ref={progressBarRef}
                role="presentation"
                onPointerDown={handleScrubStart}
                onPointerMove={handleScrubMove}
                onPointerUp={handleScrubEnd}
                onPointerCancel={handleScrubEnd}
                onClick={(e) => e.stopPropagation()}
                className="video-player-progress group/slider relative mb-1 flex h-7 w-full touch-none cursor-pointer items-center rounded-md has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/70 has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-black sm:mb-2 sm:h-4"
              >
                {/* Background Track */}
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20 transition-[height,background-color] duration-200 group-hover/slider:h-1.5 group-hover/slider:bg-white/30" />

                {/* Input Range */}
                <input
                  type="range"
                  min={0}
                  max={maxDisplayDuration}
                  value={Math.min(displayTime, maxDisplayDuration)}
                  onChange={handleSeek}
                  step="0.1"
                  aria-label="Tiến độ phát video"
                  aria-valuetext={`${formatTime(displayTime)} trên ${formatTime(duration)}`}
                  className="pointer-events-none absolute inset-0 z-30 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                />

                {/* Visible Progress Bar */}
                <div
                  className={`pointer-events-none absolute top-1/2 left-0 z-10 -translate-y-1/2 rounded-full bg-linear-to-r from-[#f2c45c] to-[#ffd978] shadow-[0_0_10px_rgba(242,196,92,0.28)] transition-[width,height] duration-100 ease-linear group-hover/slider:h-1.5 ${
                    isScrubbing ? "h-1.5" : "h-1"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                >
                  <div
                    className={`absolute top-1/2 right-0 h-2.5 w-2.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe29a] opacity-90 shadow-[0_0_0_2px_rgba(8,12,22,0.72)] transition-all duration-150 sm:h-2 sm:w-2 sm:group-hover/slider:h-3 sm:group-hover/slider:w-3 sm:group-hover/slider:scale-100 sm:group-hover/slider:opacity-100 ${
                      isScrubbing
                        ? "sm:h-3 sm:w-3 sm:scale-100 sm:opacity-100"
                        : "sm:scale-0 sm:opacity-0"
                    }`}
                  />
                </div>
              </div>

              {/* Main Controls Row */}
              <div className="flex min-w-0 items-center justify-between gap-1 sm:gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:flex-none sm:gap-3">
                  {/* Play/Pause Button */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95"
                    title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 fill-current sm:h-6 sm:w-6" />
                    ) : (
                      <Play className="h-5 w-5 fill-current sm:h-6 sm:w-6" />
                    )}
                  </button>

                  {/* Rewind 10s Button */}
                  <button
                    type="button"
                    onClick={handleRewind10}
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95 sm:flex"
                    title="Lùi 10 giây (J / Mũi tên trái)"
                  >
                    <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>

                  {/* Forward 10s Button */}
                  <button
                    type="button"
                    onClick={handleForward10}
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95 sm:flex"
                    title="Tua tới 10 giây (L / Mũi tên phải)"
                  >
                    <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>

                  {/* Volume Control */}
                  <div className="group/vol flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95"
                      title={isMuted ? "Bật âm thanh (M)" : "Tắt âm thanh (M)"}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" />
                      ) : (
                        <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      )}
                    </button>
                    <div className="w-0 overflow-hidden transition-all duration-300 group-hover/vol:w-16 sm:group-hover/vol:w-20">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-white/30 accent-[#0ea5e9] sm:w-20 dark:accent-[#fac000]"
                      />
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="video-player-time flex shrink-0 items-center rounded-md bg-black/25 px-1.5 py-1 text-[11px] font-semibold tracking-tight whitespace-nowrap text-white/85 tabular-nums sm:px-2 sm:text-xs">
                    <span>{formatTime(displayTime)}</span>
                    <span className="mx-1.5 text-white/35">/</span>
                    <span className="text-white/60">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Right Controls (Next Episode, Settings, PiP, Fullscreen) */}
                <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
                  {hasNextEpisode && (
                    <button
                      type="button"
                      onClick={handleNextEpisodeClick}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95 ${
                        franchise && FRANCHISE_PLAYER_THEMES[franchise]
                          ? FRANCHISE_PLAYER_THEMES[franchise].nextIconClass
                          : "text-[#D4AF68] hover:text-[#e0c283] hover:bg-[#D4AF68]/10"
                      }`}
                      title={
                        nextEpisodeItem
                          ? `Tập tiếp theo (${nextEpisodeItem.name})`
                          : "Tập tiếp theo (Shift+N)"
                      }
                    >
                      <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  )}

                  {/* Settings Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSettings((prev) => !prev)}
                      aria-label="Cài đặt phát video"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95 ${
                        showSettings
                          ? "rotate-45 text-[#0ea5e9] dark:text-[#fac000]"
                          : ""
                      }`}
                      title="Cài đặt"
                    >
                      <Settings className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300" />
                    </button>

                    {showSettings && (
                      <div className="animate-in fade-in zoom-in-95 absolute right-0 bottom-full z-50 mb-2 w-48 rounded-xl border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur-xl">
                        <div className="mb-1 px-3 py-1 text-xs font-bold text-white/50 uppercase">
                          Tốc độ phát
                        </div>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changeSpeed(rate)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                              playbackRate === rate
                                ? "bg-[#0ea5e9]/20 text-[#0ea5e9] dark:bg-[#fac000]/20 dark:text-[#fac000]"
                                : "text-white/80 hover:bg-white/10"
                            }`}
                          >
                            <span>
                              {rate === 1 ? "Chuẩn (1x)" : `${rate}x`}
                            </span>
                            {playbackRate === rate && (
                              <div className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9] dark:bg-[#fac000]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Picture-in-Picture */}
                  <button
                    type="button"
                    onClick={togglePip}
                    className="hidden h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 sm:flex sm:h-10 sm:w-10"
                    title="Hình trong hình (P)"
                  >
                    <PictureInPicture2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={
                      isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"
                    }
                    title={
                      isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none active:scale-95 sm:ml-1"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-6 w-6 sm:h-7 sm:w-7" />
                    ) : (
                      <Maximize className="h-6 w-6 sm:h-7 sm:w-7" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Franchise / Minimal Glassmorphism Next Episode Prompt */}
      {hasNextEpisode &&
        duration > 40 &&
        duration - currentTime <= 90 &&
        duration - currentTime > 1 &&
        !dismissNextPrompt && (
          <div className="absolute right-3.5 bottom-16 sm:right-6 sm:bottom-20 z-40 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {franchise && FRANCHISE_PLAYER_THEMES[franchise] ? (
              /* Custom Franchise Floating Prompt (Conan / Doraemon / Siêu Nhân) */
              <div
                className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl p-1.5 sm:p-2 backdrop-blur-2xl transition-all ${FRANCHISE_PLAYER_THEMES[franchise].floatingContainerClass}`}
              >
                <button
                  type="button"
                  onClick={handleNextEpisodeClick}
                  className={`group flex items-center gap-2 sm:gap-2.5 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-black transition-all active:scale-95 cursor-pointer ${FRANCHISE_PLAYER_THEMES[franchise].floatingButtonClass}`}
                  title="Chuyển sang tập tiếp theo ngay bây giờ"
                >
                  <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
                  <span>
                    {nextEpisodeItem
                      ? `${FRANCHISE_PLAYER_THEMES[franchise].floatingNextLabel} (${nextEpisodeItem.name})`
                      : FRANCHISE_PLAYER_THEMES[franchise].floatingNextLabel}
                  </span>
                  <span className="h-3.5 w-px bg-white/30" />
                  <span className="font-mono text-[11px] font-bold opacity-90 tabular-nums">
                    {Math.max(0, Math.ceil(duration - currentTime))}s
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissNextPrompt(true);
                  }}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/15 hover:text-white"
                  title="Ẩn gợi ý để nghe trọn bài hát kết phim"
                  aria-label="Ẩn gợi ý chuyển tập"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* Standard Minimal Black & White Glassmorphism Prompt */
              <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-white/25 bg-black/75 p-1.5 sm:p-2 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/10 transition-all hover:border-white/40 hover:bg-black/85">
                <button
                  type="button"
                  onClick={handleNextEpisodeClick}
                  className="group flex items-center gap-2 sm:gap-2.5 rounded-xl bg-white px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-black text-black transition-all hover:bg-white/90 active:scale-95 shadow-md cursor-pointer"
                  title="Chuyển sang tập tiếp theo ngay bây giờ"
                >
                  <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-black text-black transition-transform group-hover:translate-x-0.5" />
                  <span>
                    {nextEpisodeItem
                      ? `Tập tiếp theo (${nextEpisodeItem.name})`
                      : "Tập tiếp theo"}
                  </span>
                  <span className="h-3.5 w-px bg-black/20" />
                  <span className="font-mono text-[11px] font-bold text-black/70 tabular-nums">
                    {Math.max(0, Math.ceil(duration - currentTime))}s
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissNextPrompt(true);
                  }}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/15 hover:text-white"
                  title="Ẩn gợi ý để nghe trọn bài hát kết phim"
                  aria-label="Ẩn gợi ý chuyển tập"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

      {/* Episode Toast (Top-Left) */}
      <div
        className={`pointer-events-none absolute top-4 left-4 z-40 transform rounded-lg border border-white/10 bg-black/60 px-4 py-2 shadow-lg backdrop-blur-md transition-all duration-500 ease-out ${
          showEpisodeToast
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0"
        }`}
      >
        <span className="text-sm font-bold text-white shadow-sm">
          Tập {getEpNumber(currentEpisode || "")}
        </span>
      </div>
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
