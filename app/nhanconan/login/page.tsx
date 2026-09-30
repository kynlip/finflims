"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { useAdminTheme } from "../context/AdminThemeContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isDark, setIsDark, mounted } = useAdminTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const theme = isDark
    ? {
        shell: "bg-[#0d1114] text-[#f5f1e8]",
        ambient: "bg-[#d8a85d]/10",
        ambientSecondary: "bg-[#8f9aa0]/10",
        grid: "opacity-[0.035]",
        logoFrame: "border-white/10 bg-white/[0.06] shadow-[0_18px_50px_rgba(0,0,0,0.24)]",
        eyebrow: "text-[#d8ae6a]",
        headline: "text-[#fbf8f1]",
        body: "text-[#a9b0ae]",
        card: "border-white/10 bg-white/[0.075] shadow-[0_28px_90px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.16)]",
        cardHighlight: "bg-white/[0.12]",
        field: "border-white/10 bg-black/15 focus-within:border-[#d8ae6a]/70 focus-within:ring-[#d8ae6a]/15",
        input: "text-[#fbf8f1] placeholder:text-[#7d8785]",
        icon: "text-[#9da8a5] group-focus-within:text-[#e0b971]",
        toggle: "border-white/10 bg-white/[0.06] text-[#f0c879] hover:bg-white/[0.12]",
        button:
          "bg-[#e0b66c] text-[#271c0d] shadow-[0_14px_30px_rgba(208,158,73,0.2)] hover:bg-[#edc77f] hover:shadow-[0_16px_34px_rgba(208,158,73,0.3)]",
        footer: "border-white/10 text-[#9da8a5]",
        footerLink: "text-[#b8c0bd] hover:text-[#f0c879]",
      }
    : {
        shell: "bg-[#edf0ed] text-[#1b2422]",
        ambient: "bg-[#e0b76f]/35",
        ambientSecondary: "bg-[#b8c7c2]/35",
        grid: "opacity-[0.06]",
        logoFrame: "border-black/[0.08] bg-white/65 shadow-[0_18px_50px_rgba(74,68,48,0.11)]",
        eyebrow: "text-[#9b6e2d]",
        headline: "text-[#18211f]",
        body: "text-[#63706c]",
        card: "border-black/[0.08] bg-white/65 shadow-[0_28px_90px_rgba(74,68,48,0.12),inset_0_1px_0_rgba(255,255,255,0.92)]",
        cardHighlight: "bg-white/80",
        field: "border-black/[0.09] bg-white/45 focus-within:border-[#bc8b45]/75 focus-within:ring-[#bc8b45]/15",
        input: "text-[#1b2422] placeholder:text-[#8a9691]",
        icon: "text-[#78847f] group-focus-within:text-[#a87836]",
        toggle: "border-black/[0.08] bg-white/65 text-[#745321] hover:bg-white/90",
        button:
          "bg-[#bd8b45] text-white shadow-[0_14px_30px_rgba(161,111,44,0.18)] hover:bg-[#aa7838] hover:shadow-[0_16px_34px_rgba(161,111,44,0.26)]",
        footer: "border-black/[0.09] text-[#71807a]",
        footerLink: "text-[#596760] hover:text-[#956a2d]",
      };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
        setLoading(false);
      } else if (result?.ok) {
        router.push("/nhanconan");
      }
    } catch {
      setError("Đã có lỗi xảy ra trong quá trình xác thực.");
      setLoading(false);
    }
  };

  return (
    <main
      className={`relative isolate min-h-dvh overflow-hidden font-sans selection:bg-[#d8ae6a]/25 transition-colors duration-500 ${theme.shell}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-56 -left-40 h-[34rem] w-[34rem] rounded-full blur-[120px] transition-colors duration-700 ${theme.ambient}`}
        />
        <div
          className={`absolute -right-48 bottom-[-12rem] h-[38rem] w-[38rem] rounded-full blur-[140px] transition-colors duration-700 ${theme.ambientSecondary}`}
        />
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:32px_32px] ${theme.grid}`}
        />
      </div>

      <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(390px,456px)] lg:gap-16 lg:px-10 lg:py-12">
        <section className="flex w-full flex-col lg:pr-8">
          <div className="flex items-center gap-3">
            <div
              className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[1.1rem] border backdrop-blur-xl ${theme.logoFrame}`}
            >
              <Image
                src="/images/logo/logo-mark.svg"
                alt="Phim Hay Hơn Rổ"
                width={42}
                height={42}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${theme.eyebrow}`}>
                Phim Hay Hơn Rổ
              </p>
              <p className={`mt-1 text-xs ${theme.body}`}>Không gian quản trị</p>
            </div>
          </div>

          <div className="mt-10 hidden max-w-xl lg:block">
            <p className={`text-[11px] font-bold uppercase tracking-[0.26em] ${theme.eyebrow}`}>
              Trung tâm nội dung
            </p>
            <h1 className={`mt-5 max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-6xl ${theme.headline}`}>
              Quản lý kho phim rõ ràng, nhẹ nhàng.
            </h1>
            <p className={`mt-6 max-w-md text-base leading-7 ${theme.body}`}>
              Cập nhật phim, tập chiếu, quảng cáo và thành viên từ một bảng điều khiển gọn gàng.
            </p>
          </div>

          <div
            className={`mt-10 hidden max-w-xl items-center gap-3 rounded-2xl border p-3 backdrop-blur-xl lg:flex ${theme.card}`}
          >
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${theme.cardHighlight}`}>
              <LockKeyhole className={`h-4 w-4 ${theme.eyebrow}`} aria-hidden="true" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${theme.headline}`}>Khu vực dành cho quản trị viên</p>
              <p className={`mt-0.5 text-[11px] ${theme.body}`}>Phiên đăng nhập được bảo vệ theo tài khoản.</p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-[456px] justify-self-center lg:justify-self-end">
          <div className={`relative overflow-hidden rounded-[2rem] border p-5 backdrop-blur-2xl sm:p-8 ${theme.card}`}>
            <div className={`absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#e0b66c] to-transparent ${theme.cardHighlight}`} />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${theme.eyebrow}`}>
                  Đăng nhập
                </p>
                <h2 className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${theme.headline}`}>
                  Chào mừng trở lại
                </h2>
                <p className={`mt-2 max-w-xs text-sm leading-6 ${theme.body}`}>
                  Đăng nhập để tiếp tục quản lý nội dung của bạn.
                </p>
              </div>

              <button
                type="button"
                aria-label={isDark ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
                aria-pressed={isDark}
                title={isDark ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
                onClick={() => setIsDark(!isDark)}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${theme.toggle}`}
              >
                {mounted ? (
                  isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-sm leading-5 text-rose-500"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="admin-username" className={`text-xs font-semibold ${theme.headline}`}>
                  Tài khoản
                </label>
                <div className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 focus-within:ring-4 ${theme.field}`}>
                  <UserRound className={`h-[18px] w-[18px] shrink-0 transition-colors ${theme.icon}`} aria-hidden="true" />
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="Nhập tên đăng nhập"
                    className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${theme.input}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-password" className={`text-xs font-semibold ${theme.headline}`}>
                  Mật khẩu
                </label>
                <div className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 focus-within:ring-4 ${theme.field}`}>
                  <LockKeyhole className={`h-[18px] w-[18px] shrink-0 transition-colors ${theme.icon}`} aria-hidden="true" />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${theme.input}`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword(!showPassword)}
                    className={`shrink-0 rounded-lg p-1 transition-colors ${theme.icon}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`group flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className={`mt-7 flex items-center justify-between gap-3 border-t pt-5 text-[11px] ${theme.footer}`}>
              <span className="flex min-w-0 items-center gap-2">
                <LockKeyhole className={`h-3.5 w-3.5 shrink-0 ${theme.eyebrow}`} aria-hidden="true" />
                <span className="truncate">Phiên quản trị riêng tư</span>
              </span>
              <span className="shrink-0">CMS</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 px-1 text-xs">
            <Link href="/" className={`inline-flex items-center gap-1.5 transition-colors ${theme.footerLink}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Về trang phim
            </Link>
            <span className={theme.body}>© 2026</span>
          </div>
        </section>
      </div>
    </main>
  );
}
