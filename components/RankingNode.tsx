'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Eye, Star } from 'lucide-react';
import type { Movie } from '@/lib/data';

interface RankingNodeProps {
  movie: Movie;
  index: number;
  isActive: boolean;
  onClick: (id: string) => void;
}

function formatViews(num?: number): string | null {
  if (num === undefined || num === null || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export const RankingNode = memo(function RankingNode({
  movie,
  index,
  isActive,
  onClick,
}: RankingNodeProps) {
  const viewsText = formatViews(movie.view);
  const ratingText = movie.tmdb?.vote_average
    ? movie.tmdb.vote_average.toFixed(1)
    : null;

  return (
    <div className="group/node relative flex-none snap-center py-2 flex flex-col items-center">
      {/* Timeline Node (Avatar) */}
      <button
        className={`bg-background relative z-10 h-20 w-20 cursor-pointer rounded-full border-2 transition-all duration-300 outline-none md:h-28 md:w-28 ${
          isActive
            ? 'border-primary ring-primary/20 scale-110 shadow-[0_0_20px_rgba(var(--primary),0.3)] ring-4'
            : 'border-primary/30 hover:border-primary opacity-80 hover:scale-105 hover:opacity-100'
        } `}
        onClick={() => onClick(movie._id)}
        aria-label={`Select ${movie.name}`}
      >
        <Image
          src={movie.thumb_url || movie.poster_url || '/placeholder.png'}
          alt={movie.name}
          fill
          className="rounded-full object-cover"
          sizes="112px"
          quality={75}
          loading="lazy"
        />
        {/* Rank Badge */}
        <div className="bg-background border-primary text-primary absolute -top-2 -right-2 z-20 flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full border-2 text-xs font-black shadow-md">
          #{index + 1}
        </div>
      </button>

      {/* Label under node */}
      <div className="mt-2 text-center w-24 md:w-32 px-1">
        <p className="text-[11px] md:text-xs font-bold text-slate-200 line-clamp-1 group-hover/node:text-primary transition-colors">
          {movie.name}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[10px]">
          {viewsText ? (
            <span className="text-cyan-400 font-semibold flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
              {viewsText}
            </span>
          ) : ratingText ? (
            <span className="text-yellow-400 font-semibold flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" />
              {ratingText}
            </span>
          ) : (
            <span className="text-slate-500">{movie.year || ''}</span>
          )}
        </div>
      </div>

      {/* Vertical Connector Line */}
      <div
        className={`from-primary/20 absolute top-1/2 left-1/2 -z-10 w-[2px] origin-top -translate-x-1/2 bg-linear-to-b to-transparent transition-all duration-500 ${isActive ? 'from-primary/50 h-[180px] md:h-[220px]' : 'h-0'} `}
      />
    </div>
  );
});
