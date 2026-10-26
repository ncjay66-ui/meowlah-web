import Link from 'next/link';
import ProductCatalogue from '@/components/ProductCatalogue';

/**
 * ⚠️ ProductCatalogue 是客户端组件，而且用了 useSearchParams()，
 * 所以 Next.js 会把它整个 Suspense 边界推迟到客户端渲染 ——
 * 它的内容【不会】出现在服务端 HTML 里，Google 看不到。
 *
 * 因此下面这段服务端渲染的导言是这一页唯一能被搜索引擎读到的内容，
 * 同时也是 /halal 的一条高权重内链。不要删。
 */
export default function ProductsPage() {
  return (
    <>
      <section className="shop-seo-intro">
        <h1>Cat Food in Malaysia — Independent Scores, Prices and Halal Evidence</h1>
        <p>
          We score cat food sold in Malaysia on nutrition, show the real price per 100g, and
          record what halal evidence we were actually able to verify. Ratings are never paid for.
        </p>
        <p>
          <Link href="/halal">
            Halal evidence: what we checked, and why JAKIM does not certify pet food →
          </Link>
        </p>
      </section>
      <ProductCatalogue />
    </>
  );
}
