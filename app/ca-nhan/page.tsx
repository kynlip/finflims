"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Heart,
  History,
  LogOut,
  Camera,
  Play,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  Clock,
  Trash2,
  Loader2,
  ShieldCheck,
  Lock,
  Sparkles,
  Shield,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { changeUserPassword } from "@/app/actions/user-actions";

interface UserProfile {
  id: string;
  name?: string;
  username: string;
  email: string;
  role?: string;
  hasPassword?: boolean;
  authProvider?: "credentials" | "google";
  avatar?: string;
  createdAt?: string;
  favoritesCount?: number;
  watchHistoryCount?: number;
  linh_thach?: number;
  adFreeUntil?: string | null;
  isAdFree?: boolean;
}

interface MovieItemPreview {
  slug: string;
  name: string;
  thumb_url: string;
  episode?: string;
  addedAt?: string;
  watchedAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { status } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"favorites" | "history" | "security">("favorites");

  const [favorites, setFavorites] = useState<MovieItemPreview[]>([]);
  const [history, setHistory] = useState<MovieItemPreview[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [deletingHistorySlug, setDeletingHistorySlug] = useState<string | null>(null);
  const [deletingFavSlug, setDeletingFavSlug] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isLoggedIn = status === "authenticated";
  const canChangePassword = Boolean(
    user?.hasPassword && user.authProvider !== "google",
  );

  const fetchProfileAndLists = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTabLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const favRes = await fetch("/api/user/favorites", { cache: "no-store" });
      if (favRes.ok) {
        const favData = await favRes.json();
        setFavorites(Array.isArray(favData) ? favData : favData.favorites || []);
      }
      const histRes = await fetch("/api/user/history", { cache: "no-store" });
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(Array.isArray(histData) ? histData : histData.history || []);
      }
    } catch (err) {
      console.error("Failed to load user lists:", err);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchProfileAndLists();
    fetchTabLists();
  }, [status, isLoggedIn, fetchProfileAndLists, fetchTabLists]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showToast("Vui lòng chọn ảnh định dạng hợp lệ dưới 5MB", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUser((prev) => (prev ? { ...prev, avatar: data.avatarUrl } : null));
        showToast("Cập nhật ảnh đại diện thành công!");
      } else {
        const err = await res.json();
        showToast(err.error || "Không thể tải ảnh lên", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi tải ảnh lên", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, slug: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    const prevHist = [...history];
    setHistory((prev) => prev.filter((item) => item.slug !== slug));
    setDeletingHistorySlug(slug);

    try {
      const res = await fetch(`/api/user/history?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      showToast(`Đã xóa "${name}" khỏi lịch sử`);
      if (user) {
        setUser((prev) => (prev ? { ...prev, watchHistoryCount: Math.max(0, (prev.watchHistoryCount || 1) - 1) } : null));
      }
    } catch {
      setHistory(prevHist);
      showToast("Lỗi khi xóa lịch sử", "error");
    } finally {
      setDeletingHistorySlug(null);
    }
  };

  const handleToggleFavoriteItem = async (e: React.MouseEvent, slug: string, name: string, thumb_url: string) => {
    e.preventDefault();
    e.stopPropagation();

    const prevFavs = [...favorites];
    setFavorites((prev) => prev.filter((item) => item.slug !== slug));
    setDeletingFavSlug(slug);

    try {
      const res = await fetch("/api/user/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieSlug: slug, movieName: name, movieThumb: thumb_url }),
      });
      if (!res.ok) throw new Error("Thao tác thất bại");
      showToast(`Đã bỏ "${name}" khỏi yêu thích`);
      if (user) {
        setUser((prev) => (prev ? { ...prev, favoritesCount: Math.max(0, (prev.favoritesCount || 1) - 1) } : null));
      }
    } catch {
      setFavorites(prevFavs);
      showToast("Lỗi khi cập nhật yêu thích", "error");
    } finally {
      setDeletingFavSlug(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Mật khẩu xác nhận không trùng khớp" });
      return;
    }

    setPwSubmitting(true);
    try {
      const result = await changeUserPassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });

      if (result.error) {
        setPwMessage({ type: "error", text: result.error });
      } else {
        setPwMessage({ type: "success", text: result.message || "Đổi mật khẩu thành công!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (user) setUser({ ...user, hasPassword: true });
        showToast("Đổi mật khẩu thành công!");
      }
    } catch {
      setPwMessage({ type: "error", text: "Đã có lỗi xảy ra khi đổi mật khẩu" });
    } finally {
      setPwSubmitting(false);
    }
  };

  const formatWatchedTime = (dateStr?: string) => {
    if (!dateStr) return "";
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

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-zinc-400 bg-[#0a0c10]">
        <Loader2 size={24} className="animate-spin text-zinc-300" />
        <span className="text-xs font-mono">Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-20 bg-[#0a0c10]">
        <div className="w-full max-w-md p-7 rounded-3xl border border-zinc-800/80 bg-[#11131a] text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-100 shadow-inner">
            <User size={26} />
          </div>
          <h2 className="text-lg font-extrabold text-zinc-100 mb-1.5">Tài Khoản Chưa Đăng Nhập</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Vui lòng đăng nhập để lưu phim yêu thích, tiếp tục xem phim từ lịch sử và quản lý gói VIP.
          </p>
          <button
            onClick={() => {
              const loginBtn = document.querySelector("[data-login-trigger]") as HTMLElement;
              if (loginBtn) loginBtn.click();
              else router.push("/?auth=login");
            }}
            className="w-full py-3 rounded-2xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-md"
          >
            Đăng Nhập Ngay
          </button>
        </div>
      </div>
    );
  }

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
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-300 shadow-sm shrink-0">
              <User size={26} />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
                  Hồ Sơ & Tài Khoản
                </h1>
                <span
                  className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-wider border ${
                    user?.role === "admin"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300"
                  }`}
                >
                  {user?.role === "admin" ? "Quản Trị Viên" : "Thành Viên"}
                </span>

                {user?.isAdFree && (
                  <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck size={16} />
                    <span>VIP Active</span>
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-zinc-400 mt-1.5 leading-relaxed">
                Quản lý thông tin tài khoản, danh sách phim yêu thích, lịch sử xem và gói VIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/recharge"
              className="px-6 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 flex-1 sm:flex-none"
            >
              <Wallet size={18} />
              <span>Nạp Coin VIP</span>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 text-zinc-300 hover:text-rose-300 transition-all flex items-center justify-center gap-2"
              title="Đăng xuất"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* LEFT COLUMN: User Card & Navigation */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-md flex flex-col items-center text-center">
              {/* Avatar Box */}
              <div className="relative group mb-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 shadow-xl flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-zinc-100">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name || "User Avatar"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 p-2.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 border-2 border-zinc-900 shadow-lg transition-all active:scale-95"
                  title="Thay đổi ảnh đại diện"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* User Identity */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100">
                {user?.name || "Người dùng"}
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 font-mono mt-1.5">
                {user?.email}
              </p>

              {/* VIP Status Card */}
              <div className="w-full mt-6 p-4.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${user?.isAdFree ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-amber-500/15 text-amber-400 border border-amber-500/25"}`}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-zinc-400 uppercase tracking-wider">Trạng thái VIP</p>
                    <p className="text-base sm:text-lg font-black text-zinc-100 mt-0.5">
                      {user?.isAdFree ? "VIP Đang Kích Hoạt" : "Thành viên Free"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/recharge"
                  className="text-sm font-black text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {user?.isAdFree ? "Gia hạn →" : "Nâng cấp →"}
                </Link>
              </div>

              {/* Stats Counters Grid */}
              <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-6 border-t border-zinc-800">
                <Link
                  href="/yeu-thich"
                  className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-rose-500/40 hover:bg-zinc-900 text-center transition-all group"
                  title="Mở trang Phim Yêu Thích riêng"
                >
                  <p className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono group-hover:text-rose-400 transition-colors">{favorites.length}</p>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 flex items-center justify-center gap-1.5 font-bold group-hover:text-rose-400 transition-colors">
                    <Heart size={14} className="text-rose-400" />
                    <span>Yêu thích</span>
                  </p>
                </Link>

                <Link
                  href="/lich-su"
                  className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-cyan-500/40 hover:bg-zinc-900 text-center transition-all group"
                  title="Mở trang Lịch Sử Xem Phim riêng"
                >
                  <p className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono group-hover:text-cyan-400 transition-colors">{history.length}</p>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 flex items-center justify-center gap-1.5 font-bold group-hover:text-cyan-400 transition-colors">
                    <History size={14} className="text-cyan-400" />
                    <span>Lịch sử</span>
                  </p>
                </Link>

                <Link
                  href="/recharge"
                  className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/40 hover:bg-zinc-900 text-center transition-all group"
                  title="Mở trang Nạp Coin & VIP"
                >
                  <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{user?.linh_thach || 0}</p>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 flex items-center justify-center gap-1.5 font-bold group-hover:text-amber-400 transition-colors">
                    <Wallet size={14} className="text-amber-400" />
                    <span>Linh Thạch</span>
                  </p>
                </Link>
              </div>

              {/* Quick Links */}
              <div className="w-full mt-6 space-y-3 border-t border-zinc-800 pt-6">
                <Link
                  href="/recharge"
                  className="w-full py-3.5 px-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-sm sm:text-base font-extrabold text-zinc-200 flex items-center justify-center gap-2.5 transition-all shadow-sm"
                >
                  <Wallet size={18} className="text-amber-400" />
                  <span>Quản Lý Nạp Coin & VIP</span>
                </Link>

                {user?.role === "admin" && (
                  <Link
                    href="/nhanconan"
                    className="w-full py-3.5 px-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 text-sm sm:text-base font-extrabold text-amber-300 flex items-center justify-center gap-2.5 transition-all shadow-sm"
                  >
                    <Shield size={18} />
                    <span>Trang Quản Trị Admin</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Tab Navigation & Content */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Pill Tab Switcher - Match Admin Style */}
            <div className="inline-flex max-w-full overflow-x-auto p-1 rounded-2xl border bg-zinc-950 border-zinc-800 w-full sm:w-auto scrollbar-none">
              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-base font-extrabold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  activeTab === "favorites"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <Heart size={15} className={activeTab === "favorites" ? "fill-zinc-950 text-zinc-950" : ""} />
                <span>Yêu Thích ({favorites.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-base font-extrabold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  activeTab === "history"
                    ? "bg-white text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <History size={15} />
                <span>Lịch Sử ({history.length})</span>
              </button>

              {canChangePassword && (
                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-base font-extrabold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    activeTab === "security"
                      ? "bg-white text-zinc-950 shadow-md"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <KeyRound size={15} />
                  <span>Đổi Mật Khẩu</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT: FAVORITES */}
            {activeTab === "favorites" && (
              <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-md min-h-[400px]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <Heart size={20} className="text-rose-400" />
                    <h3 className="font-extrabold text-lg sm:text-xl uppercase tracking-wider text-zinc-100">
                      Danh Sách Yêu Thích
                    </h3>
                  </div>
                  <Link
                    href="/yeu-thich"
                    className="text-sm sm:text-base text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-bold transition-colors"
                  >
                    <span>Mở trang riêng</span>
                    <ExternalLink size={16} />
                  </Link>
                </div>

                {loadingLists ? (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 text-zinc-500">
                    <Loader2 size={26} className="animate-spin text-zinc-400" />
                    <span className="text-sm font-mono">Đang tải danh sách...</span>
                  </div>
                ) : favorites.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                    {favorites.map((item) => (
                      <div key={item.slug} className="group block w-full min-w-0">
                        <div className="border-primary/20 group-hover:border-primary/80 relative aspect-2/3 w-full overflow-hidden rounded-2xl border-2 bg-[#0d1424] transition-colors duration-300 shadow-sm">
                          <Image
                            src={item.thumb_url || "/opengraph-image.png"}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                          <button
                            onClick={(e) => handleToggleFavoriteItem(e, item.slug, item.name, item.thumb_url)}
                            disabled={deletingFavSlug === item.slug}
                            className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-xl bg-black/75 hover:bg-rose-600 text-white/90 flex items-center justify-center transition-colors border border-white/15 backdrop-blur-md"
                            title="Bỏ yêu thích"
                          >
                            {deletingFavSlug === item.slug ? (
                              <Loader2 size={14} className="animate-spin text-white" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>

                          <Link
                            href={`/phim/${item.slug}`}
                            className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF68] shadow-lg text-black hover:scale-110 transition-transform">
                              <Play size={18} className="ml-0.5 fill-black" />
                            </div>
                          </Link>
                        </div>

                        <div className="mt-2.5 min-h-[3.25rem] px-0.5 text-center">
                          <Link
                            href={`/phim/${item.slug}`}
                            className="group-hover:text-primary line-clamp-2 font-serif text-sm sm:text-base leading-tight font-bold text-zinc-100 transition-colors"
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                      <Heart size={28} />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-zinc-300 mb-5">Chưa có phim nào trong danh sách yêu thích.</p>
                    <Link
                      href="/"
                      className="px-6 py-3.5 rounded-2xl bg-white text-zinc-950 text-sm sm:text-base font-extrabold hover:bg-zinc-200 transition-all shadow-md active:scale-95"
                    >
                      Khám phá phim ngay
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: WATCH HISTORY */}
            {activeTab === "history" && (
              <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-md min-h-[400px]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <History size={20} className="text-cyan-400" />
                    <h3 className="font-extrabold text-lg sm:text-xl uppercase tracking-wider text-zinc-100">
                      Lịch Sử Xem Phim
                    </h3>
                  </div>
                  <Link
                    href="/lich-su"
                    className="text-sm sm:text-base text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-bold transition-colors"
                  >
                    <span>Mở trang riêng</span>
                    <ExternalLink size={16} />
                  </Link>
                </div>

                {loadingLists ? (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 text-zinc-500">
                    <Loader2 size={26} className="animate-spin text-zinc-400" />
                    <span className="text-sm font-mono">Đang tải danh sách...</span>
                  </div>
                ) : history.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
                    {history.map((item) => (
                      <div key={item.slug} className="group block w-full min-w-0">
                        <div className="border-primary/20 group-hover:border-primary/80 relative aspect-2/3 w-full overflow-hidden rounded-2xl border-2 bg-[#0d1424] transition-colors duration-300 shadow-sm">
                          <Image
                            src={item.thumb_url || "/opengraph-image.png"}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                          {item.episode && (
                            <div className="absolute top-2.5 right-2.5 z-10">
                              <span className="bg-primary/90 text-primary-foreground border-primary rounded-full border px-2.5 py-0.5 text-xs font-black tracking-wider uppercase shadow-sm">
                                {item.episode}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={(e) => handleDeleteHistoryItem(e, item.slug, item.name)}
                            disabled={deletingHistorySlug === item.slug}
                            className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-xl bg-black/75 hover:bg-rose-600 text-white/90 flex items-center justify-center transition-colors border border-white/15 backdrop-blur-md"
                            title="Xóa khỏi lịch sử"
                          >
                            {deletingHistorySlug === item.slug ? (
                              <Loader2 size={14} className="animate-spin text-white" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>

                          <Link
                            href={`/phim/${item.slug}`}
                            className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF68] shadow-lg text-black hover:scale-110 transition-transform">
                              <Play size={18} className="ml-0.5 fill-black" />
                            </div>
                          </Link>
                        </div>

                        <div className="mt-2.5 min-h-[3.5rem] px-0.5 text-center">
                          <Link
                            href={`/phim/${item.slug}`}
                            className="group-hover:text-primary line-clamp-2 font-serif text-sm sm:text-base leading-tight font-bold text-zinc-100 transition-colors"
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                          <span className="text-xs sm:text-sm text-zinc-400 font-mono mt-1 flex items-center justify-center gap-1.5">
                            <Clock size={13} className="text-cyan-400" />
                            <span>{formatWatchedTime(item.watchedAt)}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                      <History size={28} />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-zinc-300 mb-5">Chưa có lịch sử xem phim nào.</p>
                    <Link
                      href="/"
                      className="px-6 py-3.5 rounded-2xl bg-white text-zinc-950 text-sm sm:text-base font-extrabold hover:bg-zinc-200 transition-all shadow-md active:scale-95"
                    >
                      Xem phim ngay
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PASSWORD & SECURITY */}
            {activeTab === "security" && canChangePassword && (
              <div className="p-6 sm:p-7 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-md">
                <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-zinc-800">
                  <KeyRound size={18} className="text-amber-400" />
                  <h3 className="font-extrabold text-base sm:text-lg uppercase tracking-wider text-zinc-100">
                    Đổi Mật Khẩu Tài Khoản
                  </h3>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  {pwMessage && (
                    <div
                      className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 ${
                        pwMessage.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                      }`}
                    >
                      {pwMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      <span>{pwMessage.text}</span>
                    </div>
                  )}

                  {user?.hasPassword && (
                    <div>
                      <label className="text-sm font-bold text-zinc-200 mb-2 block">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại..."
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-all font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-zinc-200 mb-2 block">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự..."
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-zinc-200 mb-2 block">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-all font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-white text-zinc-950 font-extrabold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-5 active:scale-95 shadow-md"
                  >
                    {pwSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    <span>{pwSubmitting ? "Đang xử lý..." : "Cập Nhật Mật Khẩu"}</span>
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
