"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Play, Star, Eye } from "lucide-react";
import { getServerSlug } from "@/lib/utils";
import { ParticleBackground } from "@/components/ParticleBackground";

import { EpisodeList } from "@/components/EpisodeList";

const TrailerModal = dynamic(
  () => import("@/components/TrailerModal").then((mod) => mod.TrailerModal),
  { ssr: false },
);

import type { Movie } from "@/lib/types";

import { FavoriteButton } from "@/components/FavoriteButton";
import { ReviewSection } from "@/components/ReviewSection";

interface MovieDetailClientProps {
  movie: Movie;
  firstServerName: string;
  firstEpisodeSlug: string;
  isLoggedIn?: boolean;
}

export function MovieDetailClient({
  movie,
  firstServerName,
  firstEpisodeSlug,
  isLoggedIn = false,
}: MovieDetailClientProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // 3D Tilt Logic (currently unused)
  // const posterRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050505] font-sans text-white selection:bg-cyan-500/30">
      {/* 0. Particle Atmosphere (Subtle) */}
      <ParticleBackground />

      {/* 1. Clean Background: Pure Navy Color */}
      <div className="absolute inset-0 z-0 bg-[#0a0a0a]" />

      {/* Pivot 5.0: Modular "Starlight" Grid - Full Width & Mobile Optimized */}
      <div className="relative z-10 mx-auto w-full px-0 pt-16 pb-12 md:px-8 md:pt-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 md:gap-6">
          {/* LEFT COLUMN: Hero + Mobile Episodes + Overview */}
          <div className="flex flex-col gap-4 md:gap-6">
            {/* CARD 1: HERO MODULE (Top Left) */}
            <div className="relative min-h-[460px] sm:min-h-[400px] lg:h-[550px] w-full overflow-hidden md:rounded-4xl md:border md:border-white/10 bg-[#0a0a0a] shadow-2xl group">
              {/* Backdrop */}
              <div className="absolute inset-0">
                <Image
                  src={movie.thumb_url || movie.poster_url}
                  alt={movie.name}
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  priority
                  unoptimized
                />
                {/* Gradient Refined: Bottom on Mobile, Left/Right on Desktop */}
                <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent md:bg-linear-to-r md:from-[#0a0a0a]/90 md:via-[#0a0a0a]/40 md:to-transparent" />
              </div>

              {/* Hero Content Layer - Bottom on Mobile, Left on Desktop */}
              <div className="relative z-10 h-full flex flex-col justify-end items-start px-4 pb-6 sm:pb-8 md:px-12 md:py-12 text-left max-w-3xl space-y-3 lg:space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-1 bg-yellow-400 rounded-full" />
                  <span className="text-sm font-bold tracking-[0.2em] text-yellow-500 uppercase drop-shadow-md">
                    {movie.origin_name}
                  </span>
                </div>

                <h1 className="font-outfit text-2xl sm:text-3xl lg:text-5xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] line-clamp-3">
                  {movie.name}
                </h1>

                {/* Rating Box & Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-yellow-400 mr-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 lg:h-4 lg:w-4 ${i < Math.round((movie.tmdb?.vote_average || 0) / 2) ? "fill-current" : "text-gray-600"}`}
                      />
                    ))}
                  </div>
                  <span className="px-3 py-1 text-[10px] lg:text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full backdrop-blur-md">
                    {movie.quality}
                  </span>
                  <span className="px-3 py-1 text-[10px] lg:text-xs font-bold bg-white/10 text-white border border-white/10 rounded-full backdrop-blur-md">
                    {movie.year}
                  </span>
                  {movie.lang && (
                    <span className="px-3 py-1 text-[10px] lg:text-xs font-bold bg-white/10 text-white border border-white/10 rounded-full backdrop-blur-md hidden sm:block">
                      {movie.lang}
                    </span>
                  )}
                  {movie.view !== undefined &&
                    movie.view !== null &&
                    Number(movie.view) > 0 && (
                      <span className="px-3 py-1 text-[10px] lg:text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm">
                        <Eye className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-cyan-400" />
                        <span>
                          {Number(movie.view).toLocaleString()} lượt xem
                        </span>
                      </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 sm:pt-4 w-full">
                  <Link
                    href={`/xem/${movie.slug}/${getServerSlug(firstServerName)}/${firstEpisodeSlug}`}
                    className="group/btn relative overflow-hidden rounded-full bg-yellow-400 px-6 py-3 lg:px-10 lg:py-4 font-black text-black transition-all hover:bg-yellow-300 hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] active:scale-95 shadow-[0_0_15px_rgba(250,204,21,0.4)] flex-1 sm:flex-none justify-center text-center"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-wide text-sm lg:text-base">
                      <Play className="h-4 w-4 lg:h-5 lg:w-5 fill-black" /> Xem Ngay
                    </span>
                  </Link>

                  {movie.trailer_url && (
                    <button
                      onClick={() => setShowTrailer(true)}
                      className="rounded-full border border-white/20 bg-black/40 px-6 py-3 lg:px-8 lg:py-4 font-bold text-white backdrop-blur-md hover:bg-white/10 hover:border-yellow-500 hover:text-yellow-400 transition-all text-sm lg:text-base uppercase tracking-wide flex-1 sm:flex-none text-center"
                    >
                      Trailer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MOBILE ONLY: Episode List (Below Hero) */}
            <div className="lg:hidden w-full px-4 relative z-10">
              <div className="rounded-2xl border border-white/10 bg-[#111] backdrop-blur-md overflow-hidden shadow-2xl">
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/50">
                  <h3 className="font-bold text-white uppercase tracking-widest text-xs flex items-center gap-2">
                    <Play className="w-3 h-3 text-yellow-500 fill-current" />{" "}
                    Chọn tập
                  </h3>
                </div>
                <div className="p-3">
                  <EpisodeList
                    movie={movie}
                    currentEpisode={firstEpisodeSlug}
                    currentServer={firstServerName}
                    compact={true}
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: OVERVIEW MODULE */}
            <div className="px-4 md:px-0">
              <div className="md:rounded-4xl border border-white/10 bg-[#111]/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-3xl">
                {/* Decorative Shine */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-yellow-500/50 to-transparent" />

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Vertical Poster (Hidden on very small screens if desired, but User requested it) */}
                  <div className="hidden md:block shrink-0 w-[180px] aspect-2/3 relative rounded-2xl overflow-hidden border border-white/20 shadow-lg group/poster">
                    <Image
                      src={movie.poster_url}
                      alt={movie.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover/poster:scale-110"
                      unoptimized
                    />
                    {/* Shine effect on poster */}
                    <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity" />

                    {/* Favorite Button on Poster */}
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton
                        movie={{
                          slug: movie.slug,
                          name: movie.name,
                          thumb_url: movie.thumb_url || movie.poster_url,
                          types: [
                            movie.type,
                            ...(movie.category?.map((c) => c.slug) || []),
                          ].filter((t): t is string => !!t),
                        }}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 hover:scale-110 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
                    <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3">
                      NỘI DUNG PHIM
                    </h3>

                    {/* Movie Details Grid - Compact & Responsive - 2 columns on mobile */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 border-b border-white/10 text-sm">
                      {/* Tên gốc */}
                      {movie.origin_name && movie.origin_name.trim() && (
                        <div className="col-span-2" data-field="origin_name">
                          <span className="text-xs text-gray-400 uppercase font-semibold">
                            Tên gốc:{" "}
                          </span>
                          <span className="text-white">
                            {movie.origin_name}
                          </span>
                        </div>
                      )}

                      {/* Trạng thái */}
                      {movie.episode_current && (
                        <div data-field="status">
                          <span className="text-xs text-gray-400 uppercase font-semibold block">
                            Trạng thái:{" "}
                          </span>
                          {(() => {
                            const current = movie.episode_current.trim();
                            const total = (movie.episode_total || "").trim();
                            const isFull =
                              current.toLowerCase() === "full" ||
                              current.toLowerCase().includes("hoàn tất") ||
                              movie.status === "completed" ||
                              (total && current === total);

                            if (isFull) {
                              return (
                                <span className="text-emerald-400 font-semibold">
                                  Hoàn Tất{" "}
                                  {total && total !== "1"
                                    ? `(${total} tập)`
                                    : ""}{" "}
                                  ✓
                                </span>
                              );
                            }

                            return (
                              <span className="text-white">
                                {current}{" "}
                                {total && total !== "??" ? `/ ${total}` : ""}
                              </span>
                            );
                          })()}
                        </div>
                      )}

                      {/* Năm */}
                      {movie.year && movie.year > 0 && (
                        <div data-field="year">
                          <span className="text-xs text-gray-400 uppercase font-semibold block">
                            Năm:{" "}
                          </span>
                          <span className="text-yellow-400 font-semibold">
                            {movie.year}
                          </span>
                        </div>
                      )}

                      {/* Thời lượng */}
                      {movie.time && movie.time.trim() && (
                        <div data-field="time">
                          <span className="text-xs text-gray-400 uppercase font-semibold block">
                            Thời lượng:{" "}
                          </span>
                          <span className="text-white">{movie.time}</span>
                        </div>
                      )}

                      {/* Chất lượng */}
                      {movie.quality && movie.quality.trim() && (
                        <div data-field="quality">
                          <span className="text-xs text-gray-400 uppercase font-semibold block">
                            Chất lượng:{" "}
                          </span>
                          <span className="text-yellow-400 font-bold">
                            {movie.quality}
                          </span>
                        </div>
                      )}

                      {/* Ngôn ngữ */}
                      {movie.lang && movie.lang.trim() && (
                        <div data-field="lang" className="col-span-2">
                          <span className="text-xs text-gray-400 uppercase font-semibold">
                            Ngôn ngữ:{" "}
                          </span>
                          <span className="text-white">{movie.lang}</span>
                        </div>
                      )}

                      {/* Quốc gia */}
                      {movie.country && movie.country.length > 0 && (
                        <div data-field="country">
                          <span className="text-xs text-gray-400 uppercase font-semibold block">
                            Quốc gia:{" "}
                          </span>
                          {movie.country.map((c, idx) => (
                            <Link
                              key={idx}
                              href={`/quoc-gia/${c.slug}`}
                              className="text-white hover:text-yellow-400 transition-colors"
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Lượt xem - Mắt xem */}
                      {movie.view !== undefined &&
                        movie.view !== null &&
                        Number(movie.view) > 0 && (
                          <div data-field="view">
                            <span className="text-xs text-gray-400 uppercase font-semibold block">
                              Lượt xem:{" "}
                            </span>
                            <span className="text-cyan-400 font-bold flex items-center gap-1.5 mt-0.5">
                              <Eye className="h-3.5 w-3.5" />
                              {Number(movie.view).toLocaleString()}
                            </span>
                          </div>
                        )}

                      {/* Đánh giá - Only show if > 0 */}
                      {movie.tmdb?.vote_average !== undefined &&
                        movie.tmdb?.vote_average !== null &&
                        Number(movie.tmdb.vote_average) > 0 && (
                          <div data-field="rating" className="col-span-2">
                            <span className="text-xs text-gray-400 uppercase font-semibold">
                              Đánh giá:{" "}
                            </span>
                            <span className="text-white">
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 inline-block mr-1" />
                              {Number(movie.tmdb.vote_average).toFixed(1)}/10
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Mô tả */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Mô tả
                      </h4>
                      <p
                        className={`text-gray-300 text-sm leading-relaxed ${isContentExpanded ? "" : "line-clamp-3 sm:line-clamp-4"}`}
                      >
                        {movie.content?.replace(/<[^>]*>/g, "") ||
                          "Đang cập nhật nội dung..."}
                      </p>

                      {movie.content && movie.content.length > 250 && (
                        <button
                          onClick={() =>
                            setIsContentExpanded(!isContentExpanded)
                          }
                          className="text-xs font-bold text-yellow-400 hover:text-yellow-300 uppercase tracking-wide w-fit flex items-center gap-1"
                        >
                          {isContentExpanded ? "▲ Thu Gọn" : "▼ Đọc Thêm"}
                        </button>
                      )}
                    </div>

                    {/* Categories Pills */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Thể loại
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {movie.category?.map((c, idx) => (
                          <Link
                            key={idx}
                            href={`/the-loai/${c.slug}`}
                            className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-bold text-gray-300 uppercase hover:border-yellow-500/50 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 px-4 md:px-0">
              <ReviewSection movieSlug={movie.slug} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* RIGHT COLUMN: CARD 3 - SIDEBAR MODULE (Desktop Only) */}
          <div className="relative hidden lg:block">
            <div className="sticky top-28 h-[calc(100vh-8rem)] flex flex-col rounded-3xl border border-white/10 bg-[#111]/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
              {/* Sidebar Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40 shrink-0">
                <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-yellow-500 fill-current" /> Danh
                  Sách Tập
                </h3>
              </div>

              {/* Episode List Container */}
              <div className="flex-1 min-h-0 p-4 flex flex-col">
                <EpisodeList
                  movie={movie}
                  currentEpisode={firstEpisodeSlug}
                  currentServer={firstServerName}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTrailer && movie.trailer_url && (
        <TrailerModal
          key={`trailer-${movie._id}`}
          videoUrl={movie.trailer_url}
          onClose={() => setShowTrailer(false)}
        />
      )}

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(1.05);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .animate-breathe {
          animation: breathe 20s ease-in-out infinite;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-shine {
          animation: shine 1.5s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
