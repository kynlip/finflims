"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgePercent,
  Banknote,
  Coins,
  Download,
  RefreshCw,
  ScanLine,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useAdminTheme } from "../context/AdminThemeContext";

interface SeriesPoint {
  date: string;
  amountVnd: number;
  orders: number;
  coinAmount: number;
}

interface StatsResponse {
  range: { key: string; days: number; from: string; to: string };
  summary: {
    revenueVnd: number;
    confirmedOrders: number;
    coinIssued: number;
    averageOrderVnd: number;
    payingUsers: number;
    newPayers: number;
    pendingOrders: number;
    pendingAmountVnd: number;
    rejectedOrders: number;
    conversionRate: number;
    revenueChangePercent: number | null;
    orderChangePercent: number | null;
    previousRevenueVnd: number;
  };
  series: SeriesPoint[];
  byPlan: { planId: string; planName: string; orders: number; amountVnd: number }[];
  bySource: { source: string; orders: number; amountVnd: number }[];
  topUsers: {
    email: string;
    orders: number;
    amountVnd: number;
    coinAmount: number;
    lastAt: string | null;
  }[];
  webhook: {
    byStatus: { status: string; count: number; amount: number }[];
    lastReceivedAt: string | null;
    apiConfigured: boolean;
    reconcile: {
      ok: boolean;
      error?: string;
      fromDate: string;
      toDate: string;
      scanned: number;
      alreadyKnown: number;
      recovered: number;
      credited: number;
      unmatched: number;
      ranAt: string;
    } | null;
  };
  bank: {
    accounts: { accountNumber: string; bank: string; holder: string; balance: number }[];
    error: string;
    configuredAccount: string;
  };
}

const RANGES = [
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "90d", label: "90 ngày" },
  { key: "365d", label: "1 năm" },
];

/** Nhãn trạng thái giao dịch SePay sang tiếng Việt, phần còn lại giữ nguyên mã gốc. */
const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  credited: "Đã cộng quyền",
  received: "Mới nhận",
  underpaid: "Chuyển thiếu tiền",
  wrong_account: "Sai tài khoản nhận",
  unmatched_no_code: "Không có mã đơn",
  unmatched_order_not_found: "Không tìm thấy đơn",
  duplicate_order_settled: "Đơn đã xử lý trước đó",
  ignored_outgoing: "Giao dịch tiền ra",
  not_captured: "Chưa capture",
};

const SOURCE_LABELS: Record<string, string> = {
  "sepay-webhook": "Webhook tự động",
  "sepay-ipn": "Cổng thanh toán (IPN)",
  "sepay-reconcile": "Đối soát bù",
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function formatDayLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

export default function RechargeStats() {
  const { isDark } = useAdminTheme();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);
  const [metric, setMetric] = useState<"amountVnd" | "orders">("amountVnd");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState("");

  // Số dư ngân hàng chỉ nạp khi admin bấm nút, nên không giữ trong state: đổi
  // khoảng thời gian sẽ tải lại thống kê mà không gọi thêm SePay API.
  const fetchStats = useCallback(
    async (includeBalance = false) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/recharge/stats?range=${range}${includeBalance ? "&balance=1" : ""}`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không tải được thống kê");
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Không tải được thống kê");
      } finally {
        setLoading(false);
      }
    },
    [range],
  );

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const runReconcile = async () => {
    setReconciling(true);
    setReconcileMessage("");
    try {
      const response = await fetch("/api/sepay/reconcile?hours=24", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Đối soát thất bại");
      const result = payload.result;
      setReconcileMessage(
        `Quét ${result.scanned} giao dịch · bù ${result.recovered} giao dịch sót · cộng quyền ${result.credited} đơn · ${result.unmatched} giao dịch không khớp.`,
      );
      await fetchStats();
    } catch (reconcileError) {
      setReconcileMessage(
        reconcileError instanceof Error ? reconcileError.message : "Đối soát thất bại",
      );
    } finally {
      setReconciling(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Ngày", "Doanh thu (VNĐ)", "Số đơn", "Coin phát"],
      ...data.series.map((point) => [point.date, point.amountVnd, point.orders, point.coinAmount]),
    ];
    // Thêm BOM để Excel bản tiếng Việt không hiển thị lỗi font.
    const csv = `﻿${rows.map((row) => row.join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `doanh-thu-nap-coin-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxValue = useMemo(() => {
    if (!data?.series.length) return 1;
    return Math.max(1, ...data.series.map((point) => point[metric]));
  }, [data, metric]);

  const panelClass = isDark
    ? "border-slate-800 bg-[#0F172A]/90 shadow-xl"
    : "border-slate-200/90 bg-white shadow-sm";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const headingText = isDark ? "text-white" : "text-slate-900";

  const summary = data?.summary;
  const activeButton = "bg-blue-600 text-white border-blue-600";
  const idleButton = isDark
    ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity size={20} />
            </div>
            <div>
              <h2 className={`font-bold ${headingText}`}>Thống kê doanh thu</h2>
              <p className={`mt-1 text-xs ${mutedText}`}>
                Tính theo ngày đơn được duyệt, múi giờ Việt Nam.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`h-9 rounded-xl border px-3.5 text-xs font-bold transition-colors ${
                  range === option.key ? activeButton : idleButton
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void fetchStats()}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold ${idleButton}`}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold disabled:opacity-40 ${idleButton}`}
            >
              <Download size={14} /> Xuất CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-400">
            {error}
          </div>
        )}

        {summary && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Doanh thu kỳ này",
                value: formatMoney(summary.revenueVnd),
                hint: `${summary.confirmedOrders} đơn · TB ${formatMoney(summary.averageOrderVnd)}`,
                change: summary.revenueChangePercent,
                icon: <Wallet size={18} />,
                tone: "text-emerald-400 bg-emerald-500/10",
              },
              {
                label: "Người nạp",
                value: String(summary.payingUsers),
                hint: `${summary.newPayers} người nạp lần đầu`,
                change: null,
                icon: <UserPlus size={18} />,
                tone: "text-cyan-400 bg-cyan-500/10",
              },
              {
                label: "Tỉ lệ chốt đơn",
                value: `${summary.conversionRate}%`,
                hint: `${summary.pendingOrders} đơn chờ · ${formatMoney(summary.pendingAmountVnd)}`,
                change: null,
                icon: <BadgePercent size={18} />,
                tone: "text-amber-400 bg-amber-500/10",
              },
              {
                label: "Coin đã phát",
                value: summary.coinIssued.toLocaleString("vi-VN"),
                hint: `${summary.rejectedOrders} đơn bị từ chối`,
                change: null,
                icon: <Coins size={18} />,
                tone: "text-sky-500 bg-sky-500/10",
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border p-4 ${
                  isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-[11px] font-black uppercase tracking-wider ${mutedText}`}>
                      {card.label}
                    </p>
                    <p className={`mt-2 truncate text-xl font-black ${headingText}`}>{card.value}</p>
                    <p className={`mt-1 truncate text-[11px] ${mutedText}`}>{card.hint}</p>
                  </div>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                    {card.icon}
                  </span>
                </div>
                {typeof card.change === "number" && (
                  <div
                    className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
                      card.change >= 0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {card.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {card.change >= 0 ? "+" : ""}
                    {card.change}% so với kỳ trước
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.series.length > 0 && (
        <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`font-bold ${headingText}`}>Biểu đồ theo ngày</h2>
              <p className={`mt-1 text-xs ${mutedText}`}>Di chuột lên cột để xem chi tiết từng ngày.</p>
            </div>
            <div className="flex gap-2">
              {[
                { key: "amountVnd" as const, label: "Doanh thu" },
                { key: "orders" as const, label: "Số đơn" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMetric(option.key)}
                  className={`h-9 rounded-xl border px-3.5 text-xs font-bold transition-colors ${
                    metric === option.key ? activeButton : idleButton
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="flex h-56 items-end gap-[2px] overflow-x-auto pb-1">
              {data.series.map((point, index) => {
                const value = point[metric];
                const heightPercent = Math.max(2, (value / maxValue) * 100);
                return (
                  <div
                    key={point.date}
                    className="group relative flex min-w-[6px] flex-1 flex-col justify-end"
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-colors ${
                        hovered === index
                          ? "bg-emerald-400"
                          : value > 0
                            ? "bg-emerald-500/60"
                            : isDark
                              ? "bg-slate-800"
                              : "bg-slate-200"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {hovered !== null && data.series[hovered] && (
              <div
                className={`pointer-events-none absolute right-0 top-0 rounded-xl border px-3 py-2 text-xs shadow-lg ${
                  isDark ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <div className="font-black">{formatDayLabel(data.series[hovered].date)}</div>
                <div className="mt-1">{formatMoney(data.series[hovered].amountVnd)}</div>
                <div className={mutedText}>
                  {data.series[hovered].orders} đơn · +{data.series[hovered].coinAmount} coin
                </div>
              </div>
            )}

            <div className={`mt-2 flex justify-between text-[10px] font-bold ${mutedText}`}>
              <span>{formatDayLabel(data.series[0].date)}</span>
              <span>
                Đỉnh: {metric === "amountVnd" ? formatCompactMoney(maxValue) : `${maxValue} đơn`}
              </span>
              <span>{formatDayLabel(data.series[data.series.length - 1].date)}</span>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
            <h2 className={`font-bold ${headingText}`}>Doanh thu theo gói</h2>
            <p className={`mt-1 text-xs ${mutedText}`}>Gói nào đang bán chạy nhất trong kỳ.</p>

            {data.byPlan.length === 0 ? (
              <p className={`py-8 text-center text-sm ${mutedText}`}>Chưa có đơn thành công trong kỳ.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.byPlan.map((plan) => {
                  const share = data.summary.revenueVnd
                    ? Math.round((plan.amountVnd / data.summary.revenueVnd) * 100)
                    : 0;
                  return (
                    <div key={plan.planId || plan.planName}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${headingText}`}>{plan.planName}</span>
                        <span className={mutedText}>
                          {plan.orders} đơn · {formatMoney(plan.amountVnd)} ({share}%)
                        </span>
                      </div>
                      <div className={`mt-1.5 h-2 overflow-hidden rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 className={`mt-6 text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              Nguồn xác nhận đơn
            </h3>
            <div className="mt-3 space-y-2">
              {data.bySource.length === 0 ? (
                <p className={`text-sm ${mutedText}`}>Chưa có dữ liệu.</p>
              ) : (
                data.bySource.map((source) => (
                  <div key={source.source} className="flex items-center justify-between text-xs">
                    <span className={headingText}>
                      {SOURCE_LABELS[source.source] || source.source || "Admin duyệt tay"}
                    </span>
                    <span className={mutedText}>
                      {source.orders} đơn · {formatMoney(source.amountVnd)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={`font-bold ${headingText}`}>Sức khoẻ webhook & đối soát</h2>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Webhook gần nhất:{" "}
                  {data.webhook.lastReceivedAt
                    ? new Date(data.webhook.lastReceivedAt).toLocaleString("vi-VN")
                    : "chưa nhận lần nào"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runReconcile()}
                disabled={reconciling || !data.webhook.apiConfigured}
                title={
                  data.webhook.apiConfigured
                    ? "Gọi SePay API lấy lại giao dịch 24 giờ qua và bù đơn bị sót"
                    : "Cần cấu hình SEPAY_API_TOKEN"
                }
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold shadow-sm transition-all disabled:opacity-40 active:scale-95 ${
                  isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                <ScanLine size={14} className={reconciling ? "animate-pulse" : ""} />
                {reconciling ? "Đang đối soát..." : "Đối soát ngay"}
              </button>
            </div>

            {!data.webhook.apiConfigured && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400">
                Chưa có SEPAY_API_TOKEN — không tra cứu được giao dịch và số dư từ SePay.
              </p>
            )}

            {reconcileMessage && (
              <p className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                isDark ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}>
                {reconcileMessage}
              </p>
            )}

            {data.webhook.reconcile && (
              <p className={`mt-3 text-[11px] ${mutedText}`}>
                Lần đối soát gần nhất:{" "}
                {data.webhook.reconcile.ranAt
                  ? new Date(data.webhook.reconcile.ranAt).toLocaleString("vi-VN")
                  : "—"}{" "}
                · quét {data.webhook.reconcile.scanned} · bù {data.webhook.reconcile.recovered} · cộng{" "}
                {data.webhook.reconcile.credited}
                {data.webhook.reconcile.error ? ` · lỗi: ${data.webhook.reconcile.error}` : ""}
              </p>
            )}

            <div className="mt-4 space-y-2">
              {data.webhook.byStatus.length === 0 ? (
                <p className={`text-sm ${mutedText}`}>Chưa nhận giao dịch nào trong kỳ.</p>
              ) : (
                data.webhook.byStatus.map((row) => (
                  <div
                    key={row.status}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                      isDark ? "bg-slate-950/60" : "bg-slate-50"
                    }`}
                  >
                    <span className={row.status === "credited" ? "font-bold text-emerald-400" : headingText}>
                      {TRANSACTION_STATUS_LABELS[row.status] || row.status}
                    </span>
                    <span className={mutedText}>
                      {row.count} giao dịch · {formatMoney(row.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-black uppercase tracking-wider ${mutedText}`}>
                  Số dư tài khoản ngân hàng
                </h3>
                <button
                  type="button"
                  onClick={() => void fetchStats(true)}
                  disabled={!data.webhook.apiConfigured || loading}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold disabled:opacity-40 ${idleButton}`}
                >
                  <Banknote size={13} /> Tải số dư
                </button>
              </div>

              {data.bank.error && (
                <p className="mt-2 text-xs font-bold text-rose-400">{data.bank.error}</p>
              )}

              {data.bank.accounts.length === 0 ? (
                <p className={`mt-2 text-xs ${mutedText}`}>
                  Bấm &quot;Tải số dư&quot; để gọi SePay API (mỗi lần tốn 1 request trong hạn mức 3 request/giây).
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {data.bank.accounts.map((account) => (
                    <div
                      key={account.accountNumber}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                        isDark ? "bg-slate-950/60" : "bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className={`font-bold ${headingText}`}>
                          {account.bank} · {account.accountNumber}
                        </div>
                        <div className={mutedText}>{account.holder}</div>
                      </div>
                      <span className={`font-black ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                        {formatMoney(account.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {data && data.topUsers.length > 0 && (
        <div className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
          <h2 className={`font-bold ${headingText}`}>Top người nạp trong kỳ</h2>
          <p className={`mt-1 text-xs ${mutedText}`}>20 tài khoản chi nhiều nhất trong khoảng đang chọn.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className={isDark ? "text-slate-500" : "text-slate-400"}>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">Thành viên</th>
                  <th className="px-3 py-3">Số đơn</th>
                  <th className="px-3 py-3">Tổng tiền</th>
                  <th className="px-3 py-3">Lần gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user) => (
                  <tr key={user.email} className="border-b border-white/5 last:border-0">
                    <td className={`px-3 py-3 font-bold ${headingText}`}>{user.email}</td>
                    <td className={`px-3 py-3 ${mutedText}`}>{user.orders}</td>
                    <td className={`px-3 py-3 font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                      {formatMoney(user.amountVnd)}
                    </td>
                    <td className={`px-3 py-3 ${mutedText}`}>
                      {user.lastAt ? new Date(user.lastAt).toLocaleString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
