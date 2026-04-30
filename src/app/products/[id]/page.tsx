import { getProduct, ApiNotFoundError, ApiUnavailableError } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductDetailView from '@/components/ProductDetailView';

const BackLink = () => (
  <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 mb-5 transition-colors">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
    </svg>
    Back
  </Link>
);

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch (err) {
    if (err instanceof ApiNotFoundError) {
      // Product genuinely doesn't exist → true 404
      notFound();
    }
    // Backend is down / timeout / server error → friendly error page
    return (
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28">
        <BackLink />
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
          <Link href="/" className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to all products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-28">
      <BackLink />
      <ProductDetailView product={product} />
    </div>
  );
}
