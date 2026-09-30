export interface SiteSettings {
  siteTitle: string;
  siteSubtitle: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  footerText: string;
  copyrightText: string;
  keywords?: string[];
  adminFeaturedSlugs?: string[];
  adminHeroSlugs?: string[];
  updatedAt?: Date;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteTitle: 'Phim Hay Hơn Rổ',
  siteSubtitle: 'Xem Phim Hoạt Hình Vietsub Online',
  siteDescription: 'Xem phim hoạt hình vietsub online miễn phí, chất lượng cao, cập nhật nhanh nhất tại Phim Hay Hơn Rổ.',
  logoUrl: '/images/logo/logo-mark.svg',
  faviconUrl: '/images/logo/logo-mark.svg',
  footerText: 'Trang xem phim hoạt hình vietsub online chất lượng cao, tốc độ tải nhanh và cập nhật liên tục các tập phim mới nhất.',
  copyrightText: '© 2026 Phim Hay Hơn Rổ • PhimHayHonRo.net. All rights reserved.',
  keywords: ['phim hay hon ro', 'phim hay hơn rổ', 'hoạt hình vietsub', 'xem hoạt hình', 'hoạt hình 3d', 'hoạt hình online', 'phim hoạt hình mới nhất'],
  adminFeaturedSlugs: ['movie-conan', 'doraemon-movie-1-45', 'sieu-nhan-co-dong'],
  adminHeroSlugs: ['movie-conan', 'doraemon-movie-1-45', 'sieu-nhan-co-dong'],
};
