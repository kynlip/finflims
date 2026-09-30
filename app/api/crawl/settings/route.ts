import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getCronSettings, saveCronSettings } from '@/lib/crawler';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const settings = await getCronSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const body = await request.json().catch(() => ({}));
  await saveCronSettings(body);
  const updated = await getCronSettings();

  return NextResponse.json({ success: true, settings: updated });
}
