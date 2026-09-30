export type AdPosition =
  | 'header'
  | 'footer'
  | 'player_top'
  | 'player_bottom'
  | 'sidebar'
  | 'popunder'
  | 'in_page'
  | 'custom_script';

export type AdType = 'script' | 'banner' | 'html';

export interface AdPlacement {
  id: string;
  name: string;
  position: AdPosition;
  type: AdType;
  code?: string;
  bannerImageUrl?: string;
  bannerTargetUrl?: string;
  bannerAlt?: string;
  enabled: boolean;
  vipBypass: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface AdSettings {
  globalEnabled: boolean;
  vipBypassAll: boolean;
  headerScript?: string;
  footerScript?: string;
  placements: AdPlacement[];
  updatedAt?: string;
}

export const DEFAULT_AD_SETTINGS: AdSettings = {
  globalEnabled: false,
  vipBypassAll: true,
  headerScript: '',
  footerScript: '',
  placements: [
    {
      id: 'banner_header',
      name: 'Banner Đầu Trang (Header)',
      position: 'header',
      type: 'html',
      code: '',
      bannerImageUrl: '',
      bannerTargetUrl: '',
      bannerAlt: 'Quảng cáo Header',
      enabled: false,
      vipBypass: true,
      notes: 'Hiển thị ngay dưới Navbar trên mọi trang',
    },
    {
      id: 'banner_player_bottom',
      name: 'Banner Dưới Trình Chiếu Video',
      position: 'player_bottom',
      type: 'html',
      code: '',
      bannerImageUrl: '',
      bannerTargetUrl: '',
      bannerAlt: 'Quảng cáo Dưới Video',
      enabled: false,
      vipBypass: true,
      notes: 'Hiển thị ngay bên dưới khung phát video trang /xem',
    },
    {
      id: 'banner_footer',
      name: 'Banner Chân Trang (Footer)',
      position: 'footer',
      type: 'html',
      code: '',
      bannerImageUrl: '',
      bannerTargetUrl: '',
      bannerAlt: 'Quảng cáo Footer',
      enabled: false,
      vipBypass: true,
      notes: 'Hiển thị ở phía trên Footer',
    },
    {
      id: 'popunder_global',
      name: 'Mạng Popunder / Direct Link (Toàn Trang)',
      position: 'popunder',
      type: 'script',
      code: '',
      enabled: false,
      vipBypass: true,
      notes: 'Mã script popunder/in-page push từ các mạng quảng cáo (Adsterra, PropellerAds, PopAds...)',
    },
  ],
};
