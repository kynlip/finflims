import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getCronSettings,
  saveCronSettings,
  saveMovieToDb,
  isKkphimMovieUpToDate,
  isCrawlRunning,
  markCrawlAsStarted,
  markCrawlAsCompleted,
  saveLog,
  getMovieCollection,
} from '@/lib/crawler';
import { normalizeKkphimMovie, isKkphimDetailOk } from '@/lib/kkphim';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://phimapi.com';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  return handleCronjob(request);
}

export async function POST(request: NextRequest) {
  return handleCronjob(request);
}

async function handleCronjob(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const apiKeyParam = searchParams.get('api_key') || request.headers.get('X-API-Key');
  const cronSettings = await getCronSettings();

  const isAuthorized =
    // @ts-expect-error - role is custom field
    session?.user?.role === 'admin' ||
    (apiKeyParam && apiKeyParam === cronSettings.apiKey);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  // Check if crawl is already running
  const running = await isCrawlRunning();
  if (running) {
    return NextResponse.json(
      { ok: false, message: 'Crawl job is already running, skipping' },
      { status: 429 }
    );
  }

  const startTime = Date.now();
  await markCrawlAsStarted();

  const now = new Date();
  const nextRun = new Date(now.getTime() + cronSettings.interval * 60 * 1000);

  await saveCronSettings({
    lastRun: now.toISOString(),
    nextRun: nextRun.toISOString(),
  });

  const stats = {
    totalCount: 0,
    insertedCount: 0,
    modifiedCount: 0,
    skippedCount: 0,
    errorCount: 0,
  };

  const pagesToCrawl = 2; // Default crawl top 2 pages (~48 movies)
  const concurrent = cronSettings.concurrentCrawls || 2;
  const delay = cronSettings.delay || 1000;

  try {
    for (let page = 1; page <= pagesToCrawl; page++) {
      let listItems: Array<{ slug: string; name: string; modified?: { time: string } }> = [];
      try {
        const listRes = await fetch(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (PhimHayHonRo AutoCrawler)' },
          signal: AbortSignal.timeout(20000),
        });

        if (listRes.ok) {
          const listJson = await listRes.json();
          listItems = listJson.items || [];
        }
      } catch (err) {
        console.error(`[Cronjob] Failed to fetch list page ${page}:`, err);
        stats.errorCount++;
        continue;
      }

      stats.totalCount += listItems.length;

      for (let i = 0; i < listItems.length; i += concurrent) {
        const chunk = listItems.slice(i, i + concurrent);

        await Promise.all(
          chunk.map(async (item) => {
            try {
              if (item.modified?.time) {
                const isUpToDate = await isKkphimMovieUpToDate(item.slug, item.modified.time);
                if (isUpToDate) {
                  stats.skippedCount++;
                  return;
                }
              }

              const detailRes = await fetch(`${API_BASE}/phim/${item.slug}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (PhimHayHonRo AutoCrawler)' },
                signal: AbortSignal.timeout(25000),
              });

              if (!detailRes.ok) return;

              const detailJson = await detailRes.json();
              if (!isKkphimDetailOk(detailJson)) return;

              const normalized = normalizeKkphimMovie(detailJson);
              if (!normalized) return;

              const saveRes = await saveMovieToDb(normalized);
              if (saveRes.upsertedCount > 0) {
                stats.insertedCount++;
              } else {
                stats.modifiedCount++;
              }
            } catch {
              stats.errorCount++;
            }
          })
        );

        if (delay > 0 && i + concurrent < listItems.length) {
          await sleep(delay);
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Save log
    await saveLog({
      type: 'AUTO_CRONJOB',
      success: stats.errorCount === 0,
      message: `Auto Cronjob hoàn tất: +${stats.insertedCount} mới, ~${stats.modifiedCount} cập nhật, ${stats.skippedCount} bỏ qua, ${stats.errorCount} lỗi. (${duration}s)`,
      timestamp: new Date().toISOString(),
      details: { stats, duration },
    });

    // Send Telegram Notification
    if (cronSettings.telegram?.enabled && cronSettings.telegram?.botToken && cronSettings.telegram?.chatId) {
      let totalDbMovies = 0;
      try {
        const col = await getMovieCollection();
        totalDbMovies = await col.countDocuments();
      } catch {
        // ignore
      }

      const icon = stats.errorCount > 0 ? '🟡' : '🟢';
      const dt = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const tgMessage = `🎬 <b>Báo cáo Auto Crawl Hoạt Hình - ${dt}</b>

${icon} <b>KKPhim</b>: ${stats.errorCount === 0 ? 'Thành công' : `${stats.errorCount} lỗi`}
⏱ Thời gian: <b>${duration}s</b>

📊 <b>Thống kê:</b>
• Tổng phim trong DB: <b>${totalDbMovies.toLocaleString('vi-VN')}</b>
• Phim mới cào: <b>${stats.insertedCount}</b>
• Phim cập nhật tập mới: <b>${stats.modifiedCount}</b>
• Bỏ qua (đã mới nhất): <b>${stats.skippedCount}</b>
• Lỗi: <b>${stats.errorCount}</b>

🤖 <b>Trạng thái:</b>
• Auto crawl: 🟢 Hoạt động (mỗi ${cronSettings.interval} phút)
• Website: <code>https://phimhayhonro.net</code>`;

      await sendTelegramMessage(tgMessage, {
        botToken: cronSettings.telegram.botToken,
        chatId: cronSettings.telegram.chatId,
        enabled: true,
      });
    }

    return NextResponse.json({
      ok: true,
      stats,
      duration,
      message: 'Crawl job completed successfully',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    await markCrawlAsCompleted();
  }
}
