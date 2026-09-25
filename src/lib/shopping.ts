import type { Product, ProductDetail, ProductPriceDetail } from './api';
import type { Lang } from './language';

export const words = (lang: Lang, en: string, zh: string, bm: string) => ({ en, zh, bm })[lang];
export const money = (value: number | null | undefined) => value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? `RM ${Number(value).toFixed(2)}` : '—';
export function hasPublishedScore(product: Pick<Product, 'grade' | 'final_score'>) {
  return Number.isFinite(product.final_score) && product.final_score != null && product.final_score > 0 && product.final_score <= 100 &&
    ['S', 'A', 'B', 'C', 'D', 'F'].includes(product.grade ?? '');
}

export function purpose(product: Product, lang: Lang) {
  if (['toys','litter','litter_box','scratchers'].includes(product.category)) return words(lang,'For cats · non-food','猫专用 · 非食品','Khas untuk kucing · bukan makanan');
  if (product.is_prescription) return words(lang, 'Prescription diet · ask your vet', '处方饮食 · 请咨询兽医', 'Diet preskripsi · rujuk doktor haiwan');
  if (product.food_purpose === 'complementary') return words(lang, 'Complementary food', '辅食 / 零食', 'Makanan pelengkap');
  if (product.food_purpose === 'complete') return words(lang, 'Listed as complete food', '资料标记为主食', 'Disenaraikan sebagai makanan lengkap');
  return words(lang, 'Feeding purpose unconfirmed', '主食 / 辅食用途待确认', 'Kegunaan makanan belum disahkan');
}
export function latestPrices(prices: ProductPriceDetail[] = []) {
  const latest = new Map<string, ProductPriceDetail>();
  for (const price of prices) {
    const key = price.platform.toLowerCase();
    const previous = latest.get(key);
    const time = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
    if (!previous || time(price.scraped_at) > time(previous.scraped_at)) latest.set(key, price);
  }
  return [...latest.values()];
}
export function referencePrice(product: ProductDetail) {
  // Use the same summary field as the catalogue; never select an old historical minimum.
  if (product.price_myr != null && Number(product.price_myr) > 0) return Number(product.price_myr);
  const prices = latestPrices(product.prices).filter(p => p.in_stock && Number(p.price_myr) > 0);
  return prices.length ? Math.min(...prices.map(p => Number(p.price_myr))) : null;
}
export type Merchant = 'shopee' | 'lazada';
function hasAffiliateTrackingEvidence(platform: Merchant, url: URL) {
  const params = url.searchParams;
  if (platform === 'shopee') {
    const tagged = params.has('mmp_pid') || params.get('utm_medium') === 'affiliates' || /^an_\d+$/i.test(params.get('utm_source') ?? '');
    const shortLink = url.hostname === 's.shopee.com.my' && /^\/[A-Za-z0-9]{8,14}\/?$/.test(url.pathname);
    return tagged || shortLink;
  }
  const tagged = ['aff_id', 'aff_trace_key', 'laz_trackid', 'laz_token'].some(key => params.has(key)) ||
    params.get('trafficFrom')?.toLowerCase() === 'affiliate';
  const shortLink = url.hostname === 's.lazada.com.my' && /^\/s\.[A-Za-z0-9]+\/?$/.test(url.pathname);
  return tagged || shortLink;
}

export function merchantLink(product: Product, platform: Merchant) {
  const candidates = platform === 'shopee' ? [product.affiliate_shopee, product.shopee_url] : [product.affiliate_lazada, product.lazada_url];
  let regularMarketplaceLink: { url: string; kind: 'search' | 'product' | 'unverified'; affiliate: false } | null = null;
  for (const [index, candidate] of candidates.entries()) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const hosts = platform === 'shopee' ? ['shopee.com.my', 'shope.ee', 's.shopee.com.my'] : ['lazada.com.my'];
      if (url.protocol !== 'https:' || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) continue;
      const kind = /\/search\b|\/catalog\b/.test(url.pathname) ? 'search' :
        /-i\.\d+\.\d+|\/product\/\d+\/\d+|\/products\/.*\.html/.test(url.pathname) ? 'product' : 'unverified';
      if (index === 0 && hasAffiliateTrackingEvidence(platform, url)) return { url: url.href, kind, affiliate: true } as const;
      regularMarketplaceLink ??= { url: url.href, kind, affiliate: false };
    } catch { /* Invalid stored links are not actionable. */ }
  }
  return regularMarketplaceLink;
}

export function recordShoppingEvent(name: 'product_view' | 'affiliate_click' | 'compare_open', productId?: string, platform?: string, destinationKind?: string) {
  // Record clicks for both database products and hand-curated Malaysia catalogue IDs.
  if (name === 'affiliate_click' && productId && (platform === 'shopee' || platform === 'lazada')) {
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://meowlah-production.up.railway.app';
    const databaseProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    const catalogProduct = /^my-[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(productId);
    if (!databaseProduct && !catalogProduct) return;
    void fetch(`${api}/affiliate/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(databaseProduct
        ? { product_id: productId, platform, source: 'products_detail' }
        : { catalogue_id: productId, platform }),
      keepalive: true,
    }).catch(() => { /* Shopping outlinks must work if analytics is unavailable. */ });
  }
  // Retain a local integration hook for page analytics without collecting personal data.
  window.dispatchEvent(new CustomEvent('meowlah:shopping', { detail: { name, productId, platform, destinationKind } }));
}
