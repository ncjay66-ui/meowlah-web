import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductCatalogue from '@/components/ProductCatalogue';
import { PREFIX_TO_LANG, PREFIXED_PARAMS, HREFLANG, OG_LOCALE, type Lang } from '@/lib/locale';
import { SITE } from '@/lib/seo';

/** 列表页文案 —— 这是最该吃下 "makanan kucing terbaik" 这类词的一页 */
const LISTING: Record<Lang, { title: string; description: string }> = {
  en: {
    title: 'Cat Food Malaysia — Independent Scores, Prices & Halal Evidence',
    description:
      'Compare 600+ cat foods sold in Malaysia by independent nutrition score, price per 100g and halal evidence. Ratings are never paid for.',
  },
  bm: {
    title: 'Makanan Kucing Malaysia — Skor, Harga & Bukti Halal',
    description:
      'Bandingkan 600+ makanan kucing di Malaysia ikut skor pemakanan bebas, harga per 100g dan bukti halal. Skor kami tidak pernah dibayar.',
  },
  zh: {
    title: '马来西亚猫粮榜 — 独立评分、价格与清真证据',
    description:
      '按独立营养评分、每 100 克价格和清真证据，比较马来西亚在售的 600+ 款猫粮。评分从不接受付费。',
  },
};

export function generateStaticParams() {
  return PREFIXED_PARAMS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const internal = PREFIX_TO_LANG[lang];
  if (!internal) return { title: 'Not found', robots: { index: false, follow: false } };

  const copy = LISTING[internal];
  const url = `${SITE}/${lang}/products`;

  return {
    // absolute：这些标题已经到长度上限，不能再被 layout 模板追加 ' | MeowLah'
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: url,
      languages: {
        [HREFLANG.en]: `${SITE}/products`,
        [HREFLANG.bm]: `${SITE}/ms/products`,
        [HREFLANG.zh]: `${SITE}/zh/products`,
        'x-default': `${SITE}/products`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'MeowLah',
      url,
      title: copy.title,
      description: copy.description,
      locale: OG_LOCALE[internal],
    },
  };
}

export default async function LocalisedProductsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!PREFIX_TO_LANG[lang]) notFound();
  // 语言由 [lang]/layout.tsx 的 LanguageProvider forcedLang 注入
  return <ProductCatalogue />;
}
