"use client";

import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Download, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';

interface FileInfo {
  fileName: string;
  size: number;
  uploadedAt: string;
}

interface ChangelogVersion {
  version: string;
  date: string;
  release_notes: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function parseReleaseNotes(notes: string): { type: 'new' | 'fix' | 'improve' | 'note'; text: string }[] {
  if (!notes) return [];
  return notes.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('+ ') || t.startsWith('✨') || t.toLowerCase().includes('thêm') || t.toLowerCase().includes('mới'))
      return { type: 'new' as const, text: t.replace(/^[+✨]\s*/, '') };
    if (t.startsWith('- ') || t.startsWith('🐛') || t.toLowerCase().includes('fix') || t.toLowerCase().includes('sửa'))
      return { type: 'fix' as const, text: t.replace(/^[-🐛]\s*/, '') };
    if (t.startsWith('~ ') || t.startsWith('⚡') || t.toLowerCase().includes('cải'))
      return { type: 'improve' as const, text: t.replace(/^[~⚡]\s*/, '') };
    return { type: 'note' as const, text: t.replace(/^[•·*-]\s*/, '') };
  });
}

const tagConfig = {
  new:     { label: 'Mới',      bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-400' },
  fix:     { label: 'Fix',      bg: 'bg-red-500/15',      text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400' },
  improve: { label: 'Cải tiến', bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  note:    { label: '',         bg: '',                   text: 'text-gray-400',    border: '',                      dot: 'bg-gray-500' },
};

function ChangelogEntry({ ver, isLatest }: { ver: ChangelogVersion; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);
  const items = parseReleaseNotes(ver.release_notes);

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 z-10 ${
        isLatest
          ? 'bg-sky-400 border-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
          : 'bg-gray-700 border-gray-600'
      }`} />

      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-3 flex-wrap mb-1.5">
          <span className={`text-base sm:text-lg font-extrabold font-mono tracking-tight ${isLatest ? 'text-white' : 'text-gray-300'}`}>
            v{ver.version}
          </span>
          {isLatest && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-400 border border-sky-400/30 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Mới nhất
            </span>
          )}
          <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(ver.date)}
          </span>
          <span className="ml-auto text-gray-500 group-hover:text-gray-300 transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 mb-1 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Không có ghi chú.</p>
          ) : (
            items.map((item, i) => {
              const cfg = tagConfig[item.type];
              return (
                <div key={i} className="flex items-start gap-2.5 text-sm sm:text-base">
                  <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                  {item.type !== 'note' && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border} uppercase tracking-wide`}>
                      {cfg.label}
                    </span>
                  )}
                  <span className="text-gray-200 leading-relaxed">{item.text}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Divider line */}
      <div className="absolute left-[6px] top-4 bottom-0 w-px bg-gray-800" />
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export default function TaiAppPage() {
  const [files, setFiles] = useState<{ ios: FileInfo | null; android: FileInfo | null; tv: FileInfo | null }>({
    ios: null, android: null, tv: null
  });
  const [versionInfo, setVersionInfo] = useState<{ version: string; release_notes: string; apk_size?: number; ipa_size?: number }>({
    version: '', release_notes: ''
  });
  const [changelog, setChangelog] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllChangelog, setShowAllChangelog] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/app-download');
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files ?? { ios: null, android: null, tv: null });
          setVersionInfo(data.version ?? { version: '', release_notes: '' });
          setChangelog(data.changelog?.versions || []);
        }
      } catch (error) {
        console.error('Failed to fetch app info:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Check if running in standalone PWA mode
    const nav = window.navigator as NavigatorWithStandalone;
    if (window.matchMedia('(display-mode: standalone)').matches || nav.standalone) {
      setIsInstalled(true);
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for PWA beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('Để cài đặt trên iPhone/iPad: Nhấn nút Chia sẻ (biểu tượng mũi tên lên) ở thanh dưới cùng Safari -> Chọn "Thêm vào Màn hình chính" (Add to Home Screen).');
    } else {
      alert('Để cài đặt Web App: Mở menu trình duyệt (3 dấu chấm) -> Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính".');
    }
  };

  const appItems = [
    {
      platform: 'android',
      label: 'Android',
      fileInfo: files.android,
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6,9.48l1.84-3.18c0.16-0.31,0.04-0.69-0.26-0.85c-0.29-0.15-0.65-0.06-0.83,0.22l-1.88,3.24 c-2.86-1.21-6.08-1.21-8.94,0L5.65,5.67c-0.19-0.29-0.58-0.38-0.87-0.2C4.5,5.65,4.41,6.01,4.56,6.3L6.4,9.48 C3.3,11.25,1.28,14.44,1,18h22C22.72,14.44,20.7,11.25,17.6,9.48z M7,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25S8.25,13.31,8.25,14C8.25,14.69,7.69,15.25,7,15.25z M17,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25C18.25,14.69,17.69,15.25,17,15.25z"/>
        </svg>
      ),
      description: 'Điện thoại & máy tính bảng',
      requirements: 'Android 6.0+',
      accentColor: '#38bdf8',
      glowColor: 'rgba(56,189,248,0.15)',
      sizeBytes: versionInfo.apk_size,
    },
    {
      platform: 'ios',
      label: 'iOS',
      fileInfo: files.ios,
      icon: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
      ),
      description: 'iPhone & iPad',
      requirements: 'iOS 12.0+',
      accentColor: '#e5e7eb',
      glowColor: 'rgba(229,231,235,0.1)',
      sizeBytes: versionInfo.ipa_size,
    },
    {
      platform: 'tv',
      label: 'Android TV',
      fileInfo: files.tv,
      icon: <Monitor className="w-10 h-10" />,
      description: 'TV Box & Smart TV',
      requirements: 'Android TV 6.0+',
      accentColor: '#fbbf24',
      glowColor: 'rgba(251,191,36,0.15)',
      sizeBytes: undefined,
    },
  ];

  const hasAnyFile = files.ios || files.android || files.tv;
  const visibleChangelog = showAllChangelog ? changelog : changelog.slice(0, 5);

  return (
    <div className="min-h-screen font-sans bg-[#0b1221] text-foreground">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-sky-900/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] bg-blue-900/15 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-amber-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24">

        {/* ── Hero ── */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-white/5">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white font-serif">
            Tải ứng dụng <span className="text-primary">Phim Hay Hơn Rổ</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto leading-relaxed opacity-70 mb-6">
            Xem anime không giới hạn · Chất lượng cao · Mọi thiết bị
          </p>
          {versionInfo.version && (
            <span className="inline-flex items-center gap-2 text-sm font-mono font-medium px-4 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              Phiên bản {versionInfo.version}
            </span>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* ── PWA Instant Install Card ── */}
        {!loading && (
          <div className="mb-12 rounded-3xl border border-[#D4AF68]/35 bg-linear-to-br from-[#D4AF68]/10 via-black/40 to-[#D4AF68]/5 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#D4AF68]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#D4AF68] to-[#B8860B] text-black flex items-center justify-center font-black text-2xl shrink-0 shadow-lg shadow-[#D4AF68]/20">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-white font-serif">
                      Cài đặt Web App (PWA)
                    </h2>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#D4AF68]/20 text-[#D4AF68] border border-[#D4AF68]/40">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
                    Trải nghiệm ứng dụng toàn màn hình siêu mượt, mở trực tiếp từ màn hình chính, tự động cập nhật và không tốn dung lượng máy.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstallPWA}
                className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-linear-to-r from-[#D4AF68] to-[#F3E5AB] text-black font-extrabold text-sm shadow-xl shadow-[#D4AF68]/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>{isInstalled ? 'Đã Cài Đặt (Mở App)' : 'Cài Đặt Web App Ngay'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Download Cards ── */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
            {appItems.map((app) => (
              <div
                key={app.platform}
                className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
                  app.fileInfo ? 'hover:-translate-y-1 hover:shadow-2xl' : 'opacity-50 grayscale'
                }`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: app.fileInfo ? `${app.accentColor}25` : 'rgba(255,255,255,0.06)',
                  boxShadow: app.fileInfo ? `0 0 0 1px ${app.accentColor}15` : 'none',
                }}
              >
                {/* Top accent line */}
                {app.fileInfo && (
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${app.accentColor}60, transparent)` }} />
                )}

                <div className="p-6 flex flex-col items-center text-center h-full">
                  {/* Icon */}
                  <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: `${app.accentColor}10`, color: app.accentColor }}>
                    {app.icon}
                  </div>

                  <h2 className="text-xl font-bold mb-1 text-white">{app.label}</h2>
                  <p className="text-xs opacity-60 mb-1">{app.description}</p>
                  <p className="text-[11px] font-mono opacity-40 mb-5">{app.requirements}</p>

                  {/* File size */}
                  {app.fileInfo && app.sizeBytes && (
                    <p className="text-xs opacity-50 mb-4 font-mono">{formatBytes(app.sizeBytes)}</p>
                  )}

                  <div className="mt-auto w-full">
                    {app.fileInfo ? (
                      <a
                        href={`/download/${app.fileInfo.fileName}`}
                        download
                        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 bg-primary text-primary-foreground"
                      >
                        <Download className="w-4 h-4" />
                        Tải xuống
                      </a>
                    ) : (
                      <div className="w-full rounded-xl px-4 py-3 text-center text-sm border border-white/10 text-white/40 opacity-40 cursor-not-allowed">
                        Sắp ra mắt
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Changelog ── */}
        {!loading && changelog.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <div>
                <h2 className="text-2xl font-bold text-white font-serif">Lịch sử cập nhật</h2>
                <p className="text-sm opacity-50 mt-0.5">Theo dõi những thay đổi qua từng phiên bản</p>
              </div>
            </div>

            <div className="space-y-8">
              {visibleChangelog.map((ver, idx) => (
                <ChangelogEntry key={ver.version} ver={ver} isLatest={idx === 0} />
              ))}
            </div>

            {changelog.length > 5 && (
              <button
                onClick={() => setShowAllChangelog(s => !s)}
                className="mt-8 ml-8 flex items-center gap-2 text-sm opacity-50 hover:opacity-80 transition-opacity"
              >
                {showAllChangelog ? (
                  <><ChevronUp className="w-4 h-4" /> Thu gọn</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Xem {changelog.length - 5} phiên bản cũ hơn</>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Hướng dẫn cài đặt ── */}
        {!loading && hasAnyFile && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-white font-serif">Hướng dẫn cài đặt</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {files.android && (
                <div className="rounded-2xl p-6 border border-sky-500/20 bg-white/[0.03] shadow-md">
                  <h3 className="font-extrabold text-base mb-4 text-white flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 text-xs font-black flex items-center justify-center border border-sky-500/30">A</span>
                    Android
                  </h3>
                  <ol className="space-y-2.5 text-sm text-gray-300 list-none">
                    {['Tải file .apk về điện thoại', 'Mở file để bắt đầu cài đặt', 'Cho phép cài từ nguồn không xác định nếu được hỏi'].map((step, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-sky-400 font-bold shrink-0">{i + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {files.ios && (
                <div className="rounded-2xl p-6 border border-white/15 bg-white/[0.03] shadow-md">
                  <h3 className="font-extrabold text-base mb-4 text-white flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-gray-500/20 text-gray-200 text-xs font-black flex items-center justify-center border border-white/20">i</span>
                    iOS
                  </h3>
                  <ol className="space-y-2.5 text-sm text-gray-300 list-none">
                    {['Tải file .ipa về máy tính', 'Dùng AltStore hoặc Sideloadly để cài vào thiết bị', 'Tin cậy chứng chỉ trong Cài đặt → Chung → VPN & Quản lý thiết bị'].map((step, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-zinc-300 font-bold shrink-0">{i + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {files.tv && (
                <div className="rounded-2xl p-6 border border-amber-500/20 bg-white/[0.03] shadow-md">
                  <h3 className="font-extrabold text-base mb-4 text-white flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center border border-amber-500/30">TV</span>
                    Android TV
                  </h3>
                  <ol className="space-y-2.5 text-sm text-gray-300 list-none">
                    {['Chép file .apk vào USB hoặc gửi qua mạng', 'Dùng File Manager trên TV để mở file', 'Hoặc dùng ứng dụng Send Files to TV từ điện thoại'].map((step, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center">
          <p className="text-xs opacity-30">
            Cần hỗ trợ? Liên hệ qua fanpage chính thức.
          </p>
        </div>
      </div>
    </div>
  );
}
