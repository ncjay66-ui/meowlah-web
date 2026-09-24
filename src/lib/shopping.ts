import type { Product, ProductDetail, ProductPriceDetail } from './api';
import type { Lang } from './language';

export const words = (lang: Lang, en: string, zh: string, bm: string) => ({ en, zh, bm })[lang];
export const money = (value: number | null | undefined) => value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? `RM ${Number(value).toFixed(2)}` : '—';
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
export function merchantLink(product: Product, platform: Merchant) {
  const candidates = platform === 'shopee' ? [product.affiliate_shopee, product.shopee_url] : [product.affiliate_lazada, product.lazada_url];
  for (const [index, candidate] of candidates.entries()) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const hosts = platform === 'shopee' ? ['shopee.com.my', 'shope.ee', 's.shopee.com.my'] : ['lazada.com.my'];
      if (url.protocol !== 'https:' || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) continue;
      const kind = /\/search\b|\/catalog\b/.test(url.pathname) ? 'search' :
        /-i\.\d+\.\d+|\/product\/\d+\/\d+|\/products\/.*\.html/.test(url.pathname) ? 'product' : 'unverified';
      return { url: url.href, kind, affiliate: index === 0 } as const;
    } catch { /* Invalid stored links are not actionable. */ }
  }
  return null;
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
