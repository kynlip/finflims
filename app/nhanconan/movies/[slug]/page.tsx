"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cdnImage } from "@/lib/image";
import { useAdminTheme } from "../../context/AdminThemeContext";
import {
  Film,
  Save,
  Plus,
  Trash2,
  Server,
  ClipboardPaste,
  Eye,
  ImageIcon,
  Wand2,
  Upload,
  Loader2,
  Lock,
  Unlock,
  FileSpreadsheet,
  ArrowUpDown,
  Sparkles,
  Check,
  CheckCircle2,
  Layers,
  FileUp,
  ArrowLeft,
  ExternalLink,
  X,
} from "lucide-react";
import {
  extractDirectStreamUrl,
  toVietnameseSlug,
  cleanEpisodeTitle,
} from "@/lib/utils";

interface EpisodeItem {
  name: string;
  slug: string;
  filename?: string;
  link_embed: string;
  link_m3u8: string;
}

interface EpisodeServer {
  server_name: string;
  server_data: EpisodeItem[];
}

interface CategoryOrCountry {
  id: string;
  name: string;
  slug: string;
}

interface MovieDetail {
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  content?: string;
  type?: string;
  status?: string;
  year?: number;
  quality?: string;
  lang?: string;
  time?: string;
  episode_current?: string;
  episode_total?: string;
  poster_url?: string;
  thumb_url?: string;
  trailer_url?: string;
  category?: CategoryOrCountry[];
  country?: CategoryOrCountry[];
  episodes?: EpisodeServer[];
}

const AVAILABLE_CATEGORIES = [
  { id: "hoathinh", name: "Hoạt Hình", slug: "hoathinh" },
  { id: "hanh-dong", name: "Hành Động", slug: "hanh-dong" },
  { id: "phieu-luu", name: "Phiêu Lưu", slug: "phieu-luu" },
  { id: "hai-huoc", name: "Hài Hước", slug: "hai-huoc" },
  { id: "vien-tuong", name: "Viễn Tưởng", slug: "vien-tuong" },
  { id: "bi-an", name: "Bí Ẩn", slug: "bi-an" },
  { id: "hoc-duong", name: "Học Đường", slug: "hoc-duong" },
  { id: "vo-thuat", name: "Võ Thuật", slug: "vo-thuat" },
  { id: "tinh-cam", name: "Tình Cảm", slug: "tinh-cam" },
  { id: "tam-ly", name: "Tâm Lý", slug: "tam-ly" },
  { id: "kinh-di", name: "Kinh Dị", slug: "kinh-di" },
  { id: "co-trang", name: "Cổ Trang", slug: "co-trang" },
];

const AVAILABLE_COUNTRIES = [
  { id: "nhat-ban", name: "Nhật Bản", slug: "nhat-ban" },
  { id: "trung-quoc", name: "Trung Quốc", slug: "trung-quoc" },
  { id: "han-quoc", name: "Hàn Quốc", slug: "han-quoc" },
  { id: "au-my", name: "Âu Mỹ", slug: "au-my" },
  { id: "thai-lan", name: "Thái Lan", slug: "thai-lan" },
  { id: "viet-nam", name: "Việt Nam", slug: "viet-nam" },
];

function deduplicateEpisodes(episodes: EpisodeItem[]): EpisodeItem[] {
  const seenSlugs = new Set<string>();
  const seenEmbeds = new Set<string>();
  const result: EpisodeItem[] = [];

  for (const ep of episodes) {
    const slugKey = (ep.slug || "").trim().toLowerCase();
    const embedKey = (ep.link_embed || "").trim().toLowerCase();

    if (slugKey && seenSlugs.has(slugKey)) continue;
    if (embedKey && seenEmbeds.has(embedKey)) continue;

    if (slugKey) seenSlugs.add(slugKey);
    if (embedKey) seenEmbeds.add(embedKey);

    result.push(ep);
  }

  return result;
}

function parseCsvOrTextContent(content: string): EpisodeItem[] {
  if (!content || !content.trim()) return [];

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const episodes: EpisodeItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (
      i === 0 &&
      (line.toLowerCase().startsWith("title,url") ||
        line.toLowerCase().startsWith('"title","url"') ||
        line.toLowerCase().startsWith("name,link"))
    ) {
      continue;
    }

    if (line.includes(",") || line.includes("\t")) {
      const delimiter = line.includes("\t") ? "\t" : ",";
      let parts: string[] = [];

      if (delimiter === ",") {
        const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        if (matches) {
          parts = matches.map((m) => {
            let val = m.replace(/^,/, "").trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            return val;
          });
        }
      } else {
        parts = line.split("\t").map((p) => p.trim());
      }

      if (parts.length >= 2) {
        const rawTitle = parts[0] || "";
        const rawUrl = parts[1] || "";

        if (!rawUrl && !rawTitle) continue;

        const { name, slug, filename } = cleanEpisodeTitle(
          rawTitle || `Tập ${episodes.length + 1}`,
        );
        const cleanUrl = extractDirectStreamUrl(rawUrl);
        const isM3U8 =
          cleanUrl.includes(".m3u8") ||
          cleanUrl.includes("/hls/") ||
          cleanUrl.includes(".mp4");

        episodes.push({
          name,
          slug,
          filename,
          link_embed: !isM3U8 ? cleanUrl : "",
          link_m3u8: isM3U8 ? cleanUrl : "",
        });
        continue;
      }
    }

    if (line.startsWith("http://") || line.startsWith("https://")) {
      const epNum = episodes.length + 1;
      const cleanUrl = extractDirectStreamUrl(line);
      const isM3U8 =
        cleanUrl.includes(".m3u8") ||
        cleanUrl.includes("/hls/") ||
        cleanUrl.includes(".mp4");
      episodes.push({
        name: `Tập ${epNum}`,
        slug: `tap-${epNum}`,
        filename: `Tập ${epNum}`,
        link_embed: !isM3U8 ? cleanUrl : "",
        link_m3u8: isM3U8 ? cleanUrl : "",
      });
      continue;
    }

    const colonMatch = line.match(/^(.*?):\s*(https?:\/\/.+)$/i);
    if (colonMatch) {
      const rawTitle = colonMatch[1].trim();
      const rawUrl = colonMatch[2].trim();
      const { name, slug, filename } = cleanEpisodeTitle(rawTitle);
      const cleanUrl = extractDirectStreamUrl(rawUrl);
      const isM3U8 =
        cleanUrl.includes(".m3u8") ||
        cleanUrl.includes("/hls/") ||
        cleanUrl.includes(".mp4");

      episodes.push({
        name,
        slug,
        filename,
        link_embed: !isM3U8 ? cleanUrl : "",
        link_m3u8: isM3U8 ? cleanUrl : "",
      });
      continue;
    }
  }

  return deduplicateEpisodes(episodes);
}

function extractFirstNumber(str: string): number {
  const match = str.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function naturalSortEpisodes(
  episodes: EpisodeItem[],
  sortOption: "asc" | "reverse" | "original" = "asc",
): EpisodeItem[] {
  const deduped = deduplicateEpisodes(episodes);
  if (sortOption === "original") return [...deduped];
  if (sortOption === "reverse") return [...deduped].slice().reverse();

  return [...deduped].sort((a, b) => {
    const numA = extractFirstNumber(a.name || a.slug || "");
    const numB = extractFirstNumber(b.name || b.slug || "");
    if (numA !== numB) {
      return sortOption === "asc" ? numA - numB : numB - numA;
    }
    return (a.name || "").localeCompare(b.name || "", undefined, {
      numeric: true,
    });
  });
}

export default function AdminMovieEditPage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const isNewMovie = rawSlug === "new" || rawSlug === "create";

  const { isDark } = useAdminTheme();

  const [loading, setLoading] = useState(!isNewMovie);
  const [formData, setFormData] = useState<MovieDetail>({
    name: "",
    slug: "",
    origin_name: "",
    content: "",
    type: "hoathinh",
    status: "ongoing",
    year: new Date().getFullYear(),
    quality: "HD",
    lang: "Vietsub",
    time: "24 phút/tập",
    episode_current: "Tập 1",
    episode_total: "12 Tập",
    poster_url: "",
    thumb_url: "",
    trailer_url: "",
    category: [{ id: "hoathinh", name: "Hoạt Hình", slug: "hoathinh" }],
    country: [{ id: "nhat-ban", name: "Nhật Bản", slug: "nhat-ban" }],
    episodes: [{ server_name: "Server VIP LoadVid", server_data: [] }],
  });

  const [activeTab, setActiveTab] = useState<"info" | "episodes">("info");
  const [activeServerIdx, setActiveServerIdx] = useState(0);

  // Bulk modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputMode, setBulkInputMode] = useState<"file" | "paste">("file");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLinks, setBulkLinks] = useState("");
  const [bulkSortOption, setBulkSortOption] = useState<
    "asc" | "reverse" | "original"
  >("asc");
  const [bulkTargetServer, setBulkTargetServer] = useState<"current" | "new">(
    "current",
  );
  const [bulkNewServerName, setBulkNewServerName] = useState(
    "Server VIP (LoadVid)",
  );
  const [bulkImportMode, setBulkImportMode] = useState<"replace" | "append">(
    "replace",
  );
  const [bulkAutoUpdateStats, setBulkAutoUpdateStats] = useState(true);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Parsed episodes computed automatically
  const parsedBulkEpisodes = useMemo(() => {
    if (!bulkLinks || !bulkLinks.trim()) return [];
    const raw = parseCsvOrTextContent(bulkLinks);
    return naturalSortEpisodes(raw, bulkSortOption);
  }, [bulkLinks, bulkSortOption]);

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSlugUnlocked, setIsSlugUnlocked] = useState(isNewMovie);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const posterFileRef = useRef<HTMLInputElement>(null);
  const thumbFileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchMovieDetail = useCallback(async (slug: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/movies/${slug}`);
      if (!res.ok) throw new Error("Không thể tải thông tin phim");
      const data = await res.json();
      if (data.movie) {
        const m = data.movie;
        const normEpisodes = (m.episodes || []).map((s: EpisodeServer) => ({
          server_name: s.server_name || "Server VIP",
          server_data: (s.server_data || []).map((ep: EpisodeItem) => ({
            name: ep.name || "Tập 1",
            slug: ep.slug || "tap-1",
            filename: ep.filename || ep.name || "",
            link_embed: ep.link_embed || "",
            link_m3u8: ep.link_m3u8 || "",
          })),
        }));

        setFormData({
          ...m,
          category: m.category || [
            { id: "hoathinh", name: "Hoạt Hình", slug: "hoathinh" },
          ],
          country: m.country || [
            { id: "nhat-ban", name: "Nhật Bản", slug: "nhat-ban" },
          ],
          episodes:
            normEpisodes.length > 0
              ? normEpisodes
              : [{ server_name: "Server VIP LoadVid", server_data: [] }],
        });
        setIsSlugUnlocked(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tải phim");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isNewMovie && rawSlug) {
      fetchMovieDetail(rawSlug);
    } else {
      setFormData({
        name: "",
        slug: "",
        origin_name: "",
        content: "",
        type: "hoathinh",
        status: "ongoing",
        year: new Date().getFullYear(),
        quality: "HD",
        lang: "Vietsub",
        time: "24 phút/tập",
        episode_current: "Tập 1",
        episode_total: "12 Tập",
        poster_url: "",
        thumb_url: "",
        trailer_url: "",
        category: [{ id: "hoathinh", name: "Hoạt Hình", slug: "hoathinh" }],
        country: [{ id: "nhat-ban", name: "Nhật Bản", slug: "nhat-ban" }],
        episodes: [{ server_name: "Server VIP LoadVid", server_data: [] }],
      });
      setIsSlugUnlocked(true);
      setLoading(false);
    }
  }, [rawSlug, isNewMovie, fetchMovieDetail]);

  const currentServers = formData.episodes || [];
  const currentServer = currentServers[activeServerIdx] || {
    server_name: "Server VIP LoadVid",
    server_data: [],
  };

  const handleUploadImage = async (file: File, type: "poster" | "thumb") => {
    if (!file) return;
    if (type === "poster") setUploadingPoster(true);
    else setUploadingThumb(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      fd.append("slug", formData.slug || "");

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Lỗi tải ảnh lên");
      }

      const data = await res.json();
      if (data.url) {
        setFormData((prev) => ({
          ...prev,
          [type === "poster" ? "poster_url" : "thumb_url"]: data.url,
        }));
        showToast(
          `Đã tải lên ảnh ${type === "poster" ? "Poster" : "Thumbnail"} thành công!`,
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tải ảnh lên");
    } finally {
      if (type === "poster") setUploadingPoster(false);
      else setUploadingThumb(false);
    }
  };

  const handleGenerateSlug = () => {
    if (!formData.name) return;
    const generated = toVietnameseSlug(formData.name);
    setFormData((prev) => ({ ...prev, slug: generated }));
  };

  const handleAddServer = () => {
    const newServers = [
      ...currentServers,
      {
        server_name: `Server #${currentServers.length + 1} (LoadVid)`,
        server_data: [],
      },
    ];
    setFormData({ ...formData, episodes: newServers });
    setActiveServerIdx(newServers.length - 1);
  };

  const handleDeleteServer = (idx: number) => {
    const newServers = currentServers.filter((_, i) => i !== idx);
    setFormData({
      ...formData,
      episodes:
        newServers.length > 0
          ? newServers
          : [{ server_name: "Server VIP LoadVid", server_data: [] }],
    });
    setActiveServerIdx(Math.max(0, idx - 1));
  };

  const handleUpdateServerName = (name: string) => {
    const newServers = currentServers.map((s, i) =>
      i === activeServerIdx ? { ...s, server_name: name } : s,
    );
    setFormData({ ...formData, episodes: newServers });
  };

  const handleAddEpisode = () => {
    const epNum = currentServer.server_data.length + 1;
    const newEp: EpisodeItem = {
      name: `Tập ${epNum}`,
      slug: `tap-${epNum}`,
      filename: `Tập ${epNum}`,
      link_embed: "",
      link_m3u8: "",
    };

    const newServers = currentServers.map((s, i) =>
      i === activeServerIdx
        ? { ...s, server_data: [...s.server_data, newEp] }
        : s,
    );
    setFormData({ ...formData, episodes: newServers });
  };

  const handleDeleteEpisode = (epIdx: number) => {
    const newServers = currentServers.map((s, i) =>
      i === activeServerIdx
        ? { ...s, server_data: s.server_data.filter((_, j) => j !== epIdx) }
        : s,
    );
    setFormData({ ...formData, episodes: newServers });
  };

  const handleUpdateEpisode = (
    epIdx: number,
    field: keyof EpisodeItem,
    val: string,
  ) => {
    const newServers = currentServers.map((s, i) => {
      if (i !== activeServerIdx) return s;
      const updatedData = s.server_data.map((ep, j) => {
        if (j !== epIdx) return ep;
        if (field === "link_m3u8" || field === "link_embed") {
          const cleaned = extractDirectStreamUrl(val);
          const isM3U8 =
            cleaned.includes(".m3u8") ||
            cleaned.includes("/hls/") ||
            cleaned.includes(".mp4");
          if (isM3U8) {
            return { ...ep, link_m3u8: cleaned, link_embed: "" };
          }
          return { ...ep, [field]: cleaned };
        }
        return { ...ep, [field]: val };
      });
      return { ...s, server_data: updatedData };
    });
    setFormData({ ...formData, episodes: newServers });
  };

  const handleBulkFileSelected = (file: File) => {
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setBulkLinks(text);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleApplyBulkImport = () => {
    if (parsedBulkEpisodes.length === 0) {
      alert("Không tìm thấy dữ liệu tập phim hoặc link nào hợp lệ!");
      return;
    }

    const updatedServers = [...currentServers];
    let targetIdx = activeServerIdx;

    if (bulkTargetServer === "new") {
      const newServer = {
        server_name:
          bulkNewServerName.trim() ||
          `Server #${currentServers.length + 1} (LoadVid)`,
        server_data: parsedBulkEpisodes,
      };
      updatedServers.push(newServer);
      targetIdx = updatedServers.length - 1;
    } else {
      if (targetIdx < 0 || targetIdx >= updatedServers.length) {
        targetIdx = 0;
      }
      const curServer = updatedServers[targetIdx] || {
        server_name: "Server VIP LoadVid",
        server_data: [],
      };
      let finalEpisodes: EpisodeItem[] = [];
      if (bulkImportMode === "append") {
        const existing = curServer.server_data || [];
        const existingSlugs = new Set(
          existing.map((e: EpisodeItem) => (e.slug || "").trim().toLowerCase()),
        );
        const existingEmbeds = new Set(
          existing
            .map((e: EpisodeItem) => (e.link_embed || "").trim().toLowerCase())
            .filter(Boolean),
        );

        const newFiltered = parsedBulkEpisodes.filter((ep: EpisodeItem) => {
          const s = (ep.slug || "").trim().toLowerCase();
          const em = (ep.link_embed || "").trim().toLowerCase();
          if (s && existingSlugs.has(s)) return false;
          if (em && existingEmbeds.has(em)) return false;
          return true;
        });

        finalEpisodes = [...existing, ...newFiltered];
      } else {
        finalEpisodes = parsedBulkEpisodes;
      }

      updatedServers[targetIdx] = {
        ...curServer,
        server_data: finalEpisodes,
      };
    }

    const updatedFormData: MovieDetail = {
      ...formData,
      episodes: updatedServers,
    };

    if (bulkAutoUpdateStats && parsedBulkEpisodes.length > 0) {
      const highestEpNum = parsedBulkEpisodes.reduce((max, ep) => {
        const n = extractFirstNumber(ep.name || ep.slug || "");
        return n > max ? n : max;
      }, 0);

      if (highestEpNum > 0) {
        updatedFormData.episode_current = `Tập ${highestEpNum}`;
        updatedFormData.episode_total = `${highestEpNum} Tập`;
      } else {
        updatedFormData.episode_current = `Tập ${parsedBulkEpisodes.length}`;
        updatedFormData.episode_total = `${parsedBulkEpisodes.length} Tập`;
      }
    }

    setFormData(updatedFormData);
    setActiveServerIdx(targetIdx);
    setShowBulkModal(false);
    setBulkFile(null);
    setBulkLinks("");
    showToast(`Đã nhập thành công ${parsedBulkEpisodes.length} tập phim!`);
  };

  const toggleCategory = (cat: CategoryOrCountry) => {
    const current = formData.category || [];
    const exists = current.some((c) => c.slug === cat.slug);
    if (exists) {
      setFormData({
        ...formData,
        category: current.filter((c) => c.slug !== cat.slug),
      });
    } else {
      setFormData({ ...formData, category: [...current, cat] });
    }
  };

  const toggleCountry = (country: CategoryOrCountry) => {
    const current = formData.country || [];
    const exists = current.some((c) => c.slug === country.slug);
    if (exists) {
      setFormData({
        ...formData,
        country: current.filter((c) => c.slug !== country.slug),
      });
    } else {
      setFormData({ ...formData, country: [...current, country] });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên phim");
      return;
    }

    const finalSlug = formData.slug?.trim()
      ? toVietnameseSlug(formData.slug.trim())
      : toVietnameseSlug(formData.name.trim());

    if (!finalSlug) {
      alert("Slug phim không hợp lệ");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        slug: finalSlug,
      };

      const url =
        !isNewMovie && rawSlug
          ? `/api/admin/movies/${rawSlug}`
          : "/api/admin/movies";

      const method = !isNewMovie && rawSlug ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không thể lưu phim");
      }

      showToast("✓ Đã lưu thành công vào cơ sở dữ liệu!");

      if (isNewMovie || finalSlug !== rawSlug) {
        setTimeout(() => {
          router.push(`/nhanconan/movies/${finalSlug}`);
        }, 800);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi lưu phim");
    } finally {
      setSaving(false);
    }
  };

  const totalEpisodesCount = currentServers.reduce(
    (a, s) => a + s.server_data.length,
    0,
  );

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="text-sm font-semibold text-slate-400">
          Đang tải dữ liệu phim...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500 text-white px-5 py-3 shadow-2xl backdrop-blur-md font-bold text-sm border border-emerald-400">
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
          isDark
            ? "bg-[#0F172A]/90 border-slate-800 shadow-xl"
            : "bg-white border-slate-200/90 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <Link
            href="/nhanconan"
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200 shadow-xs"
            }`}
            title="Quay lại danh sách phim"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 border ${
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
            }`}>
              <Film size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`font-extrabold text-base sm:text-xl tracking-tight ${
                    isDark ? "text-zinc-100" : "text-zinc-900"
                  }`}
                >
                  {formData.name || (isNewMovie ? "Tạo Phim Mới" : "Chỉnh sửa Phim")}
                </h1>
                {!isNewMovie && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    {totalEpisodesCount} tập
                  </span>
                )}
              </div>
              <p
                className={`text-xs font-mono mt-0.5 ${
                  isDark ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                Slug:{" "}
                <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                  {formData.slug || "(tự động tạo)"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {!isNewMovie && formData.slug && (
            <a
              href={`/phim/${formData.slug}`}
              target="_blank"
              rel="noreferrer"
              className={`h-11 px-4 rounded-2xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all ${
                isDark
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200 shadow-xs"
              }`}
            >
              <ExternalLink size={16} />
              <span>Xem trên Web</span>
            </a>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`h-11 px-5 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 ${
              isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10"
            }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>
              {saving
                ? "Đang lưu..."
                : isNewMovie
                  ? "Tạo & Đăng Phim Mới"
                  : "Lưu thay đổi"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Form Tabs */}
      <div
        className={`rounded-3xl border overflow-hidden transition-all ${
          isDark
            ? "bg-[#0F172A]/90 border-slate-800 shadow-xl"
            : "bg-white border-slate-200/90 shadow-sm"
        }`}
      >
        {/* Navigation Tabs */}
        <div
          className={`flex items-center border-b px-4 sm:px-6 gap-3 ${
            isDark
              ? "border-slate-800 bg-slate-950/60"
              : "border-slate-200 bg-slate-50/80"
          }`}
        >
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "info"
                ? "border-blue-500 text-blue-500"
                : isDark
                  ? "border-transparent text-slate-400 hover:text-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Film size={16} />
            <span>1. Thông tin chi tiết phim</span>
          </button>

          <button
            onClick={() => setActiveTab("episodes")}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "episodes"
                ? "border-blue-500 text-blue-500"
                : isDark
                  ? "border-transparent text-slate-400 hover:text-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Server size={16} />
            <span>2. Server & Danh sách tập ({totalEpisodesCount})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {activeTab === "info" ? (
            /* TAB 1: MOVIE INFO */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Title */}
                <div className="md:col-span-6">
                  <label
                    className={`text-xs font-bold mb-1.5 block ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Tên phim <span className="text-cyan-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Thám Tử Lừng Danh Conan"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name: newName,
                        slug:
                          isNewMovie && !prev.slug
                            ? toVietnameseSlug(newName)
                            : prev.slug,
                      }));
                    }}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 shadow-xs"
                    }`}
                  />
                </div>

                {/* Origin Name */}
                <div className="md:col-span-6">
                  <label
                    className={`text-xs font-bold mb-1.5 block ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Tên gốc / Tên tiếng Anh
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Detective Conan: Case Closed"
                    value={formData.origin_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, origin_name: e.target.value })
                    }
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 shadow-xs"
                    }`}
                  />
                </div>

                {/* Slug URL with Safety Lock */}
                <div className="md:col-span-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className={`text-xs font-bold flex items-center gap-1.5 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      <span>Slug URL</span>
                      <span className="text-cyan-500">*</span>
                      {!isNewMovie && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            isDark
                              ? "bg-white/10 text-slate-400"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isSlugUnlocked ? "Đang mở khóa" : "Đã khóa cố định"}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      {!isNewMovie && (
                        <button
                          type="button"
                          onClick={() => setIsSlugUnlocked(!isSlugUnlocked)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono transition-colors ${
                            isSlugUnlocked
                              ? "bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30"
                              : isDark
                                ? "bg-white/10 text-slate-300 hover:text-white"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                          title="Mở khóa đổi Slug"
                        >
                          {isSlugUnlocked ? (
                            <Unlock size={11} />
                          ) : (
                            <Lock size={11} />
                          )}
                          <span>{isSlugUnlocked ? "Khóa lại" : "Mở khóa"}</span>
                        </button>
                      )}
                      {(isNewMovie || isSlugUnlocked) && (
                        <button
                          type="button"
                          onClick={handleGenerateSlug}
                          className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-mono font-bold"
                        >
                          <Wand2 size={12} />
                          <span>Tạo lại</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="tham-tu-lung-danh-conan"
                    value={formData.slug}
                    disabled={!isNewMovie && !isSlugUnlocked}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none transition-colors ${
                      !isNewMovie && !isSlugUnlocked
                        ? isDark
                          ? "bg-slate-900/50 border-white/5 text-slate-400 cursor-not-allowed"
                          : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                        : isDark
                          ? "bg-slate-950/60 border-white/10 text-cyan-300 focus:border-cyan-500"
                          : "bg-slate-50 border-slate-300 text-cyan-700 font-semibold focus:bg-white focus:border-cyan-500"
                    }`}
                  />
                  {!isNewMovie && !isSlugUnlocked && (
                    <p
                      className={`text-[10px] mt-1 ${
                        isDark ? "text-slate-500" : "text-slate-600"
                      }`}
                    >
                      🔒 Slug được giữ cố định để bảo vệ tất cả đường dẫn phim đã
                      chia sẻ không bị 404.
                    </p>
                  )}
                </div>

                {/* Year, Quality, Lang, Type */}
                <div className="md:col-span-6 grid grid-cols-4 gap-2.5">
                  <div>
                    <label
                      className={`text-xs font-bold mb-1.5 block ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Năm
                    </label>
                    <input
                      type="number"
                      value={formData.year || 2026}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          year: parseInt(e.target.value) || 2026,
                        })
                      }
                      className={`w-full border rounded-xl px-2.5 py-2.5 text-sm outline-none font-mono transition-all ${
                        isDark
                          ? "bg-slate-950/60 border-white/10 text-white focus:border-cyan-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500 shadow-xs"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs font-bold mb-1.5 block ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Chất lượng
                    </label>
                    <input
                      type="text"
                      value={formData.quality || "HD"}
                      onChange={(e) =>
                        setFormData({ ...formData, quality: e.target.value })
                      }
                      className={`w-full border rounded-xl px-2.5 py-2.5 text-sm outline-none transition-all ${
                        isDark
                          ? "bg-slate-950/60 border-white/10 text-white focus:border-cyan-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500 shadow-xs"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs font-bold mb-1.5 block ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Ngôn ngữ
                    </label>
                    <input
                      type="text"
                      value={formData.lang || "Vietsub"}
                      onChange={(e) =>
                        setFormData({ ...formData, lang: e.target.value })
                      }
                      className={`w-full border rounded-xl px-2.5 py-2.5 text-sm outline-none transition-all ${
                        isDark
                          ? "bg-slate-950/60 border-white/10 text-white focus:border-cyan-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500 shadow-xs"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs font-bold mb-1.5 block ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Loại
                    </label>
                    <select
                      value={formData.type || "hoathinh"}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className={`w-full border rounded-xl px-2.5 py-2.5 text-xs outline-none transition-all ${
                        isDark
                          ? "bg-slate-950/60 border-white/10 text-white focus:border-cyan-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500 shadow-xs"
                      }`}
                    >
                      <option value="hoathinh">Hoạt hình</option>
                      <option value="series">Phim bộ</option>
                      <option value="single">Phim lẻ</option>
                      <option value="tvshows">TV Shows</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status, Time, Episodes Current & Total */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label
                    className={`text-xs font-bold mb-1.5 block ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Trạng thái
                  </label>
                  <select
                    value={formData.status || "ongoing"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white focus:border-cyan-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500 shadow-xs"
                    }`}
                  >
                    <option value="ongoing">Đang chiếu (Ongoing)</option>
                    <option value="completed">Hoàn thành (Completed)</option>
                    <option value="trailer">Sắp chiếu (Trailer)</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`text-xs font-bold mb-1.5 block ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Thời lượng
                  </label>
                  <input
                    type="text"
                    placeholder="24 phút/tập"
                    value={formData.time || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 shadow-xs"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`text-xs font-bold mb-1.5 block ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Tập hiện tại
                  </label>
                  <input
                    type="text"
                    placeholder="Tập 12"
                    value={formData.episode_current || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        episode_current: e.target.value,
                      })
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 shadow-xs"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`text-xs font-bold mb-1.5 block ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Tổng số tập
                  </label>
                  <input
                    type="text"
                    placeholder="12 Tập"
                    value={formData.episode_total || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        episode_total: e.target.value,
                      })
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 shadow-xs"
                    }`}
                  />
                </div>
              </div>

              {/* Poster & Thumbnail with Live Image Preview & File Upload */}
              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl border ${
                  isDark
                    ? "bg-slate-950/40 border-white/5"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {/* Poster */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-xs font-bold flex items-center gap-1.5 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      <ImageIcon size={14} className="text-cyan-500" />
                      <span>Poster (Dọc)</span>
                    </label>
                    <input
                      ref={posterFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(f, "poster");
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingPoster}
                      onClick={() => posterFileRef.current?.click()}
                      className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      {uploadingPoster ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          <span>Tải từ máy tính</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="https://.../poster.jpg hoặc tải file từ máy"
                    value={formData.poster_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, poster_url: e.target.value })
                    }
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all ${
                      isDark
                        ? "bg-slate-900 border-white/10 text-cyan-300 focus:border-cyan-500"
                        : "bg-white border-slate-300 text-cyan-700 focus:border-cyan-500 shadow-xs"
                    }`}
                  />

                  {/* Drop zone / preview */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadImage(f, "poster");
                    }}
                    onClick={() =>
                      !formData.poster_url && posterFileRef.current?.click()
                    }
                    className={`rounded-xl border border-dashed transition-all p-3 flex items-center gap-3 ${
                      formData.poster_url
                        ? isDark
                          ? "border-white/10 bg-slate-900/50"
                          : "border-slate-300 bg-white"
                        : isDark
                          ? "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer text-slate-400"
                          : "border-cyan-400/50 bg-cyan-50/50 hover:bg-cyan-50 cursor-pointer text-slate-700"
                    }`}
                  >
                    {formData.poster_url ? (
                      <>
                        <div className="w-16 h-24 rounded-lg border border-white/10 overflow-hidden bg-black/50 relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cdnImage(formData.poster_url, 256)}
                            alt="Poster Preview"
                            className="w-full h-full object-cover"
                            decoding="async"
                            onError={(e) =>
                              ((e.target as HTMLElement).style.display = "none")
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="text-emerald-500 dark:text-emerald-400 font-semibold truncate">
                            ✓ Đã có ảnh poster
                          </p>
                          <p
                            className={`text-[11px] truncate ${
                              isDark ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {formData.poster_url}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              posterFileRef.current?.click();
                            }}
                            className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                          >
                            Thay đổi ảnh khác
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full py-4 text-center text-xs">
                        <Upload
                          size={20}
                          className="mx-auto mb-1.5 text-cyan-500 opacity-80"
                        />
                        <p
                          className={`font-semibold ${
                            isDark ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          Kéo thả ảnh hoặc bấm để chọn file
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            isDark ? "text-slate-500" : "text-slate-500"
                          }`}
                        >
                          Hỗ trợ JPG, PNG, WEBP (tối đa 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumb */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-xs font-bold flex items-center gap-1.5 ${
                        isDark ? "text-zinc-300" : "text-zinc-700"
                      }`}
                    >
                      <ImageIcon size={14} className="text-sky-500" />
                      <span>Thumbnail (Ngang)</span>
                    </label>
                    <input
                      ref={thumbFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(f, "thumb");
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingThumb}
                      onClick={() => thumbFileRef.current?.click()}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all disabled:opacity-50 border ${
                        isDark
                          ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                          : "bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200"
                      }`}
                    >
                      {uploadingThumb ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          <span>Tải từ máy tính</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="https://.../thumb.jpg hoặc tải file từ máy"
                    value={formData.thumb_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, thumb_url: e.target.value })
                    }
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                    }`}
                  />

                  {/* Drop zone / preview */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadImage(f, "thumb");
                    }}
                    onClick={() =>
                      !formData.thumb_url && thumbFileRef.current?.click()
                    }
                    className={`rounded-xl border border-dashed transition-all p-3 flex items-center gap-3 ${
                      formData.thumb_url
                        ? isDark
                          ? "border-zinc-800 bg-zinc-950/50"
                          : "border-zinc-300 bg-white"
                        : isDark
                          ? "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 cursor-pointer text-zinc-400"
                          : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 cursor-pointer text-zinc-700"
                    }`}
                  >
                    {formData.thumb_url ? (
                      <>
                        <div className="w-28 h-16 rounded-lg border border-zinc-700 overflow-hidden bg-black/50 relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cdnImage(formData.thumb_url, 384)}
                            alt="Thumb Preview"
                            className="w-full h-full object-cover"
                            decoding="async"
                            onError={(e) =>
                              ((e.target as HTMLElement).style.display = "none")
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="text-emerald-500 dark:text-emerald-400 font-semibold truncate">
                            ✓ Đã có ảnh thumbnail
                          </p>
                          <p
                            className={`text-[11px] truncate ${
                              isDark ? "text-zinc-400" : "text-zinc-600"
                            }`}
                          >
                            {formData.thumb_url}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              thumbFileRef.current?.click();
                            }}
                            className="mt-1 text-[11px] text-sky-500 dark:text-sky-400 hover:underline font-semibold"
                          >
                            Thay đổi ảnh khác
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full py-4 text-center text-xs">
                        <Upload
                          size={20}
                          className={`mx-auto mb-1.5 opacity-80 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                        />
                        <p
                          className={`font-semibold ${
                            isDark ? "text-zinc-300" : "text-zinc-700"
                          }`}
                        >
                          Kéo thả ảnh hoặc bấm để chọn file
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            isDark ? "text-zinc-500" : "text-zinc-500"
                          }`}
                        >
                          Hỗ trợ JPG, PNG, WEBP (tối đa 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories Selector */}
              <div>
                <label
                  className={`text-xs font-bold mb-2 block ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Thể loại phim
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CATEGORIES.map((cat) => {
                    const isSelected = (formData.category || []).some(
                      (c) => c.slug === cat.slug,
                    );
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? isDark
                              ? "bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-xs"
                              : "bg-sky-50 border-sky-200 text-sky-800 shadow-xs"
                            : isDark
                              ? "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white"
                              : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Countries Selector */}
              <div>
                <label
                  className={`text-xs font-bold mb-2 block ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Quốc gia
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COUNTRIES.map((country) => {
                    const isSelected = (formData.country || []).some(
                      (c) => c.slug === country.slug,
                    );
                    return (
                      <button
                        key={country.slug}
                        type="button"
                        onClick={() => toggleCountry(country)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? isDark
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-xs"
                              : "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs"
                            : isDark
                              ? "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white"
                              : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {country.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description Content */}
              <div>
                <label
                  className={`text-xs font-bold mb-1.5 block ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Nội dung tóm tắt phim
                </label>
                <textarea
                  rows={5}
                  placeholder="Nhập giới thiệu tóm tắt nội dung cốt truyện..."
                  value={formData.content || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className={`w-full border rounded-xl p-3.5 text-xs outline-none leading-relaxed transition-all ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 shadow-xs"
                  }`}
                />
              </div>
            </div>
          ) : (
            /* TAB 2: EPISODES & SERVERS */
            <div className="space-y-5">
              {/* Server Tabs */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-2xl">
                  {currentServers.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveServerIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap border ${
                        activeServerIdx === idx
                          ? isDark
                            ? "bg-white text-zinc-950 shadow-md border-white"
                            : "bg-zinc-900 text-white shadow-md border-zinc-900"
                          : isDark
                            ? "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white"
                            : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      <Server size={14} />
                      <span>{s.server_name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeServerIdx === idx
                          ? isDark ? "bg-zinc-200 text-zinc-950 font-bold" : "bg-zinc-800 text-white font-bold"
                          : "bg-zinc-800 text-zinc-300"
                      }`}>
                        {s.server_data.length}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={handleAddServer}
                    className={`p-2 rounded-xl border transition-all ${
                      isDark
                        ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                        : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200 shadow-xs"
                    }`}
                    title="Thêm Server mới"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all shadow-xs ${
                      isDark
                        ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200"
                    }`}
                  >
                    <FileSpreadsheet size={15} />
                    <span>Import File CSV / TXT / Paste Link</span>
                  </button>
                  <button
                    onClick={handleAddEpisode}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-400 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                  >
                    <Plus size={15} />
                    <span>Thêm 1 tập</span>
                  </button>
                </div>
              </div>

              {/* Active Server Editor Header */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  isDark
                    ? "bg-slate-950/40 border-white/5"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <label
                    className={`text-xs whitespace-nowrap font-semibold ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Tên Server:
                  </label>
                  <input
                    type="text"
                    value={currentServer.server_name}
                    onChange={(e) => handleUpdateServerName(e.target.value)}
                    className={`border rounded-lg px-3 py-1.5 text-xs font-bold outline-none w-full transition-all ${
                      isDark
                        ? "bg-slate-900 border-white/10 text-white focus:border-cyan-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500 shadow-xs"
                    }`}
                  />
                </div>

                {currentServers.length > 1 && (
                  <button
                    onClick={() => handleDeleteServer(activeServerIdx)}
                    className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 flex items-center gap-1 p-1 font-semibold"
                  >
                    <Trash2 size={14} />
                    <span>Xóa Server này</span>
                  </button>
                )}
              </div>

              {/* Episode List Table / Rows */}
              <div className="space-y-2.5">
                {currentServer.server_data.length === 0 ? (
                  <div
                    className={`p-12 text-center border border-dashed rounded-2xl space-y-3 ${
                      isDark
                        ? "border-white/10 bg-slate-950/20 text-slate-500"
                        : "border-slate-300 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      Server này chưa có tập phim nào.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        onClick={handleAddEpisode}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        + Thêm 1 tập thủ công
                      </button>
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                          isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        <FileSpreadsheet size={16} />
                        <span>Import file CSV / TXT hoặc Paste Link</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  currentServer.server_data.map((ep, epIdx) => (
                    <div
                      key={epIdx}
                      className={`p-3 rounded-xl border transition-all grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center ${
                        isDark
                          ? "bg-slate-950/60 border-white/5 hover:border-cyan-500/30"
                          : "bg-slate-50/90 border-slate-200 hover:border-cyan-500/50 hover:bg-slate-100/80 shadow-xs"
                      }`}
                    >
                      {/* Name & Slug */}
                      <div className="md:col-span-2 flex items-center gap-2">
                        <span
                          className={`text-[11px] font-mono w-6 text-center ${
                            isDark ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {epIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={ep.name}
                          placeholder="Tập 1"
                          onChange={(e) =>
                            handleUpdateEpisode(epIdx, "name", e.target.value)
                          }
                          className={`border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none w-full transition-all ${
                            isDark
                              ? "bg-slate-900 border-white/10 text-white focus:border-cyan-500"
                              : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500 shadow-xs"
                          }`}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={ep.slug}
                          placeholder="tap-1"
                          onChange={(e) =>
                            handleUpdateEpisode(epIdx, "slug", e.target.value)
                          }
                          className={`border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none w-full transition-all ${
                            isDark
                              ? "bg-slate-900 border-white/10 text-slate-400 focus:border-cyan-500"
                              : "bg-white border-slate-300 text-slate-600 focus:border-cyan-500 shadow-xs"
                          }`}
                        />
                      </div>

                      {/* Embed Link (e.g. LoadVid) */}
                      <div className="md:col-span-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={ep.link_embed}
                            placeholder="Link Embed (LoadVid, Youtube, Player...)"
                            onChange={(e) =>
                              handleUpdateEpisode(
                                epIdx,
                                "link_embed",
                                e.target.value,
                              )
                            }
                            className={`border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none w-full pr-7 transition-all ${
                              isDark
                                ? "bg-slate-900 border-white/10 text-cyan-300 focus:border-cyan-500"
                                : "bg-white border-slate-300 text-cyan-700 focus:border-cyan-500 shadow-xs"
                            }`}
                          />
                          {ep.link_embed && (
                            <a
                              href={ep.link_embed}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-2 top-2 text-slate-400 hover:text-cyan-500"
                              title="Test link"
                            >
                              <Eye size={13} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* M3U8 Link */}
                      <div className="md:col-span-3">
                        <input
                          type="text"
                          value={ep.link_m3u8}
                          placeholder="Link m3u8 (HLS)"
                          onChange={(e) =>
                            handleUpdateEpisode(
                              epIdx,
                              "link_m3u8",
                              e.target.value,
                            )
                          }
                          className={`border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none w-full transition-all ${
                            isDark
                              ? "bg-slate-900 border-white/10 text-amber-300 focus:border-cyan-500"
                              : "bg-white border-slate-300 text-amber-700 focus:border-cyan-500 shadow-xs"
                          }`}
                        />
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => handleDeleteEpisode(epIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Xóa tập"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Bulk Import Sub-Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-60 flex h-dvh items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-4">
          <div
            className={`max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl space-y-4 overflow-y-auto rounded-2xl border p-4 shadow-2xl sm:p-6 transition-all ${
              isDark
                ? "border-white/15 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900 shadow-2xl"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm border ${
                  isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
                }`}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h4
                    className={`font-bold text-base flex items-center gap-2 ${
                      isDark ? "text-zinc-100" : "text-zinc-900"
                    }`}
                  >
                    <span>Import Tập Phim Hàng Loạt</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25">
                      CSV / TXT / Paste Link
                    </span>
                  </h4>
                  <p
                    className={`text-xs ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    Hỗ trợ file export từ LoadVid, danh sách link hoặc nội dung
                    bảng tab/csv
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkLinks("");
                }}
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Input Mode Tabs */}
            <div
              className={`flex items-center gap-2 border-b pb-2 ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              <button
                onClick={() => setBulkInputMode("file")}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  bulkInputMode === "file"
                    ? isDark
                      ? "bg-white text-zinc-950 shadow-md"
                      : "bg-zinc-900 text-white shadow-md"
                    : isDark
                      ? "bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white"
                      : "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                }`}
              >
                <FileUp size={15} />
                <span>1. Tải file (.csv / .txt / .tsv)</span>
              </button>
              <button
                onClick={() => setBulkInputMode("paste")}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  bulkInputMode === "paste"
                    ? isDark
                      ? "bg-white text-zinc-950 shadow-md"
                      : "bg-zinc-900 text-white shadow-md"
                    : isDark
                      ? "bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white"
                      : "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                }`}
              >
                <ClipboardPaste size={15} />
                <span>2. Dán nội dung text trực tiếp</span>
              </button>
            </div>

            {/* Mode Content: File Upload vs Textarea */}
            {bulkInputMode === "file" ? (
              <div className="space-y-3">
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBulkFileSelected(f);
                    e.target.value = "";
                  }}
                />

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleBulkFileSelected(f);
                  }}
                  onClick={() => bulkFileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                    bulkFile
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : isDark
                        ? "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                        : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  {bulkFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p
                          className={`font-bold text-sm ${
                            isDark ? "text-emerald-400" : "text-emerald-700"
                          }`}
                        >
                          {bulkFile.name}
                        </p>
                        <p
                          className={`text-xs ${
                            isDark ? "text-zinc-400" : "text-zinc-600"
                          }`}
                        >
                          {(bulkFile.size / 1024).toFixed(1)} KB • Bấm vào đây
                          để chọn file khác
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                        <Upload size={22} />
                      </div>
                      <p
                        className={`font-bold text-sm ${
                          isDark ? "text-zinc-200" : "text-zinc-800"
                        }`}
                      >
                        Kéo thả file <span>.csv</span>{" "}
                        hoặc <span>.txt</span> vào đây
                      </p>
                      <p
                        className={`text-xs ${
                          isDark ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        Hoặc bấm vào để duyệt file từ máy tính (Ví dụ:
                        videos_export_....csv)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  className={`flex items-center justify-between text-xs ${
                    isDark ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  <span>Dán nội dung CSV (Title,Url) hoặc danh sách link:</span>
                  {bulkLinks && (
                    <button
                      onClick={() => {
                        setBulkLinks("");
                        setBulkFile(null);
                      }}
                      className="text-rose-500 hover:underline font-semibold"
                    >
                      Xóa nội dung
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={bulkLinks}
                  onChange={(e) => setBulkLinks(e.target.value)}
                  placeholder={`Title,Url\n"1.mp4",https://cdn.loadvid.com/videos/play/0pKO91DgUw37ZIRHlMVk\n"36 Án mạng trong thư viện.mp4",https://cdn.loadvid.com/videos/play/DYdvYZLynJPEwVau4O65\n"920(865.mp4",https://cdn.loadvid.com/videos/play/sTfdjKasxOJPhWGDsNgS\n\nHoặc chỉ cần dán danh sách URL mỗi dòng 1 link:`}
                  className={`w-full border rounded-xl p-3 text-xs font-mono outline-none leading-relaxed transition-all ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-zinc-900 shadow-xs"
                  }`}
                />
              </div>
            )}

            {/* Options Configuration */}
            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-2xl border text-xs ${
                isDark
                  ? "bg-zinc-950/60 border-zinc-800"
                  : "bg-zinc-50 border-zinc-200"
              }`}
            >
              {/* 1. Sort Option */}
              <div className="space-y-1.5">
                <label
                  className={`font-bold flex items-center gap-1.5 ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  <ArrowUpDown size={14} className="text-zinc-400" />
                  <span>1. Thứ tự sắp xếp tập:</span>
                </label>
                <select
                  value={bulkSortOption}
                  onChange={(e) =>
                    setBulkSortOption(
                      e.target.value as "asc" | "reverse" | "original",
                    )
                  }
                  className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none transition-all ${
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-zinc-500"
                      : "bg-white border-zinc-200 text-zinc-800 focus:border-zinc-900 shadow-xs"
                  }`}
                >
                  <option value="asc">
                    🟢 Tăng dần: 1 ➔ N (Khuyên dùng cho Conan / LoadVid)
                  </option>
                  <option value="reverse">🔄 Đảo ngược thứ tự (N ➔ 1)</option>
                  <option value="original">
                    📄 Giữ nguyên thứ tự trong file/text
                  </option>
                </select>
                <p
                  className={`text-[10px] ${
                    isDark ? "text-zinc-500" : "text-zinc-500"
                  }`}
                >
                  File export thường xếp từ tập mới đến cũ, chọn Tăng dần để xếp
                  từ Tập 1 ➔ Tập N.
                </p>
              </div>

              {/* 2. Target Server */}
              <div className="space-y-1.5">
                <label
                  className={`font-bold flex items-center gap-1.5 ${
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  <Server size={14} className="text-sky-500" />
                  <span>2. Đích đến Server:</span>
                </label>
                <select
                  value={bulkTargetServer}
                  onChange={(e) =>
                    setBulkTargetServer(e.target.value as "current" | "new")
                  }
                  className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none transition-all ${
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-zinc-500"
                      : "bg-white border-zinc-200 text-zinc-800 focus:border-zinc-900 shadow-xs"
                  }`}
                >
                  <option value="current">
                    Server hiện tại: {currentServer.server_name}
                  </option>
                  <option value="new">+ Tạo thêm Server mới</option>
                </select>

                {bulkTargetServer === "new" && (
                  <input
                    type="text"
                    value={bulkNewServerName}
                    onChange={(e) => setBulkNewServerName(e.target.value)}
                    placeholder="Tên server mới (VD: Server VIP LoadVid)"
                    className={`w-full border rounded-xl px-2.5 py-1.5 text-xs outline-none mt-1 transition-all ${
                      isDark
                        ? "bg-zinc-900 border-zinc-700 text-white focus:border-zinc-500"
                        : "bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 shadow-xs"
                    }`}
                  />
                )}
              </div>

              {/* 3. Import Mode & Auto stats */}
              <div className="space-y-2">
                <label
                  className={`font-bold flex items-center gap-1.5 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  <Layers size={14} className="text-amber-500" />
                  <span>3. Tùy chọn nhập:</span>
                </label>
                {bulkTargetServer === "current" && (
                  <div
                    className={`flex items-center gap-3 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="bulkImportMode"
                        checked={bulkImportMode === "replace"}
                        onChange={() => setBulkImportMode("replace")}
                        className="accent-cyan-500"
                      />
                      <span>Ghi đè tập cũ</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="bulkImportMode"
                        checked={bulkImportMode === "append"}
                        onChange={() => setBulkImportMode("append")}
                        className="accent-cyan-500"
                      />
                      <span>Thêm tiếp vào sau</span>
                    </label>
                  </div>
                )}

                <label
                  className={`flex items-center gap-1.5 text-[11px] cursor-pointer pt-0.5 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={bulkAutoUpdateStats}
                    onChange={(e) => setBulkAutoUpdateStats(e.target.checked)}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Tự động cập nhật số tập (Tập X & Tổng số tập)</span>
                </label>
              </div>
            </div>

            {/* Live Preview Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h5
                    className={`font-bold text-xs flex items-center gap-1.5 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <Sparkles size={14} className="text-cyan-500" />
                    <span>Xem trước kết quả phân tích:</span>
                  </h5>
                  {parsedBulkEpisodes.length > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
                      ✓ Đã phát hiện {parsedBulkEpisodes.length} tập phim
                    </span>
                  ) : (
                    <span
                      className={`text-xs ${
                        isDark ? "text-slate-500" : "text-slate-500"
                      }`}
                    >
                      (Chưa có dữ liệu - hãy tải file hoặc dán link ở trên)
                    </span>
                  )}
                </div>
              </div>

              {parsedBulkEpisodes.length > 0 && (
                <div
                  className={`rounded-xl border overflow-hidden text-xs max-h-56 overflow-y-auto ${
                    isDark
                      ? "border-white/10 bg-slate-950/80"
                      : "border-slate-200 bg-white shadow-xs"
                  }`}
                >
                  <table className="w-full text-left border-collapse">
                    <thead
                      className={`border-b text-[11px] sticky top-0 ${
                        isDark
                          ? "bg-slate-900 border-white/10 text-slate-400"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <tr>
                        <th className="py-2 px-3 w-12">#</th>
                        <th className="py-2 px-3">Tên tập</th>
                        <th className="py-2 px-3">Slug tập</th>
                        <th className="py-2 px-3">File gốc / Embed / M3U8</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y font-mono text-[11px] ${
                        isDark ? "divide-white/5" : "divide-slate-200"
                      }`}
                    >
                      {/* Hiển thị 4 tập đầu */}
                      {parsedBulkEpisodes.slice(0, 4).map((ep, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
                          }`}
                        >
                          <td
                            className={`py-1.5 px-3 ${
                              isDark ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </td>
                          <td
                            className={`py-1.5 px-3 font-sans font-bold ${
                              isDark ? "text-cyan-300" : "text-cyan-700"
                            }`}
                          >
                            {ep.name}
                          </td>
                          <td
                            className={`py-1.5 px-3 ${
                              isDark ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {ep.slug}
                          </td>
                          <td
                            className={`py-1.5 px-3 truncate max-w-xs ${
                              isDark ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {ep.link_embed ? (
                              <span
                                className={
                                  isDark
                                    ? "text-cyan-400/90"
                                    : "text-cyan-600 font-semibold"
                                }
                              >
                                [Embed] {ep.link_embed}
                              </span>
                            ) : (
                              <span
                                className={
                                  isDark
                                    ? "text-amber-400/90"
                                    : "text-amber-600 font-semibold"
                                }
                              >
                                [M3U8] {ep.link_m3u8}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Phân cách nếu danh sách dài */}
                      {parsedBulkEpisodes.length > 8 && (
                        <tr
                          className={`text-center font-sans font-semibold text-xs ${
                            isDark
                              ? "bg-slate-900/40 text-slate-500"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <td colSpan={4} className="py-2">
                            ... Còn {parsedBulkEpisodes.length - 8} tập phim ở
                            giữa ...
                          </td>
                        </tr>
                      )}

                      {/* Hiển thị 4 tập cuối */}
                      {parsedBulkEpisodes.length > 4 &&
                        parsedBulkEpisodes
                          .slice(Math.max(4, parsedBulkEpisodes.length - 4))
                          .map((ep, idx) => {
                            const realIdx =
                              parsedBulkEpisodes.length -
                              Math.min(4, parsedBulkEpisodes.length - 4) +
                              idx;
                            return (
                              <tr
                                key={realIdx}
                                className={`transition-colors ${
                                  isDark
                                    ? "hover:bg-white/5"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <td
                                  className={`py-1.5 px-3 ${
                                    isDark ? "text-slate-500" : "text-slate-400"
                                  }`}
                                >
                                  {realIdx + 1}
                                </td>
                                <td
                                  className={`py-1.5 px-3 font-sans font-bold ${
                                    isDark ? "text-cyan-300" : "text-cyan-700"
                                  }`}
                                >
                                  {ep.name}
                                </td>
                                <td
                                  className={`py-1.5 px-3 ${
                                    isDark ? "text-slate-400" : "text-slate-600"
                                  }`}
                                >
                                  {ep.slug}
                                </td>
                                <td
                                  className={`py-1.5 px-3 truncate max-w-xs ${
                                    isDark ? "text-slate-400" : "text-slate-600"
                                  }`}
                                >
                                  {ep.link_embed ? (
                                    <span
                                      className={
                                        isDark
                                          ? "text-cyan-400/90"
                                          : "text-cyan-600 font-semibold"
                                      }
                                    >
                                      [Embed] {ep.link_embed}
                                    </span>
                                  ) : (
                                    <span
                                      className={
                                        isDark
                                          ? "text-amber-400/90"
                                          : "text-amber-600 font-semibold"
                                      }
                                    >
                                      [M3U8] {ep.link_m3u8}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 border-t pt-3 ${
                isDark ? "border-white/10" : "border-slate-200"
              }`}
            >
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {parsedBulkEpisodes.length > 0
                  ? `Sẵn sàng nhập ${parsedBulkEpisodes.length} tập vào ${
                      bulkTargetServer === "new"
                        ? `Server mới "${bulkNewServerName}"`
                        : `"${currentServer.server_name}"`
                    }`
                  : "Chưa có tập phim nào để nhập"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkFile(null);
                    setBulkLinks("");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isDark
                      ? "bg-white/5 hover:bg-white/10 text-slate-300"
                      : "bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-xs"
                  }`}
                >
                  Hủy
                </button>
                <button
                  onClick={handleApplyBulkImport}
                  disabled={parsedBulkEpisodes.length === 0}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  <Check size={16} />
                  <span>
                    Xác nhận nhập ({parsedBulkEpisodes.length} tập)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
