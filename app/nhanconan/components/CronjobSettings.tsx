"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Save,
  Play,
  RotateCcw,
  Key,
  MessageSquare,
  Activity,
  Trash2,
} from "lucide-react";

interface CronSettings {
  enabled: boolean;
  interval: number;
  concurrentCrawls: number;
  delay: number;
  apiKey: string;
  lastRun: string | null;
  nextRun: string | null;
  telegram?: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
}

interface LogItem {
  id?: string;
  type: string;
  success: boolean;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface CronjobSettingsProps {
  isDark?: boolean;
}

export default function CronjobSettings({ isDark = true }: CronjobSettingsProps) {
  const [settings, setSettings] = useState<CronSettings>({
    enabled: true,
    interval: 30,
    concurrentCrawls: 2,
    delay: 1000,
    apiKey: "Anime2026CronVipKey",
    lastRun: null,
    nextRun: null,
    telegram: {
      enabled: false,
      botToken: "",
      chatId: "",
    },
  });

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRunningManual, setIsRunningManual] = useState(false);

  const fetchSettingsAndLogs = async () => {
    try {
      const [settingsRes, logsRes] = await Promise.all([
        fetch("/api/crawl/settings"),
        fetch("/api/crawl/logs?limit=30"),
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings((prev) => ({ ...prev, ...sData }));
      }

      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData.logs || []);
      }
    } catch (err) {
      console.error("Failed to load cron settings/logs:", err);
    }
  };

  useEffect(() => {
    fetchSettingsAndLogs();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/crawl/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      alert("Lỗi khi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    if (isRunningManual) return;
    setIsRunningManual(true);

    try {
      const res = await fetch(`/api/crawl/cronjob?api_key=${settings.apiKey}`);
      const data = await res.json();

      if (data.ok) {
        alert(`✅ Cào phim thành công: +${data.stats.insertedCount} mới, ~${data.stats.modifiedCount} cập nhật, ${data.stats.skippedCount} bỏ qua.`);
        fetchSettingsAndLogs();
      } else {
        alert(`⚠️ ${data.message || data.error}`);
      }
    } catch {
      alert("Lỗi khi kích hoạt cào phim");
    } finally {
      setIsRunningManual(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ lịch sử logs?")) return;
    try {
      await fetch("/api/crawl/logs", { method: "DELETE" });
      setLogs([]);
    } catch {
      alert("Lỗi khi xóa logs");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border transition-all ${
          isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 border ${
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
            }`}>
              <Clock size={22} />
            </div>
            <div>
              <h2 className={`text-base sm:text-xl font-extrabold tracking-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                Auto Cronjob & Thông Báo Telegram
              </h2>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                Tự động cào phim mới định kỳ và gửi báo cáo thống kê về Telegram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRunNow}
              disabled={isRunningManual}
              className={`h-11 px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
                isDark
                  ? "bg-white text-zinc-950 hover:bg-zinc-100"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10"
              }`}
            >
              {isRunningManual ? (
                <>
                  <RotateCcw size={16} className="animate-spin" />
                  <span>Đang chạy...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Kích hoạt cào ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Settings Card */}
        <div
          className={`p-6 rounded-3xl border space-y-5 ${
            isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200/90 shadow-sm"
          }`}
        >
          <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 pb-3 border-b ${
            isDark ? "border-zinc-800 text-zinc-300" : "border-zinc-200 text-zinc-700"
          }`}>
            <Activity size={16} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
            <span>Cài đặt chu kỳ & API</span>
          </h3>

          {/* Toggle enabled */}
          <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
            <div>
              <div className={`text-xs font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>Trạng thái Auto Crawl</div>
              <div className={`text-[11px] mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Cho phép hệ thống tự động cào phim theo lịch</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Chu kỳ chạy (phút)</label>
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.interval}
                onChange={(e) => setSettings({ ...settings, interval: parseInt(e.target.value) || 30 })}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Delay giữa các phim (ms)</label>
              <input
                type="number"
                min={300}
                step={100}
                value={settings.delay}
                onChange={(e) => setSettings({ ...settings, delay: parseInt(e.target.value) || 1000 })}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>CRON API KEY</label>
            <div className="relative">
              <Key className={`absolute left-3.5 top-3 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} size={15} />
              <input
                type="text"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none font-mono transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white font-bold"
                }`}
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              Dùng cho URL: <code>/api/crawl/cronjob?api_key={settings.apiKey}</code>
            </p>
          </div>

          {/* Telegram Settings */}
          <div className={`pt-3 space-y-3.5 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="flex items-center justify-between">
              <h4 className={`font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                <MessageSquare size={15} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
                <span>Thông báo Telegram</span>
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.telegram?.enabled ?? false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      telegram: {
                        enabled: e.target.checked,
                        botToken: settings.telegram?.botToken || "",
                        chatId: settings.telegram?.chatId || "",
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Telegram Bot Token</label>
              <input
                type="text"
                placeholder="123456789:ABCdef..."
                value={settings.telegram?.botToken || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    telegram: {
                      enabled: settings.telegram?.enabled ?? true,
                      botToken: e.target.value,
                      chatId: settings.telegram?.chatId || "",
                    },
                  })
                }
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Telegram Chat ID</label>
              <input
                type="text"
                placeholder="-100123456789 hoặc @channel"
                value={settings.telegram?.chatId || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    telegram: {
                      enabled: settings.telegram?.enabled ?? true,
                      botToken: settings.telegram?.botToken || "",
                      chatId: e.target.value,
                    },
                  })
                }
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                }`}
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-100"
                : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10"
            }`}
          >
            <Save size={15} />
            <span>{saving ? "Đang lưu..." : saveSuccess ? "✓ Đã lưu thành công" : "Lưu Cấu Hình"}</span>
          </button>
        </div>

        {/* History Logs Card */}
        <div
          className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${
            isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200/90 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              <Activity size={16} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
              <span>Lịch sử cào phim gần đây</span>
            </h3>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-zinc-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} />
                <span>Xóa logs</span>
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[350px] max-h-[480px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400 text-xs">
                Chưa có nhật ký cào phim nào.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                    isDark ? "bg-zinc-950/70 border-zinc-800/80" : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                        log.success
                          ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className={`text-[10px] font-mono ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                      {new Date(log.timestamp).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <p className={isDark ? "text-zinc-300" : "text-zinc-700 font-medium"}>{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
