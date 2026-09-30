import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getUsersDb } from '@/lib/db-helpers';
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

async function addCodeDirectory(
  archive: ZipArchive,
  currentDir: string,
  baseDir: string
) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      // Skip public/uploads in code directory because it's bundled in uploads/
      if (relPath === 'public/uploads' || relPath.startsWith('public/uploads/')) continue;
      await addCodeDirectory(archive, fullPath, baseDir);
    } else if (entry.isFile()) {
      if (shouldSkipFile(entry.name)) continue;
      if (relPath.startsWith('public/uploads/')) continue;
      archive.file(fullPath, { name: `code/${relPath}` });
    }
  }
}

async function getNginxConfigContent(): Promise<string | null> {
  const possiblePaths = [
    '/etc/nginx/sites-enabled/phimhayhonro.net',
    '/etc/nginx/sites-available/phimhayhonro.net',
    '/etc/nginx/conf.d/phimhayhonro.net.conf',
  ];
  for (const p of possiblePaths) {
    try {
      return await fs.readFile(/*turbopackIgnore: true*/ p, 'utf-8');
    } catch {
      // ignore
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    let body: { saveToDisk?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // default
    }

    const { saveToDisk = false } = body;
    const db = await getUsersDb();
    const dbName = db.databaseName || 'captainmedia';
    const timestamp = getTimestampString();
    const filename = `backup-full-all-hoathinh-${timestamp}.zip`;

    let diskDir = '';
    if (saveToDisk) {
      diskDir = path.join(process.cwd(), 'backups', 'full');
      await fs.mkdir(diskDir, { recursive: true });
    }

    const archive = new ZipArchive({
      zlib: { level: 6 },
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
        const manifest: Record<string, unknown> = {
          version: '1.0',
          type: 'full-system-backup',
          createdAt: new Date().toISOString(),
          database: {
            name: dbName,
            collections: {} as Record<string, number>,
          },
        };

        // 1. Export MongoDB Collections
        const collectionsInfo = await db.listCollections().toArray();
        for (const collInfo of collectionsInfo) {
          if (collInfo.name.startsWith('system.')) continue;
          const coll = db.collection(collInfo.name);
          const docs = await coll.find({}).toArray();
          (manifest.database as { collections: Record<string, number> }).collections[collInfo.name] = docs.length;
          archive.append(JSON.stringify(docs, null, 2), {
            name: `database/${collInfo.name}.json`,
          });
        }

        // 2. Add Media & Uploads
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        try {
          await fs.access(uploadsDir);
          archive.directory(uploadsDir, 'uploads');
        } catch {
          // uploads dir might be empty
        }

        const imagesDir = path.join(process.cwd(), 'public', 'images');
        try {
          await fs.access(imagesDir);
          archive.directory(imagesDir, 'images');
        } catch {
          // images dir might be empty
        }

        // 3. Add Source Code
        const rootDir = process.cwd();
        await addCodeDirectory(archive, rootDir, rootDir);

        // 4. Add Nginx Config
        const nginxConfig = await getNginxConfigContent();
        if (nginxConfig) {
          archive.append(nginxConfig, { name: 'nginx/phimhayhonro.net.conf' });
          (manifest as Record<string, unknown>).nginx = { backedUp: true, path: '/etc/nginx/sites-enabled/phimhayhonro.net' };
        }

        // 5. Add Manifest
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        await archive.finalize();
      } catch (err) {
        console.error('Error generating Full System archive:', err);
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
    console.error('Backup full system error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi sao lưu toàn bộ hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
