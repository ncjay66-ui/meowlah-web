'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Product } from '@/lib/api';
import { useTrans } from '@/lib/language';

const CAT_EMOJI: Record<string, string> = {
  wet: '🐟', dry: '🌾', freeze_dried: '❄️', treat: '🍬', supplement: '💊',
};

function isPlaceholder(url: string | null | undefined) {
  if (!url) return true;
  return url.includes('placehold.co') || url.includes('via.placeholder');
}

interface Props { product: Product; rank?: number; }

export default function ProductCard({ product, rank }: Props) {
  const tr = useTrans();
  const [imgError, setImgError] = useState(false);
  const [resolvedImg, setResolvedImg] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  // Product names always stay in English
  const displayName = product.name_en;

  useEffect(() => {
    if (!isPlaceholder(product.image_url) || resolvedImg !== null) return;
    let alive = true;
    setFetching(true);
    const brand = encodeURIComponent(product.brand || '');
    const name  = encodeURIComponent(product.name_en || '');
    fetch(`/api/product-image?brand=${brand}&name=${name}`)
      .then(r => r.json())
      .then(d => { if (alive) { setResolvedImg(d.url || ''); setFetching(false); } })
      .catch(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, [product.id, product.brand, product.name_en, product.image_url]); // eslint-disable-line

  const src = (!isPlaceholder(product.image_url) && !imgError)
    ? product.image_url
    : (resolvedImg && !imgError ? resolvedImg : null);

  const top3 = rank && rank <= 3;
  const rankColors = [
    'bg-amber-400 text-white',   // 1
    'bg-gray-400 text-white',    // 2
    'bg-orange-600 text-white',  // 3
  ];

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div
        className="bg-white rounded-2xl overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      >
        {/* ── Image ── */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {src ? (
            <img
              src={src}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => { setImgError(true); setResolvedImg(null); }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {fetching
                ? <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
                : <span className="text-4xl opacity-20">{CAT_EMOJI[product.category] ?? '🐱'}</span>
              }
            </div>
          )}

          {/* Rank pill — top-left, only top 10 */}
          {rank && rank <= 10 && (
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                top3 ? rankColors[rank - 1] : 'bg-black/30 text-white'
              }`}
            >
              {rank}
            </span>
          )}

          {/* Halal dot — top-right */}
          {product.is_halal && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm" title="Halal" />
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-3 pt-2.5 pb-3">
          {/* Brand */}
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate mb-1">
            {product.brand}
          </p>

          {/* Product name */}
          <h3 className="text-[12.5px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2.5" style={{ minHeight: '2.8em' }}>
            {displayName}
          </h3>

          {/* Price + weight */}
          <div className="flex items-baseline justify-between gap-1">
            {product.price_myr ? (
              <span className="text-[14px] font-bold text-orange-500 leading-none">
                RM {Number(product.price_myr).toFixed(2)}
              </span>
            ) : (
              <span className="text-[12px] text-gray-300">—</span>
            )}
            {product.weight_g && (
              <span className="text-[10px] text-gray-400 shrink-0">{product.weight_g}g</span>
            )}
          </div>

          {/* Halal label + MY tag — only show if relevant */}
          {(product.is_halal || product.is_local_brand) && (
            <div className="flex gap-1.5 mt-2">
              {product.is_halal && (
                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{tr('tag.halal')}</span>
              )}
              {product.is_local_brand && (
                <span className="text-[9px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">{tr('tag.myBrand')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
