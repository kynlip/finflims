"use client";

import React, { useCallback, useState, useEffect } from "react";
import Image from "next/image";
import {
  Palette,
  Upload,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Type,
  FileImage,
} from "lucide-react";
import { useAdminTheme } from "../context/AdminThemeContext";
import { DEFAULT_SITE_SETTINGS, SiteSettings } from "@/lib/settings-types";

export default function AdminSettingsPage() {
  const { isDark } = useAdminTheme();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi tải cài đặt website", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Fetch current settings on mount
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã lưu thay đổi Logo & Tiêu đề thành công!", "success");
      } else {
        showToast(data.error || "Lỗi khi lưu cài đặt", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Không thể kết nối đến máy chủ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: "logo" | "favicon") => {
    const isLogo = type === "logo";
    const setUploading = isLogo ? setUploadingLogo : setUploadingFavicon;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("slug", type);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        if (isLogo) {
          setSettings((prev) => ({ ...prev, logoUrl: data.url }));
        } else {
          setSettings((prev) => ({ ...prev, faviconUrl: data.url }));
        }
        showToast(
          `Tải lên ${isLogo ? "Logo" : "Favicon"} thành công!`,
          "success",
        );
      } else {
        showToast(data.error || "Lỗi khi tải ảnh lên", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tải file", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-cyan-500">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="font-semibold text-sm">
            Đang tải cấu hình website...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl font-bold shadow-sm shrink-0 border ${
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
            }`}>
              <Palette size={20} />
            </div>
            <div>
              <h1
                className={`text-lg sm:text-xl font-extrabold tracking-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
              >
                Cài Đặt Thương Hiệu & Logo
              </h1>
              <p
                className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}
              >
                Tùy chỉnh Logo, Tiêu đề website, Favicon và thông tin hiển thị
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center justify-center gap-2 h-11 px-5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
            isDark
              ? "bg-white text-zinc-950 hover:bg-zinc-100"
              : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10"
          }`}
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          <span>{saving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Configuration (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Logo & Favicon */}
          <div
            className={`p-6 rounded-3xl border space-y-5 ${
              isDark
                ? "bg-[#11131a] border-zinc-800/80 shadow-xl"
                : "bg-white border-zinc-200/90 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <FileImage size={18} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
              <h2
                className={`font-bold text-base ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
              >
                Hình Ảnh Logo & Favicon
              </h2>
            </div>

            {/* Logo Image Upload / URL */}
            <div className="space-y-3">
              <label
                className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Logo Website Chính (Khuyên dùng PNG trong suốt)
              </label>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Logo Preview Box */}
                <div className={`relative h-20 w-48 rounded-2xl border overflow-hidden flex items-center justify-center p-2 shrink-0 ${
                  isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                }`}>
                  {settings.logoUrl ? (
                    <Image
                      src={settings.logoUrl}
                      alt="Logo Preview"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">Chưa có Logo</span>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="relative">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "logo");
                      }}
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                        isDark
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200"
                      }`}
                    >
                      {uploadingLogo ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>
                        {uploadingLogo ? "Đang tải lên..." : "Tải lên Logo mới"}
                      </span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.logoUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, logoUrl: e.target.value })
                    }
                    placeholder="Hoặc dán URL ảnh trực tiếp (/images/logo/logo.png)..."
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono transition-colors outline-none ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Favicon Upload / URL */}
            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label
                className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Icon Tab Trình Duyệt (Favicon)
              </label>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Favicon Preview Box */}
                <div className={`relative h-14 w-14 rounded-2xl border overflow-hidden flex items-center justify-center p-2 shrink-0 ${
                  isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                }`}>
                  {settings.faviconUrl ? (
                    <Image
                      src={settings.faviconUrl}
                      alt="Favicon Preview"
                      fill
                      className="object-contain p-1.5"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400">Favicon</span>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="relative">
                    <input
                      type="file"
                      id="favicon-upload"
                      accept="image/png,image/x-icon,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "favicon");
                      }}
                    />
                    <label
                      htmlFor="favicon-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                        isDark
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200"
                      }`}
                    >
                      {uploadingFavicon ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>
                        {uploadingFavicon
                          ? "Đang tải lên..."
                          : "Tải lên Favicon mới"}
                      </span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.faviconUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, faviconUrl: e.target.value })
                    }
                    placeholder="URL Favicon (/images/logo/favicon.ico)..."
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-mono transition-colors outline-none ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Website Title & SEO */}
          <div
            className={`p-6 rounded-3xl border space-y-5 ${
              isDark
                ? "bg-[#11131a] border-zinc-800/80 shadow-xl"
                : "bg-white border-zinc-200/90 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <Type size={18} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
              <h2
                className={`font-bold text-base ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
              >
                Tiêu Đề & Thương Hiệu Website
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                >
                  Tên Thương Hiệu Website (Site Title)
                </label>
                <input
                  type="text"
                  value={settings.siteTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, siteTitle: e.target.value })
                  }
                  placeholder="Ví dụ: Phim Hay Hơn Rổ"
                  className={`w-full text-sm font-bold px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                >
                  Khẩu Hiệu / Tiêu Đề Phụ (Slogan)
                </label>
                <input
                  type="text"
                  value={settings.siteSubtitle}
                  onChange={(e) =>
                    setSettings({ ...settings, siteSubtitle: e.target.value })
                  }
                  placeholder="Ví dụ: Xem Phim Hoạt Hình & Anime Vietsub Online"
                  className={`w-full text-sm px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                >
                  Mô Tả SEO (Meta Description)
                </label>
                <textarea
                  rows={3}
                  value={settings.siteDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      siteDescription: e.target.value,
                    })
                  }
                  placeholder="Mô tả tóm tắt khi chia sẻ link Facebook, Zalo, Google..."
                  className={`w-full text-xs px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Footer Information */}
          <div
            className={`p-6 rounded-3xl border space-y-5 ${
              isDark
                ? "bg-[#11131a] border-zinc-800/80 shadow-xl"
                : "bg-white border-zinc-200/90 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <Globe size={18} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
              <h2
                className={`font-bold text-base ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
              >
                Thông Tin Chân Trang (Footer)
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                >
                  Giới thiệu chân trang
                </label>
                <textarea
                  rows={2}
                  value={settings.footerText}
                  onChange={(e) =>
                    setSettings({ ...settings, footerText: e.target.value })
                  }
                  className={`w-full text-xs px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                >
                  Bản quyền (Copyright)
                </label>
                <input
                  type="text"
                  value={settings.copyrightText}
                  onChange={(e) =>
                    setSettings({ ...settings, copyrightText: e.target.value })
                  }
                  placeholder="© 2026 Phim Hay Hơn Rổ..."
                  className={`w-full text-xs px-4 py-2.5 rounded-xl border transition-colors outline-none ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className={`sticky top-6 p-6 rounded-3xl border space-y-6 ${
              isDark
                ? "bg-[#11131a] border-zinc-800/80 shadow-2xl"
                : "bg-white border-zinc-200/90 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Eye size={18} className={isDark ? "text-zinc-300" : "text-zinc-700"} />
                <h3
                  className={`font-bold text-sm ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
                >
                  Xem Trước Trực Tiếp (Live Preview)
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
              }`}>
                Real-time
              </span>
            </div>

            {/* Browser Tab Preview */}
            <div className="space-y-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Tab Trình Duyệt:
              </span>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                {settings.faviconUrl && (
                  <div className="relative h-4 w-4 shrink-0">
                    <Image
                      src={settings.faviconUrl}
                      alt="fav"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
                <span className={`truncate font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                  {settings.siteTitle} - {settings.siteSubtitle}
                </span>
              </div>
            </div>

            {/* Navbar Header Preview */}
            <div className="space-y-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Thanh Điều Hướng (Navbar):
              </span>
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <div className="relative h-10 w-36">
                  {settings.logoUrl && (
                    <Image
                      src={settings.logoUrl}
                      alt="Logo"
                      fill
                      className="object-contain object-left"
                      unoptimized
                    />
                  )}
                </div>
                <div className={`flex items-center gap-2 text-[11px] font-bold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  <span className={isDark ? "text-white" : "text-zinc-900"}>Trang Chủ</span>
                  <span>Phim Mới</span>
                  <span>Thể Loại</span>
                </div>
              </div>
            </div>

            {/* Footer Preview */}
            <div className="space-y-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Chân Trang (Footer):
              </span>
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <div className="relative h-10 w-36">
                  {settings.logoUrl && (
                    <Image
                      src={settings.logoUrl}
                      alt="Logo"
                      fill
                      className="object-contain object-left"
                      unoptimized
                    />
                  )}
                </div>
                <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                  {settings.footerText}
                </p>
                <div className={`pt-2 border-t text-[10px] ${isDark ? "border-zinc-800 text-zinc-500" : "border-zinc-200 text-zinc-400"}`}>
                  {settings.copyrightText}
                </div>
              </div>
            </div>

            {/* Action Bottom */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {saving ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>
                {saving ? "Đang cập nhật..." : "Áp Dụng Thay Đổi Ngay"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
