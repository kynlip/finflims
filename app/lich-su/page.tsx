"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Play,
  Trash2,
  ArrowLeft,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface HistoryItem {
  slug: string;
  name: string;
  thumb_url: string;
  episode?: string;
  watchedAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { status } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/history", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : data.history || []);
      }
    } catch {
      showToast("Không thể tải lịch sử xem phim", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/?auth=login");
      return;
    }
    fetchHistory();
  }, [status, router, fetchHistory]);

  const handleDeleteItem = async (e: React.MouseEvent, slug: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    const prevHistory = [...history];
    setHistory((prev) => prev.filter((item) => item.slug !== slug));
    setDeletingSlug(slug);

    try {
      const res = await fetch(`/api/user/history?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      showToast(`Đã xóa "${name}" khỏi lịch sử`);
    } catch {
      setHistory(prevHistory);
      showToast("Lỗi khi xóa phim, vui lòng thử lại", "error");
    } finally {
      setDeletingSlug(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem phim?")) return;

    setClearing(true);
    const prevHistory = [...history];
    setHistory([]);

    try {
      const res = await fetch("/api/user/history", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      showToast("Đã xóa toàn bộ lịch sử xem phim");
    } catch {
      setHistory(prevHistory);
      showToast("Lỗi khi xóa tất cả, vui lòng thử lại", "error");
    } finally {
      setClearing(false);
    }
  };

  const formatWatchedTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Vừa xem xong";
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return "Hôm qua";
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-zinc-100 pt-20 md:pt-24 pb-20 selection:bg-zinc-700">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5 rounded-2xl bg-zinc-900 text-zinc-100 px-4 py-3 shadow-2xl border border-zinc-800 text-xs font-medium backdrop-blur-md">
            {toast.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-6xl">
        {/* TOP HERO HEADER - Admin Style */}
        <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-xl flex flex-wrap items-center justify-between gap-5 mb-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/ca-nhan"
              className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 hover:text-white shadow-sm shrink-0 transition-all active:scale-95"
              title="Về trang cá nhân"
            >
              <ArrowLeft size={22} />
            </Link>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
                  Lịch Sử Xem Phim
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {history.length} phim đã lưu
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-400 mt-1.5 leading-relaxed">
                Tự động lưu giữ tiến độ và các tập phim bạn đã theo dõi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/ca-nhan"
              className="px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <User size={16} />
              <span>Trang Cá Nhân</span>
            </Link>

            {history.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/25 transition-all disabled:opacity-50"
              >
                {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>Xóa toàn bộ lịch sử</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-400 bg-[#11131a] rounded-3xl border border-zinc-800/80 p-8">
            <Loader2 size={26} className="animate-spin text-zinc-300" />
            <span className="text-sm font-mono">Đang tải lịch sử xem phim...</span>
          </div>
        ) : history.length > 0 ? (
          <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-md">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {history.map((item) => (
                <div key={item.slug} className="group block w-full min-w-0">
                  {/* Poster Box - Match Homepage MovieCard */}
                  <div className="border-primary/20 group-hover:border-primary/80 relative aspect-2/3 w-full overflow-hidden rounded-2xl border-2 bg-[#0d1424] transition-colors duration-300 shadow-sm">
                    <Image
                      src={item.thumb_url || "/opengraph-image.png"}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Episode Tag Top-Right */}
                    {item.episode && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="bg-primary/90 text-primary-foreground border-primary rounded-full border px-2.5 py-0.5 text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-sm">
                          {item.episode}
                        </span>
                      </div>
                    )}

                    {/* Delete Item Button Top-Left */}
                    <button
                      onClick={(e) => handleDeleteItem(e, item.slug, item.name)}
                      disabled={deletingSlug === item.slug}
                      className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-xl bg-black/75 hover:bg-rose-600 text-white/90 flex items-center justify-center transition-colors border border-white/15 backdrop-blur-md"
                      title="Xóa khỏi lịch sử"
                      aria-label={`Xóa ${item.name} khỏi lịch sử`}
                    >
                      {deletingSlug === item.slug ? (
                        <Loader2 size={14} className="animate-spin text-white" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>

                    {/* Play Overlay Center */}
                    <Link
                      href={`/phim/${item.slug}`}
                      className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF68] shadow-lg text-black hover:scale-110 transition-transform">
                        <Play size={18} className="ml-0.5 fill-black" />
                      </div>
                    </Link>
                  </div>

                  {/* Movie Title & Info - Outside & Below Poster */}
                  <div className="mt-2.5 min-h-[3.5rem] px-0.5 text-center">
                    <Link
                      href={`/phim/${item.slug}`}
                      className="group-hover:text-primary line-clamp-2 font-serif text-sm sm:text-base leading-tight font-bold text-zinc-100 transition-colors"
                      title={item.name}
                    >
                      {item.name}
                    </Link>

                    <div className="mt-1 text-xs text-zinc-400 flex items-center justify-center gap-1 font-mono">
                      <Clock size={12} className="text-cyan-400" />
                      <span>{formatWatchedTime(item.watchedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 sm:p-16 rounded-3xl border border-zinc-800/80 bg-[#11131a] text-center max-w-md mx-auto my-8 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-4">
              <Film size={26} />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-100 mb-2">
              Chưa Có Lịch Sử Xem
            </h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Bạn chưa xem bộ phim nào gần đây hoặc đã xóa toàn bộ lịch sử.
            </p>
            <Link
              href="/"
              className="inline-flex px-6 py-3 rounded-2xl bg-white text-zinc-950 font-extrabold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-md items-center gap-2"
            >
              <Sparkles size={16} />
              <span>Khám phá phim ngay</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
