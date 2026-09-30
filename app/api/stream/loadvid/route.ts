import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for resolved m3u8 playlists (30 min TTL)
const m3u8Cache = new Map<string, { content: string; expiry: number }>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing video url' }, { status: 400 });
  }

  // Check cache first for instant response
  const cached = m3u8Cache.get(videoUrl);
  if (cached && cached.expiry > Date.now()) {
    return new NextResponse(cached.content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  try {
    // 1. Fetch play page from LoadVid
    const playResp = await fetch(videoUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Referer: 'https://loadvid.com/',
      },
      cache: 'no-store',
    });

    if (!playResp.ok) {
      return NextResponse.json(
        { error: `Failed to fetch LoadVid page: ${playResp.status}` },
        { status: playResp.status }
      );
    }

    const html = await playResp.text();
    const setCookie = playResp.headers.get('set-cookie') || '';

    // Extract CSRF Token
    const csrfMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    // Extract videoToken and videoHash
    const tokenMatch = html.match(/videoToken:\s*['"]([^'"]+)['"]/);
    const hashMatch = html.match(/videoHash:\s*['"]([^'"]+)['"]/);

    const videoToken = tokenMatch ? tokenMatch[1] : '';
    const videoHash = hashMatch ? hashMatch[1] : '';

    if (!videoToken || !videoHash) {
      return NextResponse.json(
        { error: 'Failed to extract video token from LoadVid' },
        { status: 500 }
      );
    }

    // 2. Resolve M3U8 token from LoadVid
    const resolveUrl = new URL('/videos/resolve-token', videoUrl).toString();
    const resolveHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Referer: videoUrl,
      Origin: new URL(videoUrl).origin,
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
      Accept: 'application/vnd.apple.mpegurl,*/*',
    };
    if (setCookie) {
      resolveHeaders['Cookie'] = setCookie;
    }

    const resolveResp = await fetch(resolveUrl, {
      method: 'POST',
      headers: resolveHeaders,
      body: JSON.stringify({ token: videoToken, hash: videoHash }),
    });

    if (!resolveResp.ok) {
      return NextResponse.json(
        { error: `LoadVid resolve failed: ${resolveResp.status}` },
        { status: resolveResp.status }
      );
    }

    const m3u8Content = await resolveResp.text();
    if (!m3u8Content.includes('#EXTM3U')) {
      return NextResponse.json(
        { error: 'Invalid M3U8 response from LoadVid' },
        { status: 500 }
      );
    }

    // Store in cache for 30 minutes
    m3u8Cache.set(videoUrl, {
      content: m3u8Content,
      expiry: Date.now() + 30 * 60 * 1000,
    });

    // Return the resolved M3U8 playlist with proper CORS and MIME headers
    return new NextResponse(m3u8Content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error) {
    console.error('[LoadVid Resolver] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
