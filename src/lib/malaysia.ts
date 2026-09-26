import data from '@/data/malaysia-products.json';
import supplies from '@/data/cat-supplies.json';
import type { ProductDetail, ProductFilters } from './api';
import type { Lang } from './language';
export type HalalStatus = 'verified' | 'brand_claim' | 'pork_free_claim' | 'expired_evidence' | 'unverified';
export interface MarketReview {
  checked_at: string; market: string; availability: string; region: string;
  merchant: string; buy_url: string; product_source: string; buy_kind?: string;
  sales_evidence?: { sold?: string; rating?: number; reviews?: number; ships_from?: string; source?: string; note?: string };
  halal_status: HalalStatus; halal_source: string | null; certificate_expires: string | null;
  certificate_image?: string; certifier?: string; certificate_number?: string; certificate_scope?: string; variant_required?: boolean;
  life_stage: string;
}
export type MalaysiaProduct = ProductDetail & { review: MarketReview };
export const malaysiaProducts = [...data, ...supplies] as MalaysiaProduct[];
export function marketReview(id: string) { return malaysiaProducts.find(p => p.id === id)?.review; }
export function marketSalesEvidence(id: string) {
  const review = marketReview(id);
  const evidence = review?.sales_evidence;
  if (!evidence || (!evidence.sold && evidence.rating == null)) return null;
  return { ...evidence, checked_at: review.checked_at, merchant: review.merchant };
}
export function halalStatus(review?: MarketReview, now = new Date()): HalalStatus {
  if (!review) return 'unverified';
  if (review.halal_status === 'verified') {
    // A missing or expired certificate must never produce a verified badge.
    if (!review.halal_source || !review.certificate_expires || !review.certifier || !review.certificate_number || !review.certificate_scope || !/^\d{4}-\d{2}-\d{2}$/.test(review.certificate_expires) || !Number.isFinite(Date.parse(review.certificate_expires))) return 'unverified';
    if (review.certificate_expires < now.toISOString().slice(0,10)) return 'expired_evidence';
  }
  return review.halal_status;
}
export function marketAvailabilityNote(review: MarketReview, lang: Lang) {
  const copy: Record<string, Record<Lang, string>> = {
    available_at_check: {
      en: 'A purchase option was visible at the last check; live stock may have changed.',
      zh: '上次查阅时页面显示可购买入口；实时库存可能已经变化。',
      bm: 'Pilihan pembelian kelihatan semasa semakan terakhir; stok semasa mungkin telah berubah.',
    },
    listed: {
      en: 'A seller listing was found, but stock was not confirmed.',
      zh: '已找到商家商品页，但未确认实时库存。',
      bm: 'Penyenaraian penjual ditemui, tetapi stok belum disahkan.',
    },
    listing_found_confirm_stock: {
      en: 'A seller listing was found; confirm current stock before ordering.',
      zh: '已找到商家商品页；下单前请确认当前库存。',
      bm: 'Penyenaraian penjual ditemui; sahkan stok sebelum membuat pesanan.',
    },
    purchase_button_observed_confirm_variant: {
      en: 'A purchase option was visible; select the exact variant and confirm stock.',
      zh: '查阅时页面有购买入口；请选对规格并确认库存。',
      bm: 'Pilihan pembelian kelihatan; pilih variasi tepat dan sahkan stok.',
    },
    out_of_stock_observed: {
      en: 'The listing showed out of stock at the last check; availability may change.',
      zh: '上次查阅时商品显示缺货；之后库存可能变化。',
      bm: 'Penyenaraian menunjukkan stok habis semasa semakan terakhir; ketersediaan mungkin berubah.',
    },
  };
  return (copy[review.availability] ?? {
    en: 'Current stock has not been confirmed.',
    zh: '当前库存尚未核实。',
    bm: 'Stok semasa belum disahkan.',
  })[lang];
}
export function marketDeliveryNote(review?: MarketReview, lang: Lang = 'en') {
  const copy: Record<string, Record<Lang, string>> = {
    west_malaysia_confirm_east: {
      en: 'West Malaysia seller option found; confirm East Malaysia coverage and your postcode with the seller.',
      zh: '已找到西马销售入口；东马配送及你的邮编范围请向商家确认。',
      bm: 'Pilihan penjual di Semenanjung ditemui; sahkan liputan Sabah/Sarawak dan poskod anda dengan penjual.',
    },
    confirm_postcode: {
      en: 'Enter your Malaysian postcode on the platform to confirm delivery coverage.',
      zh: '请在平台输入马来西亚收货邮编，确认配送范围。',
      bm: 'Masukkan poskod Malaysia anda di platform untuk mengesahkan liputan penghantaran.',
    },
    semenyih_pickup: {
      en: 'A Semenyih pickup option was recorded; delivery to your postcode is unconfirmed.',
      zh: '记录中显示士毛月自取选项；送到你的邮编尚未核实。',
      bm: 'Pilihan ambil sendiri di Semenyih direkodkan; penghantaran ke poskod anda belum disahkan.',
    },
  };
  const key = review?.region ?? '';
  return (copy[key] ?? {
    en: 'Confirm delivery to your postcode on the marketplace.',
    zh: '请在电商平台确认是否配送到你的邮编。',
    bm: 'Sahkan penghantaran ke poskod anda di platform.',
  })[lang];
}
export function lifeStage(id: string, lang: Lang) {
  const labels: Record<string, Record<Lang,string>> = {
    adult_1_plus:{en:'Adult · 1+ years',zh:'成猫 · 1 岁以上',bm:'Dewasa · 1 tahun ke atas'},
    adult_1_to_7:{en:'Adult · 1–7 years',zh:'成猫 · 1–7 岁',bm:'Dewasa · 1–7 tahun'},
    senior_7_plus:{en:'Senior · 7+ years',zh:'熟龄猫 · 7 岁以上',bm:'Senior · 7 tahun ke atas'},
    kitten_4_to_12:{en:'Kitten · 4–12 months',zh:'幼猫 · 4–12 个月',bm:'Anak kucing · 4–12 bulan'},
    '2_months_plus':{en:'Brand lists 2+ months',zh:'品牌标示 2 个月以上',bm:'Jenama menyatakan 2 bulan ke atas'},
    check_label:{en:'Check life stage on pack',zh:'适用年龄请核对包装',bm:'Semak umur pada bungkusan'},
  };
  return (labels[marketReview(id)?.life_stage || 'check_label'] || labels.check_label)[lang];
}
export function halalLabel(status: HalalStatus, lang: Lang) {
  const labels = {
    verified: {en:'Halal certificate verified',zh:'清真认证已核实',bm:'Sijil halal disahkan'},
    brand_claim: {en:'Brand halal claim · pending evidence',zh:'品牌声明清真 · 证明待核实',bm:'Dakwaan halal jenama · belum disahkan'},
    pork_free_claim: {en:'Brand declares pork-free',zh:'品牌声明无猪成分',bm:'Jenama menyatakan tanpa babi'},
    expired_evidence: {en:'Halal evidence expired · renewal pending',zh:'清真证据已过期 · 待更新',bm:'Bukti halal tamat · menunggu pembaharuan'},
    unverified: {en:'Halal status unverified',zh:'清真状态待核实',bm:'Status halal belum disahkan'},
  };
  return labels[status][lang];
}
export function curatedProducts(filters: ProductFilters = {}, query = '', status = '') {
  const q=query.trim().toLowerCase();
  const halalApplicable = (p: MalaysiaProduct) => !['toys','litter','litter_box','scratchers','carrier'].includes(p.category);
  let items=malaysiaProducts.filter(p => (!q || `${p.name_en} ${p.brand} ${p.name_zh || ''} ${p.name_bm || ''}`.toLowerCase().includes(q)) &&
    (!filters.category || p.category===filters.category) && (!filters.is_local_brand || p.is_local_brand) &&
    (!filters.is_halal || (halalApplicable(p) && halalStatus(p.review)==='verified')) &&
    (!status || (halalApplicable(p) && halalStatus(p.review)===status)) &&
    (filters.max_price == null || (p.price_myr != null && p.price_myr<=filters.max_price)));
  if(filters.sort_by?.startsWith('price')) items=[...items].sort((a,b)=>a.price_myr==null?b.price_myr==null?0:1:b.price_myr==null?-1:(a.price_myr-b.price_myr)*(filters.sort_by==='price_asc'?1:-1));
  const page=filters.page || 1, size=filters.page_size || 12;
  return {items:items.slice((page-1)*size,page*size),total:items.length,page,page_size:size};
}
