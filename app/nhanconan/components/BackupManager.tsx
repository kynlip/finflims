"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Image as ImageIcon,
  Code2,
  PackageCheck,
  Download,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  HardDrive,
  Trash2,
  Sparkles,
  Server,
  Layers,
  FileJson,
  ShieldCheck,
  Clock,
  ArrowDownToLine,
  FileSpreadsheet,
  Globe,
  Copy,
  Check,
  Terminal,
} from "lucide-react";

interface CollectionStat {
  name: string;
  count: number;
  size: number;
}

interface BackupStatsData {
  database: {
    dbName: string;
    totalCollections: number;
    totalDocuments: number;
    totalSize: number;
    collections: CollectionStat[];
  };
  media: {
    count: number;
    totalSize: number;
    uploadsCount: number;
    uploadsSize: number;
    moviesUploadsCount?: number;
    moviesUploadsSize?: number;
    moviesUploadsDir?: string;
    staticImagesCount: number;
    staticImagesSize: number;
  };
  code: {
    totalFiles: number;
    totalSize: number;
    projectDir: string;
  };
  vps?: {
    host: string;
    projectDir: string;
    pm2Name: string;
    domain: string;
    nginxPath: string;
    nginxExists: boolean;
  };
  savedBackups: {
    count: number;
    totalSize: number;
    items: Array<{
      filename: string;
      path: string;
      size: number;
      type: "database" | "images" | "code" | "full" | "other";
      createdAt: string;
    }>;
  };
  system: {
    nodeVersion: string;
    platform: string;
    serverTime: string;
    uptimeSeconds: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

interface RestoreItemResult {
  collection: string;
  total: number;
  restored: number;
  errors: number;
  mode: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function getTimestampSuffix(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export default function BackupManager({ isDark }: { isDark: boolean }) {
  const [stats, setStats] = useState<BackupStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"quick" | "database" | "nginx" | "restore" | "server-files">("quick");

  // Action loading states
  const [backingUpDb, setBackingUpDb] = useState(false);
  const [backingUpImages, setBackingUpImages] = useState(false);
  const [backingUpCode, setBackingUpCode] = useState(false);
  const [backingUpFull, setBackingUpFull] = useState(false);
  const [downloadingNginx, setDownloadingNginx] = useState(false);
  const [downloadingCollection, setDownloadingCollection] = useState<string | null>(null);

  // Quick options
  const [dbFormat, setDbFormat] = useState<"zip" | "json">("zip");
  const [saveToDiskDb, setSaveToDiskDb] = useState(true);
  const [saveToDiskImages, setSaveToDiskImages] = useState(true);
  const [saveToDiskCode, setSaveToDiskCode] = useState(true);
  const [saveToDiskFull, setSaveToDiskFull] = useState(true);
  const [includeUploadsInCode, setIncludeUploadsInCode] = useState(false);
  const [includePublicImages, setIncludePublicImages] = useState(true);

  // Nginx modal & state
  const [nginxContent, setNginxContent] = useState<string | null>(null);
  const [nginxLoading, setNginxLoading] = useState(false);
  const [copiedNginx, setCopiedNginx] = useState(false);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [restoreCollectionName, setRestoreCollectionName] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmModal, setRestoreConfirmModal] = useState(false);
  const [restoreResults, setRestoreResults] = useState<RestoreItemResult[] | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/backup/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data);
      } else {
        showToast(data.error || "Không thể tải thông tin hệ thống", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // Helper to trigger browser file download from Blob response
  const triggerBrowserDownload = async (response: Response, defaultFilename: string) => {
    let filename = defaultFilename;
    const disp = response.headers.get("Content-Disposition");
    const customHeader = response.headers.get("X-Backup-Filename");

    if (customHeader) {
      filename = customHeader;
    } else if (disp && disp.includes("filename=")) {
      const match = disp.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // 1. Backup Database
  const handleBackupDatabase = async (specificCollections?: string[]) => {
    try {
      setBackingUpDb(true);
      showToast("Đang kết nối MongoDB và trích xuất dữ liệu...", "info");

      const res = await fetch("/api/admin/backup/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collections: specificCollections,
          format: dbFormat,
          saveToDisk: saveToDiskDb,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi khi sao lưu database");
      }

      await triggerBrowserDownload(
        res,
        `backup-db-${stats?.database.dbName || "hoathinh"}-${getTimestampSuffix()}.${dbFormat}`
      );
      showToast("Sao lưu Database thành công! File đang được tải xuống.", "success");
      void fetchStats();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi sao lưu database";
      showToast(msg, "error");
    } finally {
      setBackingUpDb(false);
    }
  };

  // 2. Backup Single Collection
  const handleBackupSingleCollection = async (collName: string) => {
    try {
      setDownloadingCollection(collName);
      const res = await fetch("/api/admin/backup/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collections: [collName],
          format: "json",
          saveToDisk: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Lỗi tải collection ${collName}`);
      }

      await triggerBrowserDownload(res, `collection-${collName}-${getTimestampSuffix()}.json`);
      showToast(`Đã xuất bảng ${collName} thành công!`, "success");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi tải bảng";
      showToast(msg, "error");
    } finally {
      setDownloadingCollection(null);
    }
  };

  // 3. Backup Images
  const handleBackupImages = async () => {
    try {
      setBackingUpImages(true);
      showToast("Đang nén kho ảnh /home/phimhay/public/uploads...", "info");

      const res = await fetch("/api/admin/backup/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includePublicImages,
          saveToDisk: saveToDiskImages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi khi sao lưu ảnh");
      }

      await triggerBrowserDownload(res, `backup-images-${getTimestampSuffix()}.zip`);
      showToast("Nén và tải kho ảnh thành công!", "success");
      void fetchStats();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi sao lưu ảnh";
      showToast(msg, "error");
    } finally {
      setBackingUpImages(false);
    }
  };

  // 4. Backup Source Code
  const handleBackupCode = async () => {
    try {
      setBackingUpCode(true);
      showToast("Đang nén mã nguồn website (bỏ .next, node_modules)...", "info");

      const res = await fetch("/api/admin/backup/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeUploads: includeUploadsInCode,
          saveToDisk: saveToDiskCode,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi khi sao lưu code");
      }

      await triggerBrowserDownload(res, `backup-code-${getTimestampSuffix()}.zip`);
      showToast("Đã đóng gói mã nguồn sạch thành công!", "success");
      void fetchStats();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi sao lưu mã nguồn";
      showToast(msg, "error");
    } finally {
      setBackingUpCode(false);
    }
  };

  // 5. Backup Full System All-In-One
  const handleBackupFull = async () => {
    try {
      setBackingUpFull(true);
      showToast("Đang tạo gói sao lưu toàn diện (DB + Media + Code + Nginx)...", "info");

      const res = await fetch("/api/admin/backup/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveToDisk: saveToDiskFull,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi khi tạo bản Full Backup");
      }

      await triggerBrowserDownload(res, `backup-full-hoathinh-${getTimestampSuffix()}.zip`);
      showToast("Sao lưu toàn bộ hệ thống hoàn tất!", "success");
      void fetchStats();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi sao lưu toàn bộ hệ thống";
      showToast(msg, "error");
    } finally {
      setBackingUpFull(false);
    }
  };

  // 6. Download / View Nginx Config
  const handleDownloadNginx = async () => {
    try {
      setDownloadingNginx(true);
      showToast("Đang tải cấu hình Nginx (/etc/nginx/sites-enabled/phimhayhonro.net)...", "info");
      const res = await fetch("/api/admin/backup/nginx?download=1");
      if (!res.ok) throw new Error("Không thể tải cấu hình Nginx");
      await triggerBrowserDownload(res, "phimhayhonro.net.conf");
      showToast("Đã tải cấu hình Nginx thành công!", "success");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi tải Nginx config";
      showToast(msg, "error");
    } finally {
      setDownloadingNginx(false);
    }
  };

  const handleFetchNginxContent = async () => {
    try {
      setNginxLoading(true);
      const res = await fetch("/api/admin/backup/nginx");
      const data = await res.json();
      if (data.success) {
        setNginxContent(data.content || "");
      } else {
        showToast(data.error || "Không thể đọc cấu hình Nginx", "error");
      }
    } catch {
      showToast("Lỗi kết nối", "error");
    } finally {
      setNginxLoading(false);
    }
  };

  const handleCopyNginx = async () => {
    if (nginxContent) {
      await navigator.clipboard.writeText(nginxContent);
      setCopiedNginx(true);
      setTimeout(() => setCopiedNginx(false), 2000);
      showToast("Đã sao chép cấu hình Nginx vào clipboard!", "success");
    }
  };

  // 7. Download file from server storage
  const handleDownloadSavedFile = async (relPath: string, filename: string) => {
    try {
      showToast(`Đang tải file ${filename}...`, "info");
      const res = await fetch(`/api/admin/backup/files?path=${encodeURIComponent(relPath)}`);
      if (!res.ok) throw new Error("Không thể tải file từ máy chủ");
      await triggerBrowserDownload(res, filename);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi tải file";
      showToast(msg, "error");
    }
  };

  // 8. Delete file from server storage
  const handleDeleteSavedFile = async (relPath: string, filename: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bản sao lưu "${filename}" khỏi máy chủ không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/backup/files?path=${encodeURIComponent(relPath)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa ${filename} thành công`, "success");
        void fetchStats();
      } else {
        showToast(data.error || "Lỗi khi xóa file", "error");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi kết nối máy chủ";
      showToast(msg, "error");
    }
  };

  // 9. Restore Execution
  const handleExecuteRestore = async () => {
    if (!restoreFile) {
      showToast("Vui lòng chọn file sao lưu (.json hoặc .zip)", "error");
      return;
    }

    try {
      setRestoring(true);
      setRestoreConfirmModal(false);
      showToast("Đang giải nén và nhập dữ liệu vào MongoDB...", "info");

      const formData = new FormData();
      formData.append("file", restoreFile);
      formData.append("mode", restoreMode);
      if (restoreCollectionName) {
        formData.append("targetCollection", restoreCollectionName.trim());
      }

      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setRestoreResults(data.results || []);
        showToast(data.message || "Khôi phục dữ liệu thành công!", "success");
        setRestoreFile(null);
        void fetchStats();
      } else {
        showToast(data.error || "Khôi phục dữ liệu thất bại", "error");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi khi khôi phục dữ liệu";
      showToast(msg, "error");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-2 duration-200 text-xs font-semibold ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 dark:text-emerald-400"
              : toast.type === "error"
              ? "bg-rose-500/15 border-rose-500/30 text-rose-500 dark:text-rose-400"
              : "bg-blue-500/15 border-blue-500/30 text-blue-500 dark:text-blue-400"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 size={16} className="shrink-0" />}
          {toast.type === "error" && <AlertTriangle size={16} className="shrink-0" />}
          {toast.type === "info" && <RefreshCw size={16} className="animate-spin shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <PackageCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-black tracking-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                  Sao Lưu & Khôi Phục Hệ Thống
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  VPS: /home/phimhay
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Bảo vệ toàn vẹn dữ liệu phim, ảnh upload, cấu hình Nginx và mã nguồn của bạn trong 1 cú click.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs"
            }`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Làm mới số liệu</span>
          </button>

          <button
            onClick={handleBackupFull}
            disabled={backingUpFull}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-black bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {backingUpFull ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>Full Backup 1-Click</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY STATS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: MongoDB Database */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark
              ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
              : "bg-white border-zinc-200/90 shadow-xs hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Database size={20} />
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {stats?.database.dbName || "MongoDB"}
            </span>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-black ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              {stats ? stats.database.totalDocuments.toLocaleString("vi-VN") : "..."}
            </div>
            <div className={`text-xs mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {stats ? `${stats.database.totalCollections} bảng • ${formatBytes(stats.database.totalSize)}` : "Đang tải dữ liệu..."}
            </div>
          </div>
          <button
            onClick={() => handleBackupDatabase()}
            disabled={backingUpDb}
            className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-800/80 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/60"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
            }`}
          >
            {backingUpDb ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Tải Database</span>
          </button>
        </div>

        {/* Card 2: Media & Images (Uploads / Movies) */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark
              ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
              : "bg-white border-zinc-200/90 shadow-xs hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ImageIcon size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 truncate max-w-[130px]" title="/public/uploads/movies">
              uploads/movies
            </span>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-black ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              {stats ? stats.media.count.toLocaleString("vi-VN") : "..."}
            </div>
            <div className={`text-xs mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {stats ? `${formatBytes(stats.media.totalSize)} • ${stats.media.moviesUploadsCount ?? stats.media.uploadsCount} poster/ảnh` : "Đang tính dung lượng..."}
            </div>
          </div>
          <button
            onClick={handleBackupImages}
            disabled={backingUpImages}
            className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 border border-zinc-700/60"
                : "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
            }`}
          >
            {backingUpImages ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Tải Kho Ảnh ZIP</span>
          </button>
        </div>

        {/* Card 3: Source Code (/home/phimhay) */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark
              ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
              : "bg-white border-zinc-200/90 shadow-xs hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Code2 size={20} />
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              /home/phimhay
            </span>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-black ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              {stats ? stats.code.totalFiles.toLocaleString("vi-VN") : "..."}
            </div>
            <div className={`text-xs mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {stats ? `${formatBytes(stats.code.totalSize)} • Bỏ node_modules & .next` : "Đang kiểm tra files..."}
            </div>
          </div>
          <button
            onClick={handleBackupCode}
            disabled={backingUpCode}
            className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-800/80 hover:bg-zinc-700 text-cyan-400 border border-zinc-700/60"
                : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200"
            }`}
          >
            {backingUpCode ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Tải Mã Nguồn ZIP</span>
          </button>
        </div>

        {/* Card 4: Nginx & Server Backups */}
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isDark
              ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
              : "bg-white border-zinc-200/90 shadow-xs hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Globe size={20} />
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Nginx & VPS
            </span>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-black ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              phimhayhonro.net
            </div>
            <div className={`text-xs mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {stats?.savedBackups.count || 0} bản sao lưu trên server
            </div>
          </div>
          <button
            onClick={() => setActiveTab("nginx")}
            className={`w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 border border-zinc-700/60"
                : "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
            }`}
          >
            <FileArchive size={13} />
            <span>Xem Cấu Hình Nginx</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto custom-scrollbar ${
          isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
        }`}
      >
        <button
          onClick={() => setActiveTab("quick")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "quick"
              ? isDark
                ? "bg-zinc-800 text-white shadow-xs"
                : "bg-zinc-900 text-white shadow-xs"
              : isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <PackageCheck size={16} />
          <span>📦 Sao Lưu Nhanh</span>
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "database"
              ? isDark
                ? "bg-zinc-800 text-white shadow-xs"
                : "bg-zinc-900 text-white shadow-xs"
              : isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Layers size={16} />
          <span>🗄️ Chi Tiết Database ({stats?.database.collections.length || 0})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("nginx");
            void handleFetchNginxContent();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "nginx"
              ? isDark
                ? "bg-zinc-800 text-white shadow-xs"
                : "bg-zinc-900 text-white shadow-xs"
              : isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Globe size={16} />
          <span>🌐 Cấu Hình Nginx & VPS</span>
        </button>

        <button
          onClick={() => setActiveTab("restore")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "restore"
              ? isDark
                ? "bg-zinc-800 text-white shadow-xs"
                : "bg-zinc-900 text-white shadow-xs"
              : isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <UploadCloud size={16} />
          <span>🔄 Khôi Phục Dữ Liệu (Restore)</span>
        </button>

        <button
          onClick={() => setActiveTab("server-files")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "server-files"
              ? isDark
                ? "bg-zinc-800 text-white shadow-xs"
                : "bg-zinc-900 text-white shadow-xs"
              : isDark
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <HardDrive size={16} />
          <span>💾 File Lưu Trên Server ({stats?.savedBackups.count || 0})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: QUICK BACKUP CARDS */}
      {activeTab === "quick" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Database Backup */}
          <div
            className={`p-6 rounded-3xl border flex flex-col justify-between ${
              isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Database size={22} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                    Sao Lưu Cơ Sở Dữ Liệu (MongoDB)
                  </h3>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Xuất toàn bộ collections: movies, users, settings, recharges, crawler logs.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl my-4 space-y-3 ${
                  isDark ? "bg-[#0d0f15] border border-zinc-800/60" : "bg-zinc-50 border border-zinc-200/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Định dạng xuất file:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDbFormat("zip")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        dbFormat === "zip"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : isDark
                          ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          : "bg-zinc-200 text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      ZIP (Từng bảng riêng)
                    </button>
                    <button
                      onClick={() => setDbFormat("json")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        dbFormat === "json"
                          ? "bg-emerald-500 text-white shadow-xs"
                          : isDark
                          ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          : "bg-zinc-200 text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      JSON (1 File duy nhất)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-zinc-700/40">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Lưu 1 bản vào máy chủ:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToDiskDb}
                      onChange={(e) => setSaveToDiskDb(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleBackupDatabase()}
              disabled={backingUpDb}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {backingUpDb ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{backingUpDb ? "Đang trích xuất Database..." : "Tải Về Bản Sao Lưu Database"}</span>
            </button>
          </div>

          {/* Action 2: Images & Uploads Backup */}
          <div
            className={`p-6 rounded-3xl border flex flex-col justify-between ${
              isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <ImageIcon size={22} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                    Sao Lưu Kho Ảnh (/public/uploads/movies)
                  </h3>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Nén ZIP toàn bộ ảnh poster, thumb phim tại /home/phimhay/public/uploads/movies.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl my-4 space-y-3 ${
                  isDark ? "bg-[#0d0f15] border border-zinc-800/60" : "bg-zinc-50 border border-zinc-200/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Bao gồm Logo & Favicon tĩnh:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePublicImages}
                      onChange={(e) => setIncludePublicImages(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-zinc-700/40">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Lưu 1 bản vào máy chủ:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToDiskImages}
                      onChange={(e) => setSaveToDiskImages(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleBackupImages}
              disabled={backingUpImages}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {backingUpImages ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{backingUpImages ? "Đang nén ảnh..." : "Tải Về Kho Ảnh (ZIP)"}</span>
            </button>
          </div>

          {/* Action 3: Source Code Backup */}
          <div
            className={`p-6 rounded-3xl border flex flex-col justify-between ${
              isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <Code2 size={22} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                    Sao Lưu Mã Nguồn (/home/phimhay)
                  </h3>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Tự động lọc bỏ .next, node_modules, logs, .venv, .git để zip siêu nhẹ.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl my-4 space-y-3 ${
                  isDark ? "bg-[#0d0f15] border border-zinc-800/60" : "bg-zinc-50 border border-zinc-200/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Kèm ảnh uploads trong code:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeUploadsInCode}
                      onChange={(e) => setIncludeUploadsInCode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-zinc-700/40">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Lưu 1 bản vào máy chủ:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToDiskCode}
                      onChange={(e) => setSaveToDiskCode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleBackupCode}
              disabled={backingUpCode}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {backingUpCode ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{backingUpCode ? "Đang đóng gói mã nguồn..." : "Tải Về Mã Nguồn Sạch (ZIP)"}</span>
            </button>
          </div>

          {/* Action 4: Full System All-In-One */}
          <div
            className={`p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden ${
              isDark
                ? "bg-linear-to-br from-[#11131a] to-[#17142b] border-indigo-500/30"
                : "bg-linear-to-br from-white to-indigo-50/50 border-indigo-200 shadow-xs"
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                  <PackageCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                      Sao Lưu Toàn Bộ (Full System All-in-One)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      KHUYÊN DÙNG
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Gói siêu đầy đủ: MongoDB JSON + Kho ảnh Media + Code Theme + Cấu hình Nginx.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl my-4 space-y-3 ${
                  isDark ? "bg-[#0d0f15]/80 border border-indigo-500/20" : "bg-indigo-50/50 border border-indigo-100"
                }`}
              >
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 size={13} />
                    <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>Database MongoDB (JSON tất cả bảng)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-500">
                    <CheckCircle2 size={13} />
                    <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>Kho ảnh /home/phimhay/public/uploads/movies</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-500">
                    <CheckCircle2 size={13} />
                    <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>Toàn bộ mã nguồn sạch (không node_modules/.next)</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <CheckCircle2 size={13} />
                    <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>Cấu hình Nginx /etc/nginx/sites-enabled/phimhayhonro.net</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-dashed border-indigo-500/20">
                  <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Lưu 1 bản vào máy chủ:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToDiskFull}
                      onChange={(e) => setSaveToDiskFull(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleBackupFull}
              disabled={backingUpFull}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/30 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {backingUpFull ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{backingUpFull ? "Đang đóng gói Full System..." : "Tải Về Toàn Bộ Hệ Thống (Master ZIP)"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: DATABASE COLLECTIONS DETAIL */}
      {activeTab === "database" && (
        <div
          className={`p-6 rounded-3xl border ${
            isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                Danh Sách Collection Trong Cơ Sở Dữ Liệu ({stats?.database.dbName || "captainmedia"})
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Bạn có thể sao lưu riêng từng bảng hoặc tải toàn bộ bảng bất kỳ dạng JSON.
              </p>
            </div>

            <button
              onClick={() => handleBackupDatabase()}
              disabled={backingUpDb}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {backingUpDb ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Tải Toàn Bộ Collections</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Tên Bảng (Collection)</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Số Lượng Bản Ghi</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Dung Lượng Ước Tính</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {stats?.database.collections.map((col) => (
                  <tr
                    key={col.name}
                    className={`transition-colors ${
                      isDark ? "hover:bg-zinc-800/40" : "hover:bg-zinc-50/80"
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
                        <span className={isDark ? "text-zinc-200" : "text-zinc-800"}>{col.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] ${
                        isDark ? "bg-zinc-800/90 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                      }`}>
                        {col.count.toLocaleString("vi-VN")} docs
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-mono ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      {formatBytes(col.size)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleBackupSingleCollection(col.name)}
                        disabled={downloadingCollection === col.name}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                          isDark
                            ? "bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/60"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                        title={`Tải file JSON của bảng ${col.name}`}
                      >
                        {downloadingCollection === col.name ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <FileJson size={12} />
                        )}
                        <span>Xuất JSON</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: NGINX & VPS CONFIGURATION */}
      {activeTab === "nginx" && (
        <div className="space-y-6">
          {/* VPS Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#11131a] border-zinc-800" : "bg-white border-zinc-200"}`}>
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
                <Server size={14} />
                <span>VPS Contabo Host</span>
              </div>
              <div className={`text-base font-black font-mono ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                46.250.226.213
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">PM2: phimhay • Port: 3000</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#11131a] border-zinc-800" : "bg-white border-zinc-200"}`}>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                <Globe size={14} />
                <span>Domain Web</span>
              </div>
              <div className={`text-base font-black ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                phimhayhonro.net
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">SSL Let&apos;s Encrypt Auto</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#11131a] border-zinc-800" : "bg-white border-zinc-200"}`}>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <Code2 size={14} />
                <span>Thư Mục Project</span>
              </div>
              <div className={`text-sm font-black font-mono truncate ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                /home/phimhay
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Bỏ .next, node_modules</div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#11131a] border-zinc-800" : "bg-white border-zinc-200"}`}>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                <ImageIcon size={14} />
                <span>Thư Mục Ảnh Movies</span>
              </div>
              <div className={`text-sm font-black font-mono truncate ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                /public/uploads/movies
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Alias trực tiếp trong Nginx</div>
            </div>
          </div>

          {/* Nginx Config Box */}
          <div
            className={`p-6 rounded-3xl border ${
              isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                    Cấu Hình Nginx Reverse Proxy
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    /etc/nginx/sites-enabled/phimhayhonro.net
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Reverse proxy port 3000 tới domain phimhayhonro.net và định tuyến thư mục /uploads/.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNginx}
                  disabled={!nginxContent}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isDark
                      ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {copiedNginx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedNginx ? "Đã chép" : "Sao chép"}</span>
                </button>

                <button
                  onClick={handleDownloadNginx}
                  disabled={downloadingNginx}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {downloadingNginx ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Tải File .conf</span>
                </button>
              </div>
            </div>

            {/* Code editor view */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <Terminal size={13} className="text-purple-400" />
                  <span>phimhayhonro.net.conf</span>
                </div>
                <span>Nginx Config</span>
              </div>
              <pre className="p-4 bg-[#0a0c10] text-zinc-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-[400px] custom-scrollbar">
                {nginxLoading ? "Đang tải cấu hình Nginx..." : nginxContent || "Chưa có nội dung cấu hình..."}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: RESTORE / ROLLBACK SYSTEM */}
      {activeTab === "restore" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Restore Form */}
          <div
            className={`lg:col-span-2 p-6 rounded-3xl border ${
              isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <UploadCloud size={22} />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                  Khôi Phục Dữ Liệu Từ File Sao Lưu
                </h3>
                <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Tải lên file sao lưu .JSON hoặc .ZIP để nạp lại dữ liệu vào MongoDB.
                </p>
              </div>
            </div>

            {/* Dropzone File Upload */}
            <div className="my-6">
              <label
                htmlFor="restore-file-upload"
                className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
                  restoreFile
                    ? isDark
                      ? "border-emerald-500/60 bg-emerald-500/5"
                      : "border-emerald-500 bg-emerald-50/50"
                    : isDark
                    ? "border-zinc-700/80 bg-[#0d0f15] hover:border-zinc-500"
                    : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
                }`}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  {restoreFile ? (
                    <>
                      <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-500 mb-2">
                        <FileArchive size={28} />
                      </div>
                      <span className={`text-sm font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                        {restoreFile.name}
                      </span>
                      <span className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        Dung lượng: {formatBytes(restoreFile.size)} • Nhấn để đổi file khác
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-2">
                        <ArrowDownToLine size={28} />
                      </div>
                      <span className={`text-sm font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                        Nhấp để chọn file sao lưu hoặc kéo thả vào đây
                      </span>
                      <span className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                        Hỗ trợ file .json (đơn lẻ hoặc toàn bộ) và file .zip chứa database
                      </span>
                    </>
                  )}
                </div>
                <input
                  id="restore-file-upload"
                  type="file"
                  accept=".json,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setRestoreFile(e.target.files[0]);
                      setRestoreResults(null);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Mode selection */}
            <div className="space-y-4 mb-6">
              <label className={`block text-xs font-bold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                Chế độ khôi phục dữ liệu:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setRestoreMode("merge")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    restoreMode === "merge"
                      ? isDark
                        ? "bg-emerald-500/10 border-emerald-500 text-zinc-100"
                        : "bg-emerald-50 border-emerald-500 text-zinc-900 shadow-xs"
                      : isDark
                      ? "bg-[#0d0f15] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span>Gộp & Cập nhật (Merge / Safe)</span>
                  </div>
                  <p className="text-[11px] mt-1.5 text-zinc-500 leading-relaxed">
                    Giữ nguyên dữ liệu cũ, chỉ thêm mới và ghi đè những bản ghi trùng ID. An toàn nhất!
                  </p>
                </div>

                <div
                  onClick={() => setRestoreMode("replace")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    restoreMode === "replace"
                      ? isDark
                        ? "bg-rose-500/10 border-rose-500 text-zinc-100"
                        : "bg-rose-50 border-rose-500 text-zinc-900 shadow-xs"
                      : isDark
                      ? "bg-[#0d0f15] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle size={16} className="text-rose-500" />
                    <span>Ghi đè hoàn toàn (Clean Replace)</span>
                  </div>
                  <p className="text-[11px] mt-1.5 text-zinc-500 leading-relaxed">
                    Xóa sạch toàn bộ dữ liệu hiện có trong các bảng được import rồi nạp lại từ đầu.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Target Collection Name (Optional) */}
            <div className="mb-6">
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Tên bảng đích trong MongoDB (Tùy chọn - chỉ cần khi import 1 file JSON đơn):
              </label>
              <input
                type="text"
                value={restoreCollectionName}
                onChange={(e) => setRestoreCollectionName(e.target.value)}
                placeholder="Ví dụ: movies, users, site_settings (để trống nếu file ZIP/JSON tự chứa tên)"
                className={`w-full px-4 py-2.5 rounded-xl text-xs border transition-all ${
                  isDark
                    ? "bg-[#0d0f15] border-zinc-800 text-zinc-100 focus:border-amber-500"
                    : "bg-white border-zinc-200 text-zinc-900 focus:border-amber-500"
                }`}
              />
            </div>

            <button
              onClick={() => {
                if (!restoreFile) {
                  showToast("Vui lòng chọn file sao lưu trước", "error");
                  return;
                }
                setRestoreConfirmModal(true);
              }}
              disabled={!restoreFile || restoring}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-extrabold text-xs text-black bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {restoring ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              <span>{restoring ? "Đang tiến hành khôi phục..." : "Bắt Đầu Khôi Phục Dữ Liệu"}</span>
            </button>

            {/* Restore Results Summary */}
            {restoreResults && (
              <div
                className={`mt-6 p-4 rounded-2xl border animate-in fade-in duration-200 ${
                  isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-500 mb-2">
                  <CheckCircle2 size={16} />
                  <span>Kết quả khôi phục:</span>
                </div>
                <div className="space-y-1 text-xs">
                  {restoreResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-emerald-500/10">
                      <span className="font-mono font-bold">{r.collection}</span>
                      <span>
                        Đã khôi phục: <strong className="text-emerald-500">{r.restored}</strong> / {r.total} bản ghi
                        {r.errors > 0 && <span className="text-rose-500 ml-2">({r.errors} lỗi)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 1 Col: Instructions & Safety Rules */}
          <div className="space-y-4">
            <div
              className={`p-6 rounded-3xl border ${
                isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
              }`}
            >
              <h4 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Hướng Dẫn Khôi Phục An Toàn</span>
              </h4>

              <div className={`mt-3 space-y-2.5 text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                <p>
                  1. <strong>Trước khi restore:</strong> Hãy luôn bấm nút <em>&quot;Sao lưu nhanh Database&quot;</em> để có 1 bản lưu dự phòng phòng trường hợp cần hoàn tác.
                </p>
                <p>
                  2. <strong>Khách hàng sửa lỗi hoặc làm hỏng dữ liệu:</strong> Bạn chỉ cần tải file backup trước đó lên đây và chọn chế độ <em>&quot;Gộp & Cập nhật&quot;</em>.
                </p>
                <p>
                  3. <strong>Hỗ trợ các định dạng:</strong> File `.zip` từ tính năng Backup của hệ thống hoặc file `.json` riêng từng bảng.
                </p>
              </div>
            </div>

            {/* System Info Box */}
            <div
              className={`p-6 rounded-3xl border ${
                isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
              }`}
            >
              <h4 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                <Server size={16} className="text-cyan-500" />
                <span>Môi Trường Máy Chủ</span>
              </h4>

              <div className={`mt-3 space-y-2 text-xs font-mono ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                <div className="flex justify-between">
                  <span>Node.js:</span>
                  <span className="font-bold text-zinc-300">{stats?.system.nodeVersion || "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nền tảng:</span>
                  <span className="font-bold text-zinc-300">{stats?.system.platform || "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span>RAM Heap:</span>
                  <span className="font-bold text-zinc-300">
                    {stats?.system.memoryUsage ? formatBytes(stats.system.memoryUsage.heapUsed) : "..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Giờ Server:</span>
                  <span className="text-[11px] text-zinc-300">
                    {stats?.system.serverTime ? formatDate(stats.system.serverTime) : "..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: SERVER STORAGE BACKUP FILES */}
      {activeTab === "server-files" && (
        <div
          className={`p-6 rounded-3xl border ${
            isDark ? "bg-[#11131a] border-zinc-800/80" : "bg-white border-zinc-200/90 shadow-xs"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                Bản Sao Lưu Được Lưu Trực Tiếp Trên Máy Chủ
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Vị trí thư mục: <code className="font-mono text-[11px] bg-zinc-800/60 px-1.5 py-0.5 rounded">/backups</code> trên hosting/server.
              </p>
            </div>

            <button
              onClick={() => fetchStats()}
              disabled={loading}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs"
              }`}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Quét lại thư mục</span>
            </button>
          </div>

          {stats?.savedBackups.items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto text-zinc-500 mb-3">
                <FileArchive size={24} />
              </div>
              <p className={`text-sm font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                Chưa có bản sao lưu nào được lưu trên máy chủ
              </p>
              <p className={`text-xs mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Khi thực hiện sao lưu, bạn có thể bật tùy chọn &quot;Lưu 1 bản vào máy chủ&quot;.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Tên File</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Loại</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Dung Lượng</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider">Thời Gian Tạo</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {stats?.savedBackups.items.map((file) => (
                    <tr
                      key={file.path}
                      className={`transition-colors ${
                        isDark ? "hover:bg-zinc-800/40" : "hover:bg-zinc-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2.5">
                          <FileArchive size={15} className="text-amber-400 shrink-0" />
                          <span className={isDark ? "text-zinc-200" : "text-zinc-800"}>{file.filename}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            file.type === "database"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : file.type === "images"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : file.type === "code"
                              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                              : file.type === "full"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20"
                          }`}
                        >
                          {file.type}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-mono ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                        {formatBytes(file.size)}
                      </td>
                      <td className={`py-3.5 px-4 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-zinc-500" />
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadSavedFile(file.path, file.filename)}
                            className={`p-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              isDark
                                ? "bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                            title="Tải file này về máy"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteSavedFile(file.path, file.filename)}
                            className={`p-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              isDark
                                ? "bg-zinc-800 hover:bg-rose-500/20 text-rose-400 border border-zinc-700"
                                : "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                            }`}
                            title="Xóa file khỏi máy chủ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
              isDark ? "bg-[#141722] border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/20">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold">Xác Nhận Khôi Phục Dữ Liệu</h3>
            </div>

            <p className={`text-xs mb-4 leading-relaxed ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
              Bạn đang chuẩn bị khôi phục dữ liệu từ file <strong className="font-mono text-indigo-400">{restoreFile?.name}</strong> với chế độ:{" "}
              <strong className={restoreMode === "replace" ? "text-rose-500" : "text-emerald-500"}>
                {restoreMode === "replace" ? "GHI ĐÈ HOÀN TOÀN (Clean Replace)" : "GỘP & CẬP NHẬT (Merge)"}
              </strong>
              .
            </p>

            {restoreMode === "replace" && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs mb-4">
                ⚠️ <strong>Cảnh báo nguy hiểm:</strong> Chế độ ghi đè sẽ xóa toàn bộ dữ liệu hiện có trong bảng trước khi import! Hãy chắc chắn bạn đã sao lưu trước đó.
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setRestoreConfirmModal(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isDark
                    ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
                    : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700"
                }`}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteRestore}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
              >
                Tôi đồng ý khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
