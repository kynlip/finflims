"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageSquare,
  Share2,
  SkipForward,
  SkipBack,
  Flag,
  Keyboard,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";
import { VideoPlayer, type VideoPlayerRef } from "@/components/VideoPlayer";
import { EpisodeList } from "@/components/EpisodeList";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReviewSection } from "@/components/ReviewSection";
import {
  getServerSlug,
  extractDirectStreamUrl,
  getEpNumber,
  normalizeEpisodeKey,
} from "@/lib/utils";
import {
  detectFranchise,
  FRANCHISE_PLAYER_THEMES,
} from "@/lib/player-franchises";
import { AdPlacementRenderer } from "@/components/AdPlacementRenderer";

import type { Movie } from "@/lib/data";

interface WatchScreenProps {
  movie: Movie;
  videoSource: string;
  episode: string;
  server: string;
  nextEpisodeHref?: string;
  relatedMovies: Movie[];
  isLoggedIn?: boolean;
}

export function WatchScreen({
  movie,
  videoSource: initialVideoSource,
  episode: initialEpisode,
  server: initialServer,
  nextEpisodeHref: initialNextEpisodeHref,
  relatedMovies,
  isLoggedIn = false,
}: WatchScreenProps) {
  const playerRef = useRef<VideoPlayerRef>(null);

  // State for client-side switching
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [currentServer, setCurrentServer] = useState(initialServer);
  const [videoSource, setVideoSource] = useState(initialVideoSource);
  const [nextEpisodeHref, setNextEpisodeHref] = useState(
    initialNextEpisodeHref,
  );
  const [prevEpisodeHref, setPrevEpisodeHref] = useState<string | undefined>(
    undefined,
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [isAdFree, setIsAdFree] = useState(false);

  // Auto next state (persisted)
  const [autoNext, setAutoNext] = useState<boolean>(true);

  // Detect franchise (Conan / Doraemon / Siêu Nhân)
  const franchise = detectFranchise(movie);
  const franchiseTheme = franchise ? FRANCHISE_PLAYER_THEMES[franchise] : null;

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("video_error");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Toast notification
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastText(text);
    toastTimeoutRef.current = setTimeout(() => {
      setToastText(null);
    }, 3000);
  };

  // Load preferences from localStorage
  useEffect(() => {
    const savedAutoNext = localStorage.getItem("hoathinh_auto_next");
    if (savedAutoNext !== null) {
      setAutoNext(savedAutoNext === "true");
    }
  }, []);

  // Toggle auto-next
  const toggleAutoNext = () => {
    setAutoNext((prev) => {
      const next = !prev;
      localStorage.setItem("hoathinh_auto_next", String(next));
      showToast(
        next
          ? "Đã BẬT tự động chuyển tập tiếp theo"
          : "Đã TẮT tự động chuyển tập tiếp theo",
      );
      return next;
    });
  };

  // VIP viewers get provider ads stripped from the stream as well.
  useEffect(() => {
    if (!isLoggedIn) {
      setIsAdFree(false);
      return;
    }

    let cancelled = false;
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (!cancelled) setIsAdFree(Boolean(profile?.isAdFree));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Increment movie view counter once per view session
  useEffect(() => {
    if (movie?.slug) {
      try {
        fetch(`/api/movies/${movie.slug}/view`, { method: "POST" }).catch(
          () => {},
        );
      } catch {
        // ignore
      }
    }
  }, [movie?.slug]);

  // Compute prev/next links helper
  const computeEpisodeHrefs = useCallback(
    (epSlug: string, sName: string) => {
      const serverData =
        movie.episodes?.find(
          (s) =>
            getServerSlug(s.server_name) === sName ||
            s.server_name.toLowerCase().includes(sName.toLowerCase()) ||
            sName.toLowerCase().includes(getServerSlug(s.server_name)),
        ) || movie.episodes?.[0];

      if (!serverData) return { next: undefined, prev: undefined };

      const items = serverData.items || serverData.server_data || [];
      const cleanEp = normalizeEpisodeKey;

      const currentIndex = items.findIndex(
        (e: { slug: string; name?: string }) =>
          e.slug === epSlug ||
          cleanEp(e.slug) === cleanEp(epSlug) ||
          e.slug === `tap-${epSlug}` ||
          `tap-${e.slug}` === epSlug ||
          (e.name && cleanEp(e.name) === cleanEp(epSlug)),
      );

      if (currentIndex === -1) return { next: undefined, prev: undefined };

      const currentServerSlug = getServerSlug(serverData.server_name);
      const next =
        currentIndex < items.length - 1
          ? `/xem/${movie.slug}/${currentServerSlug}/${items[currentIndex + 1].slug}`
          : undefined;
      const prev =
        currentIndex > 0
          ? `/xem/${movie.slug}/${currentServerSlug}/${items[currentIndex - 1].slug}`
          : undefined;

      return { next, prev };
    },
    [movie],
  );

  // Sync state if props change (e.g. back/forward navigation)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentEpisode(initialEpisode);
      setCurrentServer(initialServer);
      setVideoSource(initialVideoSource);
      const { next, prev } = computeEpisodeHrefs(initialEpisode, initialServer);
      setNextEpisodeHref(next ?? initialNextEpisodeHref);
      setPrevEpisodeHref(prev);
      setIsPlaying(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    initialEpisode,
    initialServer,
    initialVideoSource,
    initialNextEpisodeHref,
    computeEpisodeHrefs,
  ]);

  // Main Switching Logic
  const handleEpisodeChange = useCallback(
    (newEpisode: string, newServer?: string) => {
      const targetServer = newServer || currentServer;

      const serverData =
        movie.episodes?.find(
          (s) =>
            getServerSlug(s.server_name) === targetServer ||
            s.server_name.toLowerCase().includes(targetServer.toLowerCase()) ||
            targetServer.toLowerCase().includes(getServerSlug(s.server_name)),
        ) || movie.episodes?.[0];
      if (!serverData) return;

      const items = serverData.items || serverData.server_data || [];
      const cleanEp = normalizeEpisodeKey;

      let currentIndex = items.findIndex(
        (e: { slug: string; name?: string }) =>
          e.slug === newEpisode ||
          cleanEp(e.slug) === cleanEp(newEpisode) ||
          e.slug === `tap-${newEpisode}` ||
          `tap-${e.slug}` === newEpisode ||
          (e.name && cleanEp(e.name) === cleanEp(newEpisode)),
      );

      if (currentIndex === -1 && items.length > 0) {
        currentIndex = 0;
      }

      if (currentIndex !== -1 && items[currentIndex]) {
        const epData = items[currentIndex];
        const rawSource =
          epData.link_m3u8 ||
          epData.m3u8 ||
          epData.link_embed ||
          epData.embed ||
          "";
        const newSource = extractDirectStreamUrl(rawSource);

        setCurrentEpisode(epData.slug || newEpisode);
        if (newServer) setCurrentServer(newServer);
        setVideoSource(newSource);

        const currentServerSlug = getServerSlug(serverData.server_name);
        const newUrl = `/xem/${movie.slug}/${currentServerSlug}/${epData.slug || newEpisode}`;
        window.history.pushState({ path: newUrl }, "", newUrl);

        if (currentIndex < items.length - 1) {
          const nextEp = items[currentIndex + 1];
          setNextEpisodeHref(
            `/xem/${movie.slug}/${currentServerSlug}/${nextEp.slug}`,
          );
        } else {
          setNextEpisodeHref(undefined);
        }

        if (currentIndex > 0) {
          const prevEp = items[currentIndex - 1];
          setPrevEpisodeHref(
            `/xem/${movie.slug}/${currentServerSlug}/${prevEp.slug}`,
          );
        } else {
          setPrevEpisodeHref(undefined);
        }
      }
    },
    [currentServer, movie],
  );

  // Auto-next triggered on video ended
  const handleVideoEnded = useCallback(() => {
    if (autoNext && nextEpisodeHref) {
      const parts = nextEpisodeHref.split("/");
      const nextEpSlug = parts[parts.length - 1];
      handleEpisodeChange(nextEpSlug);
      showToast("Đang tự động chuyển sang tập tiếp theo...");
    }
  }, [autoNext, nextEpisodeHref, handleEpisodeChange]);

  const toggleCinemaMode = () => {
    setIsCinemaMode(!isCinemaMode);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: movie.name,
          text: `Xem ${movie.name} trên Phim Hay Hơn Rổ`,
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
        showToast("Đã sao chép liên kết vào bộ nhớ tạm");
        window.setTimeout(() => setShareStatus("idle"), 1800);
      }
    } catch {
      // Ignore cancellation
    }
  };

  const handleScrollToComments = () => {
    const commentsEl = document.getElementById("comments-section");
    if (commentsEl) {
      commentsEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setIsReportModalOpen(false);
      setReportDetail("");
      showToast("Cảm ơn bạn! Báo cáo sự cố đã được gửi đến ban quản trị.");
    }, 800);
  };

  return (
    <main className="bg-background text-foreground relative min-h-screen">
      {/* Cinema Mode Backdrop */}
      {isCinemaMode && (
        <div
          className="fixed inset-0 z-50 bg-black/95 transition-opacity duration-500"
          onClick={toggleCinemaMode}
        />
      )}

      {/* Floating Action Toast Notification */}
      {toastText && (
        <div className="fixed top-20 right-4 sm:top-24 sm:right-8 z-60 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/90 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            <Sparkles className="h-4 w-4 text-yellow-400 shrink-0" />
            <span>{toastText}</span>
            <button
              type="button"
              onClick={() => setToastText(null)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cinema Mode Header Padding */}
      <div className="relative mx-auto max-w-[1800px] px-3 pt-20 pb-8 sm:px-4 sm:pt-24 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-4 lg:gap-12">
          {/* Main Content - Player Area */}
          <div className="space-y-2.5 sm:space-y-3 lg:col-span-3">
            {/* Minimal Movie & Episode Info Header (Above Player) */}
            <div className="flex items-center justify-between gap-2 px-1 text-xs sm:text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-white/90 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Đang xem
                </span>
                <Link
                  href={`/phim/${movie.slug}`}
                  className="truncate font-serif text-sm sm:text-base md:text-lg font-black text-white tracking-tight hover:text-[#D4AF68] transition-colors focus-visible:underline focus-visible:outline-none cursor-pointer"
                  title="Xem trang chi tiết phim"
                >
                  {movie.name}
                </Link>
                {currentEpisode && (
                  <span className="shrink-0 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md text-xs">
                    Tập {getEpNumber(currentEpisode)}
                  </span>
                )}
                {currentServer && (
                  <span className="hidden sm:inline-block shrink-0 text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 uppercase font-medium">
                    {currentServer}
                  </span>
                )}
              </div>
            </div>

            {/* Cinema Player Container */}
            <div
              className={`group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition-all duration-500 ${isCinemaMode ? "z-50 scale-[1.02] shadow-[0_0_100px_rgba(var(--primary),0.2)]" : "z-auto"}`}
            >
              <VideoPlayer
                ref={playerRef}
                src={videoSource}
                poster={movie.thumb_url || movie.poster_url}
                autoPlay={true}
                nextEpisodeHref={nextEpisodeHref}
                onEnded={handleVideoEnded}
                onPlayingChange={setIsPlaying}
                episodes={movie.episodes}
                currentEpisode={currentEpisode}
                currentServer={currentServer}
                movieSlug={movie.slug}
                movieName={movie.name}
                movieThumb={movie.thumb_url || movie.poster_url}
                isAdFree={isAdFree}
                franchise={franchise}
                onEpisodeChange={handleEpisodeChange}
              />
            </div>

            {/* INFO & CONTROLS SECTION */}
            <div
              className={`relative space-y-4 sm:space-y-6 transition-all duration-300 ${isCinemaMode ? "z-50" : "z-auto"}`}
            >
              {/* 1. Minimal, Unified & Responsive Video Control Bar */}
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/60 p-2.5 shadow-xl backdrop-blur-xl sm:gap-2.5 sm:p-3">
                {/* --- MOBILE LAYOUT (< md) --- */}
                <div className="flex flex-col gap-2 md:hidden">
                  {/* Mobile Row 1: 3 Equal Utility Buttons in a Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <FavoriteButton
                      movie={{
                        slug: movie.slug,
                        name: movie.name,
                        thumb_url: movie.thumb_url || movie.poster_url,
                        types: [
                          movie.type,
                          ...(movie.category?.map((c) => c.slug) || []),
                        ].filter((t): t is string => !!t),
                      }}
                      className="h-9! w-full! rounded-lg! bg-white/5! border! border-white/10! text-white/80! hover:bg-white/10! hover:text-white! flex! items-center! justify-center! text-xs!"
                      size="sm"
                    />

                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                      title="Chia sẻ"
                    >
                      <Share2 className="h-3.5 w-3.5 text-white/70" />
                      <span>{shareStatus === "copied" ? "Đã copy" : "Chia sẻ"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                      title="Báo lỗi"
                    >
                      <Flag className="h-3.5 w-3.5 text-white/70" />
                      <span>Báo lỗi</span>
                    </button>
                  </div>

                  {/* Mobile Row 2: Playback Controls (Auto-Next, Prev, Next) */}
                  <div className="flex items-center gap-1.5 w-full">
                    {/* Auto Next Switch */}
                    <button
                      type="button"
                      onClick={toggleAutoNext}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors active:scale-95 cursor-pointer ${
                        autoNext
                          ? "border-[#D4AF68]/40 bg-[#D4AF68]/15 text-[#D4AF68]"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                      title="Tự động chuyển tập"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-current" />
                      <span>{autoNext ? "Tự chuyển: Bật" : "Tự chuyển: Tắt"}</span>
                    </button>

                    {/* Prev Episode */}
                    {prevEpisodeHref ? (
                      <button
                        type="button"
                        onClick={() => {
                          const parts = prevEpisodeHref.split("/");
                          handleEpisodeChange(parts[parts.length - 1]);
                        }}
                        className="flex h-9 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                        title="Tập trước"
                      >
                        <SkipBack className="h-4 w-4 text-white/70" />
                        <span>Trước</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-9 items-center justify-center gap-1 rounded-lg border border-white/5 bg-white/5 px-3 text-xs text-white/30 shrink-0 opacity-40"
                      >
                        <SkipBack className="h-4 w-4" />
                        <span>Trước</span>
                      </button>
                    )}

                    {/* Next Episode */}
                    {nextEpisodeHref ? (
                      <button
                        type="button"
                        onClick={() => {
                          const parts = nextEpisodeHref.split("/");
                          handleEpisodeChange(parts[parts.length - 1]);
                        }}
                        className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-bold shrink-0 transition-all active:scale-95 shadow-md ${
                          franchiseTheme
                            ? franchiseTheme.nextButtonClass
                            : "bg-[#D4AF68] hover:bg-[#c49f57] text-black"
                        } cursor-pointer`}
                        title="Tập tiếp theo"
                      >
                        <span>Tập tiếp</span>
                        <SkipForward className="h-3.5 w-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-9 items-center justify-center gap-1 rounded-lg border border-white/5 bg-white/5 px-3 text-xs text-white/30 shrink-0 opacity-40"
                      >
                        <span>Hết tập</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* --- DESKTOP LAYOUT (>= md) --- */}
                <div className="hidden md:flex md:items-center md:justify-between md:gap-3">
                  {/* Left: Interactions (Favorite, Share, Report, Shortcuts, Comments) */}
                  <div className="flex items-center gap-2">
                    <FavoriteButton
                      movie={{
                        slug: movie.slug,
                        name: movie.name,
                        thumb_url: movie.thumb_url || movie.poster_url,
                        types: [
                          movie.type,
                          ...(movie.category?.map((c) => c.slug) || []),
                        ].filter((t): t is string => !!t),
                      }}
                      className="h-10! w-auto! rounded-xl! bg-white/5! border! border-white/10! text-white/80! hover:bg-white/10! hover:text-white! px-3.5! py-2! text-xs! font-semibold!"
                      size="md"
                    />

                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                      title="Chia sẻ"
                    >
                      <Share2 className="h-4 w-4 text-white/70" />
                      <span>{shareStatus === "copied" ? "Đã sao chép" : "Chia sẻ"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                      title="Báo lỗi"
                    >
                      <Flag className="h-4 w-4 text-white/70" />
                      <span>Báo lỗi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsShortcutsModalOpen(true)}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                      title="Phím tắt"
                    >
                      <Keyboard className="h-4 w-4 text-white/70" />
                      <span>Phím tắt</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleScrollToComments}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                      title="Bình luận"
                    >
                      <MessageSquare className="h-4 w-4 text-white/70" />
                      <span>Bình luận</span>
                    </button>
                  </div>

                  {/* Right: Playback Controls (Auto-Next, Prev, Next) */}
                  <div className="flex items-center gap-2">
                    {/* Auto Next Switch */}
                    <button
                      type="button"
                      onClick={toggleAutoNext}
                      className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors active:scale-95 cursor-pointer ${
                        autoNext
                          ? "border-[#D4AF68]/40 bg-[#D4AF68]/15 text-[#D4AF68]"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                      title={autoNext ? "Tự động chuyển tập (Đang Bật)" : "Tự động chuyển tập (Đang Tắt)"}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-current" />
                      <span>{autoNext ? "Tự chuyển tập: Bật" : "Tự chuyển tập: Tắt"}</span>
                    </button>

                    {/* Prev Episode */}
                    {prevEpisodeHref ? (
                      <button
                        type="button"
                        onClick={() => {
                          const parts = prevEpisodeHref.split("/");
                          handleEpisodeChange(parts[parts.length - 1]);
                        }}
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                        title="Tập trước"
                      >
                        <SkipBack className="h-4 w-4 text-white/70" />
                        <span>Tập trước</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3.5 text-xs font-semibold text-white/30 opacity-40 cursor-not-allowed"
                      >
                        <SkipBack className="h-4 w-4" />
                        <span>Tập trước</span>
                      </button>
                    )}

                    {/* Next Episode (Prominent) */}
                    {nextEpisodeHref ? (
                      <button
                        type="button"
                        onClick={() => {
                          const parts = nextEpisodeHref.split("/");
                          handleEpisodeChange(parts[parts.length - 1]);
                        }}
                        className={`flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95 ${
                          franchiseTheme
                            ? franchiseTheme.nextButtonClass
                            : "bg-[#D4AF68] hover:bg-[#c49f57] text-black"
                        } cursor-pointer`}
                        title="Tập tiếp theo (Shift+N)"
                      >
                        <SkipForward className="h-4 w-4 fill-current" />
                        <span>Tập tiếp theo</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-semibold text-white/30 opacity-40 cursor-not-allowed"
                      >
                        <SkipForward className="h-4 w-4" />
                        <span>Hết tập</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quảng cáo Dưới Trình Chiếu (Ad Placement) */}
              <AdPlacementRenderer position="player_bottom" />

              <div className="bg-border/40 h-px w-full" />

              {/* 3. Movie Description & Info (Detailed) - Mobile & Desktop */}
              <div className="flex flex-col gap-2">
                <h1 className="text-foreground text-xl sm:text-2xl lg:text-3xl font-black tracking-tight uppercase">
                  {movie.name}
                </h1>
              </div>

              <div className="mt-2 flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Poster */}
                <div className="relative hidden aspect-2/3 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl sm:block md:w-32 lg:w-40">
                  <Image
                    src={
                      movie.poster_url ||
                      movie.thumb_url ||
                      "/opengraph-image.png"
                    }
                    alt={movie.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Description Box */}
                <div className="bg-secondary/10 hover:bg-secondary/20 flex-1 rounded-2xl border border-white/5 p-4 sm:p-5 transition-colors md:p-6">
                  {/* Meta Info Row */}
                  <div className="mb-3 flex flex-col gap-2.5 border-b border-white/5 pb-3 sm:mb-4 sm:gap-3 sm:pb-4">
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {movie.quality && (
                          <span className="bg-primary/10 text-primary border-primary/20 rounded border px-2 py-0.5 text-xs font-bold">
                            {movie.quality}
                          </span>
                        )}
                        {movie.year && <span>{movie.year}</span>}
                        {movie.lang && (
                          <>
                            <span>•</span>
                            <span>{movie.lang}</span>
                          </>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 text-yellow-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-foreground font-bold">
                          {movie.tmdb?.vote_average
                            ? Number(movie.tmdb.vote_average).toFixed(1)
                            : "N/A"}
                        </span>
                        {movie.tmdb?.vote_count ? (
                          <span className="text-muted-foreground text-xs">
                            ({movie.tmdb.vote_count})
                          </span>
                        ) : null}
                      </div>

                      {/* Views */}
                      {movie.view !== undefined && movie.view > 0 && (
                        <div className="flex items-center gap-1 text-cyan-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400"
                          >
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path
                              fillRule="evenodd"
                              d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            {Number(movie.view).toLocaleString()} lượt xem
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Categories */}
                    {movie.category && movie.category.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {movie.category.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/the-loai/${c.slug}`}
                            className="hover:text-primary rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs transition-colors"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <p
                      className={`max-w-3xl text-justify text-xs sm:text-sm leading-relaxed text-gray-300 md:text-base ${isContentExpanded ? "" : "line-clamp-3"}`}
                    >
                      {movie.content?.replace(/<[^>]*>/g, "") ||
                        "Đang cập nhật nội dung..."}
                    </p>
                    {movie.content && movie.content.length > 150 && (
                      <button
                        type="button"
                        onClick={() =>
                          setIsContentExpanded(!isContentExpanded)
                        }
                        className="text-primary mt-1.5 text-xs font-bold hover:underline md:text-sm"
                      >
                        {isContentExpanded ? "Thu gọn" : "Xem thêm"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section - Desktop Only */}
            <div id="comments-section" className="hidden space-y-4 lg:block pt-4">
              <h3 className="text-foreground flex items-center gap-2 text-xl font-bold">
                <MessageSquare className="text-primary h-5 w-5" />
                Bình luận & Đánh giá
              </h3>
              <ReviewSection movieSlug={movie.slug} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Sidebar - Episodes & Recommendations */}
          <div className="space-y-4 md:space-y-10">
            {/* Episodes Widget */}
            <div className="bg-secondary/20 rounded-2xl border border-white/5 p-4 sm:p-6 backdrop-blur-sm">
              <EpisodeList
                movie={movie}
                currentEpisode={currentEpisode}
                currentServer={currentServer}
                isPlaying={isPlaying}
                compact={true}
                onEpisodeChange={handleEpisodeChange}
              />
            </div>

            {/* Comments Section - Mobile/Tablet Only */}
            <div id="comments-section-mobile" className="block space-y-4 lg:hidden pt-2">
              <h3 className="text-foreground flex items-center gap-2 text-lg font-bold">
                <MessageSquare className="text-primary h-5 w-5" />
                Bình luận & Đánh giá
              </h3>
              <ReviewSection movieSlug={movie.slug} isLoggedIn={isLoggedIn} />
            </div>

            {/* Related Movies */}
            <div className="space-y-4">
              <h3 className="text-foreground px-2 text-lg font-bold">
                Có Thể Bạn Sẽ Thích
              </h3>
              <div className="space-y-3">
                {relatedMovies &&
                  relatedMovies.slice(0, 6).map((m) => (
                    <Link
                      key={m.slug}
                      href={`/phim/${m.slug}`}
                      className="group flex gap-3 sm:gap-4 rounded-xl p-2 transition-colors hover:bg-white/5"
                    >
                      <div className="relative aspect-2/3 w-20 sm:w-24 shrink-0 overflow-hidden rounded-lg shadow-lg">
                        <Image
                          src={
                            m.poster_url ||
                            m.thumb_url ||
                            "/opengraph-image.png"
                          }
                          alt={m.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:opacity-0" />
                      </div>
                      <div className="flex flex-col justify-center py-1">
                        <h4 className="text-foreground group-hover:text-primary line-clamp-2 text-sm leading-tight font-bold transition-colors md:line-clamp-2">
                          {m.name}
                        </h4>
                        <span className="text-muted-foreground mt-1 text-xs font-medium">
                          {m.year}
                        </span>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="bg-primary/10 text-primary border-primary/20 rounded border px-1.5 py-0.5 text-[10px]">
                            {m.quality}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL 1: BÁO LỖI PHIM (REPORT ISSUE MODAL) --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsReportModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span>Báo lỗi video / sự cố</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendReport} className="mt-4 space-y-4">
              <div className="text-xs text-white/60">
                Phim: <strong className="text-white">{movie.name}</strong> - Tập:{" "}
                <strong className="text-primary">{currentEpisode}</strong> (
                {currentServer})
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Loại sự cố gặp phải
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "video_error", label: "Video không phát được / Bị lỗi link" },
                    { id: "wrong_episode", label: "Sai tập / Trùng tập khác" },
                    { id: "audio_sub", label: "Mất tiếng / Lệch phụ đề (sub)" },
                    { id: "lag_buffering", label: "Video giật lag / Tải quá chậm" },
                    { id: "other", label: "Sự cố khác" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-all ${
                        reportReason === item.id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={item.id}
                        checked={reportReason === item.id}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="accent-primary"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Mô tả chi tiết (không bắt buộc)
                </label>
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="Ví dụ: Bị đứng hình ở phút thứ 12..."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitted}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-black text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  {reportSubmitted ? "Đang gửi..." : "Gửi báo cáo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: BẢNG HƯỚNG DẪN PHÍM TẮT (SHORTCUTS MODAL) --- */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsShortcutsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <Keyboard className="h-5 w-5 text-purple-400" />
                <span>Phím tắt & Cử chỉ điều khiển</span>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Desktop Shortcuts */}
              <div>
                <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                  Phím tắt máy tính (Desktop)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: "Space / K", desc: "Phát / Tạm dừng video" },
                    { key: "← / J", desc: "Tua lùi 10 giây" },
                    { key: "→ / L", desc: "Tua tới 10 giây" },
                    { key: "S", desc: "Bỏ qua đoạn mở đầu (+85s)" },
                    { key: "Shift + N", desc: "Chuyển sang tập tiếp theo" },
                    { key: "F", desc: "Bật / Thoát toàn màn hình" },
                    { key: "M", desc: "Bật / Tắt tiếng (Mute)" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <span className="text-white/70">{item.desc}</span>
                      <kbd className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-xs">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Gestures */}
              <div className="pt-2 border-t border-white/10">
                <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Cử chỉ vuốt chạm (Mobile / Tablet)
                </h4>
                <div className="space-y-2 text-xs">
                  {[
                    { gesture: "Chạm đúp bên trái/phải", desc: "Tua lùi / Tua tới 10 giây" },
                    { gesture: "Vuốt dọc bên trái màn hình", desc: "Tăng / Giảm độ sáng màn hình" },
                    { gesture: "Vuốt dọc bên phải màn hình", desc: "Tăng / Giảm âm lượng" },
                    { gesture: "Vuốt ngang trên màn hình", desc: "Tua nhanh video trực tiếp" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <span className="font-semibold text-white/90">{item.gesture}</span>
                      <span className="text-white/60">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
