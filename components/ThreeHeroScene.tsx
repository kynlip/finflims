'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Info } from 'lucide-react';
import type { Movie } from '@/lib/data';

interface ThreeHeroSceneProps {
  movies: Movie[];
}

export function ThreeHeroScene({ movies }: ThreeHeroSceneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMovie = movies && movies.length > 0 
    ? movies[currentIndex % movies.length] 
    : ({ 
        name: "Phim Hay Hơn Rổ", 
        slug: "#", 
        content: "Khám phá kho phim hoạt hình và anime vietsub online miễn phí chất lượng cao tại Phim Hay Hơn Rổ", 
        year: 2026, 
        time: "N/A", 
        quality: "HD", 
        thumb_url: "/images/wlc.gif", 
        poster_url: "/images/wlc.gif", 
        origin_name: "Phim Hay Hơn Rổ", 
        lang: "Vietsub", 
        episode_current: "1", 
        episode_total: "1", 
        _id: "fallback" 
      } as Movie);

  useEffect(() => {
    if (!movies || movies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [movies]);

  if (!movies || movies.length === 0) {
    return (
      <div className="relative h-[55vh] w-full bg-[#0a0a1f] flex items-center justify-center md:h-screen overflow-hidden">
        <div className="text-center z-30 relative">
          <div className="text-6xl mb-6 animate-bounce">🌌</div>
          <h2 className="text-5xl font-bold text-white mb-3 tracking-tighter neon-text">Phim Hay Hơn Rổ</h2>
          <p className="text-violet-300 text-lg">Đang tải không gian 3D...</p>
          <div className="mt-8 w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[55vh] w-full md:h-screen overflow-hidden bg-[#0a0a1f]">
      {/* Background Image from current movie (like HeroSlider) - with fallback */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={currentMovie.thumb_url || currentMovie.poster_url || '/images/wlc.gif'} 
          alt={currentMovie.name}
          className="object-cover object-top w-full h-full opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b1221]/70 to-[#0b1221]" />
      </div>

      {/* HTML Overlay Content */}
      <div className="relative z-20 h-full flex items-center justify-center pointer-events-none">
        <div className="container mx-auto px-6 md:px-16 relative z-30 max-w-5xl">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-950/60 px-5 py-1 text-sm font-medium tracking-widest text-sky-300">
              {currentMovie.year} • {currentMovie.time || 'N/A'} • {currentMovie.quality}
            </div>

            <h1 className="neon-text mb-4 text-6xl font-bold leading-none tracking-tighter text-white md:text-7xl drop-shadow-2xl">
              {currentMovie.name}
            </h1>

            <p className="mb-8 max-w-md text-lg text-slate-300 line-clamp-3 drop-shadow-md">
              {currentMovie.content?.replace(/<[^>]*>/g, '') || 'Một bộ phim hoạt hình tuyệt đẹp với câu chuyện cảm động và hình ảnh đỉnh cao.'}
            </p>

            <div className="flex flex-wrap gap-4 pointer-events-auto">
              <Link
                href={`/xem/${currentMovie.slug}`}
                className="glass-panel group flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-semibold text-white transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                <Play className="h-6 w-6" />
                XEM NGAY
              </Link>

              <button
                onClick={() => window.open(`/phim/${currentMovie.slug}`, '_blank')}
                className="glass-panel flex items-center gap-3 rounded-2xl border border-white/30 px-8 py-4 text-lg font-medium text-white transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-xl"
              >
                <Info className="h-6 w-6" />
                CHI TIẾT
              </button>
            </div>

            {/* Progress Dots */}
            <div className="mt-12 flex gap-3">
              {movies.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2.5 rounded-full transition-all pointer-events-auto ${
                    i === currentIndex
                      ? 'w-10 bg-sky-400 shadow-[0_0_12px_#38bdf8]'
                      : 'w-2.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
