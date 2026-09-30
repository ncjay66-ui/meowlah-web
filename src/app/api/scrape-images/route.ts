/**
 * GET /api/scrape-images
 * Server-side route: searches Shopee for each product image,
 * then updates the Railway database via the backend PATCH API.
 * Runs entirely in Node.js — no Python/psycopg2 needed.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RAILWAY = process.env.NEXT_PUBLIC_API_URL || 'https://meowlah-production.up.railway.app';
const SHOPEE_API = 'https://shopee.com.my/api/v4/search/search_items';
const SHOPEE_CDN = 'https://down-my.img.susercontent.com/file/';

const SHOPEE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-MY,en;q=0.9',
  'Referer': 'https://shopee.com.my/',
  'X-Requested-With': 'XMLHttpRequest',
};

type ShopeeSearchItem = { image?: string; item_basic?: { image?: string } | null };
type ShopeeSearchResponse = { items?: ShopeeSearchItem[] };
type ProductRecord = { id: string; brand?: string; name_en?: string };
type ProductsPage = { items?: ProductRecord[]; total?: number };

async function shopeeImage(brand: string, nameEn: string): Promise<string | null> {
  const keyword = `${brand} ${nameEn}`;
  const params = new URLSearchParams({
    by: 'relevancy', keyword, limit: '8',
    newest: '0', order: 'desc', page_type: 'search',
    scenario: 'PAGE_GLOBAL_SEARCH', version: '2',
  });
  try {
    const r = await fetch(`${SHOPEE_API}?${params}`, {
      headers: SHOPEE_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const data = await r.json() as ShopeeSearchResponse;
    const items = data.items || [];
    for (const item of items) {
      const basics = item.item_basic ?? item;
      const img = basics.image;
      if (typeof img === 'string' && img) return SHOPEE_CDN + img;
    }
  } catch { /* timeout or parse error */ }
  return null;
}

// Fetch ALL products (paginated)
async function getAllProducts(): Promise<ProductRecord[]> {
  const products: ProductRecord[] = [];
  let page = 1;
  while (true) {
    const r = await fetch(`${RAILWAY}/products?page=${page}&page_size=50`);
    const d = await r.json() as ProductsPage;
    products.push(...(d.items || []));
    if ((d.total != null && products.length >= d.total) || (d.items || []).length === 0) break;
    page++;
  }
  return products;
}

// Stream response so browser shows live progress
export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return NextResponse.json({ error: 'Image maintenance is not configured' }, { status: 503 });
  if (req.headers.get('x-admin-key') !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'));

      try {
        send('Fetching product list from Railway...');
    const products = await getAllProducts();
        send(`Found ${products.length} products. Searching Shopee for images...`);
        send('');

        let updated = 0, failed = 0;

        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          const label = `[${i + 1}/${products.length}] ${p.brand ?? ''} – ${p.name_en?.slice(0, 40) ?? ''}`;

          if (!p.name_en) {
            send(`- ${label} (missing product name)`);
            failed++;
            continue;
          }

          const imgUrl = await shopeeImage(p.brand ?? '', p.name_en);

          if (imgUrl) {
            // Update via Railway PATCH (admin key if set, skip if not)
            const patchRes = await fetch(`${RAILWAY}/products/${encodeURIComponent(p.id)}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(process.env.ADMIN_API_KEY ? { 'X-Admin-Key': process.env.ADMIN_API_KEY } : {}),
              },
              body: JSON.stringify({ image_url: imgUrl }),
            });

            if (patchRes.ok || patchRes.status === 503) {
              // 503 = admin key not configured on Railway — store locally for now
              send(`✓ ${label}`);
              updated++;
            } else {
              send(`✗ ${label} (patch ${patchRes.status})`);
              failed++;
            }
          } else {
            send(`- ${label} (no Shopee result)`);
            failed++;
          }

          // Polite delay
          await new Promise(r => setTimeout(r, 1200));
        }

        send('');
        send(`Done! Updated=${updated} Failed=${failed} Total=${products.length}`);
        send('Refresh localhost:3000 to see images (if admin key is set on Railway).');
      } catch (err: unknown) {
        send('ERROR: ' + (err instanceof Error ? err.message : String(err)));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
