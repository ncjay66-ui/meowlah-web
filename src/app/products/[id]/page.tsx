import { getProduct } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductDetailView from '@/components/ProductDetailView';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product;
  try { product = await getProduct(id); } catch { notFound(); }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-28">

      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        Back
      </Link>

      <ProductDetailView product={product} />
    </div>
  );
}
