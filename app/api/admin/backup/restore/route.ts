import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getUsersDb } from '@/lib/db-helpers';
import { Filter, Document, ObjectId } from 'mongodb';
import { unzipSync, strFromU8 } from 'fflate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sanitizeDoc(doc: unknown): unknown {
  if (!doc || typeof doc !== 'object') return doc;
  if (Array.isArray(doc)) return doc.map(sanitizeDoc);

  const res: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc as Record<string, unknown>)) {
    if (val && typeof val === 'object' && '$oid' in val && typeof (val as { $oid: unknown }).$oid === 'string') {
      try {
        res[key] = new ObjectId((val as { $oid: string }).$oid);
      } catch {
        res[key] = (val as { $oid: string }).$oid;
      }
    } else if (val && typeof val === 'object' && '$date' in val) {
      res[key] = new Date((val as { $date: string | number }).$date);
    } else if (key === '_id' && typeof val === 'string' && ObjectId.isValid(val) && val.length === 24) {
      try {
        res[key] = new ObjectId(val);
      } catch {
        res[key] = val;
      }
    } else if (typeof val === 'object') {
      res[key] = sanitizeDoc(val);
    } else {
      res[key] = val;
    }
  }
  return res;
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'merge'; // 'merge' | 'replace'
    const targetCollection = (formData.get('targetCollection') as string) || '';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Vui lòng chọn file sao lưu (.json hoặc .zip)' }, { status: 400 });
    }

    const db = await getUsersDb();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    const collectionsData: Record<string, Record<string, unknown>[]> = {};

    // --- CASE 1: JSON File ---
    if (fileName.endsWith('.json')) {
      const text = buffer.toString('utf-8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: 'File JSON không hợp lệ hoặc bị lỗi cú pháp' }, { status: 400 });
      }

      if (Array.isArray(parsed)) {
        // Direct array of documents for a specific collection
        const colName = targetCollection || fileName.replace('.json', '').replace(/^backup-db-[^-]+-/, '').replace(/-\d+$/, '');
        if (!colName) {
          return NextResponse.json({ error: 'Vui lòng chọn tên Collection cần khôi phục' }, { status: 400 });
        }
        collectionsData[colName] = parsed as Record<string, unknown>[];
      } else if (parsed && typeof parsed === 'object') {
        const pObj = parsed as Record<string, unknown>;
        if (pObj.collections && typeof pObj.collections === 'object') {
          // Backup file with { collections: { name: [...] } }
          for (const [cName, items] of Object.entries(pObj.collections as Record<string, unknown>)) {
            if (Array.isArray(items)) {
              collectionsData[cName] = items as Record<string, unknown>[];
            }
          }
        } else {
          // Key-value or single collection
          const colName = targetCollection || 'imported_data';
          collectionsData[colName] = [pObj];
        }
      }
    }
    // --- CASE 2: ZIP File ---
    else if (fileName.endsWith('.zip')) {
      let unzipped: Record<string, Uint8Array>;
      try {
        unzipped = unzipSync(new Uint8Array(buffer));
      } catch {
        return NextResponse.json({ error: 'Không thể giải nén file ZIP' }, { status: 400 });
      }

      for (const [entryPath, entryData] of Object.entries(unzipped)) {
        // Match paths like "collections/movies.json" or "database/movies.json" or "movies.json"
        if (entryPath.endsWith('.json') && !entryPath.includes('manifest.json')) {
          const parts = entryPath.split('/');
          const jsonFileName = parts[parts.length - 1];
          const colName = jsonFileName.replace('.json', '');

          if (colName) {
            try {
              const text = strFromU8(entryData);
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) {
                collectionsData[colName] = parsed as Record<string, unknown>[];
              }
            } catch (err) {
              console.warn(`Lỗi đọc JSON từ zip entry: ${entryPath}`, err);
            }
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Định dạng không hỗ trợ. Chỉ hỗ trợ file .json hoặc .zip' }, { status: 400 });
    }

    if (Object.keys(collectionsData).length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu collection nào trong file sao lưu' }, { status: 400 });
    }

    // Perform database restoration
    const results: Array<{
      collection: string;
      total: number;
      restored: number;
      errors: number;
      mode: string;
    }> = [];

    for (const [colName, docs] of Object.entries(collectionsData)) {
      if (colName.startsWith('system.')) continue;
      const coll = db.collection(colName);
      let restoredCount = 0;
      let errorCount = 0;

      const sanitizedDocs = docs.map((d) => sanitizeDoc(d) as Record<string, unknown>);

      if (mode === 'replace') {
        // Drop / Clean collection first
        try {
          await coll.deleteMany({});
          if (sanitizedDocs.length > 0) {
            // Insert in chunks of 1000 to prevent BSON size limit
            const chunkSize = 1000;
            for (let i = 0; i < sanitizedDocs.length; i += chunkSize) {
              const chunk = sanitizedDocs.slice(i, i + chunkSize);
              await coll.insertMany(chunk, { ordered: false });
            }
            restoredCount = sanitizedDocs.length;
          }
        } catch (e) {
          console.error(`Restore replace error on ${colName}:`, e);
          errorCount++;
        }
      } else {
        // Merge mode: Upsert each document
        for (const doc of sanitizedDocs) {
          try {
            if (doc._id) {
              const filter: Filter<Document> = { _id: doc._id as ObjectId };
              await coll.updateOne(filter, { $set: doc }, { upsert: true });
              restoredCount++;
            } else if (typeof doc.slug === 'string') {
              const filter: Filter<Document> = { slug: doc.slug };
              await coll.updateOne(filter, { $set: doc }, { upsert: true });
              restoredCount++;
            } else if (typeof doc.email === 'string') {
              const filter: Filter<Document> = { email: doc.email };
              await coll.updateOne(filter, { $set: doc }, { upsert: true });
              restoredCount++;
            } else if (typeof doc.key === 'string') {
              const filter: Filter<Document> = { key: doc.key };
              await coll.updateOne(filter, { $set: doc }, { upsert: true });
              restoredCount++;
            } else {
              await coll.insertOne(doc);
              restoredCount++;
            }
          } catch (e) {
            console.error(`Restore doc error on ${colName}:`, e);
            errorCount++;
          }
        }
      }

      results.push({
        collection: colName,
        total: docs.length,
        restored: restoredCount,
        errors: errorCount,
        mode,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã khôi phục thành công ${results.length} collection(s)`,
      results,
    });
  } catch (error) {
    console.error('Restore error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi khôi phục dữ liệu';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
