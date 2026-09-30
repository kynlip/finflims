import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getAuthSession } from "@/lib/auth";
import { getUsersDb } from "@/lib/db-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Avatar lưu ngay trên đĩa VPS, phục vụ qua route /uploads/[...path].
const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const AVATAR_SIZE = 400;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/** Xoá avatar cũ của chính người này để thư mục không phình theo mỗi lần đổi ảnh. */
async function removePreviousAvatar(previous: unknown) {
  if (typeof previous !== "string") return;
  const match = previous.match(/^\/uploads\/avatars\/([A-Za-z0-9._-]+)$/);
  if (!match) return;

  const filePath = path.join(AVATAR_DIR, match[1]);
  // Chặn đường dẫn vượt ra ngoài thư mục avatar.
  if (path.relative(AVATAR_DIR, filePath).startsWith("..")) return;
  await fs.unlink(filePath).catch(() => {});
}

/**
 * Upload avatar cho user.
 * POST /api/user/avatar
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get user from session
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { message: "Định dạng không hỗ trợ. Chọn ảnh JPG, PNG, WEBP, AVIF hoặc GIF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ message: "File size must be less than 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Cắt vuông 400x400 rồi mã hoá WebP: avatar hiển thị bé nên không cần giữ
    // ảnh gốc vài MB. `rotate()` đọc EXIF để ảnh chụp từ điện thoại không bị nằm ngang.
    let optimized: Buffer;
    try {
      optimized = await sharp(buffer, { failOn: "none" })
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (error) {
      console.error("Avatar optimize error:", error);
      return NextResponse.json({ message: "Ảnh không đọc được, vui lòng chọn ảnh khác" }, { status: 400 });
    }

    await fs.mkdir(AVATAR_DIR, { recursive: true });

    const userIdentifier = session.user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "_");
    // Kèm timestamp để trình duyệt không hiện lại ảnh cũ trong cache.
    const fileName = `${userIdentifier}-${Date.now()}.webp`;
    await fs.writeFile(path.join(AVATAR_DIR, fileName), optimized);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    const db = await getUsersDb();
    const usersCollection = db.collection("users");
    const previous = await usersCollection.findOne(
      { email: session.user.email },
      { projection: { avatar: 1 } },
    );

    const result = await usersCollection.updateOne(
      { email: session.user.email },
      { $set: { avatar: avatarUrl, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      // Không có người dùng thì đừng để lại file mồ côi.
      await fs.unlink(path.join(AVATAR_DIR, fileName)).catch(() => {});
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await removePreviousAvatar(previous?.avatar);

    return NextResponse.json({
      success: true,
      avatarUrl,
      size: optimized.length,
      originalSize: file.size,
      message: "Avatar updated successfully",
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to upload avatar" },
      { status: 500 },
    );
  }
}
