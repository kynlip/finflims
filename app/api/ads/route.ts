import { NextResponse } from 'next/server';
import { getUsersDb } from '@/lib/db-helpers';
import { AdSettings, DEFAULT_AD_SETTINGS } from '@/lib/ads-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getUsersDb();
    const doc = await db.collection('ad_settings').findOne({ key: 'general' });
    if (!doc) {
      return NextResponse.json({ success: true, settings: DEFAULT_AD_SETTINGS });
    }

    const settings: AdSettings = {
      globalEnabled: Boolean(doc.globalEnabled),
      vipBypassAll: Boolean(doc.vipBypassAll ?? true),
      headerScript: doc.globalEnabled ? doc.headerScript || '' : '',
      footerScript: doc.globalEnabled ? doc.footerScript || '' : '',
      placements: doc.globalEnabled && Array.isArray(doc.placements)
        ? doc.placements.filter((p: { enabled: boolean }) => p.enabled)
        : [],
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    };

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to get public ad settings:', error);
    return NextResponse.json({ success: true, settings: DEFAULT_AD_SETTINGS });
  }
}
