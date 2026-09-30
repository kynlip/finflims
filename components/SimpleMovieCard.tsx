import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Movie } from '@/lib/data';

interface SimpleMovieCardProps {
  movie: Movie;
}

function formatViews(num?: number): string | null {
  if (num === undefined || num === null || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function SimpleMovieCard({ movie }: SimpleMovieCardProps) {
  const viewsText = formatViews(movie.view);

  return (
    <Link href={`/phim/${movie.slug}`} className="group flex flex-col gap-1.5">
      {/* Poster Image */}
      <div className="border-border/20 group-hover:border-primary/50 group-hover:shadow-primary/10 relative aspect-2/3 w-full overflow-hidden rounded-md border shadow-sm transition-all duration-300 group-hover:shadow-lg">
        <Image
          src={movie.thumb_url}
          alt={movie.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
          quality={75}
          loading="lazy"
        />

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Episode Badge */}
        {movie.episode_current && (
          <div className="absolute top-1 right-1 rounded border border-white/20 bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-sm">
            {movie.episode_current}
          </div>
        )}

        {/* View Count Badge */}
        {viewsText && (
          <div className="absolute bottom-1 left-1 rounded border border-white/15 bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white/90 shadow-sm backdrop-blur-sm flex items-center gap-0.5">
            <Eye className="w-2.5 h-2.5 text-cyan-400" />
            <span>{viewsText}</span>
          </div>
        )}

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="bg-primary/95 text-primary-foreground shadow-primary/30 flex h-8 w-8 scale-75 items-center justify-center rounded-full shadow-lg transition-transform duration-300 group-hover:scale-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-0.5 h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Movie Title */}
      <h3 className="group-hover:text-primary line-clamp-2 text-xs leading-tight font-semibold transition-colors">
        {movie.name}
      </h3>
    </Link>
  );
}
