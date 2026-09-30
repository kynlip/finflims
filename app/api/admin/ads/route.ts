import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getUsersDb } from '@/lib/db-helpers';
import { AdSettings, DEFAULT_AD_SETTINGS } from '@/lib/ads-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const db = await getUsersDb();
    const doc = await db.collection('ad_settings').findOne({ key: 'general' });
    if (!doc) {
      return NextResponse.json({ success: true, settings: DEFAULT_AD_SETTINGS });
    }

    const settings: AdSettings = {
      globalEnabled: doc.globalEnabled ?? DEFAULT_AD_SETTINGS.globalEnabled,
      vipBypassAll: doc.vipBypassAll ?? DEFAULT_AD_SETTINGS.vipBypassAll,
      headerScript: doc.headerScript ?? '',
      footerScript: doc.footerScript ?? '',
      placements: Array.isArray(doc.placements) ? doc.placements : DEFAULT_AD_SETTINGS.placements,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    };

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to get ad settings:', error);
    return NextResponse.json({ error: 'Lỗi tải cài đặt quảng cáo' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const body = await request.json();
    const { globalEnabled, vipBypassAll, headerScript, footerScript, placements } = body;

    const db = await getUsersDb();
    const updateData = {
      key: 'general',
      globalEnabled: Boolean(globalEnabled),
      vipBypassAll: Boolean(vipBypassAll),
      headerScript: typeof headerScript === 'string' ? headerScript : '',
      footerScript: typeof footerScript === 'string' ? footerScript : '',
      placements: Array.isArray(placements) ? placements : DEFAULT_AD_SETTINGS.placements,
      updatedAt: new Date(),
    };

    await db.collection('ad_settings').updateOne(
      { key: 'general' },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình quảng cáo thành công!',
      settings: updateData,
    });
  } catch (error) {
    console.error('Failed to update ad settings:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi cập nhật quảng cáo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
