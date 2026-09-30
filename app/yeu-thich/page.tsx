"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Play,
  Trash2,
  ArrowLeft,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  History,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface FavoriteItem {
  slug: string;
  name: string;
  thumb_url: string;
  addedAt: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/favorites", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : []);
      }
    } catch {
      showToast("Không thể tải danh sách yêu thích", "error");
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
    fetchFavorites();
  }, [status, router, fetchFavorites]);

  const handleRemoveFavorite = async (e: React.MouseEvent, slug: string, name: string, thumb_url: string) => {
    e.preventDefault();
    e.stopPropagation();

    const prevFavorites = [...favorites];
    setFavorites((prev) => prev.filter((item) => item.slug !== slug));
    setDeletingSlug(slug);

    try {
      const res = await fetch("/api/user/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieSlug: slug,
          movieName: name,
          movieThumb: thumb_url || "",
        }),
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      showToast(`Đã xóa "${name}" khỏi yêu thích`);
    } catch {
      setFavorites(prevFavorites);
      showToast("Lỗi khi bỏ yêu thích, vui lòng thử lại", "error");
    } finally {
      setDeletingSlug(null);
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
                  Phim Yêu Thích
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {favorites.length} phim đã lưu
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-400 mt-1.5 leading-relaxed">
                Danh sách những bộ phim hoạt hình bạn đã đánh dấu yêu thích
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

            <Link
              href="/lich-su"
              className="px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-cyan-400 hover:bg-zinc-800 transition-all"
            >
              <History size={16} />
              <span>Xem Lịch Sử</span>
            </Link>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-400 bg-[#11131a] rounded-3xl border border-zinc-800/80 p-8">
            <Loader2 size={26} className="animate-spin text-zinc-300" />
            <span className="text-sm font-mono">Đang tải danh sách yêu thích...</span>
          </div>
        ) : favorites.length > 0 ? (
          <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-md">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {favorites.map((item) => (
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

                    {/* Delete Item Button Top-Left */}
                    <button
                      onClick={(e) => handleRemoveFavorite(e, item.slug, item.name, item.thumb_url)}
                      disabled={deletingSlug === item.slug}
                      className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-xl bg-black/75 hover:bg-rose-600 text-white/90 flex items-center justify-center transition-colors border border-white/15 backdrop-blur-md"
                      title="Bỏ yêu thích"
                      aria-label={`Bỏ yêu thích ${item.name}`}
                    >
                      {deletingSlug === item.slug ? (
                        <Loader2 size={14} className="animate-spin text-white" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>

                    {/* Heart Badge Top-Right */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/90 text-white shadow-sm border border-white/15 backdrop-blur-md">
                        <Heart size={14} className="fill-white text-white" />
                      </div>
                    </div>

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

                    {item.addedAt && (
                      <div className="mt-1 text-xs text-zinc-400 flex items-center justify-center gap-1 font-mono">
                        <Heart size={10} className="text-rose-400 fill-rose-400" />
                        <span>Đã lưu {new Date(item.addedAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    )}
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
              Chưa Có Phim Yêu Thích
            </h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Bạn chưa thêm bộ phim nào vào danh sách yêu thích. Nhấn nút ❤️ trên trang chi tiết phim để lưu lại nhé!
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
