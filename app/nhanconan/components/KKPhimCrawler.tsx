"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  DownloadCloud,
  Play,
  RotateCcw,
  Search,
  Filter,
  Flame,
} from "lucide-react";

interface KKPhimCrawlerProps {
  isDark?: boolean;
}

interface StreamEvent {
  type: string;
  page?: number;
  pageTo?: number;
  slug?: string;
  name?: string;
  action?: "inserted" | "modified" | "skipped" | "error";
  message?: string;
  error?: string;
  stats?: {
    totalCount: number;
    insertedCount: number;
    modifiedCount: number;
    skippedCount: number;
    errorCount: number;
    duration: number;
  };
}

export default function KKPhimCrawler({ isDark = true }: KKPhimCrawlerProps) {
  const [crawlMode, setCrawlMode] = useState<"latest" | "manual">("latest");
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(2);
  const [concurrent, setConcurrent] = useState(2);
  const [delay, setDelay] = useState(1000);
  const [skipUpToDate, setSkipUpToDate] = useState(true);
  const [manualSlugs, setManualSlugs] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; text: string; type: "info" | "success" | "warn" | "error" }>>([]);
  const [currentProgress, setCurrentProgress] = useState<{
    page: number;
    pageTo: number;
    total: number;
    inserted: number;
    modified: number;
    skipped: number;
    error: number;
  }>({
    page: 1,
    pageTo: 1,
    total: 0,
    inserted: 0,
    modified: 0,
    skipped: 0,
    error: 0,
  });

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: "info" | "success" | "warn" | "error" = "info") => {
    setLogs((prev) => [...prev.slice(-200), { id: Date.now() + Math.random(), text, type }]);
  };

  const handleStartCrawl = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setCurrentProgress({
      page: pageFrom,
      pageTo,
      total: 0,
      inserted: 0,
      modified: 0,
      skipped: 0,
      error: 0,
    });

    addLog(`🚀 Bắt đầu cào dữ liệu từ KKPhim (phimapi.com)...`, "info");

    try {
      let endpoint = "/api/crawl/phim-moi";
      let body: Record<string, unknown> = {};

      if (crawlMode === "latest") {
        body = { pageFrom, pageTo, concurrentCrawls: concurrent, delay, skipUpToDate };
      } else {
        endpoint = "/api/crawl/thu-cong";
        body = { slugs: manualSlugs };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data: StreamEvent = JSON.parse(line);

            if (data.type === "start") {
              addLog(`📋 Đang khởi tạo quét danh sách phim...`, "info");
            } else if (data.type === "page_start") {
              addLog(`📄 Đang cào trang ${data.page}/${data.pageTo}...`, "info");
              setCurrentProgress((p) => ({ ...p, page: data.page || p.page, pageTo: data.pageTo || p.pageTo }));
            } else if (data.type === "movie_saved") {
              if (data.action === "inserted") {
                addLog(`✨ Mới: ${data.name || data.slug}`, "success");
                setCurrentProgress((p) => ({ ...p, inserted: p.inserted + 1, total: p.total + 1 }));
              } else if (data.action === "modified") {
                addLog(`🔄 Cập nhật: ${data.name || data.slug}`, "info");
                setCurrentProgress((p) => ({ ...p, modified: p.modified + 1, total: p.total + 1 }));
              } else if (data.action === "skipped") {
                addLog(`⏭️ Bỏ qua (Đã mới nhất): ${data.name || data.slug}`, "warn");
                setCurrentProgress((p) => ({ ...p, skipped: p.skipped + 1, total: p.total + 1 }));
              } else if (data.action === "error") {
                addLog(`❌ Lỗi: ${data.slug} (${data.error})`, "error");
                setCurrentProgress((p) => ({ ...p, error: p.error + 1, total: p.total + 1 }));
              }
            } else if (data.type === "complete" && data.stats) {
              addLog(
                `🎉 Hoàn tất cào phim trong ${data.stats.duration}s: +${data.stats.insertedCount} mới, ~${data.stats.modifiedCount} cập nhật, ${data.stats.skippedCount} bỏ qua, ${data.stats.errorCount} lỗi.`,
                "success"
              );
            } else if (data.type === "error") {
              addLog(`⚠️ ${data.message}`, "error");
            }
          } catch {
            // skip non-json
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addLog(`❌ Lỗi tiến trình: ${msg}`, "error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border transition-all ${
          isDark
            ? "bg-[#11131a] border-zinc-800/80 shadow-xl"
            : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 border ${
                isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
              }`}>
                <DownloadCloud size={22} />
              </div>
              <div>
                <h2 className={`text-base sm:text-xl font-extrabold tracking-tight flex items-center gap-2 ${
                  isDark ? "text-zinc-100" : "text-zinc-900"
                }`}>
                  <span>Cào Phim KKPhim</span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
                  }`}>
                    phimapi.com
                  </span>
                </h2>
                <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                  Tự động cào dữ liệu phim, tập phim & video streaming về MongoDB VPS
                </p>
              </div>
            </div>
          </div>

          <div className={`inline-flex p-1.5 rounded-2xl border ${
            isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
          }`}>
            <button
              onClick={() => setCrawlMode("latest")}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                crawlMode === "latest"
                  ? isDark
                    ? "bg-white text-zinc-950 shadow-md"
                    : "bg-zinc-900 text-white shadow-md"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Flame size={16} className={crawlMode === "latest" ? (isDark ? "text-amber-600" : "text-amber-400") : "text-amber-500"} />
              <span>Phim mới cập nhật</span>
            </button>
            <button
              onClick={() => setCrawlMode("manual")}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                crawlMode === "manual"
                  ? isDark
                    ? "bg-white text-zinc-950 shadow-md"
                    : "bg-zinc-900 text-white shadow-md"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Search size={16} />
              <span>Cào theo Slug</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`lg:col-span-1 p-6 rounded-3xl border space-y-5 ${
            isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200/90 shadow-sm"
          }`}
        >
          <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 pb-3 border-b ${
            isDark ? "border-zinc-800 text-zinc-300" : "border-zinc-200 text-zinc-700"
          }`}>
            <Filter size={16} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
            <span>Cấu hình cào phim</span>
          </h3>

          {crawlMode === "latest" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Từ trang</label>
                  <input
                    type="number"
                    min={1}
                    value={pageFrom}
                    onChange={(e) => setPageFrom(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono transition-all ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Đến trang</label>
                  <input
                    type="number"
                    min={pageFrom}
                    value={pageTo}
                    onChange={(e) => setPageTo(Math.max(pageFrom, parseInt(e.target.value) || pageFrom))}
                    className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono transition-all ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Số luồng (Concurrent)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={concurrent}
                    onChange={(e) => setConcurrent(Math.min(5, Math.max(1, parseInt(e.target.value) || 2)))}
                    className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono transition-all ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Delay (ms)</label>
                  <input
                    type="number"
                    min={300}
                    step={100}
                    value={delay}
                    onChange={(e) => setDelay(Math.max(300, parseInt(e.target.value) || 1000))}
                    className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono transition-all ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="skipUpToDate"
                  checked={skipUpToDate}
                  onChange={(e) => setSkipUpToDate(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <label htmlFor="skipUpToDate" className={`text-xs select-none cursor-pointer ${isDark ? "text-zinc-300" : "text-zinc-700 font-medium"}`}>
                  Bỏ qua phim đã cập nhật (tiết kiệm băng thông)
                </label>
              </div>
            </>
          ) : (
            <div>
              <label className={`text-xs font-semibold mb-1 block ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                Danh sách Slug (mỗi dòng 1 slug)
              </label>
              <textarea
                rows={6}
                value={manualSlugs}
                onChange={(e) => setManualSlugs(e.target.value)}
                placeholder="tham-tu-lung-danh-conan&#10;one-piece&#10;doraemon"
                className={`w-full border rounded-2xl p-3 text-xs outline-none font-mono transition-all ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                }`}
              />
            </div>
          )}

          <button
            onClick={handleStartCrawl}
            disabled={isRunning}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm ${
              isRunning
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                : isDark
                  ? "bg-white text-zinc-950 hover:bg-zinc-100 shadow-md active:scale-[0.98]"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-md shadow-zinc-900/10 active:scale-[0.98]"
            }`}
          >
            {isRunning ? (
              <>
                <RotateCcw className="animate-spin" size={17} />
                <span>Đang cào dữ liệu...</span>
              </>
            ) : (
              <>
                <Play size={17} />
                <span>Bắt đầu cào phim</span>
              </>
            )}
          </button>
        </div>

        {/* Live Terminal & Stats */}
        <div
          className={`lg:col-span-2 p-6 rounded-3xl border flex flex-col justify-between ${
            isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200/90 shadow-sm"
          }`}
        >
          {/* Progress Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className={`p-3.5 rounded-2xl border text-center ${
              isDark ? "bg-zinc-950/70 border-zinc-800/80" : "bg-zinc-50 border-zinc-200"
            }`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Mới thêm</div>
              <div className="text-xl font-black text-emerald-500 dark:text-emerald-400">+{currentProgress.inserted}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border text-center ${
              isDark ? "bg-zinc-950/70 border-zinc-800/80" : "bg-zinc-50 border-zinc-200"
            }`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Cập nhật</div>
              <div className="text-xl font-black text-sky-500 dark:text-sky-400">~{currentProgress.modified}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border text-center ${
              isDark ? "bg-zinc-950/70 border-zinc-800/80" : "bg-zinc-50 border-zinc-200"
            }`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Bỏ qua</div>
              <div className="text-xl font-black text-amber-500 dark:text-amber-400">{currentProgress.skipped}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border text-center ${
              isDark ? "bg-zinc-950/70 border-zinc-800/80" : "bg-zinc-50 border-zinc-200"
            }`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Lỗi</div>
              <div className="text-xl font-black text-rose-500 dark:text-rose-400">{currentProgress.error}</div>
            </div>
          </div>

          {/* Console logs */}
          <div
            ref={logContainerRef}
            className="flex-1 min-h-[260px] max-h-[360px] overflow-y-auto bg-zinc-950 rounded-2xl p-4 font-mono text-xs border border-zinc-800 space-y-1.5 custom-scrollbar"
          >
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500">
                Sẵn sàng cào phim. Bấm &quot;Bắt đầu cào phim&quot; để chạy.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-relaxed ${
                    log.type === "success"
                      ? "text-emerald-400"
                      : log.type === "warn"
                      ? "text-amber-400"
                      : log.type === "error"
                      ? "text-rose-400 font-bold"
                      : "text-zinc-300"
                  }`}
                >
                  {log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
