import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSlug(str: string): string {
  if (!str) return '';

  // Custom mapping for common server names - MUST MATCH across all components
  const lower = str.toLowerCase();

  // Prioritize exact matches or strong inclusions for server names
  if (
    lower.includes('vietsub') ||
    lower.includes('phụ đề') ||
    lower.includes('phu de')
  ) {
    return 'phu-de';
  }
  if (
    lower.includes('thuyết minh') ||
    lower.includes('thuyet minh') ||
    lower.includes('lồng tiếng') ||
    lower.includes('long tieng')
  ) {
    return 'thuyet-minh';
  }

  // Standard slugify for others
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Convert server name to URL-safe slug
 * This is the SINGLE SOURCE OF TRUTH for server slug conversion
 * Used across: MovieDetailClient, EpisodeList, RandomMovieSection, Watch page
 */
export function getServerSlug(serverName: string): string {
  return toSlug(serverName);
}

/**
 * Automatically extracts direct stream URL (e.g. .m3u8, .mp4) from player wrapper URLs:
 * - https://player.phimapi.com/player/?url=https://s6.kkphimplayer6.com/.../index.m3u8
 * - https://player.phimapi.com/player/?url=https%3A%2F%2F...
 * - https://player.kkphim.com/player/?url=...
 * - https://player.opstream.com/player/?url=...
 * - https://player.phim128.com/player/?url=...
 */
export function extractDirectStreamUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const cleaned = url.trim();

  // Check if URL has ?url= or &url= parameter
  const wrapperMatch = cleaned.match(/[?&]url=([^&]+)/i);
  if (wrapperMatch && wrapperMatch[1]) {
    try {
      const decoded = decodeURIComponent(wrapperMatch[1]);
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        return decoded.trim();
      }
    } catch {
      // fallback
    }
  }

  // Also handle raw prefix matches like "player.phimapi.com/player/?url="
  const prefixMatch = cleaned.match(
    /^https?:\/\/[^\/]*player[^\/]*\/.*?[?&]url=(https?:\/\/.+)$/i,
  );
  if (prefixMatch && prefixMatch[1]) {
    try {
      return decodeURIComponent(prefixMatch[1]).trim();
    } catch {
      return prefixMatch[1].trim();
    }
  }

  return cleaned;
}

const EPISODE_PREFIX = /^(tập|tap|ep(?:isode)?|#)[\s._-]*/i;

/**
 * Khoá so sánh tập phim: đưa mọi ký tự phân tách (`:`, `_`, `~`, `–`, `—`,
 * khoảng trắng) về `-` để `211:214`, `211 - 214` và slug `tap-211-214` khớp
 * nhau. Dùng chung cho danh sách tập và điều hướng tập.
 */
export function normalizeEpisodeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(EPISODE_PREFIX, "")
    // Gộp cả `-` vào đây, nếu không "211 - 214" sẽ thành "211---214".
    .replace(/[-:_~–—\s]+/g, "-")
    .replace(/\b0+(\d+)/g, "$1")
    .trim();
}

/** Số tập để hiển thị: bỏ tiền tố, bỏ số 0 thừa, thu gọn khoảng trắng quanh dấu nối. */
export function getEpNumber(slug: string): string {
  return (
    slug
      .replace(EPISODE_PREFIX, "")
      .replace(/\b0+(\d+)/g, "$1")
      .replace(/\s*([-–—:~])\s*/g, "$1")
      .trim() || slug
  );
}

/**
 * Slug tiếng Việt cho tên phim / tên tập. Khác `toSlug` ở chỗ không có luật
 * riêng cho tên server.
 */
export function toVietnameseSlug(str: string): string {
  if (!str) return "";
  let slug = str.toLowerCase();
  slug = slug.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  slug = slug.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  slug = slug.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  slug = slug.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  slug = slug.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  slug = slug.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  slug = slug.replace(/đ/g, "d");
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.trim().replace(/\s+/g, "-");
  slug = slug.replace(/-+/g, "-");
  return slug;
}

/**
 * Tách tên tập thô (tên file, dòng CSV) thành `{ name, slug }` chuẩn.
 * Dùng chung cho trang sửa phim và modal sửa phim trong admin — trước đây bị
 * copy đôi nên mỗi lần sửa lại quên một bản.
 */
export function cleanEpisodeTitle(rawTitle: string): {
  name: string;
  slug: string;
  filename: string;
} {
  const filename = (rawTitle || "").trim();
  let cleaned = filename
    .replace(/\.(mp4|mkv|avi|flv|webm|ts|m3u8)$/i, "")
    .trim();
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();

  let epName = cleaned;
  let epSlug = "";

  const parenMatch = cleaned.match(/^(\d+(?:[-–—:]\d+)?)\s*[\(\)](.*?)\)?$/);
  if (parenMatch) {
    const mainNum = parenMatch[1].replace(/[:_~–—]/g, "-");
    const subNum = parenMatch[2].trim();
    epName = `Tập ${mainNum}${subNum ? ` (${subNum})` : ""}`;
    epSlug = `tap-${mainNum.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  } else if (/^\d{6}$/.test(cleaned)) {
    const p1 = cleaned.substring(0, 3);
    const p2 = cleaned.substring(3);
    const diff = parseInt(p1, 10) - parseInt(p2, 10);
    if (diff >= 10 && diff <= 100) {
      epName = `Tập ${p1} (${p2})`;
      epSlug = `tap-${p1}`;
    } else {
      epName = `Tập ${cleaned}`;
      epSlug = `tap-${cleaned}`;
    }
  } else if (/^\d+$/.test(cleaned)) {
    epName = `Tập ${cleaned}`;
    epSlug = `tap-${cleaned}`;
  } else if (/^\d+\.\d+$/.test(cleaned)) {
    // Tập lẻ dạng thập phân (22.5, 306.5) là MỘT tập, không phải dải tập.
    epName = `Tập ${cleaned}`;
    epSlug = `tap-${cleaned.replace(".", "-")}`;
  } else if (/^\d+\s*[-–—:~_./]\s*\d+$/.test(cleaned)) {
    const parts = cleaned.split(/[-–—:~_./]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      epName = `Tập ${parts[0]}-${parts[1]}`;
      epSlug = `tap-${parts[0]}-${parts[1]}`;
    } else {
      epName = `Tập ${cleaned}`;
      epSlug = `tap-${cleaned.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    }
  } else {
    const numPrefixMatch = cleaned.match(/^(\d+)\s*[-_.:\s]+(.*)$/);
    if (numPrefixMatch) {
      const num = numPrefixMatch[1];
      const rest = numPrefixMatch[2].trim();
      if (/^\d+$/.test(rest)) {
        epName = `Tập ${num}-${rest}`;
        epSlug = `tap-${num}-${rest}`;
      } else {
        epName = `Tập ${num}: ${rest}`;
        epSlug = `tap-${num}`;
      }
    } else if (/^(tập|tap|ep|episode)\s*(\d+.*)$/i.test(cleaned)) {
      const m = cleaned.match(/^(tập|tap|ep|episode)\s*(.*)$/i);
      if (m) {
        const afterPrefix = m[2].trim();
        if (/^\d+\.\d+$/.test(afterPrefix)) {
          epName = `Tập ${afterPrefix}`;
          epSlug = `tap-${afterPrefix.replace(".", "-")}`;
        } else if (/^\d+\s*[-–—:~_./]\s*\d+$/.test(afterPrefix)) {
          const parts = afterPrefix.split(/[-–—:~_./]/).map((p) => p.trim()).filter(Boolean);
          epName = `Tập ${parts[0]}-${parts[1]}`;
          epSlug = `tap-${parts[0]}-${parts[1]}`;
        } else {
          epName = `Tập ${afterPrefix}`;
          epSlug = `tap-${toVietnameseSlug(afterPrefix)}`;
        }
      }
    } else {
      epName = cleaned.startsWith("Tập") ? cleaned : `Tập ${cleaned}`;
      epSlug = toVietnameseSlug(cleaned);
      if (!epSlug.startsWith("tap-")) {
        epSlug = `tap-${epSlug}`;
      }
    }
  }

  if (!epSlug || epSlug === "tap-") {
    epSlug = `tap-${toVietnameseSlug(epName)}`;
  }

  return { name: epName, slug: epSlug, filename };
}

/**
 * An episode is considered numeric if its display name is a number or episode range like "Tập 1", "81", "1-5", "6-10", "211:214", "286: 290", "920(865)".
 * Titles like "CHỨNG CỨ ĐỎ", "Conan bị mất tích...", "Full", "Tập Đặc Biệt" are named/special episodes.
 */
export function isNumericEpisode(episode: { name?: string; slug?: string }) {
  const raw = (episode.name || episode.slug || "").trim();
  const cleaned = raw
    .replace(/^(tập|tap|ep(?:isode)?|#)[\s._-]*/i, "")
    .replace(
      /\s*[\(\[](?:lồng tiếng|long tieng|thuyết minh|thuyet minh|vietsub|sub|phụ đề|phu de|hd|fhd|sd|cam|raw)[\)\]]/gi,
      "",
    )
    .trim();

  if (!cleaned) return false;

  // Must contain at least one digit
  if (!/\d/.test(cleaned)) return false;

  // Check if string contains only digits and common episode range/format symbols:
  // e.g. "211:214", "286: 290", "176-181", "920(865)", "348-349(342)", "22.5", "211~214", "211..214", "1-5"
  // Remove numbers, separators, punctuation, brackets, and common range words like "to", "đến", "den", "và", "va", "&"
  const stripped = cleaned
    .toLowerCase()
    // Ranh giới từ (word boundary) không áp dụng cho ký tự có dấu, phải khớp bằng khoảng trắng.
    .replace(/(^|\s)(to|đến|den|va|và)(?=\s|$)/g, "$1")
    .replace(/[\d\s\-–—:~_./+&,\(\)\[\]]/g, "")
    .replace(/^[a-z]$/i, "");

  return stripped.length === 0;
}

/** Tên tập hiển thị trong lưới: bỏ tiền tố, bỏ số 0 thừa, thu gọn khoảng trắng quanh dấu nối. */
export function formatNumericDisplayName(name: string) {
  let cleaned = (name || "")
    .replace(/^(tập|tap|ep(?:isode)?|#)[\s._-]*/i, "")
    .replace(
      /\s*[\(\[](?:lồng tiếng|long tieng|thuyết minh|thuyet minh|vietsub|sub|phụ đề|phu de|hd|fhd|sd|cam|raw)[\)\]]/gi,
      "",
    )
    .replace(/(^|\s)(?:đến|den|to|và|va)(?=\s|$)/gi, "-")
    .replace(/([-–—:~])\s*(?:tập|tap|ep(?:isode)?|#)\s*/gi, "$1")
    .trim();

  // Strip leading zeros on individual numbers, e.g. 001 -> 1, 0211 -> 211
  cleaned = cleaned.replace(/\b0+(\d+)/g, "$1");

  // Clean up whitespace around range symbols like : and - (e.g. "176 - 181" -> "176-181", "286 : 290" -> "286:290")
  cleaned = cleaned.replace(/\s*([-–—:~])\s*/g, "$1");

  return cleaned.trim() || name;
}
