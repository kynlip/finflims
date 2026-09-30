import { getUsersDb } from './db-helpers';
import { unstable_cache } from 'next/cache';
import { DEFAULT_SITE_SETTINGS, SiteSettings } from './settings-types';

export * from './settings-types';

// ============================================================================
// SITE SETTINGS GETTER (SERVER ONLY)
// ============================================================================

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const db = await getUsersDb();
      const doc = await db.collection('site_settings').findOne({ key: 'general' });
      if (!doc) {
        return DEFAULT_SITE_SETTINGS;
      }
      return {
        siteTitle: doc.siteTitle || DEFAULT_SITE_SETTINGS.siteTitle,
        siteSubtitle: doc.siteSubtitle || DEFAULT_SITE_SETTINGS.siteSubtitle,
        siteDescription: doc.siteDescription || DEFAULT_SITE_SETTINGS.siteDescription,
        logoUrl: doc.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl,
        faviconUrl: doc.faviconUrl || DEFAULT_SITE_SETTINGS.faviconUrl,
        footerText: doc.footerText || DEFAULT_SITE_SETTINGS.footerText,
        copyrightText: doc.copyrightText || DEFAULT_SITE_SETTINGS.copyrightText,
        keywords: doc.keywords || DEFAULT_SITE_SETTINGS.keywords,
        adminFeaturedSlugs: doc.adminFeaturedSlugs || DEFAULT_SITE_SETTINGS.adminFeaturedSlugs,
        adminHeroSlugs: doc.adminHeroSlugs || DEFAULT_SITE_SETTINGS.adminHeroSlugs,
      };
    } catch (err) {
      console.error('Error fetching site settings:', err);
      return DEFAULT_SITE_SETTINGS;
    }
  },
  ['site_settings_general'],
  { revalidate: 60, tags: ['site_settings'] }
);
