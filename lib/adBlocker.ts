// ==================================================================
// Ad Blocker module - Ported from hth4nh/PureMovies & optimized
// ==================================================================

// Ad-detection regex fallback — chỉ những pattern CỤ THỂ (signature exact)
// được giữ. Đã LOẠI BỎ:
//   - Pattern heuristic "DISC + 18-24 dòng + DISC": gây FALSE POSITIVE.
//     Một số phim có legit transitional block (chuyển scene, chuyển source)
//     wrap bằng 2 DISC với 11-23 segments giữa. Pattern này xoá nhầm
//     content → gap PTS → user SEEK tới mốc đó = video freeze, desync.
//   - Stripping `convertv7/` từ URL: xoá 1 phần path mà không xoá cả segment
//     → URL invalid → hls.js fetch 404 → retry-loop. Đã chuyển sang phát
//     hiện qua `processDiscontinuityBlocks` bằng segment-marker (chính xác
//     hơn, không break URL).
export const adsRegexList: RegExp[] = [
  // Signature: ad block với chuỗi EXTINF duration cố định của 1 mạng quảng cáo
  // hay xuất hiện. Đặc thù đến mức gần như không thể trùng nội dung phim.
  /#EXT-X-DISCONTINUITY\n#EXTINF:3\.920000,\n.*\n#EXTINF:0\.760000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:2\.500000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:2\.420000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:0\.780000,\n.*\n#EXTINF:1\.960000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:1\.760000,\n.*\n#EXTINF:3\.200000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:1\.360000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:2\.000000,\n.*\n#EXTINF:0\.720000,\n.*/g,
];
const DISCONTINUITY_TAG = "#EXT-X-DISCONTINUITY";

function collapseConsecutiveDiscontinuities(playlist: string): string {
  const lines = playlist.split(/\r?\n/);
  const normalized: string[] = [];
  let previousWasDiscontinuity = false;

  for (const line of lines) {
    if (line.trim() === DISCONTINUITY_TAG) {
      if (previousWasDiscontinuity) {
        continue;
      }
      normalized.push(DISCONTINUITY_TAG);
      previousWasDiscontinuity = true;
      continue;
    }

    normalized.push(line);
    if (line.trim().length > 0) {
      previousWasDiscontinuity = false;
    }
  }

  while (
    normalized.length > 0 &&
    normalized[normalized.length - 1].trim().length === 0
  ) {
    normalized.pop();
  }

  if (
    normalized.length > 0 &&
    normalized[normalized.length - 1].trim() === DISCONTINUITY_TAG
  ) {
    normalized.pop();
  }

  return normalized.join("\n");
}

export function processDiscontinuityBlocks(playlist: string): string {
  const lines = playlist.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() !== DISCONTINUITY_TAG) {
      result.push(line);
      i += 1;
      continue;
    }

    const blockLines: string[] = [];
    i += 1;

    while (i < lines.length && lines[i].trim() !== DISCONTINUITY_TAG) {
      blockLines.push(lines[i]);
      i += 1;
    }

    if (i < lines.length) {
      i += 1; // skip closing DISCONTINUITY
    }

    const segmentLines = blockLines.filter((candidateLine) => {
      const trimmed = candidateLine.trim();
      return trimmed.length > 0 && !trimmed.startsWith("#");
    });

    const isAdBlock = segmentLines.some((candidateLine) =>
      /\/v\d+\/|convertv\d+\/|\/i\d+\.com\/|adjump\//.test(candidateLine),
    );

    if (!isAdBlock) {
      result.push(DISCONTINUITY_TAG);
      result.push(...blockLines);
      result.push(DISCONTINUITY_TAG);
    } else {
      result.push(DISCONTINUITY_TAG);
    }
  }

  let cleaned = collapseConsecutiveDiscontinuities(result.join("\n"));

  for (const regex of adsRegexList) {
    regex.lastIndex = 0;
    cleaned = cleaned.replaceAll(regex, "");
  }

  return cleaned;
}

export const removeDiscontinuityAds = processDiscontinuityBlocks;

/**
 * Synchronous media-playlist cleaner used by the hls.js pLoader.
 *
 * Không tạo blob URL: hls.js giữ nguyên URL playlist gốc nên segment tương đối
 * vẫn resolve đúng, master playlist giữ đủ variants cho ABR, và mỗi lần seek
 * không phải nạp lại một playlist giả.
 *
 * KHÔNG strip hết `#EXT-X-DISCONTINUITY` — các discontinuity hợp lệ còn lại cần
 * tag để hls.js biết PTS có thể reset, bỏ đi sẽ gây lệch tiếng/hình.
 */
export function cleanMediaPlaylistText(text: string, baseUrl: string): string {
  if (!text.includes("#EXTM3U")) return text;

  const withAbsoluteUrls = text.replace(/^[^#].*$/gm, (line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return line;
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      return line;
    }
  });

  if (!isContainAds(withAbsoluteUrls)) {
    return collapseConsecutiveDiscontinuities(withAbsoluteUrls);
  }

  return processDiscontinuityBlocks(withAbsoluteUrls);
}

export function isLikelyPlaylistUrl(url: string): boolean {
  return /\.m3u8(?:$|[/?#&])/i.test(url) || url.includes("/api/stream/");
}

// Providers whose in-stream ads must stay intact for non-VIP viewers.
// KKPhim và các nguồn crawl khác luôn được lọc quảng cáo, kể cả user thường,
// nên KHÔNG được đưa vào danh sách này.
export const domainBypassWhitelist = ["loadvid.com"];

const nestedSourceParams = ["url", "src", "source", "m3u8", "file"];

function isDirectM3u8Url(candidate: string): boolean {
  try {
    const urlObj = new URL(candidate, "http://localhost");
    return urlObj.pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

function decodeUrlSafely(value: string): string {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        break;
      }
      decoded = nextDecoded;
    } catch {
      break;
    }
  }
  return decoded;
}

function isWhitelistedHostname(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");

  return domainBypassWhitelist.some((domain) => {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");

    if (normalizedDomain.includes(".")) {
      return (
        normalizedHost === normalizedDomain ||
        normalizedHost.endsWith(`.${normalizedDomain}`)
      );
    }

    return normalizedHost.includes(normalizedDomain);
  });
}

/**
 * Keep provider-owned ad delivery intact. Some providers are wrapped in a
 * local resolver URL, so inspect nested query parameters as well as the
 * visible URL hostname.
 */
export function isAdBlockBypassed(rawUrl: string): boolean {
  const pending = [rawUrl];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const candidate = decodeUrlSafely(pending.shift() || "").trim();
    if (!candidate || visited.has(candidate)) continue;
    visited.add(candidate);

    try {
      const parsed = new URL(candidate, "http://localhost");
      if (isWhitelistedHostname(parsed.hostname)) return true;

      for (const value of parsed.searchParams.values()) {
        pending.push(value);
      }
    } catch {
      // Ignore malformed nested values and continue checking other values.
    }
  }

  return false;
}

function getNestedM3u8FromQuery(urlObj: URL): string | null {
  for (const key of nestedSourceParams) {
    const rawValue = urlObj.searchParams.get(key);
    if (!rawValue) continue;
    const decoded = decodeUrlSafely(rawValue.trim());
    if (isDirectM3u8Url(decoded)) {
      return decoded;
    }
  }

  for (const [, value] of urlObj.searchParams.entries()) {
    const decoded = decodeUrlSafely(value.trim());
    if (isDirectM3u8Url(decoded)) {
      return decoded;
    }
  }

  return null;
}

export function extractDirectPlaylistUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return rawUrl;

  const decodedInput = decodeUrlSafely(trimmed);
  if (isDirectM3u8Url(decodedInput)) {
    return decodedInput;
  }

  const candidates = [trimmed, decodedInput];
  for (const candidate of candidates) {
    try {
      const urlObj = new URL(candidate, "http://localhost");
      const nested = getNestedM3u8FromQuery(urlObj);
      if (nested) return nested;
    } catch {
      // Ignore parse errors and continue fallback chain.
    }
  }

  return trimmed;
}

export const adSelectors = [
  ".ad-overlay",
  ".vast-blocker",
  '[class*="ad-container"]',
  '[id*="ads-"]',
  '[class*="ads_"]',
  '[id*="ads_"]',
  '[class*="adbox"]',
  '[id*="adbox"]',
  'iframe[src*="ads"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  'iframe[src*="adnxs"]',
  'iframe[src*="monetag"]',
  'iframe[src*="zovidree"]',
  'script[src*="zovidree"]',
  'script[src*="monetag"]',
  'div[id*="google_ads"]',
  'div[id*="div-gpt-ad"]',
  'div[class*="banner-ads"]',
  'div[class*="ads-container"]',
  'div[style*="z-index: 9999"]',
  'div[style*="z-index:9999"]',
  'div[style*="position: fixed"][style*="bottom"]',
  'div[style*="position:fixed"][style*="bottom"]',
];

const processedUrlsCache = new Map<string, string>();

export function isContainAds(playlist: string): boolean {
  if (/\/v\d+\//.test(playlist)) return true;
  if (/convertv\d+\//.test(playlist)) return true;
  if (/\/i\d+\.com\//.test(playlist)) return true;
  if (/adjump\//.test(playlist)) return true;
  return adsRegexList.some((regex) => {
    regex.lastIndex = 0;
    return regex.test(playlist);
  });
}

export function getTotalDuration(playlist: string): number {
  const matches = playlist.match(/#EXTINF:([\d.]+)/g) ?? [];
  return matches.reduce((sum, match) => {
    return sum + parseFloat(match.split(":")[1]);
  }, 0);
}

export async function removeAdsFromPlaylist(
  playlistUrl: string,
  options?: { isAdFree?: boolean },
): Promise<string> {
  try {
    const isAdFree = options?.isAdFree === true;
    const directPlaylistUrl = extractDirectPlaylistUrl(playlistUrl);
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const urlObj = new URL(directPlaylistUrl, baseOrigin);
    const cacheKey = `${isAdFree ? 'vip' : 'free'}::${directPlaylistUrl}`;

    if (processedUrlsCache.has(cacheKey)) {
      return processedUrlsCache.get(cacheKey)!;
    }

    // LoadVid owns the ad delivery for its player, so its ads stay in place for
    // regular viewers. VIP (ad-free) accounts get the playlist filtered as well.
    if (
      !isAdFree &&
      (isAdBlockBypassed(playlistUrl) || isAdBlockBypassed(directPlaylistUrl))
    ) {
      const passthroughUrl = playlistUrl.includes('/api/stream/loadvid')
        ? playlistUrl
        : directPlaylistUrl;
      processedUrlsCache.set(cacheKey, passthroughUrl);
      return passthroughUrl;
    }

    const response = await fetch(directPlaylistUrl, {
      headers: {
        'Referer': urlObj.origin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error("[AdBlocker] Failed to fetch playlist:", response.status);
      return directPlaylistUrl;
    }

    let playlist = await response.text();
    if (!playlist.includes("#EXTM3U")) {
      return directPlaylistUrl;
    }

    // `directPlaylistUrl` can be a same-origin relative path (LoadVid resolver),
    // which is not a valid base URL, so resolve against the absolute form.
    const absolutePlaylistUrl = urlObj.toString();

    playlist = playlist.replace(/^[^#].*$/gm, (line) => {
      try {
        if (line.startsWith('http://') || line.startsWith('https://')) {
          return line;
        }
        return new URL(line, absolutePlaylistUrl).toString();
      } catch {
        return line;
      }
    });

    const fallbackPlaylist = playlist;

    // Master playlist handling
    if (playlist.includes("#EXT-X-STREAM-INF")) {
      const lines = playlist
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const lastVariantUri = [...lines]
        .reverse()
        .find((line) => !line.startsWith("#"));

      if (!lastVariantUri) {
        return directPlaylistUrl;
      }

      const childUrl = new URL(lastVariantUri, absolutePlaylistUrl).toString();
      const childResult = await removeAdsFromPlaylist(childUrl, options);
      processedUrlsCache.set(cacheKey, childResult);
      return childResult;
    }

    // Check if ads are present
    const hasAds = isContainAds(playlist);
    if (!hasAds) {
      // If clean playlist, return direct URL for maximum streaming efficiency
      processedUrlsCache.set(cacheKey, directPlaylistUrl);
      return directPlaylistUrl;
    }

    let cleanedPlaylist = processDiscontinuityBlocks(playlist);
    cleanedPlaylist = collapseConsecutiveDiscontinuities(cleanedPlaylist);
    playlist = cleanedPlaylist;

    if (!playlist.includes("#EXTM3U")) {
      playlist = fallbackPlaylist;
    }

    const cleanUrl = URL.createObjectURL(
      new Blob([playlist], {
        type:
          response.headers.get("Content-Type") ??
          "application/vnd.apple.mpegurl",
      }),
    );

    processedUrlsCache.set(cacheKey, cleanUrl);

    setTimeout(
      () => {
        processedUrlsCache.delete(cacheKey);
        if (cleanUrl.startsWith("blob:")) {
          URL.revokeObjectURL(cleanUrl);
        }
      },
      5 * 60 * 1000,
    );

    return cleanUrl;
  } catch (error) {
    console.error("Lỗi khi xử lý playlist:", error);
    return extractDirectPlaylistUrl(playlistUrl);
  }
}

export function removeAdElements(
  onRemove?: (count: number) => void,
  sourceUrl?: string,
  options?: { isAdFree?: boolean },
): number {
  // Provider-owned overlays stay for regular viewers; VIP accounts get them removed.
  if (!options?.isAdFree && sourceUrl && isAdBlockBypassed(sourceUrl)) return 0;

  const adElements = document.querySelectorAll(adSelectors.join(","));
  let count = 0;

  adElements.forEach((el) => {
    // Keep admin-managed Monetag/custom placements alive. The selector list
    // contains generic ad-container patterns used for player-owned overlays.
    if (el.closest("[data-ad-placement]")) return;

    if (el instanceof HTMLElement) {
      el.style.display = "none";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      if (el.parentNode) {
        el.parentNode.removeChild(el);
        count++;
      }
    }
  });

  if (count > 0 && onRemove) {
    onRemove(count);
  }

  return count;
}

export function detectVideoAd(video: HTMLVideoElement): boolean {
  const duration = video.duration;
  const currentTime = video.currentTime;
  const isShortAd = duration < 45 && duration > 5 && currentTime < 2;
  const isLowQuality = video.videoWidth < 400;
  return isShortAd || isLowQuality;
}
