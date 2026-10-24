import { cache } from 'react';
import type { Metadata } from 'next';
import { getProduct, ApiNotFoundError } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { malaysiaProducts } from '@/lib/malaysia';
import { catalogueProducts, isCatSupply } from '@/lib/catalogue';
import CatSupplyDetail from '@/components/CatSupplyDetail';
import ProductDetailView from '@/components/ProductDetailView';
import BackButton from '@/components/BackButton';
import { buildProductMetadata, buildProductJsonLd } from '@/lib/seo';

/**
 * 产品加载逻辑抽出来 + 用 React cache() 包住。
 * 这样 generateMetadata 和页面组件在同一次请求里共用结果，不会重复打 API。
 * 合并逻辑与原先完全一致，没有改动行为。
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
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await loadProduct(id);
    return buildProductMetadata(product);
  } catch {
    // 产品不存在或后端挂了 —— 不要让这一页被索引
    return {
      title: 'Product not found',
      robots: { index: false, follow: true },
    };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product;
  try {
    product = await loadProduct(id);
  } catch (err) {
    if (err instanceof ApiNotFoundError) {
      // Product genuinely doesn't exist → true 404
      notFound();
    }
    // Backend is down / timeout / server error → friendly error page
    return (
      <div className="shop-detail max-w-3xl mx-auto px-4 py-5 pb-28">
        <BackButton />
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="text-5xl">🐾</span>
          <h1 className="text-[18px] font-bold text-gray-800">Service temporarily unavailable</h1>
          <p className="text-[14px] text-gray-500 max-w-xs">
            Our scoring engine is warming up. Please try again in a moment.
          </p>
          <Link
            href={`/products/${id}`}
            className="mt-2 px-6 py-2.5 bg-orange-500 text-white rounded-full text-[14px] font-semibold hover:bg-orange-600 transition-colors"
          >
            Try again
          </Link>
          <Link href="/products" className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to all products
          </Link>
        </div>
      </div>
    );
  }

  const jsonLd = buildProductJsonLd(product);

  return (
    <div className="shop-detail max-w-3xl mx-auto px-4 py-5 pb-28">
      {/* 结构化数据：帮助搜索结果展示价格/评分富摘要 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton />
      {isCatSupply(product) ? <CatSupplyDetail product={product} /> : <ProductDetailView product={product} />}
    </div>
  );
}
