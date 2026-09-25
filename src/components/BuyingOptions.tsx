'use client';
import { useEffect } from 'react';
import type { ProductDetail } from '@/lib/api';
import { useLang } from '@/lib/language';
import { latestPrices, merchantLink, money, purpose, recordShoppingEvent, words } from '@/lib/shopping';

export default function BuyingOptions({ product }: { product: ProductDetail }) {
  const { lang } = useLang();
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
      if (!link?.affiliate) return null;
      const price = latestPrices(product.prices).find(p => p.platform.toLowerCase() === platform);
      const date = price?.scraped_at && Number.isFinite(Date.parse(price.scraped_at)) ? new Date(price.scraped_at).toISOString().slice(0, 10) : null;
      const name = platform === 'shopee' ? 'Shopee' : 'Lazada';
      return <div className="shop-offer" key={platform}>
        <div><strong>{name}</strong><p>{price ? `${w('Recorded price', '记录价格', 'Harga direkod')} ${money(price.price_myr)}` : w('Check current price on platform', '到平台查看现价', 'Semak harga di platform')}</p>
          {date && <small>{w('Recorded', '记录于', 'Direkod')} {date}</small>}
          {price?.in_stock === false && <small>{w('Last recorded as out of stock · check again before ordering', '最近记录为缺货 · 下单前请重新确认', 'Rekod terakhir kehabisan stok · semak semula sebelum memesan')}</small>}
        </div>
        <a href={link.url} target="_blank" rel="sponsored noopener noreferrer" onClick={() => recordShoppingEvent('affiliate_click', product.id, platform, link.kind)}>
          {price?.in_stock === false ? w('Check availability', '检查是否有货', 'Semak ketersediaan') : link.kind === 'search' ? w(`Search ${name}`, `去 ${name} 搜索`, `Cari di ${name}`) : link.kind === 'product' ? w('View listing', '查看商品', 'Lihat produk') : w('View platform link', '前往平台核对', 'Semak di platform')} ↗
        </a>
      </div>;
    })}</div>
    {!hasAffiliate && <p className="shop-note">{w('No affiliate buying option is currently available for this product, so direct seller links are not shown here.', '此商品目前没有联盟购买入口，因此这里不提供商家直购链接。', 'Pilihan pembelian afiliasi belum tersedia untuk produk ini; pautan terus penjual tidak dipaparkan.')}</p>}
    {hasAffiliate && <p className="shop-note">{w('MeowLah may earn a commission from qualifying purchases through the Shopee / Lazada affiliate links. Recorded prices are not live quotes or a lowest-price guarantee.', '通过 Shopee / Lazada 联盟链接完成符合条件的购买，MeowLah 可能获得佣金。记录价格不是实时报价，也不代表全网最低价。', 'MeowLah mungkin menerima komisen melalui pautan afiliasi Shopee / Lazada bagi pembelian yang layak. Harga rekod bukan sebut harga langsung atau jaminan harga terendah.')}</p>}
  </section>;
}
