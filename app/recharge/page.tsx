"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
  Zap,
  Gift,
  Layers,
  User,
} from "lucide-react";

/* QR URLs are admin-configured and may be external. */
/* eslint-disable @next/next/no-img-element */

interface RechargePlan {
  id: string;
  name: string;
  priceVnd: number;
  coinAmount: number;
  adFreeDays: number;
  description: string;
}

interface PaymentConfig {
  enabled: boolean;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl: string;
  transferPrefix: string;
  configured: boolean;
}

interface RechargeOrder {
  id: string;
  orderCode: string;
  planName: string;
  amountVnd: number;
  coinAmount: number;
  adFreeDays: number;
  status: "pending" | "confirmed" | "rejected";
  adminNote: string;
  createdAt: string;
  confirmedBy?: string;
}

interface RechargeData {
  balance: number;
  adFreeUntil: string | null;
  isAdFree: boolean;
  plans: RechargePlan[];
  payment: PaymentConfig;
  orders: RechargeOrder[];
}

interface PaymentSession {
  orderCode: string;
  amountVnd: number;
  transferContent: string;
  qrImageUrl?: string;
  planName: string;
  coinAmount: number;
  adFreeDays: number;
}

interface PaidResult {
  coinAmount: number;
  adFreeDays: number;
  balance: number;
  adFreeUntil: string | null;
}

/** Đồng hồ chỉ chạy sau khi người dùng bấm Thanh toán và mã QR đã mở. */
const PAYMENT_WINDOW_SECONDS = 15 * 60;
const POLL_INTERVAL_MS = 4000;

function money(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function dateOnly(value: string | null) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "—";
}

function countdown(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function daysUntil(value: string | null) {
  if (!value) return 0;
  const diff = new Date(value).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
}

export default function RechargePage() {
  const { status } = useSession();
  const [data, setData] = useState<RechargeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_WINDOW_SECONDS);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const loadRecharge = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const response = await fetch("/api/user/recharge", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải thông tin nạp coin");
      setData(result);
      setSelectedPlanId((current) => current || result.plans?.[0]?.id || "");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể tải thông tin nạp coin",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void loadRecharge();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [loadRecharge, status]);

  // Giữ trong ref để hàm dò không phải tạo lại mỗi lần state đổi.
  const sessionRef = useRef<PaymentSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const checkPayment = useCallback(
    async (options?: { manual?: boolean }) => {
      const current = sessionRef.current;
      if (!current) return;
      if (options?.manual) setChecking(true);

      try {
        const response = await fetch(
          `/api/user/recharge/status?orderCode=${encodeURIComponent(current.orderCode)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) return;

        if (result.status === "confirmed") {
          setPaid({
            coinAmount: result.coinAmount,
            adFreeDays: result.adFreeDays,
            balance: result.balance,
            adFreeUntil: result.adFreeUntil,
          });
          setSession(null);
          setMessage(null);
          void loadRecharge({ silent: true });
        } else if (result.status === "rejected") {
          setSession(null);
          setMessage({
            type: "error",
            text: result.adminNote || "Giao dịch đã bị huỷ. Liên hệ quản trị viên nếu bạn đã chuyển tiền.",
          });
          void loadRecharge({ silent: true });
        } else if (options?.manual) {
          setMessage({ type: "error", text: "Chưa nhận được tiền. Ngân hàng có thể chậm vài chục giây." });
        }
      } catch {
        // Mạng chập chờn thì bỏ qua, nhịp dò sau sẽ thử lại.
      } finally {
        if (options?.manual) setChecking(false);
      }
    },
    [loadRecharge],
  );

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => void checkPayment(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session, checkPayment]);

  // Hạn giữ giao dịch tính khi mã QR mở, đọc đồng hồ trong effect chứ không phải lúc render.
  useEffect(() => {
    if (!session) {
      setSecondsLeft(PAYMENT_WINDOW_SECONDS);
      return;
    }
    const deadline = Date.now() + PAYMENT_WINDOW_SECONDS * 1000;
    const tick = () => setSecondsLeft(Math.ceil((deadline - Date.now()) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session]);

  const startPayment = async (plan: RechargePlan) => {
    if (!data?.payment.configured) return;
    setStarting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/user/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể bắt đầu thanh toán");

      setPaid(null);
      setSession({
        orderCode: result.order.orderCode,
        amountVnd: result.order.amountVnd,
        transferContent: result.order.transferContent,
        qrImageUrl: result.order.qrImageUrl,
        planName: plan.name,
        coinAmount: plan.coinAmount,
        adFreeDays: plan.adFreeDays,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể bắt đầu thanh toán",
      });
    } finally {
      setStarting(false);
    }
  };

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setMessage({ type: "error", text: "Trình duyệt chặn sao chép, vui lòng bôi đen để chép tay." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-zinc-400 bg-[#0a0c10]">
        <Loader2 size={24} className="animate-spin text-zinc-300" />
        <span className="text-xs font-mono">Đang tải dữ liệu thanh toán...</span>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-20 bg-[#0a0c10]">
        <div className="w-full max-w-md p-7 rounded-3xl border border-zinc-800/80 bg-[#11131a] text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-amber-300 shadow-inner">
            <Wallet size={26} />
          </div>
          <h1 className="text-lg font-extrabold text-zinc-100">Đăng Nhập Tài Khoản</h1>
          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
            Bạn cần đăng nhập để nạp coin, thanh toán và kích hoạt gói VIP không quảng cáo.
          </p>
          <Link
            href="/?auth=login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white text-zinc-950 py-3 text-xs font-extrabold hover:bg-zinc-200 transition-all active:scale-95 shadow-md"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 bg-[#0a0c10]">
        <div className="rounded-3xl border border-zinc-800 bg-[#11131a] p-6 text-xs text-zinc-400 max-w-sm text-center shadow-xl">
          Không thể tải dữ liệu nạp coin. Vui lòng thử lại sau.
        </div>
      </div>
    );
  }

  const expired = secondsLeft <= 0;
  const vipDaysLeft = daysUntil(data.adFreeUntil);
  const selectedPlan = data.plans.find((plan) => plan.id === selectedPlanId) || null;
  // Gói đáng tiền nhất tính theo giá mỗi ngày VIP
  const bestPlan = data.plans.reduce<RechargePlan | null>(
    (best, plan) =>
      !best || plan.priceVnd / Math.max(1, plan.adFreeDays) < best.priceVnd / Math.max(1, best.adFreeDays)
        ? plan
        : best,
    null,
  );

  return (
    <div className="relative min-h-screen bg-[#0a0c10] text-zinc-100 pt-20 md:pt-24 pb-28 lg:pb-20 selection:bg-zinc-700">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-6xl">
        
        {/* Toast / Message banner */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-semibold shadow-md ${
              message.type === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/25 bg-rose-500/10 text-rose-300"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* TOP HERO HEADER - Admin Style */}
        <div className="p-4 sm:p-8 rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-xl flex flex-wrap items-center justify-between gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="flex items-center gap-3.5 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-400 shadow-sm shrink-0">
              <Wallet size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
                  Nạp Coin & Nâng Cấp VIP
                </h1>
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Zap size={12} /> VietQR 24/7
                </span>
                {data.isAdFree && (
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck size={13} /> VIP Active ({vipDaysLeft} ngày)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-base text-zinc-400 mt-1 leading-relaxed">
                Quét mã QR tự động kích hoạt VIP không quảng cáo toàn website
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/ca-nhan"
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <User size={15} />
              <span>Hồ Sơ Cá Nhân</span>
            </Link>
          </div>
        </div>

        {/* ===== THÀNH CÔNG ===== */}
        {paid && (
          <section className="overflow-hidden rounded-3xl border border-emerald-500/25 bg-[#11131a] p-6 sm:p-10 text-center shadow-2xl mb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-zinc-100">Thanh toán thành công!</h2>
            <p className="mt-2 text-base text-zinc-300">
              Đã cộng <strong className="text-emerald-400">+{paid.coinAmount} linh thạch</strong> và kích hoạt VIP{" "}
              <strong className="text-emerald-400">{paid.adFreeDays} ngày</strong>
            </p>

            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3.5 text-left">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">Số dư linh thạch</p>
                <p className="mt-1 font-mono tabular-nums text-2xl font-black text-zinc-100">
                  {paid.balance.toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">VIP tới ngày</p>
                <p className="mt-1 font-mono tabular-nums text-2xl font-black text-emerald-400">
                  {dateOnly(paid.adFreeUntil)}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => setPaid(null)}
                className="h-13 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
              >
                Nạp thêm gói khác
              </button>
              <Link
                href="/"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white text-zinc-950 px-7 text-sm font-extrabold hover:bg-zinc-200 transition-all active:scale-95 shadow-md"
              >
                <Sparkles size={18} /> Xem phim không quảng cáo ngay
              </Link>
            </div>
          </section>
        )}

        {/* ===== ĐANG THANH TOÁN (VIETQR MODAL / CARD) ===== */}
        {session && !paid && (
          <section className="overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#11131a] shadow-2xl mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-6 py-4">
              <span className="inline-flex items-center gap-2.5 text-sm font-bold text-amber-300">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
                </span>
                Đang chờ thanh toán · {session.planName} (+{session.coinAmount} Coin / {session.adFreeDays} ngày VIP)
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono tabular-nums text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full border ${
                  expired
                    ? "text-rose-400 border-rose-500/20 bg-rose-500/10"
                    : "text-zinc-300 border-zinc-700 bg-zinc-800"
                }`}
              >
                <Clock3 size={15} /> {countdown(secondsLeft)}
              </span>
            </div>

            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:gap-8 items-start">
              {/* QR Container */}
              <div className="flex flex-col items-center lg:items-start mx-auto lg:mx-0">
                <div className="rounded-3xl bg-white p-4 shadow-2xl border border-zinc-200">
                  {session.qrImageUrl ? (
                    <img
                      src={session.qrImageUrl}
                      alt={`Mã QR thanh toán ${session.orderCode}`}
                      className="h-60 w-60 sm:h-72 sm:w-72 object-contain rounded-2xl"
                    />
                  ) : (
                    <div className="flex h-60 w-60 sm:h-72 sm:w-72 items-center justify-center text-zinc-400">
                      <QrCode size={50} />
                    </div>
                  )}
                </div>
                <p className="mt-3.5 max-w-[18rem] text-center lg:text-left text-xs leading-relaxed text-zinc-400">
                  Mở ứng dụng ngân hàng hoặc ví điện tử để quét mã. Số tiền và nội dung chuyển khoản đã được tạo sẵn tự động.
                </p>
              </div>

              {/* Bank Transfer Details Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-200/70">Số tiền thanh toán</p>
                    <p className="mt-0.5 font-mono tabular-nums text-2xl sm:text-3xl font-black text-amber-300">
                      {money(session.amountVnd)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(String(session.amountVnd), "amount")}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    title="Sao chép số tiền"
                  >
                    {copiedKey === "amount" ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-200/70">
                      Nội dung chuyển khoản (Bắt buộc)
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xl sm:text-2xl font-extrabold text-amber-300">
                      {session.transferContent}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(session.transferContent, "memo")}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    title="Sao chép nội dung"
                  >
                    {copiedKey === "memo" ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5">
                    <p className="text-xs uppercase tracking-wider font-bold text-zinc-500">Ngân hàng</p>
                    <p className="mt-1 truncate text-sm font-extrabold text-zinc-100">{data.payment.bankName}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5">
                    <p className="text-xs uppercase tracking-wider font-bold text-zinc-500">Chủ tài khoản</p>
                    <p className="mt-1 truncate text-sm font-extrabold uppercase text-zinc-100">
                      {data.payment.accountHolder}
                    </p>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider font-bold text-zinc-500">Số tài khoản</p>
                      <p className="mt-1 truncate font-mono tabular-nums text-base sm:text-lg font-bold text-zinc-100">
                        {data.payment.accountNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copy(data.payment.accountNumber, "stk")}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                      title="Sao chép số tài khoản"
                    >
                      {copiedKey === "stk" ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-zinc-400">
                  ⚠️ Giữ nguyên chính xác mã nội dung <span className="font-mono font-bold text-zinc-200">{session.transferContent}</span> để hệ thống nhận diện và cộng VIP tự động sau 5-15 giây.
                </p>

                {expired && (
                  <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                    Hết thời gian giữ giao dịch. Nếu bạn đã chuyển khoản, hệ thống vẫn sẽ kiểm tra và cộng tự động khi nhận được tiền từ ngân hàng.
                  </p>
                )}

                <div className="hidden lg:flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void checkPayment({ manual: true })}
                    disabled={checking}
                    className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-zinc-950 text-sm font-extrabold hover:bg-zinc-200 transition-all active:scale-95 shadow-md disabled:opacity-60"
                  >
                    <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
                    {checking ? "Đang kiểm tra giao dịch..." : "Tôi đã chuyển khoản"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSession(null)}
                    className="h-13 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== BẢNG ĐIỀU KHIỂN CHÍNH ===== */}
        {!session && !paid && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            
            {/* CỘT TRÁI: VÍ + CHỌN GÓI (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Thẻ Ví - Bento Style */}
              <div className="rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-[#11131a] to-zinc-950 p-6 sm:p-7 shadow-md relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Số Dư Khả Dụng</p>
                    <p className="mt-2 font-mono tabular-nums text-3xl sm:text-4xl font-black text-zinc-100">
                      {data.balance.toLocaleString("vi-VN")}
                      <span className="ml-2.5 text-base font-bold text-amber-400">Linh Thạch</span>
                    </p>
                  </div>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
                    <Wallet size={24} />
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3.5">
                  <ShieldCheck size={18} className={data.isAdFree ? "text-emerald-400" : "text-zinc-500"} />
                  {data.isAdFree ? (
                    <p className="text-xs sm:text-sm text-zinc-300">
                      VIP còn <strong className="text-emerald-400">{vipDaysLeft} ngày</strong>
                      <span className="text-zinc-500 font-mono"> · Đến {dateOnly(data.adFreeUntil)}</span>
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-zinc-400">Chưa kích hoạt VIP — đang xem kèm quảng cáo</p>
                  )}
                </div>
              </div>

              {/* Thẻ Chọn Gói VIP */}
              <div className="rounded-3xl border border-zinc-800/80 bg-[#11131a] p-6 sm:p-7 shadow-md">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-base sm:text-lg font-extrabold text-zinc-100 uppercase tracking-wider">
                    Chọn Gói Nâng Cấp
                  </h2>
                  <span className="text-xs text-zinc-500 font-medium">Tự động kích hoạt</span>
                </div>

                {!data.payment.enabled || !data.payment.configured ? (
                  <p className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400">
                    Cổng thanh toán tự động đang bảo trì. Vui lòng liên hệ quản trị viên.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.plans.map((plan) => {
                      const active = plan.id === selectedPlanId;
                      const perDay = plan.adFreeDays ? Math.round(plan.priceVnd / plan.adFreeDays) : 0;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          aria-pressed={active}
                          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? "border-amber-400/60 bg-amber-400/10 shadow-sm"
                              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              active ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-zinc-700"
                            }`}
                          >
                            {active && <Check size={14} strokeWidth={3} />}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-base font-extrabold text-zinc-100">{plan.adFreeDays} Ngày VIP</span>
                              {bestPlan?.id === plan.id && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 font-mono">
                                  <BadgeCheck size={12} /> ĐÁNG TIỀN NHẤT
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-xs text-zinc-400 font-mono">
                              +{plan.coinAmount} Coin{perDay > 0 ? ` · ${money(perDay)}/ngày` : ""}
                            </span>
                          </span>

                          <span className="shrink-0 font-mono tabular-nums text-lg font-black text-zinc-100">
                            {money(plan.priceVnd)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tóm tắt + nút thanh toán */}
                {selectedPlan && data.payment.configured && (
                  <div className="mt-6 border-t border-zinc-800 pt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 font-medium">Tổng thanh toán</span>
                      <strong className="font-mono tabular-nums text-2xl font-black text-amber-300">
                        {money(selectedPlan.priceVnd)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startPayment(selectedPlan)}
                      disabled={starting}
                      className="mt-4 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-zinc-950 text-sm font-extrabold hover:bg-zinc-200 transition-all active:scale-95 shadow-md disabled:opacity-60"
                    >
                      {starting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Đang tạo mã VietQR...
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} /> Thanh toán {money(selectedPlan.priceVnd)}
                        </>
                      )}
                    </button>
                    <p className="mt-3 text-center text-xs text-zinc-500">
                      Mã VietQR sẽ hiển thị kèm nội dung chuyển khoản tự động ở bước tiếp theo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: QUYỀN LỢI + LỊCH SỬ GIAO DỊCH (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Quyền Lợi VIP */}
              <div className="rounded-3xl border border-zinc-800/80 bg-[#11131a] p-6 sm:p-7 shadow-md">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-zinc-800">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <h2 className="text-base sm:text-lg font-extrabold text-zinc-100 uppercase tracking-wider">
                    Quyền Lợi Thành Viên VIP
                  </h2>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {[
                    {
                      icon: Sparkles,
                      title: "Tắt Sạch Quảng Cáo",
                      desc: "Không bị gián đoạn bởi banner, popunder hay quảng cáo trong trình phát video.",
                    },
                    {
                      icon: Zap,
                      title: "Kích Hoạt Tự Động 24/7",
                      desc: "Hệ thống SePay tự động quét giao dịch và kích hoạt VIP trong 5-15 giây.",
                    },
                    {
                      icon: Layers,
                      title: "Cộng Dồn Thời Hạn",
                      desc: "Gia hạn thêm gói mới khi còn hạn sẽ được cộng nối tiếp vào thời gian hiện tại.",
                    },
                    {
                      icon: Gift,
                      title: "Tặng Kèm Linh Thạch",
                      desc: "Mỗi gói nạp đều được cộng thêm linh thạch để sử dụng cho các tính năng mở rộng.",
                    },
                  ].map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <IconComp size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-zinc-100">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lịch Sử Giao Dịch */}
              <div className="rounded-3xl border border-zinc-800/80 bg-[#11131a] p-6 sm:p-7 shadow-md">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-800">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-zinc-100 uppercase tracking-wider">
                      Lịch Sử Giao Dịch Của Bạn
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-400 font-mono">20 giao dịch gần nhất</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadRecharge({ silent: true })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    <RefreshCw size={14} />
                    <span>Làm mới</span>
                  </button>
                </div>

                {data.orders.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium">Bạn chưa có giao dịch nạp coin nào.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {data.orders.map((order) => (
                      <div key={order.id} className="flex items-center gap-4 py-4">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            order.status === "confirmed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : order.status === "pending"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          }`}
                        >
                          {order.status === "confirmed" ? (
                            <CheckCircle2 size={20} />
                          ) : order.status === "pending" ? (
                            <Clock3 size={20} />
                          ) : (
                            <XCircle size={20} />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-zinc-100">{order.planName}</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-400 font-mono">
                            <span>{order.orderCode}</span> · {dateTime(order.createdAt)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-zinc-100">
                            {money(order.amountVnd)}
                          </p>
                          <span
                            className={`inline-block mt-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                              order.status === "confirmed"
                                ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                                : order.status === "pending"
                                  ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
                                  : "text-rose-400 border-rose-500/20 bg-rose-500/10"
                            }`}
                          >
                            {order.status === "confirmed"
                              ? "Thành công"
                              : order.status === "pending"
                                ? "Chờ chuyển khoản"
                                : "Đã huỷ"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-zinc-800">
                  <Link
                    href="/ca-nhan"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    <span>Quay lại trang cá nhân</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Bottom Bar */}
      {session && !paid && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#0a0c10]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSession(null)}
              className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 text-xs font-bold text-zinc-400"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={() => void checkPayment({ manual: true })}
              disabled={checking}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-zinc-950 text-xs font-extrabold disabled:opacity-60 shadow-md"
            >
              <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
              {checking ? "Đang kiểm tra..." : "Tôi đã chuyển khoản"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

