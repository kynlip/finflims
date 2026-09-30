"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Server, Film } from "lucide-react";
import type { Movie } from "@/lib/types";
import {
  getServerSlug,
  normalizeEpisodeKey,
  isNumericEpisode,
  formatNumericDisplayName,
} from "@/lib/utils";

interface EpisodeListProps {
  movie: Movie;
  currentSlug?: string;
  currentEpisode?: string;
  currentServer?: string;
  isPlaying?: boolean;
  compact?: boolean;
  onEpisodeChange?: (episode: string, server?: string) => void;
}

interface EpisodeItem {
  name: string;
  slug: string;
  time?: string;
}

function cleanServerName(serverName: string, index: number) {
  let name = serverName
    .replace(/^#|Server|Hà Nội|VIP|FPT|CDN/gi, "")
    .trim();

  if (!name || name.length < 2) name = `Server ${index + 1}`;
  if (name.toLowerCase().includes("vietsub")) name = "Phụ Đề";
  if (name.toLowerCase().includes("lồng tiếng")) name = "Lồng Tiếng";
  if (name.toLowerCase().includes("thuyết minh")) name = "Thuyết Minh";

  return name;
}

function getEpisodeShortNum(item: EpisodeItem | undefined, pickEnd = false): string | null {
  if (!item) return null;
  const raw = formatNumericDisplayName(item.name || item.slug || "");
  const numbers = raw.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    if (pickEnd && numbers.length > 1) {
      return numbers[numbers.length - 1];
    }
    return numbers[0];
  }
  return null;
}

export function EpisodeList({
  movie,
  currentEpisode,
  currentServer,
  isPlaying = false,
  compact = false,
  onEpisodeChange,
}: EpisodeListProps) {
  const episodes = movie.episodes || [];
  const initialServerIndex = episodes.findIndex(
    (server) => getServerSlug(server.server_name) === currentServer,
  );
  const [activeServerIdx, setActiveServerIdx] = useState(
    initialServerIndex >= 0 ? initialServerIndex : 0,
  );

  const currentServerData = episodes[activeServerIdx] || episodes[0];
  const items = (currentServerData?.items ||
    currentServerData?.server_data ||
    []) as EpisodeItem[];

  const EPISODES_PER_RANGE = 100;
  const ranges = [];
  if (items.length > EPISODES_PER_RANGE) {
    for (let index = 0; index < items.length; index += EPISODES_PER_RANGE) {
      const endIdx = Math.min(index + EPISODES_PER_RANGE, items.length);
      const firstEp = items[index];
      const lastEp = items[endIdx - 1];
      const startNum = getEpisodeShortNum(firstEp, false);
      const endNum = getEpisodeShortNum(lastEp, true);

      const label =
        startNum && endNum
          ? `${startNum}-${endNum}`
          : `${index + 1}-${endIdx}`;

      ranges.push({
        label,
        startIdx: index,
        endIdx,
      });
    }
  }

  const findRangeForEpisode = (epSlug?: string, itemsList: EpisodeItem[] = items) => {
    if (!epSlug || itemsList.length === 0) return 0;
    const cleanCurrent = normalizeEpisodeKey(epSlug);
    const itemIndex = itemsList.findIndex((ep) => {
      const cleanEp = normalizeEpisodeKey(ep.slug || ep.name || "");
      return (
        ep.slug === epSlug ||
        cleanEp === cleanCurrent ||
        ep.slug === `tap-${epSlug}` ||
        `tap-${ep.slug}` === epSlug
      );
    });
    if (itemIndex >= 0) {
      return Math.floor(itemIndex / EPISODES_PER_RANGE);
    }
    return 0;
  };

  const [activeRangeIdx, setActiveRangeIdx] = useState(() =>
    findRangeForEpisode(currentEpisode, items),
  );

  // Sync active range when currentEpisode changes dynamically (e.g. auto next episode)
  useEffect(() => {
    if (currentEpisode && ranges.length > 0) {
      const targetRange = findRangeForEpisode(currentEpisode, items);
      setActiveRangeIdx(targetRange);
    }
  }, [currentEpisode, items]);

  if (episodes.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-muted-foreground italic">
        Chưa có tập phim nào.
      </div>
    );
  }

  const safeRangeIdx =
    ranges.length > 0 ? Math.min(activeRangeIdx, ranges.length - 1) : 0;
  const activeRange = ranges[safeRangeIdx] || {
    startIdx: 0,
    endIdx: items.length,
  };
  const episodesToShow = items.slice(activeRange.startIdx, activeRange.endIdx);
  const numericEpisodes = episodesToShow.filter(isNumericEpisode);
  const namedEpisodes = episodesToShow.filter(
    (episode) => !isNumericEpisode(episode),
  );
  const hasBothEpisodeTypes =
    numericEpisodes.length > 0 && namedEpisodes.length > 0;
  const serverSlug = getServerSlug(currentServerData.server_name);

  const renderNumericCard = (episode: EpisodeItem, index: number) => {
    const cleanCurrent = normalizeEpisodeKey(currentEpisode || "");
    const cleanThis = normalizeEpisodeKey(episode.slug || "");
    const isServerMatch =
      !currentServer ||
      serverSlug === currentServer ||
      currentServerData.server_name === currentServer ||
      episodes.length === 1;
    const isHighlight =
      isServerMatch &&
      (currentEpisode === episode.slug ||
        (cleanCurrent !== "" && cleanCurrent === cleanThis));
    const cleanName = formatNumericDisplayName(episode.name);

    return (
      <Link
        key={`num-${index}-${episode.slug}`}
        href={`/xem/${movie.slug}/${serverSlug}/${episode.slug}`}
        onClick={(event) => {
          if (onEpisodeChange) {
            event.preventDefault();
            onEpisodeChange(episode.slug, serverSlug);
          }
        }}
        title={`Tập ${cleanName}`}
        className={`group relative flex h-10 w-full min-w-0 items-center justify-center rounded-xl border text-center transition-all duration-200 px-1.5 ${
          isHighlight
            ? "scale-105 border-white/15 bg-amber-500/20 text-yellow-400 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.25)]"
            : "border-white/10 bg-[#151515] text-gray-300 hover:scale-105 hover:border-yellow-500/50 hover:bg-white/10 hover:text-yellow-200"
        }`}
      >
        <span
          className={`truncate whitespace-nowrap font-bold ${
            cleanName.length > 8
              ? "text-[10px] tracking-tighter"
              : cleanName.length > 5
              ? "text-[11px] tracking-tight"
              : "text-xs sm:text-sm tracking-tight"
          }`}
        >
          {cleanName}
        </span>

        {isHighlight && isPlaying && (
          <span
            className="pointer-events-none absolute right-1.5 bottom-1.5 flex h-3 items-end gap-0.5"
            aria-hidden="true"
          >
            <span className="episode-playing-bar h-1 w-0.5 rounded-full bg-yellow-300" />
            <span
              className="episode-playing-bar h-2.5 w-0.5 rounded-full bg-yellow-300"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="episode-playing-bar h-1.5 w-0.5 rounded-full bg-yellow-300"
              style={{ animationDelay: "240ms" }}
            />
          </span>
        )}
      </Link>
    );
  };

  const renderNamedCard = (episode: EpisodeItem, index: number) => {
    const cleanCurrent = normalizeEpisodeKey(currentEpisode || "");
    const cleanThis = normalizeEpisodeKey(episode.slug || "");
    const isServerMatch =
      !currentServer ||
      serverSlug === currentServer ||
      currentServerData.server_name === currentServer ||
      episodes.length === 1;
    const isHighlight =
      isServerMatch &&
      (currentEpisode === episode.slug ||
        (cleanCurrent !== "" && cleanCurrent === cleanThis));
    const cleanName =
      episode.name.replace(/^Tập\s+/i, "").trim() || episode.name;

    return (
      <Link
        key={`named-${index}-${episode.slug}`}
        href={`/xem/${movie.slug}/${serverSlug}/${episode.slug}`}
        onClick={(event) => {
          if (onEpisodeChange) {
            event.preventDefault();
            onEpisodeChange(episode.slug, serverSlug);
          }
        }}
        title={episode.name}
        className={`group relative flex min-h-[46px] w-full min-w-0 items-center justify-center rounded-xl border px-3 py-2 text-center transition-all duration-200 ${
          isHighlight
            ? "border-white/15 bg-amber-500/20 text-yellow-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]"
            : "border-white/10 bg-[#151515] text-gray-300 hover:border-yellow-500/50 hover:bg-white/10 hover:text-yellow-200"
        }`}
      >
        <span
          className={`line-clamp-2 text-xs font-semibold leading-snug break-words ${
            isHighlight ? "text-yellow-400 font-bold" : "text-gray-200 group-hover:text-yellow-100"
          }`}
        >
          {cleanName}
        </span>

        {isHighlight && isPlaying && (
          <span
            className="pointer-events-none absolute right-1.5 bottom-1.5 flex h-3 items-end gap-0.5"
            aria-hidden="true"
          >
            <span className="episode-playing-bar h-1 w-0.5 rounded-full bg-yellow-300" />
            <span
              className="episode-playing-bar h-2.5 w-0.5 rounded-full bg-yellow-300"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="episode-playing-bar h-1.5 w-0.5 rounded-full bg-yellow-300"
              style={{ animationDelay: "240ms" }}
            />
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className={`flex flex-col h-full min-h-0 space-y-3 sm:space-y-4 ${compact ? "text-sm" : ""}`}>
      {/* Server selector & Range selector */}
      <div className="flex flex-col gap-2.5 shrink-0">
        {episodes.length > 0 && (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {episodes.map((server, index) => {
              const isActive = activeServerIdx === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setActiveServerIdx(index);
                    const nextServerData = episodes[index] || episodes[0];
                    const nextItems = (nextServerData?.items ||
                      nextServerData?.server_data ||
                      []) as EpisodeItem[];
                    setActiveRangeIdx(
                      findRangeForEpisode(currentEpisode, nextItems),
                    );
                    if (onEpisodeChange && currentEpisode) {
                      onEpisodeChange(
                        currentEpisode,
                        getServerSlug(server.server_name),
                      );
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all sm:px-4 sm:py-2 sm:text-sm ${
                    isActive
                      ? "scale-105 border-transparent bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                      : "border-white/10 bg-[#151515] text-gray-400 hover:border-yellow-500/50 hover:bg-white/10 hover:text-yellow-200"
                  }`}
                >
                  <Server className="h-3.5 w-3.5 shrink-0" />
                  <span>{cleanServerName(server.server_name, index)}</span>
                </button>
              );
            })}
          </div>
        )}

        {ranges.length > 0 && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            {ranges.map((range, index) => {
              const isActive = safeRangeIdx === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveRangeIdx(index)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-white/10 bg-yellow-500/20 text-yellow-400"
                      : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Episode Grid Container - single scrollable container */}
      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto pr-1 md:pr-1.5 max-h-[60vh] lg:max-h-none">
        {episodesToShow.length > 0 ? (
          <div className="space-y-4">
            {/* 1. Numeric numbered episodes */}
            {numericEpisodes.length > 0 && (
              <section aria-label="Tập số">
                {hasBothEpisodeTypes && (
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-yellow-500/80 uppercase">
                    <Play className="h-3 w-3 fill-current" />
                    <span>Tập Chính</span>
                  </div>
                )}
                <div
                  className={`grid items-start gap-2 ${
                    compact
                      ? "grid-cols-4 min-[380px]:grid-cols-5"
                      : "grid-cols-4 min-[380px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                  }`}
                >
                  {numericEpisodes.map(renderNumericCard)}
                </div>
              </section>
            )}

            {/* 2. Named / Special / OVA episodes */}
            {namedEpisodes.length > 0 && (
              <section
                aria-label="Tập đặc biệt"
                className={numericEpisodes.length > 0 ? "border-t border-white/10 pt-3" : ""}
              >
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-yellow-500/80 uppercase">
                  <Film className="h-3 w-3" />
                  <span>
                    {hasBothEpisodeTypes ? "Tập Đặc Biệt / Ngoại Truyện" : "Danh Sách Tập"}
                  </span>
                </div>
                <div
                  className={`grid items-start gap-2 ${
                    compact
                      ? "grid-cols-1 min-[420px]:grid-cols-2"
                      : "grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  }`}
                >
                  {namedEpisodes.map(renderNamedCard)}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs font-medium text-muted-foreground italic sm:text-sm">
            Chưa có tập phim nào trên server này.
          </div>
        )}
      </div>
    </div>
  );
}
