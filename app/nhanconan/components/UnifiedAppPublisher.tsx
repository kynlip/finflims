"use client";

import { useState, useEffect } from 'react';
import { Upload, Check, X, FileText, RefreshCw, Tag, Calendar, ChevronDown, ChevronUp, Sparkles, Smartphone } from 'lucide-react';
import { uploadAppFile, updateAppVersion } from '@/app/actions/app-management';

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

function formatBytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseNotes(notes: string): { type: 'new' | 'fix' | 'improve' | 'note'; text: string }[] {
  if (!notes) return [];
  return notes.split('\n').filter(l => l.trim()).map(line => {
    const t = line.trim();
    if (t.startsWith('+ ') || t.toLowerCase().includes('thêm') || t.toLowerCase().includes('mới'))
      return { type: 'new' as const, text: t.replace(/^[+✨]\s*/, '') };
    if (t.startsWith('- ') || t.toLowerCase().includes('fix') || t.toLowerCase().includes('sửa'))
      return { type: 'fix' as const, text: t.replace(/^[-🐛]\s*/, '') };
    if (t.startsWith('~ ') || t.toLowerCase().includes('cải'))
      return { type: 'improve' as const, text: t.replace(/^[~⚡]\s*/, '') };
    return { type: 'note' as const, text: t.replace(/^[•·*-]\s*/, '') };
  });
}

const tagCfg = {
  new:     { label: 'Mới',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  fix:     { label: 'Fix',      cls: 'bg-red-500/15 text-red-400 border-red-500/30',             dot: 'bg-red-400' },
  improve: { label: 'Cải tiến', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',          dot: 'bg-blue-400' },
  note:    { label: '',         cls: '',                                                           dot: 'bg-gray-600' },
};

function ChangelogCard({ ver, isLatest, isDark }: { ver: ChangelogVersion; isLatest: boolean; isDark: boolean }) {
  const [open, setOpen] = useState(isLatest);
  const items = parseNotes(ver.release_notes);

  return (
    <div className={`relative rounded-xl border transition-colors ${
      isDark
        ? isLatest ? 'bg-white/5 border-white/15' : 'bg-black/20 border-white/8 hover:border-white/12'
        : isLatest ? 'bg-white/70 border-slate-200' : 'bg-white/40 border-slate-200/60 hover:border-slate-300'
    }`}>
      {isLatest && (
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-xl bg-linear-to-r from-transparent via-yellow-400/60 to-transparent" />
      )}

      <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        <span className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg shrink-0 ${
          isLatest
            ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
            : isDark ? 'bg-white/8 text-slate-300 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          v{ver.version}
        </span>

        {isLatest && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 uppercase tracking-wider shrink-0">
            <Sparkles className="w-2.5 h-2.5" /> Latest
          </span>
        )}

        <span className={`flex items-center gap-1 text-xs shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Calendar className="w-3 h-3" />
          {formatDate(ver.date)}
        </span>

        {items.length > 0 && (
          <span className={`text-xs shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {items.length} thay đổi
          </span>
        )}

        <span className={`ml-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className={`px-4 pb-4 pt-1 border-t ${isDark ? 'border-white/8' : 'border-slate-100'}`}>
          {items.length === 0 ? (
            <p className={`text-xs italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Không có ghi chú.</p>
          ) : (
            <ul className="space-y-2 mt-2">
              {items.map((item, i) => {
                const cfg = tagCfg[item.type];
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    {item.type !== 'note' && (
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    )}
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function UnifiedAppPublisher({ isDark }: { isDark: boolean }) {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [version, setVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [ipaFile, setIpaFile] = useState<File | null>(null);
  const [tvFile, setTvFile] = useState<File | null>(null);

  const [currentApk, setCurrentApk] = useState<FileInfo | null>(null);
  const [currentIpa, setCurrentIpa] = useState<FileInfo | null>(null);
  const [currentTv, setCurrentTv] = useState<FileInfo | null>(null);
  const [latestJson, setLatestJson] = useState<{
    version: string; release_notes: string;
    apk_url?: string; apk_size?: number;
    ipa_url?: string; ipa_size?: number;
    tv_url?: string;  tv_size?: number;
  } | null>(null);
  const [changelog, setChangelog] = useState<ChangelogVersion[]>([]);
  const [showAll, setShowAll] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/app-download');
      if (res.ok) {
        const data = await res.json();
        setCurrentApk(data.files.android);
        setCurrentIpa(data.files.ios);
        setCurrentTv(data.files.tv);
        setLatestJson(data.version || null);
        setChangelog(data.changelog?.versions || []);

        if (data.version?.version) {
          const parts = data.version.version.split('.').map(Number);
          parts[2] += 1;
          if (parts[2] >= 10) { parts[1] += 1; parts[2] = 0; }
          setVersion(parts.join('.'));
        }
      }
    } catch (e) {
      console.error('Failed to load:', e);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const handlePublish = async () => {
    if (!version) { setMessage({ type: 'error', text: 'Vui lòng nhập version!' }); return; }
    setPublishing(true);
    setMessage(null);
    try {
      if (apkFile) {
        const fd = new FormData(); fd.append('file', apkFile); fd.append('platform', 'android');
        const r = await uploadAppFile(fd);
        if (!r.success) throw new Error(`Upload APK: ${r.error}`);
      }
      if (ipaFile) {
        const fd = new FormData(); fd.append('file', ipaFile); fd.append('platform', 'ios');
        const r = await uploadAppFile(fd);
        if (!r.success) throw new Error(`Upload IPA: ${r.error}`);
      }
      if (tvFile) {
        const fd = new FormData(); fd.append('file', tvFile); fd.append('platform', 'tv');
        const r = await uploadAppFile(fd);
        if (!r.success) throw new Error(`Upload TV APK: ${r.error}`);
      }
      const vr = await updateAppVersion(version, releaseNotes);
      if (!vr.success) throw new Error(`Update version: ${vr.error}`);

      setMessage({ type: 'success', text: `Đã publish v${version} thành công!` });
      setApkFile(null); setIpaFile(null); setTvFile(null);
      await loadData();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
        <span className="text-slate-400 text-sm">Đang tải...</span>
      </div>
    );
  }

  const visibleChangelog = showAll ? changelog : changelog.slice(0, 5);

  const inputCls = `w-full h-11 px-3.5 rounded-xl border text-sm font-mono transition-colors focus:outline-none focus:border-blue-500 ${
    isDark
      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500'
      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-900'
  }`;

  const cardCls = `rounded-3xl border ${
    isDark ? 'bg-[#11131a] border-zinc-800/80 shadow-xl' : 'bg-white border-zinc-200/90 shadow-sm'
  }`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 border ${
            isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-900 border-zinc-800 text-white'
          }`}>
            <Smartphone size={22} />
          </div>
          <div>
            <h1 className={`text-xl font-extrabold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Publish App Mobile</h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Upload APK, IPA + viết changelog notes → publish đồng bộ</p>
          </div>
        </div>
        {latestJson?.version && (
          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }`}>
            v{latestJson.version}
          </span>
        )}
      </div>

      {/* Feedback */}
      {message && (
        <div className={`p-3 rounded-lg border text-xs font-medium ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
        }`}>
          {message.type === 'success' ? '✓ ' : '✕ '}{message.text}
        </div>
      )}

      {/* Publish form */}
      <div className={cardCls}>
        <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <Tag className="w-4 h-4 text-blue-500" />
          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>New Release</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Version */}
          <div>
            <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Version <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="0.1.0"
              className={inputCls}
            />
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Android APK', accept: '.apk', file: apkFile, setFile: setApkFile, current: currentApk, emoji: '🤖' },
              { label: 'iOS IPA',     accept: '.ipa', file: ipaFile, setFile: setIpaFile, current: currentIpa, emoji: '🍎' },
              { label: 'Android TV',  accept: '.apk', file: tvFile,  setFile: setTvFile,  current: currentTv,  emoji: '📺' },
            ].map(({ label, accept, file, setFile, current, emoji }) => (
              <div key={label}>
                <label className={`text-xs font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {emoji} {label}
                </label>
                <label className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center ${
                  file
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/50'
                      : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-400'
                }`}>
                  <input type="file" accept={accept} onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                  {file ? (
                    <>
                      <FileText className="w-5 h-5 text-emerald-500 mb-1" />
                      <span className="text-[11px] text-emerald-500 font-medium truncate max-w-[90%]">{file.name}</span>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{formatBytes(file.size)}</span>
                    </>
                  ) : current ? (
                    <>
                      <Upload className={`w-5 h-5 mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Thay thế file</span>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'} truncate max-w-[90%]`}>
                        {current.fileName.split('/').pop()}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className={`w-5 h-5 mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Upload {accept.slice(1).toUpperCase()}</span>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Tuỳ chọn</span>
                    </>
                  )}
                </label>
                {file && (
                  <button onClick={() => setFile(null)} className="mt-1 text-[10px] text-red-500 hover:underline flex items-center gap-0.5">
                    <X className="w-3 h-3" /> Xoá
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Release Notes */}
          <div>
            <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Release Notes
            </label>
            <textarea
              value={releaseNotes}
              onChange={e => setReleaseNotes(e.target.value)}
              placeholder={"- Sửa lỗi player\n+ Thêm tính năng PIP\n~ Cải thiện tốc độ tải"}
              rows={5}
              className={`${inputCls} resize-y text-xs leading-relaxed`}
            />
            <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Dùng <code className="px-1 rounded bg-zinc-800 text-zinc-300">-</code> fix · <code className="px-1 rounded bg-zinc-800 text-zinc-300">+</code> thêm mới · <code className="px-1 rounded bg-zinc-800 text-zinc-300">~</code> cải tiến
            </p>
          </div>

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={publishing || !version}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-sm ${
              publishing || !version
                ? isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : isDark
                  ? 'bg-white text-zinc-950 hover:bg-zinc-100 shadow-md'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10'
            }`}
          >
            {publishing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Publishing...</>
            ) : (
              <><Check className="w-4 h-4" /> Publish v{version || 'x.x.x'}</>
            )}
          </button>
        </div>
      </div>

      {/* Current files */}
      {latestJson && (latestJson.apk_url || latestJson.ipa_url || latestJson.tv_url) && (
        <div className={cardCls}>
          <div className={`px-5 py-3.5 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <span className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Files hiện tại · <span className="text-emerald-500 dark:text-emerald-400 font-mono">v{latestJson.version}</span>
            </span>
          </div>
          <div className="p-5 grid grid-cols-3 gap-3">
            {latestJson.apk_url && (
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-black/20 border-white/8' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-[10px] mb-1.5 uppercase tracking-wider font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>🤖 Android</p>
                <p className="text-xs text-emerald-400 font-mono truncate">{latestJson.apk_url.split('/').pop()}</p>
                {latestJson.apk_size ? <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{formatBytes(latestJson.apk_size)}</p> : null}
              </div>
            )}
            {latestJson.ipa_url && (
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-black/20 border-white/8' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-[10px] mb-1.5 uppercase tracking-wider font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>🍎 iOS</p>
                <p className="text-xs text-emerald-400 font-mono truncate">{latestJson.ipa_url.split('/').pop()}</p>
                {latestJson.ipa_size ? <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{formatBytes(latestJson.ipa_size)}</p> : null}
              </div>
            )}
            {latestJson.tv_url && (
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-black/20 border-white/8' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-[10px] mb-1.5 uppercase tracking-wider font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>📺 Android TV</p>
                <p className="text-xs text-emerald-400 font-mono truncate">{latestJson.tv_url.split('/').pop()}</p>
                {latestJson.tv_size ? <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{formatBytes(latestJson.tv_size)}</p> : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Changelog */}
      {changelog.length > 0 && (
        <div className={cardCls}>
          <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-white/8' : 'border-slate-100'}`}>
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Changelog</span>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{changelog.length} phiên bản</span>
          </div>

          <div className="p-4 space-y-2">
            {visibleChangelog.map((ver, idx) => (
              <ChangelogCard key={ver.version} ver={ver} isLatest={idx === 0} isDark={isDark} />
            ))}
          </div>

          {changelog.length > 5 && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowAll(s => !s)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {showAll
                  ? <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                  : <><ChevronDown className="w-3.5 h-3.5" /> {changelog.length - 5} phiên bản cũ hơn</>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
