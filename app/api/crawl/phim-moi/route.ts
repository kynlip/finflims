import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  saveMovieToDb,
  isKkphimMovieUpToDate,
  markCrawlAsStarted,
  markCrawlAsCompleted,
  saveLog,
  getCronSettings,
} from '@/lib/crawler';
import { normalizeKkphimMovie, isKkphimDetailOk } from '@/lib/kkphim';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://phimapi.com';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const apiKeyParam = searchParams.get('api_key') || request.headers.get('X-API-Key');
  const cronSettings = await getCronSettings();

  const isAuthorized =
    // @ts-expect-error - role is custom field
    session?.user?.role === 'admin' ||
    (apiKeyParam && apiKeyParam === cronSettings.apiKey);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => ({}));
  const pageFrom = Math.max(1, Number(body.pageFrom) || 1);
  const pageTo = Math.max(pageFrom, Number(body.pageTo) || pageFrom);
  const concurrent = Math.min(Math.max(1, Number(body.concurrentCrawls) || 2), 5);
  const delay = Math.max(300, Number(body.delay) || 1000);
  const skipUpToDate = body.skipUpToDate !== false;

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
    } catch {
      // client disconnected
    }
  };

  (async () => {
    const startTime = Date.now();
    const lockAcquired = await markCrawlAsStarted();

    if (!lockAcquired) {
      await sendEvent({
        type: 'error',
        message: 'Có một tiến trình cào phim khác đang chạy. Vui lòng chờ!',
      });
      await writer.close();
      return;
    }

    const stats = {
      totalCount: 0,
      insertedCount: 0,
      modifiedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      failedMovies: [] as string[],
    };

    try {
      await sendEvent({
        type: 'start',
        pageFrom,
        pageTo,
        totalPages: pageTo - pageFrom + 1,
        concurrent,
        delay,
      });

      for (let page = pageFrom; page <= pageTo; page++) {
        await sendEvent({ type: 'page_start', page, pageTo });

        // 1. Fetch danh sách phim theo trang
        let listItems: Array<{ slug: string; name: string; modified?: { time: string } }> = [];
        try {
          const listRes = await fetch(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (PhimHayHonRo Crawler)' },
            signal: AbortSignal.timeout(20000),
          });

          if (!listRes.ok) {
            throw new Error(`API returned HTTP ${listRes.status}`);
          }

          const listJson = await listRes.json();
          listItems = listJson.items || [];
        } catch (listErr) {
          const errMessage = listErr instanceof Error ? listErr.message : 'Unknown error';
          await sendEvent({
            type: 'page_error',
            page,
            error: `Lỗi tải danh sách trang ${page}: ${errMessage}`,
          });
          stats.errorCount++;
          continue;
        }

        stats.totalCount += listItems.length;

        // 2. Fetch chi tiết từng phim với giới hạn concurrent
        for (let i = 0; i < listItems.length; i += concurrent) {
          const chunk = listItems.slice(i, i + concurrent);

          await Promise.all(
            chunk.map(async (item) => {
              try {
                // Kiểm tra skip nếu phim chưa thay đổi
                if (skipUpToDate && item.modified?.time) {
                  const isUpToDate = await isKkphimMovieUpToDate(item.slug, item.modified.time);
                  if (isUpToDate) {
                    stats.skippedCount++;
                    await sendEvent({
                      type: 'movie_saved',
                      slug: item.slug,
                      name: item.name,
                      action: 'skipped',
                      message: 'Đã mới nhất',
                    });
                    return;
                  }
                }

                // Gọi detail API
                const detailRes = await fetch(`${API_BASE}/phim/${item.slug}`, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (PhimHayHonRo Crawler)' },
                  signal: AbortSignal.timeout(25000),
                });

                if (!detailRes.ok) {
                  throw new Error(`HTTP ${detailRes.status}`);
                }

                const detailJson = await detailRes.json();
                if (!isKkphimDetailOk(detailJson)) {
                  throw new Error('Invalid detail response');
                }

                const normalized = normalizeKkphimMovie(detailJson);
                if (!normalized) {
                  throw new Error('Failed to normalize movie');
                }

                const saveRes = await saveMovieToDb(normalized);
                if (saveRes.upsertedCount > 0) {
                  stats.insertedCount++;
                  await sendEvent({
                    type: 'movie_saved',
                    slug: item.slug,
                    name: normalized.name,
                    action: 'inserted',
                  });
                } else {
                  stats.modifiedCount++;
                  await sendEvent({
                    type: 'movie_saved',
                    slug: item.slug,
                    name: normalized.name,
                    action: 'modified',
                  });
                }
              } catch (err) {
                stats.errorCount++;
                stats.failedMovies.push(item.slug);
                const msg = err instanceof Error ? err.message : 'Unknown error';
                await sendEvent({
                  type: 'movie_saved',
                  slug: item.slug,
                  name: item.name,
                  action: 'error',
                  error: msg,
                });
              }
            })
          );

          if (delay > 0 && i + concurrent < listItems.length) {
            await sleep(delay);
          }
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      await sendEvent({
        type: 'complete',
        stats: {
          ...stats,
          duration,
        },
      });

      // Lưu Log vào DB
      await saveLog({
        type: 'CRAWL_PHIM_MOI',
        success: stats.errorCount === 0,
        message: `Cào phim mới trang ${pageFrom} -> ${pageTo}: +${stats.insertedCount} mới, ~${stats.modifiedCount} cập nhật, ${stats.skippedCount} bỏ qua, ${stats.errorCount} lỗi. (${duration}s)`,
        timestamp: new Date().toISOString(),
        details: { stats, pageFrom, pageTo, duration },
      });
    } catch (crawlErr) {
      const msg = crawlErr instanceof Error ? crawlErr.message : 'Unknown error';
      await sendEvent({ type: 'error', message: `Lỗi cào phim: ${msg}` });
    } finally {
      await markCrawlAsCompleted();
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
