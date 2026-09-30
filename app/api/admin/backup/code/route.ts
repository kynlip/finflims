import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { ZipArchive } from 'archiver';
import { PassThrough, Readable } from 'stream';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getTimestampString() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

const EXCLUDE_DIRS = new Set([
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
  'dist',
  'build',
  '.husky',
]);

const EXCLUDE_FILES = new Set([
  '.eslintcache',
  'tsconfig.tsbuildinfo',
]);

function shouldSkipFile(filename: string): boolean {
  if (EXCLUDE_FILES.has(filename)) return true;
  if (filename.endsWith('.tsbuildinfo')) return true;
  if (filename.endsWith('.log')) return true;
  if (filename.endsWith('.tmp')) return true;
  if (filename.endsWith('.pyc')) return true;
  return false;
}

async function addDirectoryToArchive(
  archive: ZipArchive,
  currentDir: string,
  baseDir: string,
  includeUploads = false
) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      if (!includeUploads && (relPath === 'public/uploads' || relPath.startsWith('public/uploads/'))) continue;
      await addDirectoryToArchive(archive, fullPath, baseDir, includeUploads);
    } else if (entry.isFile()) {
      if (shouldSkipFile(entry.name)) continue;
      if (!includeUploads && relPath.startsWith('public/uploads/')) continue;
      archive.file(fullPath, { name: relPath });
    }
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    let body: {
      includeUploads?: boolean;
      saveToDisk?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      // default
    }

    const { includeUploads = false, saveToDisk = false } = body;
    const rootDir = process.cwd();
    const timestamp = getTimestampString();
    const filename = `backup-code-theme-${timestamp}.zip`;

    let diskDir = '';
    if (saveToDisk) {
      diskDir = path.join(process.cwd(), 'backups', 'code');
      await fs.mkdir(diskDir, { recursive: true });
    }

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    if (saveToDisk) {
      const diskPath = path.join(diskDir, filename);
      const fileOut = createWriteStream(diskPath);
      archive.pipe(fileOut);
    }

    (async () => {
      try {
        await addDirectoryToArchive(archive, rootDir, rootDir, includeUploads);

        const manifest = {
          version: '1.0',
          type: 'source-code-backup',
          createdAt: new Date().toISOString(),
          includesUploads: includeUploads,
          system: {
            nodeVersion: process.version,
            platform: process.platform,
          },
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: 'backup-manifest.json' });

        await archive.finalize();
      } catch (err) {
        console.error('Error generating Code archive:', err);
        archive.abort();
      }
    })();

    const webStream = Readable.toWeb(passThrough);

    return new Response(webStream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Backup-Filename': filename,
      },
    });
  } catch (error) {
    console.error('Backup code error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi sao lưu mã nguồn';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
