"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Server,
  RefreshCw,
  Sparkles,
  Layers,
  Clapperboard,
  Tv,
  Film,
  X,
} from "lucide-react";
import { cdnImage } from "@/lib/image";

interface MovieItem {
  _id: string;
  name: string;
  slug: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  type?: string;
  status?: string;
  year?: number;
  quality?: string;
  lang?: string;
  episode_current?: string;
  episodesCount: number;
  serversCount: number;
  is_manual?: boolean;
}

interface Stats {
  totalAll: number;
  manual?: number;
  hoathinh: number;
  series: number;
  single: number;
  tvshows: number;
}

interface MovieManagerProps {
  isDark?: boolean;
}

export default function MovieManager({ isDark = true }: MovieManagerProps) {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [stats, setStats] = useState<Stats>({
    totalAll: 0,
    hoathinh: 0,
    series: 0,
    single: 0,
    tvshows: 0,
  });

  const fetchMovies = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "15",
        });

        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        } else if (selectedType && selectedType !== "all") {
          params.set("type", selectedType);
        }

        const res = await fetch(`/api/admin/movies?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        setMovies(data.movies || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setCurrentPage(data.pagination?.page || 1);

        if (data.stats) {
          setStats(data.stats);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedType],
  );

  useEffect(() => {
    fetchMovies(1);
  }, [fetchMovies]);

  const handleDeleteMovie = async (slug: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa phim "${name}"? Thao tác này không thể hoàn tác!`)) return;

    try {
      const res = await fetch(`/api/admin/movies/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchMovies(currentPage);
    } catch {
      alert("Lỗi khi xóa phim");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 📊 1. Top Stats Cards (Payflow Minimal Bento Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Tất cả phim */}
        <div
          onClick={() => {
            setSelectedType("all");
            setSearchQuery("");
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedType === "all" && !searchQuery
              ? isDark
                ? "bg-[#181b26] border-zinc-600 ring-2 ring-zinc-600/30 shadow-lg"
                : "bg-white border-2 border-zinc-900 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Tất cả phim
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>
              <Layers size={16} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
            {stats.totalAll.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Toàn bộ kho phim
          </div>
        </div>

        {/* Phim Admin Up */}
        <div
          onClick={() => {
            setSelectedType("manual");
            setSearchQuery("");
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedType === "manual"
              ? isDark
                ? "bg-[#181b26] border-amber-500/60 ring-2 ring-amber-500/20 shadow-lg"
                : "bg-white border-2 border-amber-600 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Admin Upload
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-500">
            {(stats.manual || 0).toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Phim tự đăng tay
          </div>
        </div>

        {/* Hoạt hình */}
        <div
          onClick={() => {
            setSelectedType("hoathinh");
            setSearchQuery("");
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedType === "hoathinh"
              ? isDark
                ? "bg-[#181b26] border-sky-500/60 ring-2 ring-sky-500/20 shadow-lg"
                : "bg-white border-2 border-sky-600 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">
              Hoạt hình
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-500">
              <Film size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-sky-500">
            {stats.hoathinh.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Anime & Cartoon
          </div>
        </div>

        {/* Phim bộ */}
        <div
          onClick={() => {
            setSelectedType("series");
            setSearchQuery("");
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedType === "series"
              ? isDark
                ? "bg-[#181b26] border-blue-500/60 ring-2 ring-blue-500/20 shadow-lg"
                : "bg-white border-2 border-blue-600 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Phim bộ
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
              <Tv size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-500">
            {stats.series.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Nhiều tập
          </div>
        </div>

        {/* Phim lẻ */}
        <div
          onClick={() => {
            setSelectedType("single");
            setSearchQuery("");
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedType === "single"
              ? isDark
                ? "bg-[#181b26] border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-lg"
                : "bg-white border-2 border-emerald-600 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
              Phim lẻ
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <Clapperboard size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-500">
            {stats.single.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            1 tập hoàn chỉnh
          </div>
        </div>
      </div>

      {/* 🔍 2. Filter & Action Toolbar */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 ${
          isDark
            ? "bg-[#11131a] border-zinc-800/80 shadow-md"
            : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className={`absolute left-3.5 top-3 ${isDark ? "text-zinc-400" : "text-zinc-500"}`} size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm phim theo tên, slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMovies(1)}
              className={`w-full h-11 border rounded-2xl pl-11 pr-10 text-sm outline-none transition-all ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:bg-white"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchMovies(1);
                }}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className={`h-11 px-3.5 rounded-2xl border text-sm font-semibold outline-none transition-all ${
              isDark
                ? "bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-500"
                : "bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-zinc-900"
            }`}
          >
            <option value="all">Tất cả thể loại</option>
            <option value="manual">⭐ Admin Upload</option>
            <option value="hoathinh">Hoạt hình</option>
            <option value="series">Phim bộ</option>
            <option value="single">Phim lẻ</option>
            <option value="tvshows">TV Shows</option>
          </select>

          <button
            onClick={() => fetchMovies(1)}
            className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all shrink-0 border ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
            }`}
            title="Làm mới"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/nhanconan/featured"
            className={`h-11 px-4 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 ${
              isDark
                ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200"
            }`}
          >
            <Sparkles size={16} />
            <span>Ghim Hero Slider</span>
          </Link>

          <Link
            href="/nhanconan/movies/new"
            className={`flex-1 md:flex-none h-11 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-100"
                : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10"
            }`}
          >
            <Plus size={18} />
            <span>Thêm Phim Mới</span>
          </Link>
        </div>
      </div>

      {/* 📋 3. Desktop Table View (>= 768px) */}
      <div
        className={`hidden md:block rounded-3xl border overflow-hidden ${
          isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200 shadow-sm"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className={`border-b font-bold text-xs uppercase tracking-wider ${
                  isDark
                    ? "border-zinc-800 bg-[#0d0e14] text-zinc-400"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                <th className="py-4 px-5">Phim</th>
                <th className="py-4 px-4">Thể loại</th>
                <th className="py-4 px-4">Tình trạng</th>
                <th className="py-4 px-4">Server & Tập</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-zinc-800/70" : "divide-zinc-100"}`}>
              {loading && movies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={22} className="animate-spin text-zinc-400" />
                      <span>Đang tải danh sách phim...</span>
                    </div>
                  </td>
                </tr>
              ) : movies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-400 text-sm">
                    Không tìm thấy phim nào.
                  </td>
                </tr>
              ) : (
                movies.map((movie) => (
                  <tr
                    key={movie._id}
                    className={`transition-colors ${
                      isDark ? "hover:bg-zinc-800/40" : "hover:bg-zinc-50"
                    }`}
                  >
                    {/* Movie Poster & Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-15 rounded-xl overflow-hidden shrink-0 border relative ${
                          isDark ? "bg-zinc-800 border-zinc-700/80" : "bg-zinc-100 border-zinc-200"
                        }`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cdnImage(movie.thumb_url || movie.poster_url || "", 96)}
                            alt={movie.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 max-w-sm">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/nhanconan/movies/${movie.slug}`}
                              className={`font-bold text-sm hover:underline truncate ${
                                isDark ? "text-zinc-100 hover:text-white" : "text-zinc-900 hover:text-zinc-950"
                              }`}
                            >
                              {movie.name}
                            </Link>
                            {movie.is_manual && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                Admin Up
                              </span>
                            )}
                          </div>
                          <div className={`text-xs truncate mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            {movie.origin_name || movie.slug}
                          </div>
                          <div className={`text-[11px] font-mono truncate mt-0.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                            /{movie.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Year */}
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        isDark ? "bg-zinc-800/90 text-zinc-300 border-zinc-700/80" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                      }`}>
                        {movie.type === "hoathinh" ? "Hoạt hình" : movie.type === "series" ? "Phim bộ" : movie.type === "single" ? "Phim lẻ" : movie.type || "Khác"}
                      </span>
                      <div className={`text-xs mt-1 font-mono ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        {movie.year || "—"}
                      </div>
                    </td>

                    {/* Status & Quality */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                          {movie.episode_current || "Full"}
                        </span>
                        <span className={`text-[11px] font-mono ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          {movie.quality || "HD"} • {movie.lang || "Vietsub"}
                        </span>
                      </div>
                    </td>

                    {/* Servers & Episodes */}
                    <td className="py-4 px-4">
                      <div className={`flex items-center gap-2 text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        <span className="flex items-center gap-1">
                          <Server size={13} className={isDark ? "text-zinc-400" : "text-zinc-500"} />
                          {movie.serversCount || 0} server
                        </span>
                        <span>•</span>
                        <span>{movie.episodesCount || 0} tập</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/nhanconan/movies/${movie.slug}`}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                          }`}
                          title="Chỉnh sửa phim & tập"
                        >
                          <Edit size={16} />
                        </Link>
                        <a
                          href={`/phim/${movie.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                          }`}
                          title="Xem trên website"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => handleDeleteMovie(movie.slug, movie.name)}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                          }`}
                          title="Xóa phim"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-between ${
            isDark
              ? "border-zinc-800 bg-[#0d0e14] text-zinc-400"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          <div className="text-sm">
            Hiển thị <strong>{movies.length}</strong> / <strong>{total.toLocaleString()}</strong> phim (Trang {currentPage} / {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMovies(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className={`h-10 px-3.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 border ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-xs"
              }`}
            >
              <ChevronLeft size={16} />
              <span>Trước</span>
            </button>
            <span className={`text-sm font-mono font-bold px-3 py-1.5 rounded-xl border ${
              isDark ? "bg-zinc-800/90 border-zinc-700 text-zinc-200" : "bg-zinc-100 border-zinc-200 text-zinc-800"
            }`}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => fetchMovies(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className={`h-10 px-3.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 border ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-xs"
              }`}
            >
              <span>Sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 📱 4. Mobile Cards View (< 768px) */}
      <div className="md:hidden space-y-3.5">
        {loading && movies.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            <RefreshCw size={22} className="animate-spin text-zinc-400 mx-auto mb-2" />
            <span>Đang tải kho phim...</span>
          </div>
        ) : movies.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            Không tìm thấy phim nào.
          </div>
        ) : (
          movies.map((movie) => (
            <div
              key={`mobile-${movie._id}`}
              className={`p-4 rounded-3xl border space-y-3.5 transition-all ${
                isDark
                  ? "bg-[#11131a] border-zinc-800/80 shadow-lg"
                  : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              {/* Card Top: Poster + Name */}
              <div className="flex gap-3.5 items-start">
                <div className={`w-13 h-18 rounded-2xl overflow-hidden shrink-0 border relative ${
                  isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cdnImage(movie.thumb_url || movie.poster_url || "", 128)}
                    alt={movie.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/nhanconan/movies/${movie.slug}`}
                      className={`font-bold text-sm truncate ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
                    >
                      {movie.name}
                    </Link>
                  </div>
                  <div className={`text-xs truncate mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    {movie.origin_name || movie.slug}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                    }`}>
                      {movie.year || "—"}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                      {movie.episode_current || "Full"}
                    </span>
                    {movie.is_manual && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                        Admin Up
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Meta */}
              <div className={`flex items-center justify-between text-xs px-3.5 py-2 rounded-xl border ${
                isDark ? "bg-zinc-950/70 border-zinc-800/80 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"
              }`}>
                <span className="flex items-center gap-1">
                  <Server size={13} className={isDark ? "text-zinc-400" : "text-zinc-500"} />
                  {movie.serversCount || 0} server
                </span>
                <span>•</span>
                <span>{movie.episodesCount || 0} tập</span>
                <span>•</span>
                <span className={`font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{movie.quality || "HD"}</span>
              </div>

              {/* Card Bottom Actions */}
              <div className={`grid grid-cols-3 gap-2 pt-1 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                <Link
                  href={`/nhanconan/movies/${movie.slug}`}
                  className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    isDark ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                >
                  <Edit size={15} />
                  <span>Sửa</span>
                </Link>

                <a
                  href={`/phim/${movie.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`h-10 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    isDark ? "border-zinc-700 bg-zinc-900 text-zinc-200" : "border-zinc-200 bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <ExternalLink size={15} />
                  <span>Xem</span>
                </a>

                <button
                  onClick={() => handleDeleteMovie(movie.slug, movie.name)}
                  className="h-10 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/25 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Trash2 size={15} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between ${
            isDark ? "bg-[#11131a] border-zinc-800" : "bg-white border-zinc-200"
          }`}
        >
          <button
            onClick={() => fetchMovies(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className={`h-10 px-4 rounded-xl text-xs font-bold disabled:opacity-30 border flex items-center gap-1 ${
              isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-zinc-100 text-zinc-800 border-zinc-200"
            }`}
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>
          <span className={`text-xs font-mono font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => fetchMovies(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className={`h-10 px-4 rounded-xl text-xs font-bold disabled:opacity-30 border flex items-center gap-1 ${
              isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-zinc-100 text-zinc-800 border-zinc-200"
            }`}
          >
            <span>Sau</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
