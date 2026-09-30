'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import type { Movie } from '@/lib/data';
import { RankingNode } from './RankingNode';
import { MovieInfoOverlay } from './MovieInfoOverlay';

export function RankingSection({
  items,
}: {
  items: { title: string; movies: Movie[]; href?: string }[];
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeMovieId, setActiveMovieId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      // Use a small buffer (e.g. 2px) to account for sub-pixel rendering differences
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  }, []);

  // Initial check and resize listener
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, items, activeTab]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 600; // Increased scroll amount for better UX
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Check scroll after animation roughly completes
      setTimeout(checkScroll, 300);
    }
  };

  const currentItem = items[activeTab];

  // Memoize the selected movie to prevent overlay re-renders when other things change
  const selectedMovie = useMemo(
    () => currentItem?.movies.find((m) => m._id === activeMovieId) || null,
    [activeMovieId, currentItem]
  );

  const handleNodeClick = useCallback((id: string) => {
    setActiveMovieId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setActiveMovieId(null);
  }, []);

  if (!currentItem || !currentItem.movies || currentItem.movies.length === 0)
    return null;

  return (
    <section className="bg-secondary/30 relative flex min-h-[400px] flex-col justify-center py-8 transition-all duration-300 md:py-10">
      {/* Background Decorative Line */}
      <div className="via-primary/20 absolute top-1/2 left-0 z-0 h-[2px] w-full -translate-y-1/2 bg-linear-to-r from-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-8">
        {/* Tab Navigation with "View All" Link */}
        <div className="relative z-20 mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Trophy className="h-5 w-5" />
            </div>
            <h2 className="font-serif text-xl font-extrabold text-[#D4AF68] md:text-2xl tracking-wide">
              Bảng Xếp Hạng
            </h2>
          </div>

          <div className="bg-background/50 border-border inline-flex max-w-full items-center overflow-x-auto rounded-full border p-1 shadow-lg backdrop-blur-md scrollbar-none">
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(idx);
                  setActiveMovieId(null);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = 0;
                    setTimeout(checkScroll, 100);
                  }
                }}
                className={`rounded-full px-3.5 sm:px-5 py-1.5 md:py-2 text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-300 md:px-7 ${
                  activeTab === idx
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } `}
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* View All Link */}
          {currentItem.href && (
            <Link
              href={currentItem.href}
              className="group bg-background/50 border-border hover:border-primary hover:shadow-primary/20 flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-md transition-all duration-300 hover:shadow-lg"
            >
              <span className="text-muted-foreground group-hover:text-primary text-xs md:text-sm font-bold transition-colors">
                Xem tất cả
              </span>
              <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-all group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        {/* Info Overlay - Positioned centrally relative to container */}
        <div className="pointer-events-none relative z-50 flex h-0 w-full justify-center">
          <div className="pointer-events-auto">
            <MovieInfoOverlay
              movie={selectedMovie}
              onClose={handleCloseOverlay}
            />
          </div>
        </div>

        <div className="group relative mt-4">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground absolute top-1/2 left-0 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border opacity-0 shadow-xl transition-all duration-300 group-hover:opacity-100 hover:scale-110 md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground absolute top-1/2 right-0 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border opacity-0 shadow-xl transition-all duration-300 group-hover:opacity-100 hover:scale-110 md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="scrollbar-none flex max-w-full snap-x snap-mandatory items-center gap-4 overflow-x-auto px-4 py-8 md:gap-8 md:px-12"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {currentItem.movies.map((movie, index) => (
              <RankingNode
                key={`${movie._id}-${index}`}
                movie={movie}
                index={index}
                isActive={activeMovieId === movie._id}
                onClick={handleNodeClick}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
