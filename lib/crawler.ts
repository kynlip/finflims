// lib/crawler.ts — Helper quản lý Database, Cào phim & Cronjob

import clientPromise from './mongodb';
import { MovieData } from './kkphim';
import { Collection, Db } from 'mongodb';

export const DB_NAME = process.env.MONGODB_DB_NAME || 'captainmedia';
export const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'kkphim';
export const SETTINGS_COLLECTION = 'settings';
export const LOG_COLLECTION = 'logs';

export interface CronSettings {
  enabled: boolean;
  interval: number; // minutes
  concurrentCrawls: number;
  delay: number; // ms
  apiKey: string;
  lastRun: string | null;
  nextRun: string | null;
  telegram?: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
}

export interface CrawlLog {
  type: string;
  success: boolean;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
  createdAt?: Date;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getMovieCollection(): Promise<Collection<Record<string, unknown>>> {
  const db = await getDb();
  return db.collection(COLLECTION_NAME);
}

// Lưu 1 phim (Upsert)
export async function saveMovieToDb(movieData: MovieData): Promise<{ upsertedCount: number; modifiedCount: number }> {
  const col = await getMovieCollection();
  const { _id, created, crawledAt, updatedAt, view, ...movieToSave } = movieData;
  void _id;
  void crawledAt;
  void updatedAt;
  void view;

  const now = new Date();
  const nowIso = now.toISOString();

  const result = await col.updateOne(
    { slug: movieData.slug, is_manual: { $ne: true } },
    {
      $set: {
        ...movieToSave,
        modified: movieToSave.modified || { time: nowIso },
        updatedAt: now,
      },
      $setOnInsert: {
        created: created || { time: nowIso },
        crawledAt: now,
        view: 0,
      },
    },
    { upsert: true }
  );

  return {
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
  };
}

// Lưu nhiều phim cùng lúc (Bulk Upsert)
export async function saveMoviesBulk(movies: MovieData[]): Promise<{
  inserted: number;
  modified: number;
  matched: number;
}> {
  if (movies.length === 0) return { inserted: 0, modified: 0, matched: 0 };
  const col = await getMovieCollection();
  const now = new Date();
  const nowIso = now.toISOString();

  const ops = movies.map((m) => {
    const { _id, created, crawledAt, updatedAt, view, ...rest } = m;
    void _id;
    void crawledAt;
    void updatedAt;
    void view;

    return {
      updateOne: {
        filter: { slug: m.slug, is_manual: { $ne: true } },
        update: {
          $set: {
            ...rest,
            modified: rest.modified || { time: nowIso },
            updatedAt: now,
          },
          $setOnInsert: {
            created: created || { time: nowIso },
            crawledAt: now,
            view: 0,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await col.bulkWrite(ops, { ordered: false });
  return {
    inserted: result.upsertedCount,
    modified: result.modifiedCount,
    matched: result.matchedCount,
  };
}

// So sánh modified.time để skip phim chưa đổi
export async function isKkphimMovieUpToDate(slug: string, apiModified: string): Promise<boolean> {
  const col = await getMovieCollection();
  const doc = (await col.findOne({ slug }, { projection: { modified: 1 } })) as {
    modified?: { time?: string };
  } | null;
  if (!doc?.modified?.time) return false;
  return doc.modified.time >= apiModified;
}

// Quản lý Settings Cronjob
export async function getCronSettings(): Promise<CronSettings> {
  const db = await getDb();
  const doc = await db.collection(SETTINGS_COLLECTION).findOne({ type: 'cron-kkphim' });

  const defaultSettings: CronSettings = {
    enabled: true,
    interval: 30,
    concurrentCrawls: 2,
    delay: 1000,
    apiKey: process.env.CRON_API_KEY || 'Anime2026CronVipKey',
    lastRun: null,
    nextRun: null,
    telegram: {
      enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
  };

  if (!doc) return defaultSettings;

  return {
    enabled: doc.enabled ?? defaultSettings.enabled,
    interval: doc.interval ?? defaultSettings.interval,
    concurrentCrawls: doc.concurrentCrawls ?? defaultSettings.concurrentCrawls,
    delay: doc.delay ?? defaultSettings.delay,
    apiKey: doc.apiKey || defaultSettings.apiKey,
    lastRun: doc.lastRun ?? null,
    nextRun: doc.nextRun ?? null,
    telegram: {
      enabled: doc.telegram?.enabled ?? defaultSettings.telegram!.enabled,
      botToken: doc.telegram?.botToken || defaultSettings.telegram!.botToken,
      chatId: doc.telegram?.chatId || defaultSettings.telegram!.chatId,
    },
  };
}

export async function saveCronSettings(settings: Partial<CronSettings>): Promise<void> {
  const db = await getDb();
  await db.collection(SETTINGS_COLLECTION).updateOne(
    { type: 'cron-kkphim' },
    {
      $set: {
        ...settings,
        type: 'cron-kkphim',
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Quản lý Lock Crawl (Tránh 2 job cào đè nhau)
export async function isCrawlRunning(): Promise<boolean> {
  const db = await getDb();
  const lock = await db.collection(SETTINGS_COLLECTION).findOne({ type: 'crawl-lock-kkphim' });
  if (!lock?.isRunning) return false;

  // Tự release nếu lock quá 15 phút (stale lock)
  const lockTime = new Date(lock.startedAt || 0).getTime();
  if (Date.now() - lockTime > 15 * 60 * 1000) {
    await markCrawlAsCompleted();
    return false;
  }
  return true;
}

export async function markCrawlAsStarted(): Promise<boolean> {
  const db = await getDb();
  const running = await isCrawlRunning();
  if (running) return false;

  await db.collection(SETTINGS_COLLECTION).updateOne(
    { type: 'crawl-lock-kkphim' },
    {
      $set: {
        isRunning: true,
        startedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  return true;
}

export async function markCrawlAsCompleted(): Promise<void> {
  const db = await getDb();
  await db.collection(SETTINGS_COLLECTION).updateOne(
    { type: 'crawl-lock-kkphim' },
    {
      $set: {
        isRunning: false,
        completedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

// Lưu Logs
export async function saveLog(logData: CrawlLog): Promise<void> {
  try {
    const db = await getDb();
    await db.collection(LOG_COLLECTION).insertOne({
      ...logData,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save log to MongoDB:', error);
  }
}

export async function getRecentLogs(limit = 50): Promise<CrawlLog[]> {
  try {
    const db = await getDb();
    const logs = await db
      .collection(LOG_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return logs.map(({ _id, ...rest }) => ({
      ...rest,
      id: _id.toString(),
    })) as unknown as CrawlLog[];
  } catch {
    return [];
  }
}
