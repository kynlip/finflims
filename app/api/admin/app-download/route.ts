import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const DOWNLOAD_DIR = path.join(process.cwd(), "public", "download");
const LATEST_JSON_PATH = path.join(DOWNLOAD_DIR, "latest.json");
const CHANGELOG_JSON_PATH = path.join(DOWNLOAD_DIR, "changelog.json");

async function getFileInfo(fileName: string | undefined) {
  if (!fileName) return null;
  try {
    const filePath = path.join(DOWNLOAD_DIR, fileName);
    const stats = await fs.stat(filePath);
    return {
      fileName,
      size: stats.size,
      uploadedAt: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

async function readLatestJson() {
  try {
    const content = await fs.readFile(LATEST_JSON_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { version: "0.0.0", release_notes: "" };
  }
}

async function readChangelogJson() {
  try {
    const content = await fs.readFile(CHANGELOG_JSON_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { versions: [] };
  }
}

// GET /api/admin/app-download
export async function GET() {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }
  try {
    let allFiles: string[] = [];
    try {
      allFiles = await fs.readdir(DOWNLOAD_DIR);
    } catch {
      // Thư mục không tồn tại
    }

    const iosFile = allFiles.find((f) => f.endsWith(".ipa"));
    const tvFile = allFiles.find(
      (f) => (f.includes("-tv") || f.includes("_tv")) && f.endsWith(".apk")
    );
    const androidFile = allFiles.find(
      (f) => f.endsWith(".apk") && f !== tvFile
    );

    const [ios, android, tv, versionInfo, changelog] = await Promise.all([
      getFileInfo(iosFile),
      getFileInfo(androidFile),
      getFileInfo(tvFile),
      readLatestJson(),
      readChangelogJson(),
    ]);

    return NextResponse.json({
      files: { ios, android, tv },
      version: versionInfo,
      changelog,
    });
  } catch (error) {
    console.error("GET app-download error:", error);
    return NextResponse.json(
      {
        files: { ios: null, android: null, tv: null },
        version: { version: "0.0.0", release_notes: "" },
        changelog: { versions: [] },
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/app-download
export async function POST(request: Request) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const body = await request.json();
    const { version, release_notes, changelog } = body;

    if (version || release_notes) {
      const currentLatest = await readLatestJson();
      const updatedLatest = {
        ...currentLatest,
        version: version || currentLatest.version,
        release_notes: release_notes || currentLatest.release_notes,
      };
      await fs.writeFile(LATEST_JSON_PATH, JSON.stringify(updatedLatest, null, 2), "utf-8");
    }

    if (changelog) {
      await fs.writeFile(CHANGELOG_JSON_PATH, JSON.stringify(changelog, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST app-download error:", error);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}
