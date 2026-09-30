'use client';

import { MovieCard } from './MovieCard';
import type { Movie } from '@/lib/data';

interface MovieGridProps {
  movies: Movie[];
  title?: string;
  className?: string;
  showRank?: boolean;
}

export function MovieGrid({
  movies,
  title,
  className = '',
  showRank = false,
}: MovieGridProps) {
  if (!movies || movies.length === 0) {
    return (
      <div className="text-muted-foreground py-20 text-center">
        Không tìm thấy phim nào.
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <div className="border-border mb-8 border-b pb-4">
          <h1 className="text-primary font-serif text-3xl font-bold md:text-4xl">
            {title}
          </h1>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie, index) => (
          <MovieCard
            key={movie._id}
            movie={movie}
            rank={showRank ? index + 1 : undefined}
          />
        ))}
      </div>
    </div>
  );
}
