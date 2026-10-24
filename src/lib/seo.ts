import type { Metadata } from 'next';
import type { Product } from './api';
import { LANG_TO_PREFIX, HREFLANG, OG_LOCALE, type Lang } from './locale';
import { halalStatus, marketReview, type HalalStatus } from './malaysia';

export const SITE = 'https://www.meowlah.com';
export const SITE_NAME = 'MeowLah';

// 语言常量从 ./locale 统一来源，这里只做转出，方便其他模块一次性 import
export { LANG_TO_PREFIX, HREFLANG, OG_LOCALE } from './locale';

/** 产品 URL：英文无前缀（同时作为 x-default），其余带 /ms 或 /zh */
export function productUrl(id: string, lang: Lang = 'en'): string {
  const prefix = LANG_TO_PREFIX[lang];
  return prefix ? `${SITE}/${prefix}/products/${id}` : `${SITE}/products/${id}`;
}

/** hreflang 互指表 —— 三语 + x-default，Google 要求必须互相指向 */
export function productAlternates(id: string) {
  return {
    canonical: productUrl(id, 'en'),
    languages: {
      [HREFLANG.en]: productUrl(id, 'en'),
      [HREFLANG.bm]: productUrl(id, 'bm'),
      [HREFLANG.zh]: productUrl(id, 'zh'),
      'x-default': productUrl(id, 'en'),
    },
  };
}

/**
 * 分类词 —— 这是关键词的载体。
 * 马来语版本刻意包含 "Makanan Kucing"，这正是马来西亚人实际搜的词。
 */
const CATEGORY_WORD: Record<string, Record<Lang, string>> = {
  wet:          { en: 'Wet Cat Food',          bm: 'Makanan Kucing Basah',        zh: '猫湿粮' },
  dry:          { en: 'Dry Cat Food',          bm: 'Makanan Kucing Kering',       zh: '猫干粮' },
  freeze_dried: { en: 'Freeze-Dried Cat Food', bm: 'Makanan Kucing Freeze-Dried', zh: '冻干猫粮' },
  treat:        { en: 'Cat Treat',             bm: 'Snek Kucing',                 zh: '猫零食' },
  supplement:   { en: 'Cat Supplement',        bm: 'Suplemen Kucing',             zh: '猫咪保健品' },
  toys:         { en: 'Cat Toy',               bm: 'Mainan Kucing',               zh: '猫玩具' },
  litter:       { en: 'Cat Litter',            bm: 'Pasir Kucing',                zh: '猫砂' },
  litter_box:   { en: 'Litter Box',            bm: 'Bekas Pasir Kucing',          zh: '猫砂盆' },
  scratchers:   { en: 'Cat Scratcher',         bm: 'Penggaru Kucing',             zh: '猫抓板' },
  carrier:      { en: 'Cat Carrier',           bm: 'Bekas Bawa Kucing',           zh: '猫包' },
};

const FALLBACK_CATEGORY: Record<Lang, string> = {
  en: 'Cat Product', bm: 'Produk Kucing', zh: '猫咪用品',
};

function categoryWord(category: string, lang: Lang): string {
  return CATEGORY_WORD[category]?.[lang] ?? FALLBACK_CATEGORY[lang];
}

/**
 * 清真措辞 —— 严格对应 halalStatus 的 5 种状态，三语一致。
 * 绝不把「品牌自称」写成「已认证」：这是 MeowLah 全部可信度的来源。
 */
function halalPhrase(status: HalalStatus, lang: Lang, certifier?: string | null): string | null {
  const P: Record<Exclude<HalalStatus, 'unverified'>, Record<Lang, string>> = {
    verified: {
      en: certifier ? `Halal certified (${certifier})` : 'Halal certified',
      bm: certifier ? `Halal disahkan (${certifier})` : 'Halal disahkan',
      zh: certifier ? `清真认证（${certifier}）` : '清真认证',
    },
    brand_claim: {
      en: 'Brand claims halal — certificate not sighted',
      bm: 'Jenama mendakwa halal — sijil belum disemak',
      zh: '品牌自称清真 —— 未见证书',
    },
    pork_free_claim: {
      en: 'Brand claims pork-free',
      bm: 'Jenama mendakwa bebas babi',
      zh: '品牌自称不含猪肉成分',
    },
    expired_evidence: {
      en: 'Halal certificate expired at last check',
      bm: 'Sijil halal tamat tempoh semasa semakan terakhir',
      zh: '上次查核时清真证书已过期',
    },
  };
  if (status === 'unverified') return null; // 没证据就不提，不做任何暗示
  return P[status][lang];
}

/** 该语言下展示用的产品名 */
function displayName(p: Product, lang: Lang): string {
  if (lang === 'bm' && p.name_bm) return p.name_bm;
  if (lang === 'zh' && p.name_zh) return p.name_zh;
  return p.name_en;
}

const TRUST: Record<Lang, string> = {
  en: 'Independent scoring — ratings are never paid for.',
  bm: 'Penilaian bebas — skor tidak pernah dibayar.',
  zh: '独立评分 —— 评级从不接受付费。',
};

/** 每种语言自己的句式 —— 不做单词拼接，避免「猫干粮 马来西亚.」这种语法错误 */
const SENTENCE: Record<Lang, {
  lead: (name: string, brand: string, cat: string) => string;
  score: (s: number, g: string) => string;
  price: (bits: string) => string;
  end: (s: string) => string;
}> = {
  en: {
    lead: (n, b, c) => `${n} by ${b} — ${c} in Malaysia.`,
    score: (s, g) => `MeowLah score ${s}/100 (Grade ${g}).`,
    price: (bits) => `Price ${bits}.`,
    end: (s) => `${s}.`,
  },
  bm: {
    lead: (n, b, c) => `${n} oleh ${b} — ${c} di Malaysia.`,
    score: (s, g) => `Skor MeowLah ${s}/100 (Gred ${g}).`,
    price: (bits) => `Harga ${bits}.`,
    end: (s) => `${s}.`,
  },
  zh: {
    lead: (n, b, c) => `${n}（${b}）— 马来西亚${c}。`,
    score: (s, g) => `MeowLah 评分 ${s}/100（${g} 级）。`,
    price: (bits) => `价格 ${bits}。`,
    end: (s) => `${s}。`,
  },
};

const MAX_TITLE = 60; // Google 桌面端大约在这个长度截断
const BRAND_SUFFIX = ' | MeowLah';

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

/** 放得下才加品牌后缀 —— 关键词比品牌名重要（我们现在还没有品牌认知度） */
function withBrand(core: string): string {
  return core.length + BRAND_SUFFIX.length <= MAX_TITLE ? core + BRAND_SUFFIX : core;
}

/**
 * 标题：整体（含品牌后缀）控制在 60 字符内。
 * 注意：这个函数返回的是【完整标题】，buildProductMetadata 用 title.absolute 输出，
 * 绕开 layout 的 '%s | MeowLah' 模板，否则会被二次追加而超长。
 *
 * 非英文版【必须】保留分类关键词（Makanan Kucing / 猫干粮）—— 那是排名的核心，
 * 宁可截断产品名，也不能把关键词挤掉。
 */
export function productTitle(p: Product, lang: Lang = 'en'): string {
  const name = displayName(p, lang);
  const price = p.price_myr != null ? `RM${p.price_myr.toFixed(2)}` : null;

  if (lang === 'en') {
    const parts = [name];
    if (p.grade) parts.push(`Grade ${p.grade}`);
    if (price) parts.push(price);
    return withBrand(clamp(parts.join(' — '), MAX_TITLE));
  }

  const cat = categoryWord(p.category, lang);
  const tail = price ? ` — ${cat} — ${price}` : ` — ${cat}`;
  const room = MAX_TITLE - tail.length;
  // 留至少 8 个字符给产品名，否则标题会失去辨识度
  const shortName = name.length > room ? clamp(name, Math.max(9, room)) : name;
  return withBrand(shortName + tail);
}

/** 描述：全部用真实数据拼，不写营销废话 */
export function productDescription(p: Product, lang: Lang = 'en'): string {
  const review = marketReview(p.id);
  const halal = halalPhrase(halalStatus(review), lang, review?.certifier);
  const name = displayName(p, lang);
  const cat = categoryWord(p.category, lang);

  const S = SENTENCE[lang];
  const sentences: string[] = [];
  sentences.push(S.lead(name, p.brand, cat));

  if (p.final_score != null && p.grade) {
    sentences.push(S.score(Math.round(p.final_score), p.grade));
  }

  const bits: string[] = [];
  if (p.price_myr != null) bits.push(`RM${p.price_myr.toFixed(2)}`);
  if (p.price_myr != null && p.weight_g) {
    bits.push(`RM${((p.price_myr / p.weight_g) * 100).toFixed(2)}/100g`);
  }
  if (bits.length) sentences.push(S.price(bits.join(' · ')));

  if (halal) sentences.push(S.end(halal));

  // 信任声明只在还有余量时加，避免被截成半句
  const core = sentences.join(' ');
  if (core.length + TRUST[lang].length + 1 <= 158) sentences.push(TRUST[lang]);

  // 按句子边界收尾，不做半个单词的硬切
  let out = sentences.join(' ');
  if (out.length > 158) {
    const kept: string[] = [];
    let len = 0;
    for (const s of sentences) {
      if (len + s.length + 1 > 158) break;
      kept.push(s);
      len += s.length + 1;
    }
    out = kept.length ? kept.join(' ') : sentences[0].slice(0, 155).trimEnd() + '…';
  }
  return out;
}

/** 完整的产品页 metadata（含 hreflang 互指） */
export function buildProductMetadata(p: Product, lang: Lang = 'en'): Metadata {
  const title = productTitle(p, lang);
  const description = productDescription(p, lang);
  const url = productUrl(p.id, lang);
  const image = p.image_url || undefined;
  const alt = productAlternates(p.id);

  return {
    // absolute：绕开 layout 的 '%s | MeowLah' 模板，品牌后缀已在 productTitle 里按长度决定
    title: { absolute: title },
    description,
    // canonical 指向当前语言自己的 URL；languages 提供三语互指
    alternates: { canonical: url, languages: alt.languages },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
      locale: OG_LOCALE[lang],
      ...(image ? { images: [{ url: image, alt: displayName(p, lang) }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/**
 * JSON-LD 结构化数据 —— 争取搜索结果里的富摘要。
 * 只输出我们真的有的字段，缺的就不写，避免被判定为误导性标记。
 */
export function buildProductJsonLd(p: Product, lang: Lang = 'en') {
  const review = marketReview(p.id);
  const status = halalStatus(review);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayName(p, lang),
    brand: { '@type': 'Brand', name: p.brand },
    category: categoryWord(p.category, lang),
    url: productUrl(p.id, lang),
    inLanguage: HREFLANG[lang],
  };

  if (p.image_url) data.image = p.image_url;
  if (p.weight_g) data.weight = { '@type': 'QuantitativeValue', value: p.weight_g, unitCode: 'GRM' };
  if (p.country_origin) data.countryOfOrigin = p.country_origin;

  if (p.price_myr != null) {
    data.offers = {
      '@type': 'Offer',
      price: p.price_myr.toFixed(2),
      priceCurrency: 'MYR',
      availability:
        review?.availability === 'out_of_stock_observed'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: productUrl(p.id, lang),
    };
  }

  if (p.final_score != null) {
    data.review = {
      '@type': 'Review',
      author: { '@type': 'Organization', name: SITE_NAME },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Math.round(p.final_score),
        bestRating: 100,
        worstRating: 0,
      },
    };
  }

  const props: { '@type': string; name: string; value: string }[] = [];
  // 只有真正核验过的证书才写进结构化数据
  if (status === 'verified' && review?.certifier) {
    props.push({ '@type': 'PropertyValue', name: 'Halal certification', value: review.certifier });
  }
  if (p.grade) props.push({ '@type': 'PropertyValue', name: 'MeowLah grade', value: p.grade });
  if (props.length) data.additionalProperty = props;

  return data;
}
