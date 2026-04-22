/**
 * GET /api/proxy-image?url=<encoded_url>
 * Server-side image proxy to bypass hotlink protection and CORS.
 * Fetches the image from the origin server with proper Referer headers,
 * then serves it to the browser with a 24-hour cache.
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB max

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  try {
    const r = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': url.origin + '/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      return NextResponse.json({ error: `upstream ${r.status}` }, { status: 502 });
    }

    const contentType = r.headers.get('content-type')?.split(';')[0].trim() ?? 'image/jpeg';
    if (!ALLOWED_CONTENT_TYPES.some(t => contentType.startsWith(t.split('/')[0]))) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }

    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Too large' }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Proxy-Origin': url.hostname,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
