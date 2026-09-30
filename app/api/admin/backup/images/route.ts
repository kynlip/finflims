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

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    let body: {
      includePublicImages?: boolean;
      saveToDisk?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      // default
    }

    const { includePublicImages = true, saveToDisk = false } = body;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    // Ensure uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = getTimestampString();
    const filename = `backup-images-${timestamp}.zip`;

    let diskDir = '';
    if (saveToDisk) {
      diskDir = path.join(process.cwd(), 'backups', 'images');
      await fs.mkdir(diskDir, { recursive: true });
    }

    const archive = new ZipArchive({
      zlib: { level: 6 }, // Faster compression for already-compressed images
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
        // Add uploads directory
        archive.directory(uploadsDir, 'uploads');

        // Add public static images (logos, favicons, banners)
        if (includePublicImages) {
          try {
            await fs.access(imagesDir);
            archive.directory(imagesDir, 'images');
          } catch {
            // images dir might be absent
          }
        }

        // Add manifest
        const manifest = {
          version: '1.0',
          type: 'images-backup',
          createdAt: new Date().toISOString(),
          includesUploads: true,
          includesPublicImages: includePublicImages,
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        await archive.finalize();
      } catch (err) {
        console.error('Error generating Images archive:', err);
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
    console.error('Backup images error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi sao lưu kho ảnh';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
