"use server";

import { promises as fs } from "fs";
import path from "path";
import { getAuthSession, isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const DOWNLOAD_DIR = path.join(process.cwd(), "public", "download");
const LATEST_JSON_PATH = path.join(DOWNLOAD_DIR, "latest.json");

type ActionResponse = {
  success?: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

async function checkAdmin(): Promise<boolean> {
  const session = await getAuthSession();
  return isAdmin(session);
}

// ============================================================
// Upload App File (APK/IPA)
// ============================================================
export async function uploadAppFile(formData: FormData): Promise<ActionResponse> {
  try {
    if (!(await checkAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    const file = formData.get("file") as File;
    const platform = formData.get("platform") as string;

    if (!file || !platform) {
      return { error: "Missing file or platform" };
    }

    if (!["ios", "android", "tv"].includes(platform)) {
      return { error: "Invalid platform" };
    }

    const expectedExt = platform === "ios" ? ".ipa" : ".apk";
    if (!file.name.toLowerCase().endsWith(expectedExt)) {
      return { error: `File must be ${expectedExt} for ${platform}` };
    }

    // Tạo thư mục nếu chưa có
    try {
      await fs.access(DOWNLOAD_DIR);
    } catch {
      await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    }

    // Xóa file cũ của cùng platform
    try {
      const existingFiles = await fs.readdir(DOWNLOAD_DIR);
      for (const existingFile of existingFiles) {
        const isOldFile =
          (platform === "ios" && existingFile.endsWith(".ipa")) ||
          (platform === "android" &&
            existingFile.endsWith(".apk") &&
            !existingFile.includes("-tv") &&
            !existingFile.includes("_tv")) ||
          (platform === "tv" &&
            existingFile.endsWith(".apk") &&
            (existingFile.includes("-tv") || existingFile.includes("_tv")));

        if (isOldFile) {
          await fs.unlink(path.join(DOWNLOAD_DIR, existingFile));
        }
      }
    } catch {
      // Không có file cũ
    }

    const fileName = file.name;
    const filePath = path.join(DOWNLOAD_DIR, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    revalidatePath("/tai-app");
    return { success: true, data: { fileName, platform, size: buffer.length } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { error: "Failed to upload file: " + msg };
  }
}

// ============================================================
// Delete App File
// ============================================================
export async function deleteAppFile(fileName: string): Promise<ActionResponse> {
  try {
    if (!(await checkAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    if (!fileName || (!fileName.endsWith(".apk") && !fileName.endsWith(".ipa"))) {
      return { error: "Invalid file name" };
    }

    const filePath = path.join(DOWNLOAD_DIR, fileName);
    if (!filePath.startsWith(DOWNLOAD_DIR)) {
      return { error: "Invalid file path" };
    }

    await fs.unlink(filePath);
    revalidatePath("/tai-app");
    return { success: true, data: { deleted: fileName } };
  } catch (error) {
    console.error("Delete error:", error);
    return { error: "Failed to delete file" };
  }
}

// ============================================================
// Update App Version + Auto-sync Changelog
// ============================================================
export async function updateAppVersion(
  version: string,
  releaseNotes: string
): Promise<ActionResponse> {
  try {
    if (!(await checkAdmin())) {
      return { error: "Unauthorized: Admin access required" };
    }

    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return { error: "Version format must be x.x.x (e.g., 1.0.0)" };
    }

    try {
      await fs.access(DOWNLOAD_DIR);
    } catch {
      await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    }

    let apkUrl = "", apkSize = 0;
    let ipaUrl = "", ipaSize = 0;
    let tvUrl = "", tvSize = 0;

    try {
      const files = await fs.readdir(DOWNLOAD_DIR);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://phimhayhonro.net";

      const androidApk = files.find(
        (f) => f.endsWith(".apk") && !f.includes("-tv") && !f.includes("_tv")
      );
      if (androidApk) {
        apkUrl = `${baseUrl}/download/${androidApk}`;
        const stats = await fs.stat(path.join(DOWNLOAD_DIR, androidApk));
        apkSize = stats.size;
      }

      const iosIpa = files.find((f) => f.endsWith(".ipa"));
      if (iosIpa) {
        ipaUrl = `${baseUrl}/download/${iosIpa}`;
        const stats = await fs.stat(path.join(DOWNLOAD_DIR, iosIpa));
        ipaSize = stats.size;
      }

      const tvApk = files.find(
        (f) => f.endsWith(".apk") && (f.includes("-tv") || f.includes("_tv"))
      );
      if (tvApk) {
        tvUrl = `${baseUrl}/download/${tvApk}`;
        const stats = await fs.stat(path.join(DOWNLOAD_DIR, tvApk));
        tvSize = stats.size;
      }
    } catch (e) {
      console.error("Error scanning files:", e);
    }

    // Ghi latest.json
    const latestData = {
      version,
      release_notes: releaseNotes || "",
      apk_url: apkUrl,
      apk_size: apkSize,
      ipa_url: ipaUrl,
      ipa_size: ipaSize,
      tv_url: tvUrl,
      tv_size: tvSize,
    };

    await fs.writeFile(LATEST_JSON_PATH, JSON.stringify(latestData, null, 2) + "\n", "utf-8");

    // Auto-sync changelog.json
    const CHANGELOG_PATH = path.join(DOWNLOAD_DIR, "changelog.json");
    let changelogData: { versions: Array<{ version: string; date: string; release_notes: string }> };

    try {
      const content = await fs.readFile(CHANGELOG_PATH, "utf-8");
      changelogData = JSON.parse(content);
    } catch {
      changelogData = { versions: [] };
    }

    const versionEntry = {
      version,
      date: new Date().toISOString().split("T")[0],
      release_notes: releaseNotes || "",
    };

    const existingIndex = changelogData.versions.findIndex((v) => v.version === version);
    if (existingIndex >= 0) {
      changelogData.versions[existingIndex] = versionEntry;
    } else {
      changelogData.versions.unshift(versionEntry);
    }

    await fs.writeFile(CHANGELOG_PATH, JSON.stringify(changelogData, null, 2) + "\n", "utf-8");

    revalidatePath("/tai-app");
    return { success: true, data: latestData };
  } catch (error) {
    console.error("Update version error:", error);
    return { error: "Failed to update version" };
  }
}
