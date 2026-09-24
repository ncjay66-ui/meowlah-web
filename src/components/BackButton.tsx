'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/lib/language';
import { words } from '@/lib/shopping';

export default function BackButton() {
  return <Suspense fallback={<Link href="/products">← MeowLah</Link>}><CatalogueBackLink /></Suspense>;
}
function CatalogueBackLink() {
  const params = useSearchParams();
  const { lang } = useLang();
  const from = params.get('from') || '';
  const safeFrom = /^(\/products|\/)(\?[^#]*)?$/.test(from) && !from.includes('\\') ? from : '/products';
  return (
    <Link
      href={safeFrom}
      className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 mb-5 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
      </svg>
      {words(lang, 'Back to products', '返回商品列表', 'Kembali ke makanan')}
    </Link>
  );
}
