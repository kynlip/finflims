import type { Metadata, Viewport } from 'next';
// Self-hosted fonts via @fontsource (no Google Fonts API dependency)
// Chỉ load weight thực sự dùng để giảm tải font
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Providers } from '@/components/Providers';
import { ConditionalShell } from '@/components/ConditionalShell';
import { auth } from '@/auth';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://phimhayhonro.net';

export const viewport: Viewport = {
  themeColor: '#0b1221',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Phim Hay Hơn Rổ',
  title: {
    default: 'Phim Hay Hơn Rổ - Xem Phim Online Vietsub',
    template: '%s | Phim Hay Hơn Rổ',
  },
  description:
    'Xem phim lẻ, phim bộ, phim truyền hình và hoạt hình vietsub online miễn phí, chất lượng cao tại Phim Hay Hơn Rổ.',
  keywords: ['phim hay hon ro', 'phim hay hơn rổ', 'xem phim online', 'phim lẻ', 'phim bộ', 'hoạt hình vietsub'],
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Phim Hay Hơn Rổ',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/images/logo/favicon.ico' },
      { url: '/images/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/logo/logo-mark.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/images/logo/favicon.ico',
    apple: [
      { url: '/images/logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: 'Phim Hay Hơn Rổ',
    title: 'Phim Hay Hơn Rổ - Xem Phim Online Vietsub',
    description: 'Xem phim lẻ, phim bộ, phim truyền hình và hoạt hình vietsub online miễn phí tại Phim Hay Hơn Rổ',
    images: [
      {
        url: '/images/logo/logo-mark.svg',
        width: 512,
        height: 512,
        alt: 'Phim Hay Hơn Rổ Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phim Hay Hơn Rổ - Xem Phim Online Vietsub',
    description: 'Xem phim lẻ, phim bộ, phim truyền hình và hoạt hình vietsub online miễn phí tại Phim Hay Hơn Rổ',
    images: ['/images/logo/logo-mark.svg'],
  },
  other: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'mobile-web-app-capable': 'yes',
  },
  manifest: '/manifest.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className="dark"
      style={{ colorScheme: 'dark' }}
    >
      <body
        suppressHydrationWarning
        className="text-foreground bg-[#0b1221] font-sans antialiased"
        style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers session={session}>
            <ConditionalShell>{children}</ConditionalShell>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
