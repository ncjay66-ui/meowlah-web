/**
 * GET /api/proxy-image?url=<encoded_url>
 * Server-side image proxy to bypass hotlink protection and CORS.
 * Fetches the image from the origin server with proper Referer headers,
 * then serves it to the browser with a 24-hour cache.
 */
import { NextRequest, NextResponse } from 'next/server';
import { parseApprovedImageUrl } from '@/lib/image-url';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB max

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const url = parseApprovedImageUrl(raw);
  if (!url) return NextResponse.json({ error: 'Image host is not allowed' }, { status: 400 });

  try {
    const r = await fetch(url.toString(), {
      redirect: 'manual',
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
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }

    const contentLength = Number(r.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Too large' }, { status: 413 });
    }

    const reader = r.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Image body unavailable' }, { status: 502 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SIZE) {
        await reader.cancel();
        return NextResponse.json({ error: 'Too large' }, { status: 413 });
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buf.set(chunk, offset);
      offset += chunk.byteLength;
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
