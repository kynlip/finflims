import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Movie } from '@/lib/data';

interface MovieCardProps {
  movie: Movie;
  rank?: number;
  priority?: boolean;
}

function episodeLabel(movie: Movie) {
  const current = (movie.episode_current || '').trim();
  if (!current || current.toLowerCase() === 'tập') {
    return movie.status === 'completed' ? 'Hoàn Tất' : 'Đang chiếu';
  }

  const isFull =
    current.toLowerCase() === 'full' ||
    current.includes('Hoàn Tất') ||
    (movie.episode_total && current === movie.episode_total);

  if (isFull) return 'Hoàn Tất';

  // Clean "Tập Tập" -> "Tập "
  return `Tập ${current.replace(/^Tập\s+/i, '')}`;
}

function formatViews(num?: number): string | null {
  if (num === undefined || num === null || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Server component on purpose: the homepage renders well over a hundred of
// these, so keeping them out of the client bundle removes the bulk of the
// hydration work on low-end phones.
export function MovieCard({ movie, rank, priority = false }: MovieCardProps) {
  const poster = movie.poster_url || movie.thumb_url || '';
  const viewsText = formatViews(movie.view);

  return (
    <Link href={`/phim/${movie.slug}`} className="group block w-full min-w-0">
      <div className="border-primary/20 group-hover:border-primary/80 relative aspect-2/3 w-full overflow-hidden rounded-2xl border-2 bg-[#0d1424] transition-colors duration-300">
        {poster ? (
          <Image
            src={poster}
            alt={movie.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            quality={75}
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-b from-slate-800 to-slate-950 p-4 text-center">
            <span className="text-xs font-bold text-slate-500">Chưa có ảnh</span>
          </div>
        )}

        {/* Current Episode Badge - Top Right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="bg-primary/90 text-primary-foreground border-primary rounded-full border px-2.5 py-0.5 text-xs font-black tracking-wider uppercase shadow-sm">
            {episodeLabel(movie)}
          </span>
        </div>

        {/* View Count Badge - Bottom Left */}
        {viewsText && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="bg-black/75 backdrop-blur-md text-white/90 border border-white/15 rounded-lg px-2 py-0.5 text-xs font-mono font-bold flex items-center gap-1 shadow-sm">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{viewsText}</span>
            </span>
          </div>
        )}

        {/* Rank Badge - Top Left (Exclusive for Top 10) */}
        {rank && rank <= 10 && (
          <div className="absolute top-0 left-0 z-20">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-br-xl border-r-2 border-b-2 border-black/20 text-lg font-black">
              #{rank}
            </div>
          </div>
        )}
      </div>

      {/* Keep the title outside the poster so artwork and text never overlap. */}
      <div className="mt-2.5 min-h-[3rem] px-0.5 text-center">
        <h3 className="group-hover:text-primary line-clamp-2 font-serif text-sm sm:text-base leading-tight font-extrabold text-white transition-colors">
          {movie.name}
        </h3>
      </div>
    </Link>
  );
}
