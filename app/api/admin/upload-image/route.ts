import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Bề ngang tối đa theo mục đích dùng. Poster hiển thị cỡ 300px nên 600px là đủ
// cho màn hình 2x; ảnh nền và ảnh nội dung cần rộng hơn.
const MAX_WIDTH: Record<string, number> = {
  poster: 600,
  thumb: 1280,
  logo: 512,
  image: 1280,
};

const WEBP_QUALITY = 80;

interface OptimizedImage {
  buffer: Buffer;
  ext: string;
  optimized: boolean;
}

/**
 * Nén ảnh trước khi ghi đĩa.
 *
 * Chuyển sang WebP vì nhỏ hơn JPEG/PNG 25-80% ở cùng chất lượng và mọi trình
 * duyệt còn hỗ trợ đều đọc được. GIF giữ nguyên để không mất khung động, ảnh
 * lỗi cũng giữ nguyên thay vì làm hỏng luồng upload.
 */
async function optimizeImage(
  buffer: Buffer,
  type: string,
  originalExt: string,
): Promise<OptimizedImage> {
  if (originalExt === ".gif") {
    return { buffer, ext: originalExt, optimized: false };
  }

  // Logo được lưu kèm tên cố định `logo.png`, đổi sang WebP là đuôi file nói dối
  // về nội dung. Với logo chỉ thu nhỏ, giữ nguyên định dạng.
  const keepFormat = type === "logo";

  try {
    const maxWidth = MAX_WIDTH[type] ?? MAX_WIDTH.image;
    const pipeline = sharp(buffer, { failOn: "none" }).rotate();
    const metadata = await pipeline.metadata();

    // Chỉ thu nhỏ, không phóng to ảnh vốn đã bé hơn khung.
    if ((metadata.width || 0) > maxWidth) {
      pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    const output = keepFormat
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();

    // Ảnh đã tối ưu sẵn đôi khi to ra sau khi mã hoá lại — giữ bản nhỏ hơn.
    if (output.length >= buffer.length) {
      return { buffer, ext: originalExt, optimized: false };
    }

    return { buffer: output, ext: keepFormat ? ".png" : ".webp", optimized: true };
  } catch (error) {
    console.warn("Optimize image failed, dùng ảnh gốc:", error);
    return { buffer, ext: originalExt, optimized: false };
  }
}

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "movies");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";
    const slug = (formData.get("slug") as string) || "";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng chọn file hình ảnh" }, { status: 400 });
    }

    // Limit size to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Kích thước ảnh tối đa là 10MB" }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WEBP, AVIF hoặc GIF" },
        { status: 400 }
      );
    }

    // Get clean file extension
    let ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      if (file.type === "image/png") ext = ".png";
      else if (file.type === "image/webp") ext = ".webp";
      else if (file.type === "image/avif") ext = ".avif";
      else if (file.type === "image/gif") ext = ".gif";
      else ext = ".jpg";
    }

    // Ensure uploads directory exists
    try {
      await fs.access(UPLOADS_DIR);
    } catch {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }

    // Handle special logo or favicon uploads
    if (type === "logo" || type === "favicon") {
      const logoDir = path.join(process.cwd(), "public", "images", "logo");
      try { await fs.mkdir(logoDir, { recursive: true }); } catch { /* ignore */ }
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (type === "logo") {
        const optimizedLogo = await optimizeImage(buffer, "logo", ext);
        // Save to public/images/logo/logo.png and a timestamped file for cache-busting
        const timeFile = `logo-${Date.now()}${optimizedLogo.ext}`;
        await fs.writeFile(path.join(logoDir, "logo.png"), optimizedLogo.buffer);
        await fs.writeFile(path.join(logoDir, timeFile), optimizedLogo.buffer);
        return NextResponse.json({
          success: true,
          url: `/images/logo/${timeFile}`,
          fileName: timeFile,
          size: optimizedLogo.buffer.length,
          originalSize: file.size,
          optimized: optimizedLogo.optimized,
        });
      } else {
        // Favicon giữ nguyên định dạng: trình duyệt cũ và một số app đọc .ico.
        const timeFile = `favicon-${Date.now()}${ext}`;
        await fs.writeFile(path.join(logoDir, "favicon.ico"), buffer);
        await fs.writeFile(path.join(logoDir, timeFile), buffer);
        return NextResponse.json({
          success: true,
          url: `/images/logo/${timeFile}`,
          fileName: timeFile,
          size: file.size,
        });
      }
    }

    // Generate safe unique filename
    const cleanPrefix = type === "poster" ? "poster" : type === "thumb" ? "thumb" : "img";
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 30);
    const slugPart = cleanSlug ? `-${cleanSlug}` : "";

    const bytes = await file.arrayBuffer();
    const optimized = await optimizeImage(Buffer.from(bytes), type, ext);

    // Đặt tên sau khi nén: đuôi file phải khớp định dạng thật, không thì route
    // phục vụ ảnh trả sai Content-Type.
    const uniqueFileName = `${cleanPrefix}${slugPart}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${optimized.ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    await fs.writeFile(filePath, optimized.buffer);

    const publicUrl = `/uploads/movies/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
      size: optimized.buffer.length,
      originalSize: file.size,
      optimized: optimized.optimized,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    const msg = error instanceof Error ? error.message : "Lỗi tải ảnh lên";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
