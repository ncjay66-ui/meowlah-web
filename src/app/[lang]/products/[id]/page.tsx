import { cache } from 'react';
import type { Metadata } from 'next';
import { getProduct, ApiNotFoundError } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { malaysiaProducts } from '@/lib/malaysia';
import { catalogueProducts, isCatSupply } from '@/lib/catalogue';
// ⚠️ 从纯模块 locale 导入，不要从 language.tsx（'use client'）
import { PREFIX_TO_LANG, type Lang } from '@/lib/locale';
import CatSupplyDetail from '@/components/CatSupplyDetail';
import ProductDetailView from '@/components/ProductDetailView';
import BackButton from '@/components/BackButton';
import { buildProductMetadata, buildProductJsonLd } from '@/lib/seo';

/**
 * 错误页文案就地定义。
 * 不用 language.tsx 的 t()：那是 client 模块的函数，服务端调用会拿到代理。
 */
const ERR: Record<Lang, { title: string; body: string; retry: string; back: string }> = {
  en: {
    title: 'Service temporarily unavailable',
    body: 'Our scoring engine is warming up. Please try again in a moment.',
    retry: 'Try again',
    back: 'Back to all products',
  },
  bm: {
    title: 'Perkhidmatan tidak tersedia buat sementara',
    body: 'Enjin pemarkahan kami sedang dimulakan. Sila cuba sebentar lagi.',
    retry: 'Cuba lagi',
    back: 'Kembali ke semua produk',
  },
  zh: {
    title: '服务暂时不可用',
    body: '评分服务正在启动，请稍后重试。',
    retry: '重试',
    back: '返回全部产品',
  },
};

/**
 * 与 /products/[id] 完全相同的数据加载逻辑，只是外面套了语言。
 * React cache() 让 generateMetadata 与页面组件共用一次加载。
 */
const loadProduct = cache(async (id: string) => {
  const summary = catalogueProducts.find((p) => p.id === id);
  let product =
    malaysiaProducts.find((p) => p.id === id) ??
    (await getProduct(id).catch((err) => {
      if (!summary || err instanceof ApiNotFoundError) throw err;
      return { ...summary, nutrition: null, score: null, prices: [], halal_cert_no: null };
    }));
  if (summary) product = { ...product, ...summary };
  return product;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const internal = PREFIX_TO_LANG[lang];
  if (!internal) return { title: 'Not found', robots: { index: false, follow: false } };

  try {
    const product = await loadProduct(id);
    return buildProductMetadata(product, internal);
  } catch {
    return { title: 'Product not found', robots: { index: false, follow: true } };
  }
}

export default async function LocalisedProductPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const internal = PREFIX_TO_LANG[lang];
  if (!internal) notFound();

  let product;
  try {
    product = await loadProduct(id);
  } catch (err) {
    if (err instanceof ApiNotFoundError) notFound();
    const e = ERR[internal];
    return (
      <div className="shop-detail max-w-3xl mx-auto px-4 py-5 pb-28">
        <BackButton />
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="text-5xl">🐾</span>
          <h1 className="text-[18px] font-bold text-gray-800">{e.title}</h1>
          <p className="text-[14px] text-gray-500 max-w-xs">{e.body}</p>
          <Link
            href={`/${lang}/products/${id}`}
            className="mt-2 px-6 py-2.5 bg-orange-500 text-white rounded-full text-[14px] font-semibold hover:bg-orange-600 transition-colors"
          >
            {e.retry}
          </Link>
          <Link
            href={`/${lang}/products`}
            className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← {e.back}
          </Link>
        </div>
      </div>
    );
  }

  const jsonLd = buildProductJsonLd(product, internal);

  return (
    <div className="shop-detail max-w-3xl mx-auto px-4 py-5 pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton />
      {isCatSupply(product) ? <CatSupplyDetail product={product} /> : <ProductDetailView product={product} />}
    </div>
  );
}
