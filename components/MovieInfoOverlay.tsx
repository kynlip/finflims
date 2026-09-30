'use client';

import Link from 'next/link';
import { Star, Play, X, Calendar, Clock, Eye } from 'lucide-react';
import type { Movie } from '@/lib/data';

interface MovieInfoOverlayProps {
  movie: Movie | null;
  onClose: () => void;
}

export function MovieInfoOverlay({ movie, onClose }: MovieInfoOverlayProps) {
  if (!movie) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-4 pointer-events-auto absolute top-full left-1/2 z-50 mt-4 w-[90vw] max-w-md -translate-x-1/2 duration-300">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4AF68] bg-[#0B1221] text-[#F3F0E6] shadow-[0_0_50px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
        {/* Close Button Mobile */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-full bg-black/20 p-1 text-white hover:bg-black/40 md:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center p-4 text-center md:p-6">
          <h3 className="mb-2 font-serif text-xl leading-tight font-bold text-[#D4AF68] drop-shadow-md md:text-2xl">
            {movie.name}
          </h3>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-gray-400 md:text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#D4AF68]" />
              {movie.year}
            </span>
            <span className="h-1 w-1 rounded-full bg-gray-600" />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#D4AF68]" />
              {movie.time || 'N/A'}
            </span>
            <span className="h-1 w-1 rounded-full bg-gray-600" />
            <span className="flex items-center gap-1 font-black text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              {movie.tmdb?.vote_average
                ? movie.tmdb.vote_average.toFixed(1)
                : 'N/A'}
            </span>
            {movie.view !== undefined && movie.view > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-gray-600" />
                <span className="flex items-center gap-1 font-black text-cyan-400">
                  <Eye className="h-3.5 w-3.5" />
                  {movie.view.toLocaleString()} lượt xem
                </span>
              </>
            )}
          </div>

          <p className="mb-6 line-clamp-3 max-w-xs text-sm leading-relaxed font-medium text-gray-300">
            {movie.content?.replace(/<[^>]*>/g, '')}
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-800"
            >
              Đóng
            </button>
            <Link
              href={`/phim/${movie.slug}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4AF68] py-2.5 text-center text-sm font-bold text-black shadow-lg transition-all hover:bg-[#c29d55] hover:shadow-[#D4AF68]/20"
            >
              <Play className="h-4 w-4 fill-current" />
              Xem Ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Arrow pointing up */}
      <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-[#D4AF68] bg-[#0B1221]" />
    </div>
  );
}
