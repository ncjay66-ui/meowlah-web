'use client';
import { useEffect } from 'react';
import type { ProductDetail } from '@/lib/api';
import { marketReview } from '@/lib/malaysia';
import { useLang } from '@/lib/language';
import { latestPrices, merchantLink, money, purpose, recordShoppingEvent, words } from '@/lib/shopping';

export default function BuyingOptions({ product }: { product: ProductDetail }) {
  const { lang } = useLang();
  const review = marketReview(product.id);
  const hasAffiliate = !!(merchantLink(product, 'shopee')?.affiliate || merchantLink(product, 'lazada')?.affiliate);
  const w = (en: string, zh: string, bm: string) => words(lang, en, zh, bm);
  useEffect(() => { recordShoppingEvent('product_view', product.id); }, [product.id]);
  return <section id="buying-options" className="shop-buying">
    <div className="shop-eyebrow">{w('BEFORE YOU BUY', '购买前，先确认', 'SEBELUM MEMBELI')}</div>
    <h2>{w('Choose where to buy', '选择购买平台', 'Pilih tempat membeli')}</h2>
    <p>{purpose(product, lang)} · {product.weight_g ? `${product.weight_g}g` : w('Weight unconfirmed', '重量待确认', 'Berat belum disahkan')}</p>
    <p className="shop-note">{w('Check flavour, pack size and seller on the platform. Shipping and vouchers are calculated there.', '请在平台核对口味、包装数量及商家。运费与优惠券以平台结算为准。', 'Semak perisa, saiz pek dan penjual di platform. Penghantaran dan baucar dikira di sana.')}</p>
    <div className="shop-offers">{(['shopee', 'lazada'] as const).map(platform => {
      const link = merchantLink(product, platform);
      if (review && !link) return null;
      const price = latestPrices(product.prices).find(p => p.platform.toLowerCase() === platform);
      const date = price?.scraped_at && Number.isFinite(Date.parse(price.scraped_at)) ? new Date(price.scraped_at).toISOString().slice(0, 10) : null;
      const name = platform === 'shopee' ? 'Shopee' : 'Lazada';
      return <div className="shop-offer" key={platform}>
        <div><strong>{name}</strong><p>{price ? `${w('Recorded price', '记录价格', 'Harga direkod')} ${money(price.price_myr)}` : w('Check current price on platform', '到平台查看现价', 'Semak harga di platform')}</p>
          {date && <small>{w('Recorded', '记录于', 'Direkod')} {date}</small>}
          {price?.in_stock === false && <small>{w('Last recorded as out of stock', '最近记录为缺货', 'Rekod terakhir: kehabisan stok')}</small>}
        </div>
        {link ? <a href={link.url} target="_blank" rel={link.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"} onClick={() => { if (link.affiliate) recordShoppingEvent('affiliate_click', product.id, platform, link.kind); }}>
          {link.kind === 'search' ? w(`Search ${name}`, `去 ${name} 搜索`, `Cari di ${name}`) : link.kind === 'product' ? w('View listing', '查看商品', 'Lihat produk') : w('View platform link', '前往平台核对', 'Semak di platform')} ↗
        </a> : <span className="shop-note">{w('Link unavailable', '暂无有效链接', 'Pautan tiada')}</span>}
      </div>;
    })}{review && <div className="shop-offer"><div><strong>{review.merchant} · {w('direct seller', '商家直链', 'penjual langsung')}</strong><p>{product.price_myr ? money(product.price_myr) : w('Select a pack to check the price', '选择包装后查看价格', 'Pilih pek untuk harga')}</p><small>{w('Reference checked', '参考资料查阅于', 'Semakan rujukan')} {review.checked_at}</small><small>{review.region === 'semenyih_pickup' ? w('Semenyih shop pickup; confirm delivery separately', 'Semenyih 门店自提；配送另行确认', 'Ambil di kedai Semenyih; sahkan penghantaran') : review.region === 'west_malaysia_confirm_east' ? w('West Malaysia delivery; confirm East Malaysia coverage', '西马配送；东马覆盖请向商家确认', 'Penghantaran Semenanjung; sahkan Malaysia Timur') : w('Check stock and delivery postcode with seller', '向商家确认库存和配送邮编', 'Sahkan stok dan poskod dengan penjual')}</small></div><a href={review.buy_url} target="_blank" rel="noopener noreferrer">{review.buy_kind === 'store' ? w('Find this pack in store', '到店内选择此规格', 'Cari pek di kedai') : w('View Malaysian seller', '查看马来西亚销售页', 'Lihat penjual Malaysia')} ↗</a></div>}</div>
    {review && <p className="shop-note">{w('The reviewed seller link above is not an affiliate link. Marketplace variants must match this pack before purchase.', '以上核查销售链接不是联盟链接。购买前请核对平台口味与规格。', 'Pautan penjual yang disemak di atas bukan pautan afiliasi. Semak perisa dan saiz sebelum membeli.')}</p>}
    {hasAffiliate && <p className="shop-note">{w('MeowLah may earn a commission from qualifying purchases through the Shopee / Lazada affiliate links. Recorded prices are not live quotes or a lowest-price guarantee.', '通过 Shopee / Lazada 联盟链接完成符合条件的购买，MeowLah 可能获得佣金。记录价格不是实时报价，也不代表全网最低价。', 'MeowLah mungkin menerima komisen melalui pautan afiliasi Shopee / Lazada bagi pembelian yang layak. Harga rekod bukan sebut harga langsung atau jaminan harga terendah.')}</p>}
  </section>;
}
