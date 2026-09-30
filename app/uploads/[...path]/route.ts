import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type UploadParams = {
  path?: string[];
};

type RouteContext = {
  params: Promise<UploadParams>;
};

function resolveUploadPath(segments: string[] | undefined): string | null {
  if (!segments?.length) return null;

  const filePath = path.resolve(UPLOADS_ROOT, ...segments);
  const relativePath = path.relative(UPLOADS_ROOT, filePath);

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return filePath;
}

async function getUploadFile(context: RouteContext) {
  const { path: segments } = await context.params;
  const filePath = resolveUploadPath(segments);

  if (!filePath) return null;

  try {
    const stats = await fs.stat(/* turbopackIgnore: true */ filePath);
    if (!stats.isFile()) return null;

    return {
      filePath,
      contentType:
        CONTENT_TYPES[path.extname(filePath).toLowerCase()] ||
        "application/octet-stream",
      contentLength: stats.size.toString(),
      lastModified: stats.mtime.toUTCString(),
    };
  } catch {
    return null;
  }
}

function getHeaders(file: {
  contentType: string;
  contentLength: string;
  lastModified: string;
}) {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": file.contentLength,
    "Content-Type": file.contentType,
    "Last-Modified": file.lastModified,
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const file = await getUploadFile(context);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const body = await fs.readFile(/* turbopackIgnore: true */ file.filePath);
  return new NextResponse(body, { headers: getHeaders(file) });
}

export async function HEAD(
  _request: NextRequest,
  context: RouteContext,
) {
  const file = await getUploadFile(context);

  if (!file) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { headers: getHeaders(file) });
}
