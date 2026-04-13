/**
 * GET /api/product-image?brand=X&name=Y
 * Server-side image lookup with 1-hour cache.
 * Uses DuckDuckGo image search (no login required, no bot-wall).
 * Runs on the Next.js server (local machine) — full internet, no CORS issues.
 */
import { NextRequest, NextResponse } from 'next/server';

// In-process cache: key → { url, at }
const cache = new Map<string, { url: string; at: number }>();
const TTL = 60 * 60 * 1000; // 1 hour

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Step 1: get DDG VQD token from the search page HTML */
async function getDdgVqd(query: string): Promise<string | null> {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`;
  try {
    const r = await fetch(url, {
      headers: { ...COMMON_HEADERS, 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    // VQD token is embedded as: vqd="4-xxx" or vqd=4-xxx
    const m = html.match(/vqd[=\s"']+([0-9-]+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Step 2: fetch DDG image results JSON and return first image URL */
async function ddgImageSearch(query: string): Promise<string | null> {
  const vqd = await getDdgVqd(query);
  if (!vqd) return null;

  const params = new URLSearchParams({
    q: query,
    vqd,
    f: ',,,,,',
    p: '1',
    s: '0',
    u: 'bing',
    l: 'wt-wt',
  });
  const url = `https://duckduckgo.com/i.js?${params}`;

  try {
    const r = await fetch(url, {
      headers: {
        ...COMMON_HEADERS,
        'Accept': 'application/json',
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const data = await r.json() as any;
    const results: any[] = data.results || [];
    for (const item of results) {
      const img: string = item.image;
      // Prefer known product CDNs; skip tiny thumbnails
      if (img && img.startsWith('https://') && item.width >= 200) {
        return img;
      }
    }
    // Fall back to first result regardless of size
    if (results[0]?.image) return results[0].image;
  } catch { /* timeout or parse error */ }
  return null;
}

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get('brand') || '';
  const name  = req.nextUrl.searchParams.get('name')  || '';
  const debug = req.nextUrl.searchParams.get('debug') === '1';
  if (!brand && !name) return NextResponse.json({ url: null });

  const key = `${brand}|${name}`.toLowerCase();
  if (!debug) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < TTL) {
      return NextResponse.json({ url: cached.url || null });
    }
  }

  // Search with brand + product name + site hints for better results
  const keyword = `${brand} ${name} cat food`.trim();
  const imgUrl = await ddgImageSearch(keyword);

  if (imgUrl) {
    cache.set(key, { url: imgUrl, at: Date.now() });
    return NextResponse.json({ url: imgUrl });
  }

  cache.set(key, { url: '', at: Date.now() });
  return NextResponse.json({ url: null });
}
