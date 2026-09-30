"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Clock3,
  CreditCard,
  ReceiptText,
  RefreshCw,
  Save,
  Settings2,
  Users,
  Wallet,
  X,
  Plus,
  Trash2,
  Coins,
} from "lucide-react";
import { useAdminTheme } from "../context/AdminThemeContext";
import RechargeStats from "./RechargeStats";

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
  qrTemplate: "compact" | "qronly" | "standee";
  showAccountInfo: boolean;
  transferPrefix: string;
  configured: boolean;
}

interface RechargeOrder {
  id: string;
  orderCode: string;
  userEmail: string;
  planName: string;
  amountVnd: number;
  coinAmount: number;
  adFreeDays: number;
  transferReference: string;
  status: "pending" | "confirmed" | "rejected";
  stale?: boolean;
  adminNote: string;
  createdAt: string;
  confirmedAt?: string | null;
  confirmedBy?: string;
}

interface RechargeStats {
  totalRevenueVnd: number;
  totalConfirmedOrders: number;
  totalPendingOrders: number;
  stalePendingOrders: number;
  stalePendingAmountVnd: number;
  stalePendingMinutes: number;
  totalPayingUsers: number;
  byStatus: Record<string, { count: number; amountVnd: number; coinAmount: number }>;
  topUsers: {
    email: string;
    orders: number;
    amountVnd: number;
    coinAmount: number;
    lastAt: string | null;
  }[];
}

interface SePayTransaction {
  id: string;
  sepayId: number;
  gateway: string;
  transferAmount: number;
  transferType: string;
  content: string;
  code: string | null;
  orderCode: string;
  userEmail: string;
  referenceCode: string;
  status: string;
  transactionDate: string;
  receivedAt: string | null;
}

const emptyPayment: PaymentConfig = {
  enabled: true,
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountHolder: "",
  qrImageUrl: "",
  qrTemplate: "compact",
  showAccountInfo: true,
  transferPrefix: "PHH",
  configured: false,
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

export default function RechargeManager() {
  const { isDark } = useAdminTheme();
  const [payment, setPayment] = useState<PaymentConfig>(emptyPayment);
  const [plans, setPlans] = useState<RechargePlan[]>([]);
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [stats, setStats] = useState<RechargeStats | null>(null);
  const [transactions, setTransactions] = useState<SePayTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modal Cộng coin trực tiếp cho khách
  const [isDirectCreditModalOpen, setIsDirectCreditModalOpen] = useState(false);
  const [directUser, setDirectUser] = useState("");
  const [directCoin, setDirectCoin] = useState(100);
  const [directDays, setDirectDays] = useState(30);
  const [directNote, setDirectNote] = useState("");
  const [directSubmitting, setDirectSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/recharge?status=${statusFilter}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải dữ liệu nạp coin");
      setPayment(data.payment || emptyPayment);
      setPlans(data.plans || []);
      setOrders(data.orders || []);
      setStats(data.stats || null);
      setTransactions(data.transactions || []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể tải dữ liệu" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Đơn giờ được webhook SePay cộng tự động, admin không phải bấm mới thấy.
  // Chỉ chạy khi tab đang hiển thị để không quét DB lúc admin bỏ đó cả buổi.
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchData();
    }, 20000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  const updatePlanField = (
    planId: string,
    field: keyof RechargePlan,
    value: string | number,
  ) => {
    setPlans((current) =>
      current.map((plan) => {
        if (plan.id !== planId) return plan;
        if (field === "priceVnd" || field === "coinAmount" || field === "adFreeDays") {
          return { ...plan, [field]: Math.max(0, Number(value) || 0) };
        }
        return { ...plan, [field]: value };
      }),
    );
  };

  const handleAddPlan = () => {
    const newId = `plan_${Date.now()}`;
    setPlans((current) => [
      ...current,
      {
        id: newId,
        name: `Gói Mới`,
        priceVnd: 50_000,
        coinAmount: 50,
        adFreeDays: 30,
        description: "Bỏ quảng cáo toàn website trong 30 ngày",
      },
    ]);
  };

  const handleRemovePlan = (planId: string) => {
    if (plans.length <= 1) {
      alert("Cần giữ ít nhất 1 gói nạp!");
      return;
    }
    if (!confirm("Bạn có chắc muốn xóa gói nạp này?")) return;
    setPlans((current) => current.filter((p) => p.id !== planId));
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payment, plans }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu cấu hình");
      setPayment(data.payment || payment);
      if (data.plans) setPlans(data.plans);
      setMessage({ type: "success", text: "Đã lưu cấu hình thanh toán và danh sách gói VIP thành công!" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu cấu hình" });
    } finally {
      setSaving(false);
    }
  };

  const handleDirectCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUser.trim()) {
      alert("Vui lòng nhập Email hoặc Username của khách hàng");
      return;
    }
    if (directCoin <= 0 && directDays <= 0) {
      alert("Vui lòng nhập số coin (>0) hoặc số ngày VIP (>0)");
      return;
    }

    setDirectSubmitting(true);
    try {
      const res = await fetch("/api/admin/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "credit_direct",
          userEmailOrId: directUser.trim(),
          coinAmount: Number(directCoin) || 0,
          adFreeDays: Number(directDays) || 0,
          adminNote: directNote.trim() || "Admin cộng trực tiếp",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cộng coin cho khách");
      setMessage({
        type: "success",
        text: `🎉 Đã cộng thành công ${directCoin} coin (${directDays} ngày VIP) cho tài khoản ${data.userEmail || directUser}! (Tổng coin hiện tại: ${data.newCoins})`,
      });
      setIsDirectCreditModalOpen(false);
      setDirectUser("");
      setDirectNote("");
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Đã xảy ra lỗi khi cộng coin");
    } finally {
      setDirectSubmitting(false);
    }
  };

  const processOrder = async (order: RechargeOrder, nextStatus: "confirmed" | "rejected") => {
    const action = nextStatus === "confirmed" ? "duyệt và cộng quyền" : "từ chối";
    if (!window.confirm(`Xác nhận ${action} đơn ${order.orderCode}?`)) return;

    setProcessingId(order.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/recharge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xử lý đơn");
      setMessage({ type: "success", text: nextStatus === "confirmed" ? "Đã cộng coin và kích hoạt VIP." : "Đã từ chối đơn nạp." });
      await fetchData();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể xử lý đơn" });
    } finally {
      setProcessingId(null);
    }
  };

  const inputClass = `w-full h-11 rounded-xl border px-3.5 text-xs outline-none transition-colors ${
    isDark
      ? "border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500"
      : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
  }`;
  const panelClass = isDark
    ? "border-zinc-800/80 bg-[#11131a] shadow-xl"
    : "border-zinc-200/90 bg-white shadow-sm";
  const mutedText = isDark ? "text-zinc-400" : "text-zinc-600";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
            Nạp coin & Quyền VIP
          </h1>
          <p className={`mt-1 max-w-2xl text-xs sm:text-sm ${mutedText}`}>
            Chỉnh giá và thêm/xóa gói nạp, cộng coin thủ công cho khách, theo dõi doanh thu và xử lý giao dịch.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Cộng coin cho khách */}
          <button
            type="button"
            onClick={() => setIsDirectCreditModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-xs sm:text-sm font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
          >
            <Coins size={16} /> Cộng coin cho khách
          </button>

          <label className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-xs font-bold ${
            isDark ? "border-zinc-700 bg-zinc-800 text-zinc-200" : "border-zinc-200 bg-white text-zinc-700"
          }`}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Tự làm mới 20s
          </label>
          <button
            type="button"
            onClick={() => void fetchData()}
            className={`inline-flex items-center justify-center gap-2 h-11 rounded-2xl border px-5 text-xs sm:text-sm font-bold transition-all shadow-xs ${
              isDark ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-5 py-3.5 text-sm font-bold flex items-center gap-2 ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Tổng tiền đã nạp", value: formatMoney(stats.totalRevenueVnd), hint: `${stats.totalConfirmedOrders} đơn thành công`, icon: <Wallet size={18} />, tone: "text-emerald-500 bg-emerald-500/10" },
            { label: "Thành viên đã nạp", value: String(stats.totalPayingUsers), hint: "Tính theo email có đơn thành công", icon: <Users size={18} />, tone: "text-sky-500 bg-sky-500/10" },
            { label: "Đơn chờ chuyển khoản", value: String(stats.totalPendingOrders), hint: `${formatMoney(stats.byStatus.pending?.amountVnd || 0)} · chưa vào doanh thu${stats.stalePendingOrders ? ` · ${stats.stalePendingOrders} quá hạn` : ""}`, icon: <Clock3 size={18} />, tone: "text-amber-500 bg-amber-500/10" },
            { label: "Coin đã phát", value: `${(stats.byStatus.confirmed?.coinAmount || 0).toLocaleString("vi-VN")} coin`, hint: `${stats.byStatus.rejected?.count || 0} đơn bị từ chối`, icon: <ReceiptText size={18} />, tone: "text-sky-500 bg-sky-500/10" },
          ].map((card) => (
            <div key={card.label} className={`rounded-2xl border p-4 ${panelClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>{card.label}</p>
                  <p className={`mt-2 truncate text-xl font-extrabold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>{card.value}</p>
                  <p className={`mt-1 truncate text-[11px] ${mutedText}`}>{card.hint}</p>
                </div>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>{card.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <RechargeStats />

      {/* Form Cấu hình thanh toán & Gói nạp ĐỘNG */}
      <form onSubmit={saveSettings} className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className={isDark ? "font-bold text-zinc-100" : "font-bold text-zinc-900"}>Cấu hình thanh toán</h2>
              <p className={`mt-1 text-xs ${mutedText}`}>Dùng để sinh mã VietQR động cho từng đơn và đối chiếu tài khoản nhận tiền.</p>
            </div>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={payment.enabled}
              onChange={(event) => setPayment((current) => ({ ...current, enabled: event.target.checked }))}
              className="h-4 w-4 accent-emerald-500"
            />
            Bật nạp
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>Ngân hàng</span>
            <input className={inputClass} value={payment.bankName} onChange={(e) => setPayment({ ...payment, bankName: e.target.value })} placeholder="Ví dụ: MB Bank" />
          </label>
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>Mã ngân hàng (VietQR)</span>
            <input className={inputClass} value={payment.bankCode} onChange={(e) => setPayment({ ...payment, bankCode: e.target.value })} placeholder="MBBank hoặc 970422" />
          </label>
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>Số tài khoản</span>
            <input className={inputClass} value={payment.accountNumber} onChange={(e) => setPayment({ ...payment, accountNumber: e.target.value })} placeholder="Số tài khoản nhận" />
          </label>
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>Chủ tài khoản</span>
            <input className={inputClass} value={payment.accountHolder} onChange={(e) => setPayment({ ...payment, accountHolder: e.target.value })} placeholder="NGUYEN VAN A" />
          </label>
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>Tiền tố nội dung</span>
            <input className={inputClass} value={payment.transferPrefix} onChange={(e) => setPayment({ ...payment, transferPrefix: e.target.value.toUpperCase() })} placeholder="PHH" />
          </label>
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>URL QR (tuỳ chọn)</span>
            <input className={inputClass} value={payment.qrImageUrl} onChange={(e) => setPayment({ ...payment, qrImageUrl: e.target.value })} placeholder="https://..." />
          </label>
          <label className="space-y-1.5 lg:col-span-1">
            <span className={`text-xs font-semibold ${mutedText}`}>Bố cục ảnh VietQR</span>
            <select className={inputClass} value={payment.qrTemplate} onChange={(e) => setPayment({ ...payment, qrTemplate: e.target.value as PaymentConfig["qrTemplate"] })}>
              <option value="compact">compact — khung gọn kèm logo</option>
              <option value="qronly">qronly — chỉ mã QR</option>
              <option value="standee">standee — khung để bàn</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5 text-xs font-bold lg:col-span-1">
            <input
              type="checkbox"
              checked={payment.showAccountInfo}
              onChange={(e) => setPayment({ ...payment, showAccountInfo: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className={mutedText}>Hiện số tài khoản đầy đủ dưới ảnh QR</span>
          </label>
        </div>

        {/* Danh sách Gói nạp ĐỘNG */}
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h3 className={`text-sm font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                Danh sách gói nạp (Tùy biến động)
              </h3>
              <p className={`text-xs ${mutedText}`}>
                Admin có thể tự do thêm bớt gói, chỉnh tên, giá tiền, số coin và số ngày VIP.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <Plus size={15} /> Thêm gói nạp mới
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className={isDark ? "bg-zinc-900/60 text-zinc-400" : "bg-zinc-50 text-zinc-500"}>
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Tên gói</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Số tiền (VNĐ)</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Coin cộng</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">VIP (ngày)</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Mô tả</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlanField(plan.id, "name", e.target.value)}
                        className={`${inputClass} max-w-[140px] font-bold`}
                        placeholder="Ví dụ: Gói 50K"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={plan.priceVnd}
                        onChange={(e) => updatePlanField(plan.id, "priceVnd", e.target.value)}
                        className={`${inputClass} max-w-[140px]`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={plan.coinAmount}
                        onChange={(e) => updatePlanField(plan.id, "coinAmount", e.target.value)}
                        className={`${inputClass} max-w-[110px]`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={3650}
                        step={1}
                        value={plan.adFreeDays}
                        onChange={(e) => updatePlanField(plan.id, "adFreeDays", e.target.value)}
                        className={`${inputClass} max-w-[110px]`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={plan.description || ""}
                        onChange={(e) => updatePlanField(plan.id, "description", e.target.value)}
                        className={`${inputClass} min-w-[200px]`}
                        placeholder="Mô tả quyền lợi..."
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemovePlan(plan.id)}
                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa gói này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center gap-2 h-11 rounded-2xl px-6 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 ${
              isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10"
            }`}
          >
            <Save size={16} /> {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </form>

      {/* Section Đơn thanh toán */}
      <section className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className={isDark ? "font-bold text-white" : "font-bold text-slate-900"}>Đơn thanh toán</h2>
              <p className={`mt-1 text-xs ${mutedText}`}>Đơn tạo ra khi khách bấm Thanh toán, chưa phải tiền về. Khớp mã thì webhook tự cộng; chỉ duyệt tay khi khách chuyển sai nội dung.</p>
            </div>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} max-w-[180px]`}>
            <option value="pending">Đang chờ chuyển khoản</option>
            <option value="pending_stale">Quá hạn (khách bỏ ngang)</option>
            <option value="confirmed">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
            <option value="all">Tất cả</option>
          </select>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center gap-2 py-12 text-sm ${mutedText}`}><RefreshCw size={16} className="animate-spin" /> Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className={`py-12 text-center text-sm ${mutedText}`}>Chưa có yêu cầu nào trong bộ lọc này.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className={isDark ? "text-slate-500" : "text-slate-400"}>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">Đơn / thời gian</th>
                  <th className="px-3 py-3">Thành viên</th>
                  <th className="px-3 py-3">Gói</th>
                  <th className="px-3 py-3">Mã giao dịch</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-3 py-3 text-right">Xử lý</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-4"><div className={isDark ? "font-bold text-white" : "font-bold text-slate-900"}>{order.orderCode}</div><div className={`mt-1 ${mutedText}`}>{formatDate(order.createdAt)}</div></td>
                    <td className={`px-3 py-4 ${mutedText}`}>{order.userEmail}</td>
                    <td className="px-3 py-4"><div className={isDark ? "font-bold text-cyan-300" : "font-bold text-cyan-700"}>{order.planName}</div><div className={`mt-1 ${mutedText}`}>{formatMoney(order.amountVnd)} · +{order.coinAmount} coin · {order.adFreeDays} ngày</div></td>
                    <td className={`px-3 py-4 ${mutedText}`}>{order.transferReference || "Chưa nhập"}</td>
                    <td className="px-3 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${order.status === "pending" ? (order.stale ? "bg-slate-500/10 text-slate-400" : "bg-amber-500/10 text-amber-400") : order.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{order.status === "pending" ? <Clock3 size={12} /> : order.status === "confirmed" ? <Check size={12} /> : <X size={12} />}{order.status === "pending" ? (order.stale ? "Quá hạn" : "Chờ chuyển khoản") : order.status === "confirmed" ? "Đã duyệt" : "Từ chối"}</span>{order.confirmedBy && <div className={`mt-1 text-[10px] ${mutedText}`}>{order.confirmedBy === "sepay-webhook" ? "Tự động qua SePay" : order.confirmedBy === "sepay-ipn" ? "Cổng thanh toán SePay" : order.confirmedBy === "sepay-reconcile" ? "Đối soát bù tự động" : order.confirmedBy}</div>}</td>
                    <td className="px-3 py-4 text-right">{order.status === "pending" && <div className="flex justify-end gap-2"><button type="button" onClick={() => void processOrder(order, "rejected")} disabled={processingId === order.id} className="rounded-lg border border-rose-500/20 px-2.5 py-2 font-bold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"><X size={14} /></button><button type="button" onClick={() => void processOrder(order, "confirmed")} disabled={processingId === order.id} className="rounded-lg bg-emerald-500 px-3 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"><Check size={14} /></button></div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section Thành viên đã nạp */}
      <section className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Users size={20} />
          </div>
          <div>
            <h2 className={isDark ? "font-bold text-white" : "font-bold text-slate-900"}>Thành viên đã nạp</h2>
            <p className={`mt-1 text-xs ${mutedText}`}>Xếp theo tổng tiền, tối đa 50 người.</p>
          </div>
        </div>

        {!stats || stats.topUsers.length === 0 ? (
          <div className={`py-10 text-center text-sm ${mutedText}`}>Chưa có giao dịch nạp thành công nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className={isDark ? "text-slate-500" : "text-slate-400"}>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">Thành viên</th>
                  <th className="px-3 py-3">Số đơn</th>
                  <th className="px-3 py-3">Tổng tiền</th>
                  <th className="px-3 py-3">Coin nhận</th>
                  <th className="px-3 py-3">Lần nạp gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((user) => (
                  <tr key={user.email} className="border-b border-white/5 last:border-0">
                    <td className={`px-3 py-3 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{user.email}</td>
                    <td className={`px-3 py-3 ${mutedText}`}>{user.orders}</td>
                    <td className={`px-3 py-3 font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{formatMoney(user.amountVnd)}</td>
                    <td className={`px-3 py-3 ${mutedText}`}>+{user.coinAmount.toLocaleString("vi-VN")}</td>
                    <td className={`px-3 py-3 ${mutedText}`}>{user.lastAt ? formatDate(user.lastAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section Log giao dịch SePay */}
      <section className={`rounded-3xl border p-5 sm:p-6 ${panelClass}`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200">
            <ReceiptText size={20} />
          </div>
          <div>
            <h2 className={isDark ? "font-bold text-zinc-100" : "font-bold text-zinc-900"}>Log giao dịch SePay</h2>
            <p className={`mt-1 text-xs ${mutedText}`}>50 webhook gần nhất, gồm cả giao dịch không khớp đơn nào.</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className={`py-10 text-center text-sm ${mutedText}`}>Chưa nhận webhook nào từ SePay.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className={isDark ? "text-slate-500" : "text-slate-400"}>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3">Ngân hàng</th>
                  <th className="px-3 py-3">Số tiền</th>
                  <th className="px-3 py-3">Nội dung</th>
                  <th className="px-3 py-3">Đơn khớp</th>
                  <th className="px-3 py-3">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-3">
                      <div className={isDark ? "font-bold text-white" : "font-bold text-slate-900"}>{transaction.transactionDate || "—"}</div>
                      <div className={`mt-1 ${mutedText}`}>#{transaction.sepayId} · {transaction.referenceCode || "—"}</div>
                    </td>
                    <td className={`px-3 py-3 ${mutedText}`}>{transaction.gateway || "—"}</td>
                    <td className={`px-3 py-3 font-bold ${transaction.transferType === "in" ? (isDark ? "text-emerald-300" : "text-emerald-700") : "text-rose-400"}`}>
                      {transaction.transferType === "in" ? "+" : "−"}{formatMoney(transaction.transferAmount)}
                    </td>
                    <td className={`max-w-[260px] px-3 py-3 ${mutedText}`}><div className="truncate" title={transaction.content}>{transaction.content || "—"}</div></td>
                    <td className="px-3 py-3">
                      <div className={isDark ? "font-bold text-cyan-300" : "font-bold text-cyan-700"}>{transaction.orderCode || transaction.code || "—"}</div>
                      <div className={`mt-1 ${mutedText}`}>{transaction.userEmail || "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        transaction.status === "credited"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : transaction.status.startsWith("unmatched") || transaction.status === "underpaid"
                            ? "bg-amber-500/10 text-amber-400"
                            : transaction.status.startsWith("failed")
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-white/10 text-slate-400"
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL CỘNG COIN TRỰC TIẾP CHO KHÁCH */}
      {isDirectCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl ${panelClass}`}>
            <button
              type="button"
              onClick={() => setIsDirectCreditModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Coins size={22} />
              </div>
              <div>
                <h3 className={`text-base font-extrabold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                  Cộng Coin & Tặng VIP
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  Cộng trực tiếp vào tài khoản khách hàng không cần đơn SePay.
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectCreditSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${mutedText}`}>
                  Email hoặc Tên tài khoản (Username) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={directUser}
                  onChange={(e) => setDirectUser(e.target.value)}
                  placeholder="Ví dụ: user@gmail.com hoặc username"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${mutedText}`}>
                    Số Coin cộng
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={directCoin}
                    onChange={(e) => setDirectCoin(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="100"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${mutedText}`}>
                    VIP thêm (ngày)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3650}
                    step={1}
                    value={directDays}
                    onChange={(e) => setDirectDays(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="30"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${mutedText}`}>
                  Ghi chú / Lý do
                </label>
                <input
                  type="text"
                  value={directNote}
                  onChange={(e) => setDirectNote(e.target.value)}
                  placeholder="Ví dụ: Nạp bù qua Zalo / Thưởng sự kiện / Tặng quà"
                  className={inputClass}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDirectCreditModalOpen(false)}
                  className={`h-11 px-5 rounded-2xl text-xs font-bold border transition-colors ${
                    isDark ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={directSubmitting}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 active:scale-95"
                >
                  <Coins size={16} /> {directSubmitting ? "Đang xử lý..." : "Xác nhận cộng coin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
