'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  Play,
  Star,
  Film,
  LayoutGrid,
  MonitorPlay,
  Info,
  Clapperboard,
  Server,
  Eye,
} from 'lucide-react';
import type { Movie } from '@/lib/data';
import { getServerSlug } from '@/lib/utils';

interface RandomMovieSectionProps {
  movies: Movie[];
  className?: string;
}

export function RandomMovieSection({
  movies,
  className = '',
}: RandomMovieSectionProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'trailer' | 'episodes'
  >('overview');
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [currentMovieIdx, setCurrentMovieIdx] = useState(0);

  if (!movies || movies.length === 0) return null;

  const movie = movies[currentMovieIdx];

  // Navigation functions
  const nextMovie = () => {
    setCurrentMovieIdx((prev) => (prev + 1) % movies.length);
    setActiveTab('overview'); // Reset to overview when changing movie
    setActiveServerIdx(0);
  };

  const prevMovie = () => {
    setCurrentMovieIdx((prev) => (prev - 1 + movies.length) % movies.length);
    setActiveTab('overview');
    setActiveServerIdx(0);
  };

  // Use actual episodes data from movie
  const episodes = movie.episodes || [];
  const currentServer = episodes[activeServerIdx] || episodes[0];
  const serverItems = (currentServer?.server_data || currentServer?.items || []) as Array<{
    name: string;
    slug: string;
    link_embed?: string;
    link_m3u8?: string;
  }>;
  const episodesToShow = serverItems.slice(0, 12);

  return (
    <section
      className={`bg-muted/20 dark:bg-background text-foreground relative overflow-hidden py-4 transition-colors duration-500 md:py-6 lg:py-10 ${className}`}
    >
      <div className="relative z-10 flex h-full flex-col gap-4 md:gap-6">
        {/* Section Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-2xl font-black md:text-3xl lg:text-4xl">
            Phim Ngẫu Nhiên
          </h2>
        </div>

        <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:gap-8">
          {/* 1. Sidebar Navigation (Left) - Desktop only */}
          <div className="border-border hidden w-48 shrink-0 flex-col space-y-6 border-r pt-8 pr-6 lg:flex">
            {[
              { id: 'overview' as const, label: 'Tổng Quan', icon: Info },
              { id: 'trailer' as const, label: 'Trailer', icon: Clapperboard },
              { id: 'episodes' as const, label: 'Tập Phim', icon: Film },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-3 rounded-lg p-2 text-base font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground translate-x-1 shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } `}
              >
                <tab.icon
                  className={`h-4 w-4 ${activeTab === tab.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col">
            {/* Mobile Tab Navigation */}
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 lg:hidden">
              {[
                { id: 'overview' as const, label: 'Tổng Quan', icon: Info },
                {
                  id: 'trailer' as const,
                  label: 'Trailer',
                  icon: Clapperboard,
                },
                { id: 'episodes' as const, label: 'Tập Phim', icon: Film },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  } `}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 2. Header */}
            <header className="mb-3 flex flex-col items-start gap-1.5 md:mb-5 md:gap-2">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="text-primary hidden text-xs font-bold tracking-[0.2em] uppercase md:inline-block">
                  {movie.quality} STUDIO PRESENTS
                </span>

                {/* Movie Navigation */}
                {movies.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevMovie}
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full p-2 transition-all active:scale-95"
                      aria-label="Previous movie"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-muted-foreground text-xs font-bold">
                      {currentMovieIdx + 1} / {movies.length}
                    </span>
                    <button
                      onClick={nextMovie}
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full p-2 transition-all active:scale-95"
                      aria-label="Next movie"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <h2 className="text-foreground mb-1 line-clamp-1 w-full font-serif text-lg font-black tracking-tight sm:text-xl md:mb-2 md:text-2xl lg:text-3xl">
                {movie.name}
              </h2>

              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                {movie.year && (
                  <span className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-bold tracking-wider uppercase">
                    {movie.year}
                  </span>
                )}
                {movie.time && (
                  <>
                    <div className="bg-border h-4 w-px" />
                    <span className="text-muted-foreground text-sm font-medium uppercase">
                      {movie.time}
                    </span>
                  </>
                )}
                {movie.lang && (
                  <>
                    <div className="bg-border h-4 w-px" />
                    <span className="text-muted-foreground text-sm font-medium uppercase">
                      {movie.lang
                        .trim()
                        .replace(/\s*0+\s*/g, ' ')
                        .trim() || 'Phụ Đề'}
                    </span>
                  </>
                )}
                {movie.tmdb?.vote_average &&
                Number(movie.tmdb.vote_average) > 0 ? (
                  <>
                    <div className="bg-border h-4 w-px" />
                    <span className="flex items-center gap-1 text-sm font-bold text-yellow-500">
                      <Star className="h-3 w-3 fill-current" />
                      {Number(movie.tmdb.vote_average).toFixed(1)}
                    </span>
                  </>
                ) : null}
                {movie.imdb?.id ? (
                  <>
                    <div className="bg-border h-4 w-px" />
                    <a
                      href={`https://www.imdb.com/title/${movie.imdb.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-bold text-yellow-600 transition-colors hover:text-yellow-500"
                    >
                      IMDB
                    </a>
                  </>
                ) : null}
                {movie.view !== undefined && movie.view > 0 ? (
                  <>
                    <div className="bg-border h-4 w-px" />
                    <span className="flex items-center gap-1 text-xs md:text-sm font-bold text-cyan-600 dark:text-cyan-400">
                      <Eye className="h-3.5 w-3.5" />
                      {movie.view.toLocaleString('vi-VN')} lượt xem
                    </span>
                  </>
                ) : null}
              </div>
            </header>

            {/* 3. The "Board" (Card Content) - Responsive Height */}
            <div className="bg-card border-border relative h-auto min-h-[340px] md:h-[380px] overflow-hidden rounded-2xl border shadow-xl">
              <div
                className="relative z-10 flex h-full flex-col p-4 md:p-5 lg:p-6"
                key={movie._id}
              >
                {activeTab === 'overview' && (
                  <div className="animate-fade-in flex h-full flex-col gap-3 md:gap-4 lg:gap-5">
                    {/* Poster Image - Top on mobile, right on desktop */}
                    <div className="border-border/50 relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border shadow-lg md:hidden">
                      <Image
                        src={movie.thumb_url || movie.poster_url || '/no-image.png'}
                        alt={movie.name}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        quality={75}
                        loading="lazy"
                      />
                    </div>

                    <div className="flex h-full flex-col gap-4 md:flex-row md:gap-5 lg:gap-6">
                      <div className="flex flex-1 flex-col">
                        <div className="space-y-2 md:space-y-3">
                          {/* Categories - Clickable badges */}
                          <div className="flex flex-wrap gap-2">
                            {movie.category
                              ?.slice(0, 3)
                              .map(
                                (
                                  cat: { name: string; slug: string },
                                  idx: number
                                ) => (
                                  <Link
                                    key={`${cat.slug}-${idx}`}
                                    href={`/tim-kiem?category=${cat.slug}`}
                                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                  >
                                    <LayoutGrid className="h-3 w-3" />
                                    {cat.name}
                                  </Link>
                                )
                              )}
                          </div>

                          {/* Description */}
                          <p className="line-clamp-2 text-xs sm:text-sm md:text-base leading-relaxed text-slate-300 md:block">
                            {movie.content?.replace(/<[^>]*>/g, '')}
                          </p>

                          {/* Additional Info Grid - Hidden on mobile */}
                          <div className="border-border hidden grid-cols-2 gap-2 border-t pt-2 md:grid">
                            {movie.country && movie.country.length > 0 && (
                              <div className="space-y-0.5">
                                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                                  Quốc Gia
                                </p>
                                <p className="text-foreground truncate text-sm font-bold">
                                  {movie.country
                                    .map((c: { name: string }) => c.name)
                                    .join(', ')}
                                </p>
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <p className="text-muted-foreground text-xs tracking-wider uppercase">
                                Trạng Thái
                              </p>
                              <p className="text-foreground text-sm font-bold">
                                {movie.status === 'completed' ||
                                movie.episode_current === 'Full'
                                  ? 'Hoàn Tất'
                                  : `${movie.episode_current} / ${movie.episode_total || '??'}`}
                              </p>
                            </div>
                            {Number(movie.view) > 0 && (
                              <div className="space-y-0.5">
                                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                                  Lượt Xem
                                </p>
                                <p className="text-foreground text-sm font-bold">
                                  {Number(movie.view).toLocaleString()}
                                </p>
                              </div>
                            )}
                            {movie.quality && (
                              <div className="space-y-0.5">
                                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                                  Chất Lượng
                                </p>
                                <p className="text-foreground text-sm font-bold">
                                  {movie.quality}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Button - Bottom aligned */}
                        <div className="mt-4 pt-2 md:mt-auto block">
                          <Link
                            href={`/phim/${movie.slug}`}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wide uppercase shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto"
                          >
                            <Play className="h-4 w-4 fill-current" />
                            Xem Chi Tiết
                          </Link>
                        </div>
                      </div>

                      {/* Poster Image - Right side on desktop */}
                      <div className="border-border/50 relative hidden shrink-0 overflow-hidden rounded-xl border shadow-lg md:block md:h-full md:w-1/3 lg:w-2/5">
                        <Image
                          src={movie.poster_url || '/no-image.png'}
                          alt={movie.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 40vw"
                          quality={75}
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'trailer' && (
                  <div className="animate-fade-in flex h-full w-full flex-col">
                    {movie.trailer_url ? (
                      <div className="border-border relative aspect-video w-full overflow-hidden rounded-xl border bg-black shadow-lg">
                        <iframe
                          src={movie.trailer_url.replace('watch?v=', 'embed/')}
                          className="absolute inset-0 h-full w-full"
                          title="Movie Trailer"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="text-muted-foreground bg-muted/20 border-border flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8">
                        <MonitorPlay className="h-16 w-16 opacity-20" />
                        <p>Trailer chưa được cập nhật.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'episodes' && (
                  <div className="animate-fade-in flex h-full flex-col">
                    {/* Server Selection Headers */}
                    {episodes.length > 0 && (
                      <div className="border-border mb-6 flex items-center gap-4 overflow-x-auto border-b pb-2">
                        {episodes.map(
                          (server: { server_name: string }, idx: number) => {
                            let cleanName = server.server_name
                              .replace(/^#|Server|Hà Nội|VIP|FPT|CDN/gi, '')
                              .trim();
                            if (!cleanName || cleanName.length < 2)
                              cleanName = `Server ${idx + 1}`;
                            if (cleanName.toLowerCase().includes('vietsub'))
                              cleanName = 'Phụ Đề';
                            if (cleanName.toLowerCase().includes('lồng tiếng'))
                              cleanName = 'Lồng Tiếng';
                            if (cleanName.toLowerCase().includes('thuyết minh'))
                              cleanName = 'Thuyết Minh';

                            return (
                              <button
                                key={idx}
                                onClick={() => setActiveServerIdx(idx)}
                                className={`relative top-px flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                                  (activeServerIdx < episodes.length ? activeServerIdx : 0) === idx
                                    ? 'text-primary border-primary bg-primary/5 border-b-2'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                } `}
                              >
                                <Server className="h-4 w-4" />
                                {cleanName}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* Episodes Grid */}
                    {episodesToShow.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
                        {episodesToShow.map(
                          (ep: { name: string; slug: string }, idx: number) => {
                            const cleanEpName =
                              ep.name
                                .replace(/^Tập\s+/i, '')
                                .replace(/^0+/, '') || ep.name;
                            return (
                              <Link
                                key={idx}
                                href={`/xem/${movie.slug}/${getServerSlug(currentServer?.server_name || 'default')}/${ep.slug}`}
                                className="group border-border bg-background hover:border-primary hover:bg-primary/5 relative flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all active:scale-95"
                              >
                                <span className="text-muted-foreground mb-1 text-[10px] font-bold uppercase">
                                  Tập
                                </span>
                                <span className="text-foreground group-hover:text-primary text-xl font-black">
                                  {cleanEpName}
                                </span>
                              </Link>
                            );
                          }
                        )}

                        {/* Show 'See All' if more than 12 */}
                        {serverItems.length > 12 && (
                          <Link
                            href={`/phim/${movie.slug}`}
                            className="border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex flex-col items-center justify-center rounded-lg border border-dashed p-3 transition-all active:scale-95"
                          >
                            <ChevronRight className="h-6 w-6" />
                            <span className="text-xs font-bold">Xem Thêm</span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground bg-muted/10 border-border flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed italic">
                        <p>Chưa có tập phim nào.</p>
                        <Link
                          href={`/phim/${movie.slug}`}
                          className="not-italic text-xs font-semibold text-primary hover:underline"
                        >
                          Xem trang chi tiết phim &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
