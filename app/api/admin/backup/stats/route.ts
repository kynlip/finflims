import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getUsersDb } from '@/lib/db-helpers';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface FileStatSummary {
  count: number;
  totalSize: number;
}

// Calculate directory stats recursively with skip list
async function getDirectoryStats(
  dirPath: string,
  skipNames: Set<string> = new Set()
): Promise<FileStatSummary> {
  let count = 0;
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (skipNames.has(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = await getDirectoryStats(fullPath, skipNames);
        count += sub.count;
        totalSize += sub.totalSize;
      } else if (entry.isFile()) {
        try {
          const s = await fs.stat(fullPath);
          count++;
          totalSize += s.size;
        } catch {
          // ignore inaccessible file
        }
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return { count, totalSize };
}

// Get list of local backups stored in backups/ directory
async function getSavedBackupsList() {
  const backupsDir = path.join(process.cwd(), 'backups');
  const files: Array<{
    filename: string;
    path: string;
    size: number;
    type: 'database' | 'images' | 'code' | 'full' | 'other';
    createdAt: string;
  }> = [];

  try {
    await fs.mkdir(backupsDir, { recursive: true });
    const scanDir = async (curDir: string, relDir = '') => {
      const entries = await fs.readdir(curDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(curDir, entry.name);
        const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await scanDir(fullPath, relPath);
        } else if (entry.isFile() && (entry.name.endsWith('.zip') || entry.name.endsWith('.json') || entry.name.endsWith('.conf'))) {
          const s = await fs.stat(fullPath);
          let type: 'database' | 'images' | 'code' | 'full' | 'other' = 'other';
          const lower = entry.name.toLowerCase();
          if (lower.includes('db') || lower.includes('database')) type = 'database';
          else if (lower.includes('img') || lower.includes('image') || lower.includes('upload')) type = 'images';
          else if (lower.includes('code') || lower.includes('source')) type = 'code';
          else if (lower.includes('full') || lower.includes('all')) type = 'full';

          files.push({
            filename: entry.name,
            path: relPath.replace(/\\/g, '/'),
            size: s.size,
            type,
            createdAt: s.mtime.toISOString(),
          });
        }
      }
    };

    await scanDir(backupsDir);
  } catch (err) {
    console.error('Error scanning backups directory:', err);
  }

  return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function GET() {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const db = await getUsersDb();

    // 1. Database Stats
    const rawCollections = await db.listCollections().toArray();
    const collections: Array<{
      name: string;
      count: number;
      size: number;
    }> = [];

    let totalDbDocs = 0;
    let totalDbStorageSize = 0;

    for (const collInfo of rawCollections) {
      if (collInfo.name.startsWith('system.')) continue;
      try {
        const coll = db.collection(collInfo.name);
        const count = await coll.countDocuments();
        let size = 0;
        try {
          const stats = await db.command({ collStats: collInfo.name });
          size = stats.totalSize || stats.size || stats.storageSize || 0;
        } catch {
          size = count * 1024;
        }

        totalDbDocs += count;
        totalDbStorageSize += size;

        collections.push({
          name: collInfo.name,
          count,
          size,
        });
      } catch (e) {
        console.warn(`Error getting stats for collection ${collInfo.name}:`, e);
      }
    }

    collections.sort((a, b) => b.count - a.count);

    // 2. Images & Media Stats (including /public/uploads/movies)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const moviesUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'movies');
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    const uploadsStat = await getDirectoryStats(uploadsDir);
    const moviesUploadsStat = await getDirectoryStats(moviesUploadsDir);
    const imagesStat = await getDirectoryStats(imagesDir);

    const mediaStats = {
      count: uploadsStat.count + imagesStat.count,
      totalSize: uploadsStat.totalSize + imagesStat.totalSize,
      uploadsCount: uploadsStat.count,
      uploadsSize: uploadsStat.totalSize,
      moviesUploadsCount: moviesUploadsStat.count,
      moviesUploadsSize: moviesUploadsStat.totalSize,
      moviesUploadsDir: '/home/phimhay/public/uploads/movies',
      staticImagesCount: imagesStat.count,
      staticImagesSize: imagesStat.totalSize,
    };

    // 3. Codebase Stats (Excludes build artifacts and server caches)
    const codeSkipDirs = new Set([
      'node_modules',
      '.next',
      '.git',
      '.venv',
      '__pycache__',
      '.idea',
      '.vscode',
      'downloads',
      'logs',
      '.remember',
      '.gemini',
      'output',
      'backups',
      '.eslintcache',
      'dist',
      'build',
      'public', // Separated into media
    ]);
    const codeStat = await getDirectoryStats(process.cwd(), codeSkipDirs);

    // 4. Saved Backups on server
    const savedBackups = await getSavedBackupsList();
    const savedBackupsTotalSize = savedBackups.reduce((sum, f) => sum + f.size, 0);

    // 5. Nginx & VPS Config verification
    let nginxExists = false;
    const nginxPath = '/etc/nginx/sites-enabled/phimhayhonro.net';
    try {
      await fs.access(nginxPath);
      nginxExists = true;
    } catch {
      nginxExists = false;
    }

    return NextResponse.json({
      success: true,
      database: {
        dbName: db.databaseName,
        totalCollections: collections.length,
        totalDocuments: totalDbDocs,
        totalSize: totalDbStorageSize,
        collections,
      },
      media: mediaStats,
      code: {
        totalFiles: codeStat.count,
        totalSize: codeStat.totalSize,
        projectDir: '/home/phimhay',
      },
      vps: {
        host: '46.250.226.213',
        projectDir: '/home/phimhay',
        pm2Name: 'phimhay',
        domain: 'phimhayhonro.net',
        nginxPath,
        nginxExists,
      },
      savedBackups: {
        count: savedBackups.length,
        totalSize: savedBackupsTotalSize,
        items: savedBackups,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
      },
    });
  } catch (error) {
    console.error('Backup stats error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi lấy thống kê sao lưu';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
