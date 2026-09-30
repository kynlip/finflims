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

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    let body: {
      collections?: string[];
      format?: 'zip' | 'json';
      saveToDisk?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is allowed, defaults used
    }

    const {
      collections: targetCollections,
      format = 'zip',
      saveToDisk = false,
    } = body;

    const db = await getUsersDb();
    const allCollsInfo = await db.listCollections().toArray();
    const availableCollNames = allCollsInfo
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.'));

    const collsToBackup = targetCollections && targetCollections.length > 0
      ? availableCollNames.filter((n) => targetCollections.includes(n))
      : availableCollNames;

    if (collsToBackup.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy collection nào để sao lưu' },
        { status: 400 }
      );
    }

    const timestamp = getTimestampString();
    const dbName = db.databaseName || 'captainmedia';

    // Prepare disk storage directory if saveToDisk is enabled
    let diskDir = '';
    if (saveToDisk) {
      diskDir = path.join(process.cwd(), 'backups', 'database');
      await fs.mkdir(diskDir, { recursive: true });
    }

    // --- CASE 1: Single JSON Export ---
    if (format === 'json') {
      const dbExportData: Record<string, unknown> = {
        _metadata: {
          version: '1.0',
          database: dbName,
          createdAt: new Date().toISOString(),
          totalCollections: collsToBackup.length,
          collectionStats: {} as Record<string, number>,
        },
        collections: {} as Record<string, unknown[]>,
      };

      for (const collName of collsToBackup) {
        const coll = db.collection(collName);
        const docs = await coll.find({}).toArray();
        (dbExportData.collections as Record<string, unknown[]>)[collName] = docs;
        ((dbExportData._metadata as { collectionStats: Record<string, number> }).collectionStats)[collName] = docs.length;
      }

      const jsonString = JSON.stringify(dbExportData, null, 2);
      const filename = `backup-db-${dbName}-${timestamp}.json`;

      if (saveToDisk) {
        await fs.writeFile(path.join(diskDir, filename), jsonString, 'utf-8');
      }

      return new Response(jsonString, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // --- CASE 2: ZIP Archive Stream ---
    const filename = `backup-db-${dbName}-${timestamp}.zip`;
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

    // Metadata record
    const metaData: {
      version: string;
      database: string;
      createdAt: string;
      totalCollections: number;
      collections: Record<string, number>;
    } = {
      version: '1.0',
      database: dbName,
      createdAt: new Date().toISOString(),
      totalCollections: collsToBackup.length,
      collections: {},
    };

    // Asynchronously write collections to zip
    (async () => {
      try {
        for (const collName of collsToBackup) {
          const coll = db.collection(collName);
          const docs = await coll.find({}).toArray();
          metaData.collections[collName] = docs.length;

          const collJson = JSON.stringify(docs, null, 2);
          archive.append(collJson, { name: `collections/${collName}.json` });
        }

        // Append manifest/metadata
        archive.append(JSON.stringify(metaData, null, 2), { name: 'manifest.json' });

        await archive.finalize();
      } catch (err) {
        console.error('Error generating DB archive:', err);
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
    console.error('Backup database error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi sao lưu database';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
