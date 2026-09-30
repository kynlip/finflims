'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Code,
  ShieldCheck,
  Power,
  Layers,
} from 'lucide-react';
import { useAdminTheme } from '../context/AdminThemeContext';
import { AdPlacement, AdPosition, AdSettings, AdType, DEFAULT_AD_SETTINGS } from '@/lib/ads-types';

const POSITION_LABELS: Record<AdPosition, string> = {
  header: 'Đầu Trang (Header)',
  player_top: 'Phía Trên Trình Chiếu',
  player_bottom: 'Phía Dưới Trình Chiếu',
  sidebar: 'Cột Phải (Sidebar)',
  footer: 'Chân Trang (Footer)',
  popunder: 'Popunder / In-page Push',
  in_page: 'Giữa Nội Dung',
  custom_script: 'Mã Script Tùy Biến',
};

export default function AdminAdsPage() {
  const { isDark } = useAdminTheme();
  const [settings, setSettings] = useState<AdSettings>(DEFAULT_AD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit/Add modal state
  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ads');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching ads settings:', err);
      setMessage({ type: 'error', text: 'Không thể tải cấu hình quảng cáo' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (updatedSettings?: AdSettings) => {
    const toSave = updatedSettings || settings;
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMessage({ type: 'success', text: 'Đã lưu cấu hình quảng cáo thành công!' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi lưu cấu hình' });
      }
    } catch (err) {
      console.error('Error saving ads:', err);
      setMessage({ type: 'error', text: 'Lỗi mạng khi lưu cài đặt quảng cáo' });
    } finally {
      setSaving(false);
    }
  };

  const toggleGlobal = () => {
    const next = { ...settings, globalEnabled: !settings.globalEnabled };
    setSettings(next);
    handleSave(next);
  };

  const toggleVipBypass = () => {
    const next = { ...settings, vipBypassAll: !settings.vipBypassAll };
    setSettings(next);
  };

  const togglePlacement = (id: string) => {
    const newPlacements = settings.placements.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    const next = { ...settings, placements: newPlacements };
    setSettings(next);
  };

  const handleDeletePlacement = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vị trí quảng cáo này?')) return;
    const newPlacements = settings.placements.filter((p) => p.id !== id);
    const next = { ...settings, placements: newPlacements };
    setSettings(next);
  };

  const openNewPlacementModal = () => {
    setEditingPlacement({
      id: `ad_${Date.now()}`,
      name: 'Vị trí quảng cáo mới',
      position: 'player_bottom',
      type: 'html',
      code: '',
      bannerImageUrl: '',
      bannerTargetUrl: '',
      bannerAlt: '',
      enabled: true,
      vipBypass: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlacement) return;

    const exists = settings.placements.some((p) => p.id === editingPlacement.id);
    let newPlacements: AdPlacement[];
    if (exists) {
      newPlacements = settings.placements.map((p) =>
        p.id === editingPlacement.id ? editingPlacement : p
      );
    } else {
      newPlacements = [...settings.placements, editingPlacement];
    }

    const next = { ...settings, placements: newPlacements };
    setSettings(next);
    setIsModalOpen(false);
    setEditingPlacement(null);
  };

  const cardBg = isDark ? 'bg-[#151822] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm';
  const inputBg = isDark
    ? 'bg-[#0f1118] border-zinc-700 text-zinc-100 placeholder-zinc-500'
    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400';
  const subText = isDark ? 'text-zinc-400' : 'text-zinc-500';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
          <p className={subText}>Đang tải cấu hình quảng cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header & Save Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Quản Lý Quảng Cáo (Ad Manager)
              </h1>
              <p className={`text-xs sm:text-sm ${subText}`}>
                Quản lý các mạng quảng cáo (Google AdSense, Popunder, Banner tùy biến, Script)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
          </button>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-sm font-bold animate-fade-in ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Quick Global Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Master Switch */}
        <div className={`rounded-3xl border p-5 sm:p-6 transition-all ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl border transition-colors ${
                  settings.globalEnabled
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700/40 bg-zinc-800/40 text-zinc-500'
                }`}
              >
                <Power className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-bold text-base">Tổng Công Tắc Quảng Cáo</h3>
                <p className={`text-xs ${subText}`}>
                  {settings.globalEnabled
                    ? 'Đang BẬT: Các vị trí quảng cáo được kích hoạt sẽ hiển thị'
                    : 'Đang TẮT: Toàn bộ quảng cáo trên trang web bị tắt'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleGlobal}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.globalEnabled ? 'bg-emerald-500' : isDark ? 'bg-zinc-800' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.globalEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* VIP Bypass Switch */}
        <div className={`rounded-3xl border p-5 sm:p-6 transition-all ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl border transition-colors ${
                  settings.vipBypassAll
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-700/40 bg-zinc-800/40 text-zinc-500'
                }`}
              >
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-bold text-base">Miễn Quảng Cáo Cho Thành Viên VIP</h3>
                <p className={`text-xs ${subText}`}>
                  {settings.vipBypassAll
                    ? 'Đang BẬT: Tài khoản VIP tự động không bao giờ thấy quảng cáo'
                    : 'Đang TẮT: VIP vẫn hiển thị quảng cáo như người dùng thường'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleVipBypass}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.vipBypassAll ? 'bg-amber-500' : isDark ? 'bg-zinc-800' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.vipBypassAll ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Global Scripts Section (Header & Footer code) */}
      <div className={`rounded-3xl border p-5 sm:p-6 space-y-4 ${cardBg}`}>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
          <Code className="h-4 w-4" />
          <span>Mã Script Mạng Quảng Cáo Toàn Trang (AdSense / Header / Footer)</span>
        </div>
        <p className={`text-xs ${subText}`}>
          Chèn mã nhúng script từ các nhà cung cấp quảng cáo (Google AdSense, Adsterra, PopAds, Popunder tag).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-400">
              Mã nhúng Header Script (&lt;head&gt;)
            </label>
            <textarea
              rows={4}
              value={settings.headerScript || ''}
              onChange={(e) => setSettings({ ...settings, headerScript: e.target.value })}
              placeholder="<!-- Ví dụ: <script async src='https://pagead2.googlesyndication.com/...'></script> -->"
              className={`w-full rounded-2xl border p-3 font-mono text-xs outline-none transition-colors ${inputBg}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-400">
              Mã nhúng Footer Script (&lt;body&gt; bottom)
            </label>
            <textarea
              rows={4}
              value={settings.footerScript || ''}
              onChange={(e) => setSettings({ ...settings, footerScript: e.target.value })}
              placeholder="<!-- Ví dụ: Mã direct link popunder hoặc popup script -->"
              className={`w-full rounded-2xl border p-3 font-mono text-xs outline-none transition-colors ${inputBg}`}
            />
          </div>
        </div>
      </div>

      {/* Placements List */}
      <div className={`rounded-3xl border p-5 sm:p-6 space-y-4 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            <Layers className="h-4 w-4" />
            <span>Danh Sách Vị Trí Quảng Cáo ({settings.placements.length})</span>
          </div>

          <button
            type="button"
            onClick={openNewPlacementModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Vị Trí Mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.placements.map((placement) => (
            <div
              key={placement.id}
              className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                isDark ? 'border-zinc-800 bg-[#0e1017]' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm truncate">{placement.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                          placement.enabled
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-700/30 text-zinc-500'
                        }`}
                      >
                        {placement.enabled ? 'Đang Bật' : 'Tắt'}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${subText}`}>
                      Vị trí: <span className="font-bold text-amber-400">{POSITION_LABELS[placement.position] || placement.position}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlacement(placement);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlacement(placement.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Type Preview info */}
                <div className="mt-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Định dạng:</span>
                    <span className="font-mono font-bold uppercase text-[11px] text-cyan-400">
                      {placement.type}
                    </span>
                    {placement.vipBypass && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        VIP Miễn
                      </span>
                    )}
                  </div>

                  {placement.notes && (
                    <p className={`text-[11px] italic line-clamp-1 ${subText}`}>
                      {placement.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => togglePlacement(placement.id)}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    placement.enabled
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {placement.enabled ? 'Tắt vị trí này' : 'Bật vị trí này'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPlacement(placement);
                    setIsModalOpen(true);
                  }}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Cấu hình mã &gt;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && editingPlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-6 max-h-[90vh] overflow-y-auto shadow-2xl ${cardBg}`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                <span>Cấu Hình Vị Trí Quảng Cáo</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPlacement(null);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 pt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400">Tên vị trí quảng cáo</label>
                  <input
                    type="text"
                    required
                    value={editingPlacement.name}
                    onChange={(e) =>
                      setEditingPlacement({ ...editingPlacement, name: e.target.value })
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400">Vị trí hiển thị</label>
                  <select
                    value={editingPlacement.position}
                    onChange={(e) =>
                      setEditingPlacement({
                        ...editingPlacement,
                        position: e.target.value as AdPosition,
                      })
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                  >
                    {Object.entries(POSITION_LABELS).map(([pos, label]) => (
                      <option key={pos} value={pos}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400">Loại quảng cáo</label>
                  <select
                    value={editingPlacement.type}
                    onChange={(e) =>
                      setEditingPlacement({
                        ...editingPlacement,
                        type: e.target.value as AdType,
                      })
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                  >
                    <option value="html">Mã HTML / Script Mạng Quảng Cáo (AdSense, v.v.)</option>
                    <option value="banner">Banner Ảnh Tự Động (Link ảnh + Link đích)</option>
                    <option value="script">Script Tự Do</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlacement.enabled}
                      onChange={(e) =>
                        setEditingPlacement({
                          ...editingPlacement,
                          enabled: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                    <span className="text-xs font-bold">Kích hoạt</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlacement.vipBypass}
                      onChange={(e) =>
                        setEditingPlacement({
                          ...editingPlacement,
                          vipBypass: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded accent-amber-500"
                    />
                    <span className="text-xs font-bold">VIP Miễn hiển thị</span>
                  </label>
                </div>
              </div>

              {editingPlacement.type === 'banner' ? (
                <div className="space-y-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-400">URL Hình ảnh Banner</label>
                    <input
                      type="url"
                      placeholder="https://... hoặc /uploads/banner.png"
                      value={editingPlacement.bannerImageUrl || ''}
                      onChange={(e) =>
                        setEditingPlacement({
                          ...editingPlacement,
                          bannerImageUrl: e.target.value,
                        })
                      }
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-400">URL Đích khi người dùng Click</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editingPlacement.bannerTargetUrl || ''}
                      onChange={(e) =>
                        setEditingPlacement({
                          ...editingPlacement,
                          bannerTargetUrl: e.target.value,
                        })
                      }
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400">
                    Mã HTML / Script Quảng Cáo
                  </label>
                  <textarea
                    rows={6}
                    value={editingPlacement.code || ''}
                    onChange={(e) =>
                      setEditingPlacement({
                        ...editingPlacement,
                        code: e.target.value,
                      })
                    }
                    placeholder="<ins class='adsbygoogle' ...></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>"
                    className={`w-full rounded-2xl border p-3 font-mono text-xs outline-none ${inputBg}`}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ghi chú vị trí hoặc đối tác liên kết..."
                  value={editingPlacement.notes || ''}
                  onChange={(e) =>
                    setEditingPlacement({
                      ...editingPlacement,
                      notes: e.target.value,
                    })
                  }
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPlacement(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black text-xs font-extrabold hover:bg-amber-400"
                >
                  Cập Nhật Vị Trí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
