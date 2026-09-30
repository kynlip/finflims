import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Movie } from '@/lib/data';
import type { FranchiseSlug } from '@/lib/franchises';

interface FranchiseMovieCardProps {
  movie: Movie;
  franchise?: FranchiseSlug;
  priority?: boolean;
}

function formatViews(num?: number): string | null {
  if (num === undefined || num === null || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function episodeLabel(movie: Movie) {
  const current = (movie.episode_current || '').trim();
  if (!current || current.toLowerCase() === 'tập') {
    return movie.status === 'completed' ? 'Hoàn tất' : 'Đang chiếu';
  }

  const isFull =
    current.toLowerCase() === 'full' ||
    current.toLowerCase().includes('hoàn tất') ||
    (movie.episode_total && current === movie.episode_total);

  if (isFull) return 'Hoàn tất';
  return current.toLowerCase().startsWith('tập') ? current : `Tập ${current}`;
}

export function FranchiseMovieCard({
  movie,
  franchise,
  priority = false,
}: FranchiseMovieCardProps) {
  const poster = movie.poster_url || movie.thumb_url;
  const viewsText = formatViews(movie.view);

  const isConan = franchise === 'conan';
  const isDoraemon = franchise === 'doraemon';
  const hoverBorder = isConan
    ? 'group-hover:border-[#f0bd83]/80'
    : isDoraemon
      ? 'group-hover:border-[#36d9ef]/80'
      : 'group-hover:border-amber-400/80';
  const hoverText = isConan
    ? 'group-hover:text-[#f0bd83]'
    : isDoraemon
      ? 'group-hover:text-[#7af4ff]'
      : 'group-hover:text-amber-400';

  return (
    <Link
      href={`/phim/${movie.slug}`}
      className="group block w-full min-w-0 focus-visible:outline-none"
      aria-label={`Xem ${movie.name}`}
    >
      {/* Poster Image Container */}
      <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)] ${hoverBorder}`}>
        {poster ? (
          <Image
            src={poster}
            alt={movie.name}
            fill
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 16vw"
            quality={85}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-slate-900 p-4 text-center text-xs font-bold text-white/60">
            Chưa có ảnh
          </div>
        )}

        {/* Current Episode Badge - Top Right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="rounded-lg border border-amber-500/40 bg-black/80 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-amber-300 backdrop-blur-md shadow-sm">
            {episodeLabel(movie)}
          </span>
        </div>

        {/* Bottom Left: View Count Badge */}
        {viewsText && (
          <div className="absolute left-2.5 bottom-2.5 z-10">
            <span className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/75 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-white/90 backdrop-blur-md shadow-sm">
              <Eye className="h-3 w-3 text-cyan-400" />
              <span>{viewsText}</span>
            </span>
          </div>
        )}
      </div>

      {/* Title Outside Poster */}
      <div className="mt-2.5 px-0.5 text-center sm:text-left">
        <h3 className={`line-clamp-2 min-h-[2.5rem] text-sm sm:text-base font-bold text-white transition-colors leading-snug ${hoverText}`}>
          {movie.name}
        </h3>
      </div>
    </Link>
  );
}


