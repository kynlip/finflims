/**
 * Return a reliable image URL for remote movie artwork.
 *
 * The upstream movie CDN intermittently stalls when fetched by Next's
 * server-side optimizer, producing 500 responses from /_next/image. The
 * browser can load the same artwork directly, so this helper intentionally
 * keeps the source URL unchanged.
 *
 * Width and quality remain accepted for call-site compatibility.
 */
export function cdnImage(url: string, _width: number, _quality = 75): string {
  void _width;
  void _quality;
  return url || '';
}
