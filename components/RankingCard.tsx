'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/lib/data';

interface RankingCardProps {
  movie: Movie;
  rank: number;
  type?: 'rating' | 'view';
}

export function RankingCard({
  movie,
  rank,
  type = 'rating',
}: RankingCardProps) {
  // Format numbers (e.g. 16000 -> 16K, 1200000 -> 1.2M)
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  };

  const score =
    type === 'rating'
      ? (movie.tmdb?.vote_average || 0).toFixed(1)
      : formatNumber(movie.view || 0);

  const subText =
    type === 'rating'
      ? `+${formatNumber(movie.tmdb?.vote_count || 0)} Ratings`
      : 'Lượt xem';

  const label = type === 'rating' ? 'RATING' : 'VIEWS';

  return (
    <Link
      href={`/phim/${movie.slug}`}
      className="group border-border/50 bg-muted hover:shadow-primary/20 hover:border-primary/50 relative block w-full overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-xl"
    >
      {/* Background Image - Wide Aspect Ratio */}
      <div className="relative aspect-2/1 w-full">
        <Image
          src={movie.thumb_url || movie.poster_url}
          alt={movie.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={75}
          loading="lazy"
        />

        {/* Lighter Gradient Overlay - Only bottom and sides */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30 md:bg-linear-to-r md:from-black/80 md:via-black/20 md:to-transparent" />

        {/* Image-only overlays: rank and score remain attached to the artwork. */}
        <div className="absolute inset-0 flex items-start justify-between p-4">
          <div className="relative z-10">
            <div className="border-primary/80 text-primary-foreground flex h-10 w-10 items-center justify-center rounded border-2 bg-transparent text-xl font-black shadow-[0_0_15px_rgba(var(--primary),0.3)] backdrop-blur-sm md:h-12 md:w-12 md:text-2xl lg:rounded-lg">
              <span className="text-white drop-shadow-md">{rank}</span>
            </div>
          </div>

          {/* Right Side Rating/View Badge (Desktop/Mobile) */}
          {((type === 'rating' && (movie.tmdb?.vote_average || 0) > 0) ||
            (type === 'view' && (movie.view || 0) > 0)) && (
            <div className="z-10 flex flex-col items-end">
              <div className="mb-1 rounded-sm bg-yellow-400/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
                {label}
              </div>
              <div className="flex items-center gap-1 text-3xl leading-none font-black text-white drop-shadow-lg md:text-4xl">
                {score}
              </div>
              <div className="mt-1 text-[10px] font-medium text-gray-300 md:text-xs">
                {subText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Title and metadata stay below the image. */}
      <div className="min-h-[6.5rem] p-4">
        <div className="text-primary mb-0.5 text-sm font-bold md:text-base">
          {movie.episode_current}
        </div>
        <h3 className="text-foreground group-hover:text-primary line-clamp-2 font-serif text-lg leading-tight font-bold transition-colors md:text-xl">
          {movie.name}
        </h3>
        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs md:text-sm">
          {movie.origin_name}
        </p>
      </div>
    </Link>
  );
}
