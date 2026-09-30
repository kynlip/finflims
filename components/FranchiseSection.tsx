import Link from 'next/link';
import { ArrowUpRight, Bell, Search, Zap } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { FRANCHISES, type FranchiseSlug } from '@/lib/franchises';
import type { Movie } from '@/lib/data';

interface FranchiseSectionProps {
  franchise: FranchiseSlug;
  movies: Movie[];
  className?: string;
}

export function FranchiseSection({
  franchise,
  movies,
  className = '',
}: FranchiseSectionProps) {
  if (!movies || movies.length === 0) return null;

  const collection = FRANCHISES[franchise];
  const theme = collection.theme;
  const BrandIcon = franchise === 'conan' ? Search : franchise === 'doraemon' ? Bell : Zap;

  return (
    <section
      aria-labelledby={`${franchise}-section-title`}
      className={`relative isolate overflow-hidden rounded-[2rem] border ${theme.panel} ${className}`}
    >
      <div
        className={`pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full blur-3xl ${theme.glow}`}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-linear-to-l from-white/[0.04] to-transparent" />

      <div className="relative grid gap-7 p-4 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:p-8">
        <div className="flex min-w-0 flex-col justify-between gap-7">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${theme.badge} shadow-lg shadow-black/20`}
              >
                <BrandIcon className={`h-6 w-6 ${theme.accent}`} strokeWidth={1.8} />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold tracking-wider uppercase ${theme.accent}`}
              >
                {collection.eyebrow}
              </span>
            </div>

            <div className="mb-3 flex items-start gap-3">
              <span className={`mt-1 h-12 w-1 rounded-full ${theme.line}`} />
              <div>
                <h2
                  id={`${franchise}-section-title`}
                  className={`font-serif text-2xl leading-tight font-black tracking-tight sm:text-3xl ${theme.title}`}
                >
                  {collection.displayName}
                </h2>
                <p className={`mt-2 text-xs sm:text-sm font-bold ${theme.accent}`}>
                  {collection.subtitle}
                </p>
              </div>
            </div>
            <p className="max-w-[24rem] text-sm sm:text-base leading-6 text-white/70">
              {collection.sectionDescription}
            </p>
          </div>

          <Link
            href={`/${franchise}`}
            className={`group inline-flex w-fit items-center gap-2 rounded-full border px-5 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${theme.button}`}
          >
            Khám phá tất cả
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className={`text-xs sm:text-sm font-bold tracking-wider uppercase ${theme.accent}`}>
              Được xem nhiều
            </span>
            <span className="text-xs text-white/50 md:hidden">
              Vuốt để xem thêm
            </span>
          </div>

          <div className="hide-scrollbar grid auto-cols-[calc((100%_-_0.75rem)/2)] grid-flow-col grid-rows-2 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:auto-cols-[calc((100%_-_1.5rem)/3)] sm:gap-4 md:grid-flow-row md:grid-cols-4 md:grid-rows-none md:overflow-visible md:pb-0 lg:grid-cols-5 xl:grid-cols-6">
            {movies.slice(0, 12).map((movie, index) => (
              <div key={movie._id} className="h-full min-w-0 snap-start">
                <MovieCard movie={movie} priority={index < 2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
