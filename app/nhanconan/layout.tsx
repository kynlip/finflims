"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  DownloadCloud,
  Clock,
  Download,
  Users,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Palette,
  Wallet,
  ExternalLink,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  HardDriveDownload,
  Megaphone,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { AdminThemeProvider, useAdminTheme } from "./context/AdminThemeContext";

const menuItems = [
  { href: "/nhanconan/khophim", label: "Quản lý kho phim & Tập", icon: Film },
  { href: "/nhanconan/featured", label: "Ghim Hero & Trang chủ", icon: Sparkles },
  { href: "/nhanconan/caophim", label: "Cào phim KKPhim", icon: DownloadCloud },
  { href: "/nhanconan/cron", label: "Auto Cronjob & Bot", icon: Clock },
  { href: "/nhanconan/nap-vip", label: "Nạp coin & VIP", icon: Wallet },
  { href: "/nhanconan/users", label: "Quản lý thành viên", icon: Users },
  { href: "/nhanconan/ads", label: "Quản lý quảng cáo", icon: Megaphone },
  { href: "/nhanconan/settings", label: "Logo & Cài đặt web", icon: Palette },
  { href: "/nhanconan/apps", label: "App Mobile", icon: Download },
  { href: "/nhanconan/backup", label: "Sao lưu & Khôi phục", icon: HardDriveDownload },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/nhanconan/khophim") {
    return (
      pathname === "/nhanconan" ||
      pathname === "/nhanconan/khophim" ||
      pathname.startsWith("/nhanconan/movies")
    );
  }
  return pathname === href || pathname.startsWith(href);
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDark, setIsDark, mounted } = useAdminTheme();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userEmail = session?.user?.email || "admin@hoathinh.tv";
  const userName = session?.user?.name || "Admin";
  const userInitial = (session?.user?.name || session?.user?.email || "A")[0].toUpperCase();

  const currentItem =
    menuItems.find((item) => isItemActive(pathname, item.href)) || {
      label: pathname.startsWith("/nhanconan/movies")
        ? "Chi tiết & Tập phim"
        : "Quản trị",
      icon: Film,
      href: "/nhanconan/khophim",
    };

  return (
    <div
      className={`h-dvh w-full font-sans transition-colors duration-200 overflow-hidden flex relative text-sm
        ${isDark ? "dark bg-[#0a0c10] text-zinc-100 selection:bg-zinc-700" : "bg-[#f8f9fc] text-zinc-900 selection:bg-zinc-200"}`}
    >
      {/* SIDEBAR - Modern Curved Capsule Style (Payflow Minimal Bento) */}
      <aside
        className={`hidden md:flex flex-col w-72 z-30 transition-all duration-200 border-r shrink-0 relative ${
          isDark
            ? "bg-[#11131a] border-zinc-800/80"
            : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div
          className={`h-20 flex items-center px-6 border-b shrink-0 ${
            isDark ? "border-zinc-800/80" : "border-zinc-100"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <Link
              href="/nhanconan"
              className="group flex min-w-0 items-center gap-3"
            >
              <div
                className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border transition-all duration-200 group-hover:scale-105 ${
                  isDark
                    ? "border-zinc-700/80 bg-zinc-900/90 shadow-inner"
                    : "border-zinc-200 bg-zinc-100 shadow-xs"
                }`}
              >
                <Image
                  src="/images/logo/logo-mark.svg"
                  alt="Phim Hay Hơn Rổ"
                  width={28}
                  height={28}
                  className="h-6 w-6 object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`truncate text-sm font-extrabold tracking-tight ${
                    isDark ? "text-zinc-100" : "text-zinc-900"
                  }`}
                >
                  Phim Hay Hơn Rổ
                </span>
                <span className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Hệ thống Quản trị
                </span>
              </div>
            </Link>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border leading-none shrink-0 ${
              isDark ? "bg-zinc-800/90 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
            }`}>
              v1.2
            </span>
          </div>
        </div>

        {/* Sidebar Menu Items */}
        <div className="flex-1 py-5 px-3.5 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div
            className={`px-3 mb-3 text-[11px] font-bold uppercase tracking-wider ${
              isDark ? "text-zinc-400" : "text-zinc-500"
            }`}
          >
            Chức Năng Chính
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all duration-150 text-sm ${
                  isActive
                    ? isDark
                      ? "bg-white text-zinc-950 font-bold shadow-md shadow-black/30"
                      : "bg-zinc-900 text-white font-bold shadow-md shadow-zinc-900/10"
                    : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 font-medium"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? isDark ? "text-zinc-950" : "text-white"
                        : isDark
                          ? "text-zinc-400"
                          : "text-zinc-500"
                    }
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-zinc-950" : "bg-white"}`} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Bottom User Profile Card */}
        <div
          className={`p-3.5 border-t ${
            isDark ? "border-zinc-800/80 bg-[#0d0f15]" : "border-zinc-100 bg-zinc-50/70"
          }`}
        >
          <div
            className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
              isDark
                ? "bg-[#141722] border-zinc-800 shadow-sm"
                : "bg-white border-zinc-200/90 shadow-sm"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
            }`}>
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold truncate ${
                    isDark ? "text-zinc-100" : "text-zinc-900"
                  }`}
                >
                  {userName}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/20 leading-none">
                  ADMIN
                </span>
              </div>
              <div
                className={`text-[11px] truncate mt-0.5 font-mono ${
                  isDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                {userEmail}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/nhanconan/login" })}
              className={`p-2 rounded-xl transition-all ${
                isDark
                  ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                  : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
              }`}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden h-full">
        {/* HEADER - Modern Minimal Glass Bar */}
        <header
          className={`h-16 shrink-0 flex items-center justify-between px-4 sm:px-8 z-20 transition-all border-b
          ${
            isDark
              ? "bg-[#11131a]/85 border-zinc-800/80 backdrop-blur-xl"
              : "bg-white/90 border-zinc-200/90 backdrop-blur-xl shadow-xs"
          }`}
        >
          {/* Left: Mobile menu toggle + Brand or Desktop Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 rounded-xl border transition-all md:hidden ${
                isDark
                  ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-100"
                  : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800 shadow-xs"
              }`}
              aria-label="Mở menu quản trị"
            >
              <Menu size={18} />
            </button>

            {/* Mobile Brand */}
            <div className="flex items-center gap-2.5 md:hidden">
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl border ${
                  isDark ? "border-zinc-700 bg-zinc-800" : "border-zinc-200 bg-zinc-100"
                }`}
              >
                <Image
                  src="/images/logo/logo-mark.svg"
                  alt="Phim Hay Hơn Rổ"
                  width={22}
                  height={22}
                  className="h-5 w-5 object-contain"
                  priority
                />
              </span>
              <span
                className={`font-bold text-sm truncate max-w-[140px] sm:max-w-[200px] ${
                  isDark ? "text-zinc-100" : "text-zinc-900"
                }`}
              >
                {currentItem.label}
              </span>
            </div>

            {/* Desktop Breadcrumb */}
            <div
              className={`hidden md:flex items-center gap-2 text-sm font-medium ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              <Link
                href="/nhanconan"
                className={`flex items-center gap-1.5 transition-colors ${
                  isDark ? "hover:text-zinc-100" : "hover:text-zinc-900"
                }`}
              >
                <span>Admin</span>
              </Link>
              <ChevronRight size={14} className={isDark ? "text-zinc-600" : "text-zinc-400"} />
              <span
                className={`font-bold ${
                  isDark ? "text-zinc-100" : "text-zinc-900"
                }`}
              >
                {currentItem.label}
              </span>
            </div>
          </div>

          {/* Right: Quick actions (View Site, Theme Toggle, Logout) */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                isDark
                  ? "bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 shadow-xs"
              }`}
              title="Mở website trong tab mới"
            >
              <ExternalLink size={14} />
              <span>Xem Website</span>
            </Link>

            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl transition-all border ${
                isDark
                  ? "bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800 text-amber-400"
                  : "bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-700 shadow-xs"
              }`}
              title={isDark ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode"}
              suppressHydrationWarning
            >
              {mounted ? (
                isDark ? <Sun size={16} /> : <Moon size={16} />
              ) : (
                <Sun size={16} />
              )}
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/nhanconan/login" })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                isDark
                  ? "bg-zinc-900/80 border-zinc-800 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-300 text-zinc-300"
                  : "bg-white border-zinc-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-zinc-700 shadow-xs"
              }`}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 scroll-smooth relative pb-28 md:pb-10">
          <div className="max-w-7xl mx-auto min-h-full">{children}</div>

          {/* Mobile Menu Drawer - Full Minimal Design */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden transition-all duration-200 animate-in fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div
                className={`w-80 max-w-[85vw] h-full shadow-2xl p-6 flex flex-col gap-4 transition-all duration-200 border-r backdrop-blur-2xl ${
                  isDark
                    ? "bg-[#11131a]/95 border-zinc-800 text-zinc-100"
                    : "bg-white/98 border-zinc-200 text-zinc-900"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <Link
                    href="/nhanconan"
                    className="flex items-center gap-3"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span
                      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${
                        isDark ? "border-zinc-700 bg-zinc-800" : "border-zinc-200 bg-zinc-100"
                      }`}
                    >
                      <Image
                        src="/images/logo/logo-mark.svg"
                        alt="Phim Hay Hơn Rổ"
                        width={26}
                        height={26}
                        className="h-6 w-6 object-contain"
                      />
                    </span>
                    <div>
                      <div className="text-sm font-extrabold">Phim Hay Hơn Rổ</div>
                      <div className="text-[11px] text-zinc-400">Admin Control</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Menu Items */}
                <div className="flex-1 overflow-y-auto space-y-1.5 py-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left text-sm font-bold transition-all min-h-[46px] ${
                          isActive
                            ? isDark
                              ? "bg-white text-zinc-950 shadow-md"
                              : "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                            : isDark
                              ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Drawer Footer User Card */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs">
                      {userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{userName}</div>
                      <div className="text-[11px] text-zinc-400 truncate font-mono">{userEmail}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/nhanconan/login" })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all min-h-[42px]"
                  >
                    <LogOut size={15} />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Bottom Floating Navigation Dock */}
          <nav
            className={`md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-around rounded-3xl border p-1.5 backdrop-blur-2xl shadow-xl transition-all ${
              isDark
                ? "bg-[#11131a]/92 border-zinc-800/90 shadow-black/60 text-zinc-400"
                : "bg-white/92 border-zinc-200/90 shadow-zinc-400/20 text-zinc-600"
            }`}
          >
            {/* Top 4 primary menu items */}
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-3 transition-all min-h-[46px] min-w-[54px] ${
                    isActive
                      ? isDark
                        ? "bg-white text-zinc-950 font-bold shadow-md"
                        : "bg-zinc-900 text-white font-bold shadow-md"
                      : isDark
                        ? "hover:text-zinc-100 hover:bg-zinc-800/50"
                        : "hover:text-zinc-950 hover:bg-zinc-100"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-bold leading-tight">
                    {item.label.split(" ")[0]}
                  </span>
                </Link>
              );
            })}

            {/* "More / Menu" button to open drawer */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-3 transition-all min-h-[46px] min-w-[54px] ${
                isDark
                  ? "hover:text-zinc-100 hover:bg-zinc-800/50"
                  : "hover:text-zinc-950 hover:bg-zinc-100"
              }`}
            >
              <LayoutGrid size={18} />
              <span className="text-[10px] font-bold leading-tight">Thêm</span>
            </button>
          </nav>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // @ts-expect-error - role is added in auth.ts
  const isAdmin = status === "authenticated" && session?.user?.role === "admin";
  const isNonAdmin = status === "authenticated" && !isAdmin;

  useEffect(() => {
    if (pathname === "/nhanconan/login") return;
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/nhanconan/login");
    }
  }, [router, status, pathname]);

  if (pathname === "/nhanconan/login") {
    return <AdminThemeProvider>{children}</AdminThemeProvider>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isNonAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] text-red-500 font-sans flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <LogOut size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">TRUY CẬP BỊ TỪ CHỐI</h1>
        <p className="text-slate-400 max-w-md text-sm">
          Tài khoản của bạn không có quyền quản trị viên Admin để truy cập khu vực này.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => signOut({ callbackUrl: "/nhanconan/login" })}
            className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 text-red-400 px-5 py-2.5 rounded-xl hover:bg-red-500/20 font-semibold text-sm transition-all"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
          <Link
            href="/"
            className="text-sm font-semibold text-slate-300 hover:text-white border border-white/10 bg-white/5 px-5 py-2.5 rounded-xl transition-all"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
