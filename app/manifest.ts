import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Phim Hay Hơn Rổ - Xem Phim Hoạt Hình & Anime Vietsub Online',
    short_name: 'Phim Hay Hơn Rổ',
    description:
      'Xem phim hoạt hình anime vietsub online miễn phí, chất lượng cao, cập nhật nhanh nhất tại Phim Hay Hơn Rổ',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b1221',
    theme_color: '#0b1221',
    icons: [
      {
        src: '/images/logo/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/logo/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/logo/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/images/logo/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/images/logo/logo-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    shortcuts: [
      {
        name: 'Trang Chủ',
        url: '/',
        description: 'Trang chủ Phim Hay Hơn Rổ',
      },
      {
        name: 'Lọc Phim',
        url: '/tim-kiem',
        description: 'Tìm kiếm và lọc phim hoạt hình',
      },
      {
        name: 'Vũ trụ Conan',
        url: '/conan',
        description: 'Phim và movie thám tử lừng danh Conan',
      },
      {
        name: 'Vũ trụ Doraemon',
        url: '/doraemon',
        description: 'Phim và movie Doraemon',
      },
      {
        name: 'Vũ trụ Siêu Nhân',
        url: '/sieu-nhan',
        description: 'Kamen Rider, Super Sentai & Ultraman',
      },
    ],
    categories: ['entertainment', 'video'],
    lang: 'vi',
    prefer_related_applications: false,
  };
}
