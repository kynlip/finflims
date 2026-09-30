import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isPathSafe(baseDir: string, targetPath: string): boolean {
  const resolved = path.resolve(baseDir, targetPath);
  return resolved === baseDir || resolved.startsWith(baseDir + path.sep);
}

export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const relPath = searchParams.get('path');

    if (!relPath) {
      return NextResponse.json({ error: 'Thiếu đường dẫn file' }, { status: 400 });
    }

    const backupsDir = path.resolve(process.cwd(), 'backups');
    const fullPath = path.resolve(backupsDir, relPath);

    if (!isPathSafe(backupsDir, fullPath)) {
      return NextResponse.json({ error: 'Đường dẫn không hợp lệ' }, { status: 403 });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: 'File không tồn tại trên máy chủ' }, { status: 404 });
    }

    const stat = await fs.stat(fullPath);
    const filename = path.basename(fullPath);
    const nodeStream = createReadStream(fullPath);
    const webStream = Readable.toWeb(nodeStream);

    const isZip = filename.endsWith('.zip');
    const isJson = filename.endsWith('.json');
    const contentType = isZip
      ? 'application/zip'
      : isJson
      ? 'application/json'
      : 'application/octet-stream';

    return new Response(webStream as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Download backup file error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi tải file sao lưu';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const relPath = searchParams.get('path');

    if (!relPath) {
      return NextResponse.json({ error: 'Thiếu đường dẫn file' }, { status: 400 });
    }

    const backupsDir = path.resolve(process.cwd(), 'backups');
    const fullPath = path.resolve(backupsDir, relPath);

    if (!isPathSafe(backupsDir, fullPath)) {
      return NextResponse.json({ error: 'Đường dẫn không hợp lệ' }, { status: 403 });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: 'File không tồn tại hoặc đã bị xóa' }, { status: 404 });
    }

    await fs.unlink(fullPath);

    return NextResponse.json({ success: true, message: 'Đã xóa file sao lưu thành công' });
  } catch (error) {
    console.error('Delete backup file error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi xóa file sao lưu';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
