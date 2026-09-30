"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  Star,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Search,
  ExternalLink,
  Edit,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { cdnImage } from "@/lib/image";
import { useAdminTheme } from "../context/AdminThemeContext";

interface MovieItem {
  _id: string;
  name: string;
  slug: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  type?: string;
  year?: number;
  quality?: string;
  lang?: string;
  episode_current?: string;
  is_manual?: boolean;
}

export default function FeaturedHeroManager() {
  const { isDark } = useAdminTheme();
  const [activeTab, setActiveTab] = useState<"hero" | "featured">("hero");

  // Hero Slider state
  const [heroSlugs, setHeroSlugs] = useState<string[]>([]);
  const [heroMovies, setHeroMovies] = useState<MovieItem[]>([]);
  const [heroFallbackMovies, setHeroFallbackMovies] = useState<MovieItem[]>([]);
  const [heroLoading, setHeroLoading] = useState(false);

  // Featured Section state
  const [featuredSlugs, setFeaturedSlugs] = useState<string[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<MovieItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Quick Search & Pick Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchHeroMovies = useCallback(async () => {
    try {
      setHeroLoading(true);
      const res = await fetch("/api/admin/hero-movies");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setHeroSlugs(data.slugs || []);
        setHeroMovies(data.movies || []);
        setHeroFallbackMovies(data.fallbackMovies || []);
      }
    } catch {
      // ignore
    } finally {
      setHeroLoading(false);
    }
  }, []);

  const fetchFeaturedMovies = useCallback(async () => {
    try {
      setFeaturedLoading(true);
      const res = await fetch("/api/admin/featured-movies");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setFeaturedSlugs(data.slugs || []);
        setFeaturedMovies(data.movies || []);
      }
    } catch {
      // ignore
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeroMovies();
    fetchFeaturedMovies();
  }, [fetchHeroMovies, fetchFeaturedMovies]);

  // Handle Search for quick movie selection
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/movies?q=${encodeURIComponent(searchQuery.trim())}&limit=6`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.movies || []);
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Hero Actions ---
  const handleAddHeroSlug = async (slugToAdd?: string) => {
    const clean = (slugToAdd || searchQuery).trim().toLowerCase();
    if (!clean) return;

    if (heroSlugs.length >= 6 && !heroSlugs.includes(clean)) {
      alert("Hero Banner tối đa 6 phim. Vui lòng gỡ bớt 1 phim trước khi ghim phim mới!");
      return;
    }

    try {
      const res = await fetch("/api/admin/hero-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", slug: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Không thể ghim vào Hero Slider");
        return;
      }
      setSearchQuery("");
      setSearchResults([]);
      showToast(`✓ Đã ghim thành công "${clean}" vào Hero Banner Slider!`);
      fetchHeroMovies();
    } catch {
      alert("Lỗi khi thêm phim vào Hero");
    }
  };

  const handleRemoveHeroSlug = async (slug: string) => {
    try {
      const res = await fetch("/api/admin/hero-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", slug }),
      });
      if (res.ok) {
        showToast(`Đã bỏ ghim phim "${slug}" khỏi Hero.`);
        fetchHeroMovies();
      }
    } catch {
      alert("Lỗi khi xóa slug khỏi Hero");
    }
  };

  const handleMoveHero = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= heroSlugs.length) return;

    const newSlugs = [...heroSlugs];
    const temp = newSlugs[index];
    newSlugs[index] = newSlugs[targetIdx];
    newSlugs[targetIdx] = temp;

    setHeroSlugs(newSlugs);

    try {
      await fetch("/api/admin/hero-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", slugs: newSlugs }),
      });
      fetchHeroMovies();
    } catch {
      fetchHeroMovies();
    }
  };

  // --- Featured Actions ---
  const handleAddFeaturedSlug = async (slugToAdd?: string) => {
    const clean = (slugToAdd || searchQuery).trim().toLowerCase();
    if (!clean) return;

    try {
      const res = await fetch("/api/admin/featured-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", slug: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Không thể thêm vào Phim Admin Upload");
        return;
      }
      setSearchQuery("");
      setSearchResults([]);
      showToast(`✓ Đã thêm thành công "${clean}" vào Phim Admin Upload!`);
      fetchFeaturedMovies();
    } catch {
      alert("Lỗi khi thêm phim");
    }
  };

  const handleRemoveFeaturedSlug = async (slug: string) => {
    try {
      const res = await fetch("/api/admin/featured-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", slug }),
      });
      if (res.ok) {
        showToast(`Đã bỏ ghim phim "${slug}".`);
        fetchFeaturedMovies();
      }
    } catch {
      alert("Lỗi khi xóa phim");
    }
  };

  const handleMoveFeatured = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= featuredSlugs.length) return;

    const newSlugs = [...featuredSlugs];
    const temp = newSlugs[index];
    newSlugs[index] = newSlugs[targetIdx];
    newSlugs[targetIdx] = temp;

    setFeaturedSlugs(newSlugs);

    try {
      await fetch("/api/admin/featured-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", slugs: newSlugs }),
      });
      fetchFeaturedMovies();
    } catch {
      fetchFeaturedMovies();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-600 text-white px-5 py-3 shadow-2xl backdrop-blur-md font-bold text-sm border border-emerald-500">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 🌟 1. Header Banner */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border transition-all ${
          isDark
            ? "bg-[#11131a] border-zinc-800/80 shadow-xl"
            : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 border ${
              isDark ? "bg-zinc-800 border-zinc-700 text-amber-400" : "bg-zinc-900 border-zinc-800 text-amber-400"
            }`}>
              <Crown size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1
                  className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                    isDark ? "text-zinc-100" : "text-zinc-900"
                  }`}
                >
                  Quản Lý Ghim Hero & Trang Chủ
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                  isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
                }`}>
                  Featured
                </span>
              </div>
              <p
                className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                  isDark ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                Cấu hình 6 phim xuất hiện trên thanh trượt <strong>Hero Banner Slider</strong> và danh sách nổi bật <strong>Phim Admin Upload</strong> tại Trang chủ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className={`h-11 px-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                  : "bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200"
              }`}
            >
              <ExternalLink size={16} />
              <span>Xem Trang Chủ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 🧭 2. Tab Navigation & Fast Search Form */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border transition-all ${
          isDark
            ? "bg-[#11131a] border-zinc-800/80 shadow-xl"
            : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          {/* Segmented Control */}
          <div className={`inline-flex p-1.5 rounded-2xl border ${
            isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
          }`}>
            <button
              onClick={() => setActiveTab("hero")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
                activeTab === "hero"
                  ? isDark
                    ? "bg-white text-zinc-950 shadow-md"
                    : "bg-zinc-900 text-white shadow-md"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Crown size={16} className={activeTab === "hero" ? (isDark ? "text-zinc-950" : "text-white") : "text-amber-400"} />
              <span>1. Hero Banner Slider</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold leading-none ${
                  activeTab === "hero"
                    ? isDark ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-white"
                    : isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {heroSlugs.length}/6
              </span>
            </button>

            <button
              onClick={() => setActiveTab("featured")}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
                activeTab === "featured"
                  ? isDark
                    ? "bg-amber-400 text-zinc-950 shadow-md"
                    : "bg-amber-500 text-zinc-950 shadow-md"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Star size={16} className={activeTab === "featured" ? "fill-zinc-950 text-zinc-950" : "text-amber-500"} />
              <span>2. Phim Admin Upload</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold leading-none ${
                  activeTab === "featured"
                    ? "bg-zinc-950/20 text-zinc-950"
                    : isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {featuredSlugs.length}
              </span>
            </button>
          </div>

          {/* Quick Search & Pick or Input Slug */}
          <div className="relative flex-1 max-w-lg">
            <div className="relative">
              <Search
                className={`absolute left-3.5 top-3.5 ${
                  isDark ? "text-zinc-400" : "text-zinc-500"
                }`}
                size={17}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên phim để ghim nhanh hoặc nhập slug..."
                className={`w-full h-11 border rounded-2xl pl-11 pr-10 text-xs sm:text-sm outline-none transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:bg-white"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Live Search Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-12 z-50 p-2 rounded-2xl border shadow-2xl backdrop-blur-2xl divide-y ${
                  isDark
                    ? "bg-[#11131a]/95 border-zinc-800 divide-zinc-800 text-zinc-100"
                    : "bg-white/98 border-zinc-200 divide-zinc-100 text-zinc-900"
                }`}
              >
                {searchResults.map((m) => (
                  <div
                    key={m._id}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                      isDark ? "hover:bg-zinc-800/60" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-12 rounded-lg overflow-hidden shrink-0 border ${
                        isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                      }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cdnImage(m.thumb_url || m.poster_url || "", 64)}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm truncate">{m.name}</div>
                        <div className={`text-[11px] font-mono truncate ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{m.slug}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (activeTab === "hero") handleAddHeroSlug(m.slug);
                        else handleAddFeaturedSlug(m.slug);
                      }}
                      className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all ${
                        activeTab === "hero"
                          ? isDark
                            ? "bg-white text-zinc-950 hover:bg-zinc-100 shadow-sm"
                            : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm"
                          : "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-sm"
                      }`}
                    >
                      <Plus size={14} />
                      <span>{activeTab === "hero" ? "Ghim Hero" : "Ghim Admin"}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 👑 TAB 1: HERO BANNER SLIDER */}
        {activeTab === "hero" && (
          <div className="mt-6 space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border text-xs sm:text-sm ${
              isDark
                ? "bg-zinc-900/60 border-zinc-800 text-zinc-300"
                : "bg-zinc-50 border-zinc-200 text-zinc-700"
            }`}>
              <div className="flex items-center gap-2.5">
                <HelpCircle size={18} className={isDark ? "text-zinc-400" : "text-zinc-500"} />
                <span>
                  Slider trang chủ yêu cầu hiển thị đủ <strong>6 phim</strong>. Bạn đang ghim cố định <strong>{heroSlugs.length}/6 phim</strong>. {heroSlugs.length < 6 ? `(${6 - heroSlugs.length} vị trí còn lại sẽ tự động lấy phim Anime mới từ KKPhim bù vào).` : "(Đã đủ 6 phim ghim thủ công)."}
                </span>
              </div>
            </div>

            {heroLoading && heroMovies.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-400">
                <RefreshCw size={22} className="animate-spin text-zinc-400 mx-auto mb-2" />
                <span>Đang tải danh sách Hero Slider...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Admin Pinned Movies */}
                {heroSlugs.map((slug, idx) => {
                  const movie = heroMovies.find((m) => m.slug === slug);
                  return (
                    <div
                      key={`hero-${slug}`}
                      className={`p-4 rounded-3xl border flex flex-col justify-between gap-3.5 transition-all relative overflow-hidden ${
                        isDark
                          ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700 shadow-lg"
                          : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                          isDark
                            ? "bg-zinc-800/90 text-zinc-200 border-zinc-700"
                            : "bg-zinc-100 text-zinc-800 border-zinc-200"
                        }`}>
                          👑 Slot #{idx + 1} • Admin Ghim
                        </span>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/nhanconan/movies/${slug}`}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                            }`}
                            title="Chỉnh sửa phim"
                          >
                            <Edit size={16} />
                          </Link>
                          <a
                            href={`/phim/${slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                            }`}
                            title="Xem trên Web"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveHeroSlug(slug)}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                            }`}
                            title="Bỏ ghim khỏi Hero"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Movie Card Center Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-16 h-22 rounded-2xl overflow-hidden shrink-0 border relative ${
                          isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                        }`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cdnImage(movie?.thumb_url || movie?.poster_url || "", 128)}
                            alt={movie?.name || slug}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-bold text-sm sm:text-base line-clamp-1 ${
                              isDark ? "text-zinc-100" : "text-zinc-900"
                            }`}
                          >
                            {movie?.name || slug}
                          </h3>
                          <div className={`text-xs font-mono font-semibold truncate mt-0.5 ${
                            isDark ? "text-zinc-400" : "text-zinc-500"
                          }`}>
                            {slug}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                              {movie?.year || "—"} • {movie?.episode_current || "Full"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Reorder Controls */}
                      <div className={`flex items-center justify-between pt-2.5 border-t ${
                        isDark ? "border-zinc-800" : "border-zinc-100"
                      }`}>
                        <span className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          Thứ tự hiển thị:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveHero(idx, -1)}
                            disabled={idx === 0}
                            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-20 ${
                              isDark
                                ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                            }`}
                          >
                            <ArrowUp size={14} />
                            <span>Lên</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveHero(idx, 1)}
                            disabled={idx === heroSlugs.length - 1}
                            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-20 ${
                              isDark
                                ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                            }`}
                          >
                            <span>Xuống</span>
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Fallback Movies from KKPhim */}
                {heroFallbackMovies.slice(0, Math.max(0, 6 - heroSlugs.length)).map((fbMovie, fbIdx) => {
                  const currentSlot = heroSlugs.length + fbIdx + 1;
                  return (
                    <div
                      key={`fb-${fbMovie.slug}`}
                      className={`p-4 rounded-3xl border border-dashed flex flex-col justify-between gap-3.5 transition-all ${
                        isDark
                          ? "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"
                          : "bg-zinc-50/50 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                          isDark ? "bg-zinc-900 text-zinc-400 border-zinc-800" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}>
                          Slot #{currentSlot} • Fallback Tự Động
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddHeroSlug(fbMovie.slug)}
                          className={`h-8 px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                            isDark
                              ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700"
                              : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border-zinc-200"
                          }`}
                          title="Ghim cố định phim này"
                        >
                          <Crown size={13} />
                          <span>Ghim cố định</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-16 h-22 rounded-2xl overflow-hidden shrink-0 border relative ${
                          isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                        }`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cdnImage(fbMovie.thumb_url || fbMovie.poster_url || "", 128)}
                            alt={fbMovie.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-bold text-sm sm:text-base line-clamp-1 ${
                              isDark ? "text-zinc-300" : "text-zinc-800"
                            }`}
                          >
                            {fbMovie.name}
                          </h3>
                          <div className={`text-xs font-mono truncate mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            {fbMovie.slug}
                          </div>
                          <div className={`text-[11px] mt-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            {fbMovie.year || "—"} • {fbMovie.episode_current || "Full"}
                          </div>
                        </div>
                      </div>

                      <div className={`text-xs text-right pt-2 border-t ${isDark ? "border-zinc-800 text-zinc-500" : "border-zinc-200 text-zinc-400"}`}>
                        Nguồn: Anime mới nhất từ KKPhim
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ⭐ TAB 2: PHIM ADMIN UPLOAD (FEATURED SECTION) */}
        {activeTab === "featured" && (
          <div className="mt-6 space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border text-xs sm:text-sm ${
              isDark
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}>
              <div className="flex items-center gap-2.5">
                <Star size={18} className="fill-amber-400 text-amber-400 shrink-0" />
                <span>
                  Các phim trong danh sách này sẽ hiển thị ưu tiên tại section <strong>&quot;Phim Admin Upload&quot;</strong> trên trang chủ.
                </span>
              </div>
            </div>

            {featuredLoading && featuredMovies.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-400">
                <RefreshCw size={22} className="animate-spin text-amber-500 mx-auto mb-2" />
                <span>Đang tải danh sách phim ghim...</span>
              </div>
            ) : featuredSlugs.length === 0 ? (
              <div className={`py-16 text-center text-sm italic ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Chưa có phim nào trong danh sách. Hãy dùng ô tìm kiếm ở trên để thêm phim!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {featuredSlugs.map((slug, idx) => {
                  const movie = featuredMovies.find((m) => m.slug === slug);
                  return (
                    <div
                      key={`feat-${slug}`}
                      className={`p-4 rounded-3xl border flex flex-col justify-between gap-3.5 transition-all ${
                        isDark
                          ? "bg-[#11131a] border-zinc-800/80 hover:border-amber-500/50 shadow-lg"
                          : "bg-white border-zinc-200/90 hover:border-amber-300 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                          ⭐ Thứ tự #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/nhanconan/movies/${slug}`}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                            }`}
                            title="Chỉnh sửa phim"
                          >
                            <Edit size={16} />
                          </Link>
                          <a
                            href={`/phim/${slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                            }`}
                            title="Xem trên Web"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeaturedSlug(slug)}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                            }`}
                            title="Bỏ ghim"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-14 h-20 rounded-2xl overflow-hidden shrink-0 border relative ${
                          isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                        }`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cdnImage(movie?.thumb_url || movie?.poster_url || "", 128)}
                            alt={movie?.name || slug}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-bold text-sm line-clamp-1 ${
                              isDark ? "text-zinc-100" : "text-zinc-900"
                            }`}
                          >
                            {movie?.name || slug}
                          </h3>
                          <div className="text-xs font-mono text-amber-500 dark:text-amber-400 truncate mt-0.5">
                            {slug}
                          </div>
                          <div className={`text-[11px] mt-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            {movie?.year || "—"} • {movie?.episode_current || "Full"}
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between pt-2.5 border-t ${
                        isDark ? "border-zinc-800" : "border-zinc-100"
                      }`}>
                        <span className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                          Thứ tự:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveFeatured(idx, -1)}
                            disabled={idx === 0}
                            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-20 ${
                              isDark
                                ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                            }`}
                          >
                            <ArrowUp size={14} />
                            <span>Lên</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFeatured(idx, 1)}
                            disabled={idx === featuredSlugs.length - 1}
                            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-20 ${
                              isDark
                                ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                            }`}
                          >
                            <span>Xuống</span>
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
