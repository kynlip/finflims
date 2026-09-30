import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { MovieCard } from './MovieCard';
import type { Movie } from '@/lib/data';

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  href?: string;
  className?: string;
  priority?: boolean;
}

export function MovieSection({
  title,
  movies,
  href,
  className = '',
  priority = false,
}: MovieSectionProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <section className={`py-6 sm:py-8 md:py-10 ${className}`}>
      {/* Section Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {href ? (
            <Link href={href} className="group inline-flex items-center gap-2">
              <div className="h-5 sm:h-6 w-1 sm:w-1.5 rounded-full bg-primary transition-all duration-300 group-hover:h-7 group-hover:shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
              <h2 className="text-foreground group-hover:text-primary font-sans text-xl sm:text-2xl md:text-3xl font-black tracking-tight drop-shadow-md transition-colors">
                {title}
              </h2>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-5 sm:h-6 w-1 sm:w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              <h2 className="text-foreground font-sans text-xl sm:text-2xl md:text-3xl font-black tracking-tight drop-shadow-md">
                {title}
              </h2>
            </div>
          )}
        </div>

        {href && (
          <Link
            href={href}
            className="hover:text-primary group flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground transition-colors"
          >
            <span className="text-xs tracking-wider uppercase">
              Xem tất cả
            </span>
            <div className="group-hover:bg-primary flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white/10 shadow-sm transition-all group-hover:text-black">
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )}
      </div>

      {/* Mobile keeps two rows and scrolls horizontally (exact 2 cards per view); desktop returns to a full grid. */}
      <div className="hide-scrollbar grid auto-cols-[calc((100%_-_0.75rem)/2)] grid-flow-col grid-rows-2 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:auto-cols-[calc((100%_-_1.5rem)/3)] sm:gap-4 md:grid-flow-row md:grid-cols-4 md:grid-rows-none md:overflow-visible md:pb-0 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie, idx) => (
          <div key={movie._id || idx} className="h-full min-w-0 snap-start">
            <MovieCard movie={movie} priority={priority && idx < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
