'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Category, Product, SortBy } from '@/lib/api';
import { getCategoryLabel, useLang } from '@/lib/language';
import { money, purpose, recordShoppingEvent, words } from '@/lib/shopping';
import ShoppingImage from './ShoppingImage';
import { halalLabel, halalStatus, marketReview, marketSalesEvidence, lifeStage } from '@/lib/malaysia';

import { catalogueProducts, selectCatalogue, isCatSupply } from '@/lib/catalogue';
const categories = ['', 'wet', 'dry', 'freeze_dried', 'treat', 'supplement', 'toys', 'litter', 'litter_box', 'scratchers'];
const sorts: SortBy[] = ['score_desc', 'price_asc', 'price_desc'];
export default function ProductCatalogue() {
  return <Suspense fallback={<div className="shop-state" role="status">MeowLah · …</div>}><Catalogue /></Suspense>;
}
function Catalogue() {
  const { lang, setLang } = useLang();
  const w = (en: string, zh: string, bm: string) => words(lang, en, zh, bm);
  const params = useSearchParams();

  const pathname = usePathname();
  const category = categories.includes(params.get('category') || '') ? params.get('category') || '' : '';
  const query = params.get('q') || '';
  const scope = params.get('scope') === 'all' ? 'all' : params.get('scope') === 'recommended' ? 'recommended' : lang === 'bm' ? 'recommended' : 'all';
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const sort = sorts.includes(params.get('sort') as SortBy) ? params.get('sort') as SortBy : 'score_desc';
  const budget = ['10', '30', '60', '100'].includes(params.get('budget') || '') ? params.get('budget')! : '';
  const local = params.get('local') === '1';
  const halal = params.get('halal') === '1' ? 'verified' : ['verified', 'brand_claim', 'pork_free_claim', 'expired_evidence', 'unverified'].includes(params.get('halal') || '') ? params.get('halal') || '' : '';
  const [result, setResult] = useState<{ items: Product[]; total: number; searchLimited?: boolean }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [guide, setGuide] = useState(false);
  const [selected, setSelected] = useState<Product[]>([]);
  const [shortlistReady, setShortlistReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pageSize = 12;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(sessionStorage.getItem('ml_product_shortlist') || '[]');
        if (Array.isArray(saved)) setSelected(saved.map(p => catalogueProducts.find(current => current.id === p?.id)).filter((p): p is Product => !!p).slice(0, 3));
      } catch { /* Shortlisting still works when storage is unavailable. */ }
      setShortlistReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (shortlistReady) {
      try { sessionStorage.setItem('ml_product_shortlist', JSON.stringify(selected)); } catch { /* Optional session persistence. */ }
    }
  }, [selected, shortlistReady]);
  const change = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    next.delete('page');
    Object.entries(updates).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k));
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
  };
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(false);
      try {
        const filters = { page, page_size: pageSize, category: category as Category || undefined, sort_by: sort, max_price: budget ? Number(budget) : undefined, is_local_brand: local || undefined, is_halal: undefined };
        const data = await Promise.resolve(selectCatalogue(filters, query, halal, scope, lang));
        if (!cancelled) setResult(data);
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [page, category, sort, budget, local, halal, query, retry, scope, lang]);
  const toggle = (product: Product) => setSelected(previous => previous.some(p => p.id === product.id) ? previous.filter(p => p.id !== product.id) : previous.length < 3 ? [...previous, product] : previous);
  const returnTo = `${pathname}${params.size ? `?${params}` : ''}`;
  const productUrl = (product: Product) => `/products/${encodeURIComponent(product.id)}?from=${encodeURIComponent(returnTo)}`;
  const active = !!(category || budget || local || halal || query);
  const pages = Math.max(1, Math.ceil(result.total / pageSize));
  return <div className="shop-shell">
    <div className="shop-topline"><span>{w('THE MEOWLAH CAT SHOP', 'MEOWLAH 猫咪选购指南', 'PANDUAN BELI UNTUK KUCING')}</span><div aria-label="Language">{(['en', 'zh', 'bm'] as const).map(l => <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'zh' ? '中文' : l.toUpperCase()}</button>)}</div></div>
    <section className="shop-hero"><div className="shop-hero-copy"><span className="shop-eyebrow">{w('LESS GUESSWORK. BETTER CHOICES FOR CATS.', '少一点纠结，多一点安心。', 'LEBIH MUDAH MEMILIH.')}</span><h1>{w('Made for cats.', '只为猫咪，', 'Keutamaan halal.')}<br /><em>{w('More to discover.', '发现更多好物。', 'Keperluan kucing.')}</em></h1><p>{w('Browse cat food, toys and everyday essentials. Reviewed Malaysia picks sit alongside the wider catalogue.', '猫粮、玩具与日常用品一起选；马来西亚精选与完整商品库分别浏览。', 'Utamakan makanan dengan bukti halal, diikuti keperluan kucing. Dakwaan jenama bukan sijil yang telah disahkan.')}</p><button className="shop-primary" aria-expanded={guide} onClick={() => setGuide(!guide)}>{w('Help me narrow it down', '帮我缩小选择', 'Bantu saya memilih')} ↗</button><small>{w('No sign-up needed', '无需注册，即可开始', 'Tidak perlu mendaftar')}</small></div>
      <aside className="shop-hero-note"><div className="shop-cat" aria-hidden="true">ฅ^•ﻌ•^ฅ</div><div className="shop-note-line" /><span className="shop-eyebrow">{w('A LITTLE HELP AT EVERY STEP', '每一步，都选得更明白', 'PANDUAN SETIAP LANGKAH')}</span><ol><li><b>01</b>{w('Start with your budget', '先看预算与品类', 'Mulakan dengan bajet')}</li><li><b>02</b>{w('Compare up to 3 products', '挑选最多 3 款对比', 'Banding sehingga 3 produk')}</li><li><b>03</b>{w('Check details, then shop', '核对规格，再去购买', 'Semak butiran, kemudian beli')}</li></ol></aside></section>
    {guide && <section className="shop-guide"><div><h2>{w('Let’s start with two things.', '先从两个条件开始。', 'Mulakan dengan dua perkara.')}</h2><p>{w('Catalogue filters, not a personalised feeding prescription.', '按商品资料筛选，不替代个别猫咪的饮食建议。', 'Penapis katalog, bukan preskripsi pemakanan peribadi.')}</p></div><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); change({ category: String(data.get('type')), budget: String(data.get('budget')), q: '' }); setGuide(false); document.getElementById('shop-results')?.scrollIntoView(); }}><label>{w('Product type', '想找什么类型？', 'Jenis produk')}<select name="type" defaultValue={category}>{categories.map(c => <option key={c} value={c}>{c ? getCategoryLabel(c, lang) : w('Any type', '不限品类', 'Semua jenis')}</option>)}</select></label><label>{w('Budget per pack', '每件预算', 'Bajet setiap pek')}<select name="budget" defaultValue={budget}><option value="">{w('Any budget', '不限预算', 'Semua bajet')}</option>{[10, 30, 60, 100].map(n => <option value={n} key={n}>≤ RM {n}</option>)}</select></label><button className="shop-primary">{w('Show matching products', '查看符合条件的商品', 'Lihat pilihan')} →</button></form></section>}
    <section className="shop-evidence shop-market-intro"><span className="shop-eyebrow">MALAYSIA · CAT PRODUCTS</span><h2>{w('Halal information you can check.', '清真信息，要有据可查。', 'Maklumat halal yang boleh disemak.')}</h2><p>{w('Brand claims, pork-free statements and verified certificates are separate filters. No current certificate has met our verification criteria in this selection yet.', '品牌清真声明、无猪成分声明和已核实证书分别筛选。本次精选暂未有通过有效证书核验的商品。', 'Dakwaan jenama, kenyataan tanpa babi dan sijil sah ditapis berasingan. Belum ada sijil semasa yang memenuhi semakan kami dalam pilihan ini.')}</p><p>{w('Unverified does not mean non-halal. Delivery coverage varies, especially for Sabah and Sarawak; check your postcode with the seller.', '待核实不等于非清真。配送范围因商家而异，沙巴及砂拉越请特别核对邮编。', 'Belum disahkan tidak bermaksud tidak halal. Semak poskod penghantaran, terutama Sabah dan Sarawak.')}</p></section>
    <section className="shop-discovery" id="shop-results"><div><span className="shop-eyebrow">{w('FIND YOUR NEXT FAVOURITE', '找到适合猫咪的好物', 'CARI PILIHAN SETERUSNYA')}</span><h2>{w('Explore cat products', '逛逛猫咪好物', 'Terokai produk kucing')}</h2></div><form className="shop-search" key={query} onSubmit={e => { e.preventDefault(); change({ q: String(new FormData(e.currentTarget).get('q') || '').trim() }); }}><label className="sr-only" htmlFor="food-search">{w('Search product or brand', '搜索商品或品牌', 'Cari produk atau jenama')}</label><input id="food-search" name="q" defaultValue={query} placeholder={w('Search product or brand…', '搜索商品或品牌…', 'Cari produk atau jenama…')} type="search" /><button aria-label={w('Search', '搜索', 'Cari')}>↗</button></form></section>
    <div className="shop-tabs shop-scope" aria-label={w('Catalogue collection','商品范围','Pilihan katalog')}><button aria-pressed={scope === 'recommended'} onClick={() => change({scope:'recommended'})}>{w('Malaysia picks','马来西亚精选','Pilihan utama')}</button><button aria-pressed={scope === 'all'} onClick={() => change({scope:'all'})}>{w('All cat products','全部猫商品','Semua produk kucing')} ({catalogueProducts.length})</button></div>
    <div className="shop-tabs" aria-label={w('Product categories', '商品品类', 'Jenis produk')}>{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => change({ category: c })}>{c ? getCategoryLabel(c, lang) : w('All categories', '全部品类', 'Semua kategori')}</button>)}</div>
    <div className="shop-toolbar"><label>{w('Pack budget', '每件预算', 'Bajet pek')}<select value={budget} onChange={e => change({ budget: e.target.value })}><option value="">{w('Any', '不限', 'Semua')}</option>{[10, 30, 60, 100].map(n => <option key={n} value={n}>≤ RM {n}</option>)}</select></label><button className="shop-filter" aria-pressed={local} onClick={() => change({ local: local ? '' : '1' })}>{w('MY brands', '马来西亚品牌', 'Jenama MY')}</button><label>{w('Halal evidence', '清真证据', 'Bukti halal')}<select value={halal} onChange={e => change({halal:e.target.value})}><option value="">{w('All statuses', '全部状态', 'Semua status')}</option>{(['verified','brand_claim','pork_free_claim','expired_evidence','unverified'] as const).map(status=><option value={status} key={status}>{halalLabel(status,lang)}</option>)}</select></label><label className="shop-sort">{w('Sort', '排序', 'Susunan')}<select value={sort} onChange={e => change({ sort: e.target.value })}><option value="score_desc">{w('Curated order', '精选顺序', 'Susunan pilihan')}</option><option value="price_asc">{w('Pack price: low to high', '单件价格：从低到高', 'Harga pek: rendah ke tinggi')}</option><option value="price_desc">{w('Pack price: high to low', '单件价格：从高到低', 'Harga pek: tinggi ke rendah')}</option></select></label></div>
    <div className="shop-results-label"><span aria-live="polite">{loading ? w('Finding products…', '正在查找商品…', 'Mencari produk…') : error ? '' : `${result.total} ${w('products', '款商品', 'produk')}${query ? ` · “${query}”` : ''}`}</span>{active && <button onClick={() => window.history.pushState(null, '', pathname)}>{w('Clear filters', '清除筛选', 'Kosongkan penapis')} ×</button>}</div>
    {result.searchLimited && query && <p className="shop-note">{w('Search returns up to 30 matches. Filters apply to those matches; use a more specific name to refine.', '搜索最多返回 30 个候选，筛选应用于这些候选。输入更具体的名称可缩小范围。', 'Carian memulangkan sehingga 30 padanan. Gunakan nama lebih khusus.')}</p>}
    <p className="shop-note shop-catalog-note">{w('Older listings still need seller and pack checks. Prices are references excluding delivery. Seller sales and ratings are dated marketplace snapshots and may combine product variants. Products without an image or a working affiliate offer are held out of the catalogue.', '旧商品的商家与规格仍待复核；价格为不含运费的参考价。销量与评分是有日期的商家页面快照，可能合并不同变体；缺少图片或有效联盟购买入口的商品暂不展示。', 'Penyenaraian lama masih memerlukan semakan penjual dan pek. Harga rujukan tidak termasuk penghantaran. Jualan dan rating ialah snapshot bertarikh daripada halaman penjual dan mungkin menggabungkan variasi produk. Produk tanpa imej atau tawaran afiliasi yang berfungsi tidak dipaparkan.')}</p>
    {loading ? <div className="shop-grid" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div className="shop-skeleton" key={i} />)}</div> : error ? <div className="shop-state" role="alert"><h3>{w('The shelf is taking a moment.', '商品暂时加载失败', 'Katalog belum tersedia.')}</h3><p>{w('Please retry. Your filters are saved.', '请重试，你的筛选条件已保留。', 'Cuba lagi. Penapis anda dikekalkan.')}</p><button className="shop-primary" onClick={() => setRetry(n => n + 1)}>{w('Try again', '重新加载', 'Cuba lagi')}</button></div> : !result.items.length ? <div className="shop-state"><h3>{w('No products match these filters.', '没有符合这些条件的商品', 'Tiada produk yang sepadan.')}</h3>{halal === 'verified' && <p>{w('No current product certificate has been verified yet. Brand claims and pork-free statements remain separate options.', '目前尚无商品完成有效清真证书核验。你可以单独查看品牌声明或无猪成分声明。', 'Belum ada sijil produk semasa yang disahkan. Dakwaan jenama dan tanpa babi kekal pilihan berasingan.')}</p>}<button onClick={() => window.history.pushState(null, '', pathname)}>{w('Explore all products', '查看全部商品', 'Lihat semua produk')} →</button></div> : <div className="shop-grid">{result.items.map(product => {
      const chosen = selected.some(p => p.id === product.id);
      const sales = marketSalesEvidence(product.id);
      return <article className="shop-card" key={product.id}><Link href={productUrl(product)} prefetch={false} className="shop-card-image"><ShoppingImage key={product.image_url} url={product.image_url} name={product.name_en} />{product.grade && <span className="shop-score">{w('Score', '评分', 'Skor')} {product.grade}</span>}</Link><div className="shop-card-body"><div className="shop-brand">{product.brand}</div><Link href={productUrl(product)} prefetch={false}><h3>{product.name_en}</h3></Link>{!isCatSupply(product) && <span className="shop-halal-status">{halalLabel(halalStatus(marketReview(product.id)),lang)}</span>}<p className="shop-purpose">{purpose(product, lang)}</p><div className="shop-card-price"><strong>{product.price_myr ? money(product.price_myr) : w('Check price', '查看商家价格', 'Semak harga')}</strong><span>{isCatSupply(product) ? product.specification : product.weight_g ? `${product.weight_g}g` : '—'}</span></div><small>{isCatSupply(product) ? w('Choose size / variant at the seller','规格与款式以商家页面为准','Pilih saiz / variasi di kedai') : product.price_myr && product.weight_g ? `${money(product.price_myr / product.weight_g * 100)} / 100g` : w('Unit price unavailable', '暂无单位价格', 'Harga unit tiada')}</small>{sales && <p className="shop-seller-proof" title={`${sales.merchant} · ${w('Checked','查阅于','Disemak')} ${sales.checked_at}${sales.note ? ` · ${sales.note}` : ''}`}>{sales.sold && <strong>{sales.sold} {w('sold','已售','terjual')}</strong>}{sales.sold && sales.rating != null && <span aria-hidden="true"> · </span>}{sales.rating != null && <strong>{sales.rating.toFixed(1)}★</strong>}<span> · {w('seller snapshot','商家快照','snapshot penjual')} · {sales.checked_at}</span></p>}<div className="shop-card-actions"><Link href={productUrl(product)} prefetch={false}>{w('Details & buying options', '详情与购买选项', 'Butiran & pilihan beli')} ↗</Link><button aria-label={`${w('Compare', '对比', 'Banding')} ${product.name_en}`} aria-pressed={chosen} disabled={!chosen && selected.length >= 3} onClick={() => toggle(product)}>{chosen ? '✓' : '+'}</button></div></div></article>;
    })}</div>}
    {!loading && !error && pages > 1 && <nav className="shop-pagination" aria-label={w('Product pages', '商品分页', 'Halaman produk')}><button disabled={page <= 1} onClick={() => change({ page: String(page - 1) })}>← {w('Previous', '上一页', 'Sebelum')}</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => change({ page: String(page + 1) })}>{w('Next', '下一页', 'Seterusnya')} →</button></nav>}
    <div className="shop-footer-note"><strong>{w('Choose by product type and your cat’s needs.', '按品类和猫咪的需要来选。', 'Pilih mengikut jenis produk dan keperluan kucing.')}</strong><p>{w('For food, check the label for life stage and complete-food claims. For toys and supplies, confirm size, materials and delivery with the seller.', '食品请核对适用年龄与主食说明；玩具和用品请向商家确认尺寸、材质及配送。', 'Untuk makanan, semak peringkat umur dan kenyataan makanan lengkap. Untuk mainan dan kelengkapan, sahkan saiz, bahan dan penghantaran dengan penjual.')}</p></div>
    {selected.length > 0 && <div className="shop-compare-tray"><span>{selected.length}/3 {w('selected', '款已选', 'dipilih')}</span><button onClick={() => setSelected([])}>{w('Clear', '清空', 'Kosongkan')}</button><button className="shop-primary" onClick={() => { dialog.current?.showModal(); recordShoppingEvent('compare_open'); }}>{w('Compare products', '开始对比', 'Banding makanan')} ↗</button></div>}
    <dialog ref={dialog} className="shop-compare-dialog"><div className="shop-dialog-head"><h2>{w('Your shortlist', '你的候选清单', 'Senarai pilihan anda')}</h2><button autoFocus onClick={() => dialog.current?.close()} aria-label={w('Close comparison', '关闭对比', 'Tutup perbandingan')}>×</button></div><p className="shop-note">{w('Reference prices. Compare unit prices within one food type.', '参考价格。单位价格适合在同类食品中比较。', 'Harga rujukan. Banding harga unit bagi jenis yang sama.')}</p><div className="shop-table-scroll"><table><thead><tr><th>{w('Compare', '对比项目', 'Banding')}</th>{selected.map(p => <th key={p.id}>{p.name_en}</th>)}</tr></thead><tbody>{[
      [w('Type', '品类', 'Jenis'), (p: Product) => getCategoryLabel(p.category, lang)],
      [w('Purpose', '用途', 'Kegunaan'), (p: Product) => purpose(p, lang)],
      [w('Life stage', '适用年龄', 'Umur'), (p: Product) => isCatSupply(p) ? '—' : lifeStage(p.id,lang)],
      [w('Halal evidence', '清真证据', 'Bukti halal'), (p: Product) => isCatSupply(p) ? '—' : halalLabel(halalStatus(marketReview(p.id)),lang)],
      [w('Pack size', '包装重量', 'Saiz pek'), (p: Product) => isCatSupply(p) ? p.specification || '—' : p.weight_g ? `${p.weight_g}g` : '—'],
      [w('Reference price', '参考价', 'Harga rujukan'), (p: Product) => money(p.price_myr)],
      [w('Per 100g', '每 100g', 'Setiap 100g'), (p: Product) => !isCatSupply(p) && p.price_myr && p.weight_g ? money(p.price_myr / p.weight_g * 100) : '—'],
      [w('Nutrition score', '营养评分', 'Skor nutrisi'), (p: Product) => isCatSupply(p) ? w('Not scored', '不适用', 'Tidak dinilai') : p.final_score != null ? `${Math.round(p.final_score)}/100` : '—'],
    ].map(([label, value]) => <tr key={String(label)}><th>{String(label)}</th>{selected.map(p => <td key={p.id}>{(value as (p: Product) => string)(p)}</td>)}</tr>)}<tr><th>{w('Next step', '下一步', 'Seterusnya')}</th>{selected.map(p => <td key={p.id}><Link href={productUrl(p)} onClick={() => dialog.current?.close()}>{w('View details', '查看详情', 'Lihat butiran')} ↗</Link><button className="shop-remove" onClick={() => { setSelected(items => items.filter(item => item.id !== p.id)); if (selected.length === 1) dialog.current?.close(); }}>{w('Remove', '移除', 'Buang')}</button></td>)}</tr></tbody></table></div></dialog>
  </div>;
}
