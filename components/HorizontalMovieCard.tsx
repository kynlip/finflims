import Image from 'next/image';
import Link from 'next/link';
import { Play, Star } from 'lucide-react';
import type { Movie } from '@/lib/data';

interface HorizontalMovieCardProps {
  movie: Movie;
}

export function HorizontalMovieCard({ movie }: HorizontalMovieCardProps) {
  return (
    <Link
      href={`/phim/${movie.slug}`}
      className="group hover:bg-card/90 border-border/40 hover:border-primary/60 relative flex gap-4 overflow-hidden rounded-2xl border bg-white/5 p-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)] hover:shadow-primary/20"
    >
      {/* Thumbnail Image (16:9) */}
      <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={movie.thumb_url}
          alt={movie.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="160px"
          quality={75}
          loading="lazy"
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
          <div className="bg-primary/90 flex h-10 w-10 items-center justify-center rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-transform duration-300 group-hover:scale-110">
            <Play className="text-primary-foreground ml-1 h-5 w-5 fill-current drop-shadow-md" />
          </div>
        </div>

        {/* Episode Badge */}
        {movie.episode_current && (
          <div className="absolute right-2 bottom-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
            {movie.episode_current}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div>
          <h3 className="text-foreground group-hover:text-primary mb-1 line-clamp-2 text-sm font-extrabold tracking-tight transition-colors md:text-base">
            {movie.name}
          </h3>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {movie.origin_name}
          </p>
        </div>

        {/* Only show metadata row if there's at least one valid field */}
        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
          {movie.quality && (
            <span className="bg-primary/10 text-primary border-primary/20 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold">
              {movie.quality}
            </span>
          )}

          {(movie.year || 0) > 0 && (
            <span className="font-medium">{movie.year}</span>
          )}
          {(movie.tmdb?.vote_average || 0) > 0 && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              <span className="font-bold">
                {movie.tmdb!.vote_average.toFixed(1)}
              </span>
            </div>
          )}
          {(Number(movie.view) || 0) > 0 && (
            <span>{Number(movie.view).toLocaleString()} lượt xem</span>
          )}
        </div>
      </div>
    </Link>
  );
}
