import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getUsersDb } from '@/lib/db-helpers';
import { DEFAULT_SITE_SETTINGS, SiteSettings } from '@/lib/settings';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getUsersDb();
    const doc = await db.collection('site_settings').findOne({ key: 'general' });
    if (!doc) {
      return NextResponse.json({ success: true, settings: DEFAULT_SITE_SETTINGS });
    }

    const settings: SiteSettings = {
      siteTitle: doc.siteTitle || DEFAULT_SITE_SETTINGS.siteTitle,
      siteSubtitle: doc.siteSubtitle || DEFAULT_SITE_SETTINGS.siteSubtitle,
      siteDescription: doc.siteDescription || DEFAULT_SITE_SETTINGS.siteDescription,
      logoUrl: doc.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl,
      faviconUrl: doc.faviconUrl || DEFAULT_SITE_SETTINGS.faviconUrl,
      footerText: doc.footerText || DEFAULT_SITE_SETTINGS.footerText,
      copyrightText: doc.copyrightText || DEFAULT_SITE_SETTINGS.copyrightText,
      keywords: doc.keywords || DEFAULT_SITE_SETTINGS.keywords,
      updatedAt: doc.updatedAt,
    };

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to get site settings:', error);
    return NextResponse.json({ error: 'Lỗi tải cài đặt website' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const body = await request.json();
    const {
      siteTitle,
      siteSubtitle,
      siteDescription,
      logoUrl,
      faviconUrl,
      footerText,
      copyrightText,
    } = body;

    const db = await getUsersDb();
    const updateData = {
      key: 'general',
      siteTitle: (siteTitle || DEFAULT_SITE_SETTINGS.siteTitle).trim(),
      siteSubtitle: (siteSubtitle || DEFAULT_SITE_SETTINGS.siteSubtitle).trim(),
      siteDescription: (siteDescription || DEFAULT_SITE_SETTINGS.siteDescription).trim(),
      logoUrl: (logoUrl || DEFAULT_SITE_SETTINGS.logoUrl).trim(),
      faviconUrl: (faviconUrl || DEFAULT_SITE_SETTINGS.faviconUrl).trim(),
      footerText: (footerText || DEFAULT_SITE_SETTINGS.footerText).trim(),
      copyrightText: (copyrightText || DEFAULT_SITE_SETTINGS.copyrightText).trim(),
      updatedAt: new Date(),
    };

    await db.collection('site_settings').updateOne(
      { key: 'general' },
      { $set: updateData },
      { upsert: true }
    );

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/nhanconan');
      revalidatePath('/nhanconan/settings');
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cài đặt website thành công!',
      settings: updateData,
    });
  } catch (error) {
    console.error('Failed to update site settings:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi cập nhật cài đặt';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
