import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { HorizontalMovieCard } from './HorizontalMovieCard';
import type { Movie } from '@/lib/data';

interface HorizontalMovieSectionProps {
  title: string;
  movies: Movie[];
  href?: string;
  className?: string;
  desktopColumns?: 2 | 3;
}

export function HorizontalMovieSection({
  title,
  movies,
  href,
  className = '',
  desktopColumns = 2,
}: HorizontalMovieSectionProps) {
  if (!movies || movies.length === 0) return null;

  const desktopColumnsClass =
    desktopColumns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  return (
    <section className={`py-8 ${className}`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {href ? (
            <Link href={href} className="group inline-flex items-center gap-2">
              <h2 className="text-primary group-hover:text-primary/80 font-serif text-2xl font-bold drop-shadow-sm transition-colors md:text-3xl">
                {title}
              </h2>
            </Link>
          ) : (
            <h2 className="text-primary font-serif text-2xl font-bold drop-shadow-sm md:text-3xl">
              {title}
            </h2>
          )}
        </div>

        {href && (
          <Link
            href={href}
            className="hover:text-primary group flex items-center gap-2 text-sm font-bold text-white transition-colors"
          >
            <span className="hidden text-xs tracking-wider uppercase md:inline">
              Xem tất cả
            </span>
            <div className="group-hover:bg-primary flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-all group-hover:text-black md:h-8 md:w-8">
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        )}
      </div>

      <div
        className={`hide-scrollbar grid snap-x snap-mandatory auto-cols-[100%] grid-flow-col gap-4 overflow-x-auto pb-4 sm:auto-cols-[300px] sm:grid-flow-row sm:grid-cols-2 sm:pb-0 ${desktopColumnsClass}`}
      >
        {movies.map((movie) => (
          <div key={movie._id} className="snap-center sm:snap-align-none">
            <HorizontalMovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}
