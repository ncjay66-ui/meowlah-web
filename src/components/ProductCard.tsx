'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Product } from '@/lib/api';
import { useTrans } from '@/lib/language';

const CAT_EMOJI: Record<string, string> = {
  wet: '🐟', dry: '🌾', freeze_dried: '❄️', treat: '🍬', supplement: '💊',
};

// Grade badge colours — consistent with page.tsx GRADE_CHIP
const GRADE_BG: Record<string, string> = {
  S: '#7c3aed',  // violet-600
  A: '#10b981',  // emerald-500
  B: '#84cc16',  // lime-500
  C: '#eab308',  // yellow-500
  D: '#f97316',  // orange-500
  F: '#ef4444',  // red-500
};

function isPlaceholder(url: string | null | undefined) {
  if (!url) return true;
  return url.includes('placehold.co') || url.includes('via.placeholder');
}

interface Props { product: Product; rank?: number; }

export default function ProductCard({ product, rank }: Props) {
  const tr = useTrans();
  const [imgError, setImgError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [resolvedImg, setResolvedImg] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  // Product names always stay in English
  const displayName = product.name_en;

  useEffect(() => {
    // Fetch DDG fallback only after proxy also fails OR image_url is placeholder/null
    if (resolvedImg !== null) return;
    if (!isPlaceholder(product.image_url) && !imgError) return;
    if (!isPlaceholder(product.image_url) && imgError && !useProxy) return; // proxy attempt pending
    let alive = true;
    setFetching(true);
    const brand = encodeURIComponent(product.brand || '');
    const name  = encodeURIComponent(product.name_en || '');
    fetch(`/api/product-image?brand=${brand}&name=${name}`)
      .then(r => r.json())
      .then(d => { if (alive) { setResolvedImg(d.url || ''); setFetching(false); } })
      .catch(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, [product.id, product.brand, product.name_en, product.image_url, imgError, useProxy]); // eslint-disable-line

  // Build the src to display:
  // 1. Primary image_url (direct)
  // 2. Primary image_url via proxy (if direct failed)
  // 3. DDG resolved image (if proxy also failed or image was placeholder)
  const primaryUrl = !isPlaceholder(product.image_url) ? product.image_url : null;
  const proxyUrl = primaryUrl ? `/api/proxy-image?url=${encodeURIComponent(primaryUrl)}` : null;

  const src = primaryUrl && !imgError
    ? primaryUrl
    : useProxy && proxyUrl && !imgError
    ? proxyUrl
    : (resolvedImg || null);

  const top3 = rank && rank <= 3;
  const rankColors = [
    'bg-amber-400 text-white',   // 1
    'bg-gray-400 text-white',    // 2
    'bg-orange-600 text-white',  // 3
  ];

  const gradeBg = product.grade ? GRADE_BG[product.grade] : null;

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
              onError={() => {
                if (!useProxy && primaryUrl && !src?.includes('/api/proxy-image')) {
                  // Step 1: direct load failed → try via proxy
                  setUseProxy(true);
                } else {
                  // Step 2: proxy also failed → fall through to DDG search
                  setImgError(true);
                  setResolvedImg(null);
                }
              }}
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

          {/* Grade badge — bottom-right */}
          {gradeBg && (
            <span
              className="absolute bottom-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full leading-none text-white shadow-sm"
              style={{ backgroundColor: gradeBg }}
            >
              {product.grade}
            </span>
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

          {/* Cost per 100g — value density indicator */}
          {product.price_myr && product.weight_g ? (
            <p className="text-[10px] text-gray-400 mt-0.5">
              RM {((Number(product.price_myr) / product.weight_g) * 100).toFixed(2)}/100g
            </p>
          ) : (
            <p className="text-[10px] text-transparent mt-0.5">—</p>
          )}

          {/* Halal label + MY tag */}
          {(product.is_halal || product.is_local_brand) && (
            <div className="flex gap-1.5 mt-1.5">
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
