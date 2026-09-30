// Custom pLoader cho hls.js — intercept playlist response và clean ads inline.
//
// Lợi ích so với approach cũ (fetch → clean → blob URL rồi pass cho hls.js):
//   1. Master playlist giữ nguyên → hls.js thấy đủ variants → ABR hoạt động,
//      capLevelToPlayerSize / capLevelOnFPSDrop có tác dụng.
//   2. Chỉ clean media playlist khi hls.js request → không chặn initial load,
//      không tạo blob URL giả (blob khiến mỗi lần seek phải làm việc thừa).
//   3. URL tương đối trong playlist do hls.js tự resolve theo response URL.

import type {
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderResponse,
  PlaylistLoaderConstructor,
} from "hls.js";
import { cleanMediaPlaylistText } from "./adBlocker";

type LoaderCtor = new (config: HlsConfig) => Loader<LoaderContext>;

/**
 * Wrap một playlist loader class để clean ads trong response m3u8.
 *
 * Chỉ clean MEDIA playlist (không có `#EXT-X-STREAM-INF`) của level chính;
 * audio/subtitle track giữ nguyên vì ad-marker regex match theo pattern URL
 * segment, dễ false positive trên track audio → rè/rớt tiếng.
 */
export function createAdBlockPlaylistLoader(
  BaseLoader: LoaderCtor,
): PlaylistLoaderConstructor {
  class AdBlockPlaylistLoader extends BaseLoader {
    load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>,
    ): void {
      const originalOnSuccess = callbacks.onSuccess;

      const patchedCallbacks: LoaderCallbacks<LoaderContext> = {
        ...callbacks,
        onSuccess: (response, stats, ctx, networkDetails) => {
          try {
            const data = response.data;
            const contextType = (ctx as { type?: string }).type;
            const isMainLevel =
              contextType === "level" || contextType === undefined;

            if (
              isMainLevel &&
              typeof data === "string" &&
              data.includes("#EXTM3U") &&
              !data.includes("#EXT-X-STREAM-INF")
            ) {
              const baseUrl = response.url || ctx.url;
              const cleaned = cleanMediaPlaylistText(data, baseUrl);
              const patched: LoaderResponse = { ...response, data: cleaned };
              originalOnSuccess(patched, stats, ctx, networkDetails);
              return;
            }
          } catch (err) {
            // Fail-open: lỗi clean → trả response gốc để vẫn phát được.
            console.warn("[AdBlockLoader] clean failed, passing through:", err);
          }
          originalOnSuccess(response, stats, ctx, networkDetails);
        },
      };

      super.load(context, config, patchedCallbacks);
    }
  }

  return AdBlockPlaylistLoader as unknown as PlaylistLoaderConstructor;
}
