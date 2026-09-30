'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Play, ChevronLeft, ChevronRight, Info, Film, Eye, Star, Sparkles } from 'lucide-react';
import type { Movie } from '@/lib/data';
import { cdnImage } from '@/lib/image';

const TrailerModal = dynamic(
  () => import('./TrailerModal').then((mod) => mod.TrailerModal),
  { ssr: false }
);

interface HeroSliderProps {
  movies: Movie[];
  ariaLabel?: string;
}

const SLIDE_DURATION = 7000;
const FALLBACK_IMAGE = '/images/wlc.gif';

function formatSynopsis(content?: string): string {
  if (!content) {
    return 'Khám phá kho phim mới với hình ảnh sắc nét, cốt truyện lôi cuốn và trải nghiệm xem phim tuyệt vời.';
  }
  return content
    .replace(/<[^>]*>/g, '')
    .trim()
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export function HeroSlider({ movies, ariaLabel = 'Phim Nổi Bật' }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const total = movies?.length ?? 0;

  const handleNext = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(handleNext, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [handleNext, isPaused, total]);

  // Pause the slider while the tab is hidden (saves battery on mobile)
  useEffect(() => {
    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Touch swipe handling for mobile
  const minSwipeDistance = 45;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  const currentMovie = total > 0 ? movies[currentIndex] : null;

  // Cache visible slides
  const mountedSlides = useMemo(() => {
    if (total === 0) return new Set<number>();
    return new Set([
      currentIndex,
      (currentIndex + 1) % total,
      (currentIndex - 1 + total) % total,
    ]);
  }, [currentIndex, total]);

  const metaItems = useMemo(() => {
    if (!currentMovie) return [];
    const items: string[] = [];
    if (currentMovie.category?.length) {
      items.push(
        currentMovie.category
          .map((c) => c.name)
          .slice(0, 2)
          .join(', ')
      );
    }
    if (currentMovie.year) items.push(String(currentMovie.year));
    if (currentMovie.episode_current) {
      const ep = currentMovie.episode_current.trim();
      const formattedEp = ep.toLowerCase().startsWith('tập') || ep.toLowerCase() === 'full' || ep.toLowerCase().includes('hoàn tất') ? ep : `Tập ${ep}`;
      items.push(formattedEp);
    } else if (currentMovie.time) {
      items.push(currentMovie.time);
    }
    if (currentMovie.lang && currentMovie.lang.toLowerCase() !== currentMovie.quality?.toLowerCase()) {
      items.push(currentMovie.lang);
    }
    return items;
  }, [currentMovie]);

  if (!currentMovie) {
    return (
      <div className="relative flex h-[42vh] min-h-[320px] w-full items-center justify-center bg-[#0b1221] text-slate-400">
        <p className="text-sm font-medium text-slate-300">
          Đang tải danh sách phim nổi bật...
        </p>
      </div>
    );
  }

  const cleanContent = formatSynopsis(currentMovie.content);

  return (
    <section
      className="group/hero relative h-[50vh] min-h-[360px] max-h-[440px] w-full overflow-hidden bg-[#0b1221] select-none sm:h-[65vh] sm:min-h-[460px] sm:max-h-[560px] md:h-[78vh] md:min-h-[540px] md:max-h-[700px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label={ariaLabel}
    >
      {/* 1. Backdrop Layer */}
      {movies.map((movie, idx) => {
        if (!mountedSlides.has(idx)) return null;

        const isActive = idx === currentIndex;
        // Always prioritize thumb_url (16:9 widescreen high-res backdrop) to prevent blurry zoomed-in vertical posters
        const heroImageUrl =
          movie.thumb_url || movie.poster_url || FALLBACK_IMAGE;

        return (
          <div
            key={`hero-bg-${movie._id || movie.slug || idx}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
            }`}
          >
            <img
              src={cdnImage(heroImageUrl, 1920)}
              alt={movie.name}
              loading={idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={idx === 0 ? 'high' : 'auto'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-top"
            />

            {/* Left-to-right soft scrim to guarantee crystal clear text readability on bright backdrops without blurring the right artwork */}
            <div className="absolute inset-0 z-10 bg-linear-to-r from-[#0b1221]/85 via-[#0b1221]/45 via-40% to-transparent" />
            {/* Smooth bottom blend into page background */}
            <div className="absolute inset-0 z-10 bg-linear-to-t from-[#0b1221] via-[#0b1221]/30 via-15% to-transparent" />
          </div>
        );
      })}

      {/* 2. Main Content Layer (Minimal & Compact for Mobile) */}
      <div className="relative z-20 container mx-auto flex h-full flex-col justify-end px-4 pb-6 sm:px-6 sm:pb-10 md:px-12 md:pb-14 lg:px-16">
        <div className="max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl space-y-2 sm:space-y-3 md:space-y-3.5">
          
          {/* 1. Movie Title (Lên trước các thông tin) */}
          <Link
            href={`/phim/${currentMovie.slug}`}
            className="group/title block max-w-full"
          >
            <h1
              className="line-clamp-2 font-sans text-xl leading-tight font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] transition-colors group-hover/title:text-[#FFD875] sm:text-2xl md:text-3xl lg:text-4xl"
              title={currentMovie.name}
            >
              {currentMovie.name || 'Phim mới'}
            </h1>
          </Link>

          {/* 2. Badges & Metadata Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Minimal Spotlight Tag */}
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] sm:text-xs font-black text-primary backdrop-blur-md uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Nổi bật
            </span>

            {/* Quality badge */}
            {currentMovie.quality && (
              <span className="rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white backdrop-blur-md shadow-sm">
                {currentMovie.quality}
              </span>
            )}

            {/* TMDB Rating */}
            {currentMovie.tmdb?.vote_average && Number(currentMovie.tmdb.vote_average) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/50 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-amber-300 backdrop-blur-md shadow-sm">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{Number(currentMovie.tmdb.vote_average).toFixed(1)}</span>
              </span>
            ) : null}

            {/* View count (hidden on very small screens, visible on sm+) */}
            {currentMovie.view !== undefined && currentMovie.view > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-black/50 px-2.5 py-0.5 text-xs font-bold text-cyan-300 backdrop-blur-md shadow-sm">
                <Eye className="h-3 w-3 text-cyan-400" />
                <span>{(currentMovie.view || 0).toLocaleString('vi-VN')}</span>
              </span>
            )}

            {/* Metadata (Category + Year) */}
            {metaItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] sm:text-xs md:text-sm font-semibold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]">
                {metaItems.slice(0, 3).map((item, idx) => (
                  <React.Fragment key={`meta-${idx}`}>
                    <span className="text-white/60">•</span>
                    <span className={idx === 0 ? 'text-[#FFD875] font-bold' : 'text-white/95'}>
                      {item}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* 3. Synopsis (Desktop only for minimal mobile view) */}
          <p className="hidden sm:line-clamp-2 md:line-clamp-3 max-w-xl text-xs leading-relaxed font-medium text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)] md:text-base">
            {cleanContent}
          </p>

          {/* Action buttons (Clean, compact & thumb-friendly) */}
          <div className="flex items-center gap-2 pt-1 sm:gap-3 sm:pt-2">
            <Link
              href={`/xem/${currentMovie.slug}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FFD875] px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm md:text-base font-black text-[#0f111a] shadow-md shadow-[#FFD875]/20 transition-all hover:bg-[#ffe08f] active:scale-95"
            >
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-[#0f111a] text-[#0f111a]" />
              <span>Phát ngay</span>
            </Link>

            <Link
              href={`/phim/${currentMovie.slug}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm md:text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
            >
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              <span>Chi tiết</span>
            </Link>

            {currentMovie.trailer_url && (
              <button
                type="button"
                onClick={() => setShowTrailer(true)}
                className="inline-flex h-8 w-8 sm:h-11 sm:w-auto sm:px-4 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/40 text-xs sm:text-sm font-semibold text-white/85 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white active:scale-95"
                title="Xem Trailer"
                aria-label="Xem Trailer"
              >
                <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/70" />
                <span className="hidden sm:inline">Trailer</span>
              </button>
            )}

            {/* Mobile Compact Slide Dots right in the action row */}
            <div className="ml-auto flex items-center gap-1 sm:hidden">
              {movies.map((_, idx) => (
                <button
                  key={`mob-dot-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Đi tới phim ${idx + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'w-4 bg-[#FFD875]'
                      : 'w-1 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3. Indicator + Navigation Buttons (Desktop Only) */}
        <div className="absolute right-4 bottom-8 hidden items-center gap-3 sm:flex sm:right-8 md:right-16 md:bottom-12">
          <div className="flex items-center gap-1.5">
            {movies.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Đi tới phim ${idx + 1}`}
                className={`relative h-1 overflow-hidden rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-7 bg-[#FFD875]'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              >
                {idx === currentIndex && !isPaused && (
                  <div
                    className="animate-progress absolute inset-0 origin-left bg-white/50"
                    style={{ animationDuration: `${SLIDE_DURATION}ms` }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-full border border-white/15 bg-black/40 p-2 text-white transition-all hover:bg-white/20 active:scale-90 sm:p-2.5"
              aria-label="Phim trước"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full border border-white/15 bg-black/40 p-2 text-white transition-all hover:bg-white/20 active:scale-90 sm:p-2.5"
              aria-label="Phim tiếp theo"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {showTrailer && currentMovie.trailer_url && (
        <TrailerModal
          videoUrl={currentMovie.trailer_url}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </section>
  );
}
