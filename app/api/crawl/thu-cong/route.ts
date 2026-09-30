import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  saveMovieToDb,
  markCrawlAsStarted,
  markCrawlAsCompleted,
  saveLog,
  getCronSettings,
} from '@/lib/crawler';
import { normalizeKkphimMovie, isKkphimDetailOk } from '@/lib/kkphim';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
  let rawSlugs: string[] = [];

  if (Array.isArray(body.slugs)) {
    rawSlugs = body.slugs;
  } else if (typeof body.slugs === 'string') {
    rawSlugs = body.slugs.split(/[\n,;]+/).map((s: string) => s.trim());
  } else if (typeof body.slug === 'string') {
    rawSlugs = [body.slug.trim()];
  }

  const slugs = rawSlugs
    .map((s) => s.replace(/^https?:\/\/[^/]+\/(?:phim\/|v1\/api\/phim\/)?/i, '').replace(/[/?#].*$/, '').trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return new Response(JSON.stringify({ error: 'Danh sách slug trống' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
      totalCount: slugs.length,
      insertedCount: 0,
      modifiedCount: 0,
      errorCount: 0,
      failedMovies: [] as string[],
    };

    try {
      await sendEvent({
        type: 'start',
        totalSlugs: slugs.length,
      });

      for (let i = 0; i < slugs.length; i++) {
        const slug = slugs[i];
        try {
          const detailRes = await fetch(`${API_BASE}/phim/${slug}`, {
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
              slug,
              name: normalized.name,
              action: 'inserted',
              index: i + 1,
              total: slugs.length,
            });
          } else {
            stats.modifiedCount++;
            await sendEvent({
              type: 'movie_saved',
              slug,
              name: normalized.name,
              action: 'modified',
              index: i + 1,
              total: slugs.length,
            });
          }
        } catch (err) {
          stats.errorCount++;
          stats.failedMovies.push(slug);
          const msg = err instanceof Error ? err.message : 'Unknown error';
          await sendEvent({
            type: 'movie_saved',
            slug,
            action: 'error',
            error: msg,
            index: i + 1,
            total: slugs.length,
          });
        }

        if (i < slugs.length - 1) {
          await sleep(500);
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

      await saveLog({
        type: 'CRAWL_THU_CONG',
        success: stats.errorCount === 0,
        message: `Cào thủ công ${slugs.length} slug: +${stats.insertedCount} mới, ~${stats.modifiedCount} cập nhật, ${stats.errorCount} lỗi. (${duration}s)`,
        timestamp: new Date().toISOString(),
        details: { stats, slugs, duration },
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
