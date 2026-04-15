'use client';
import { useEffect, useState } from 'react';
import { useLang, getCategoryLabel } from '@/lib/language';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://meowlah-production.up.railway.app';

const GRADE_STYLE: Record<string, string> = {
  S: 'bg-violet-500', A: 'bg-emerald-500', B: 'bg-lime-500',
  C: 'bg-yellow-400', D: 'bg-orange-500', F: 'bg-red-500',
};

const CATEGORY_META: Record<string, { emoji: string; color: string; bg: string }> = {
  wet:          { emoji: '🥫', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'   },
  dry:          { emoji: '🌾', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-100' },
  freeze_dried: { emoji: '❄️', color: 'text-cyan-600',   bg: 'bg-cyan-50 border-cyan-100'   },
  treat:        { emoji: '🍬', color: 'text-pink-600',   bg: 'bg-pink-50 border-pink-100'   },
  supplement:   { emoji: '💊', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
};

interface TopProduct {
  id: string; name_en: string; brand: string;
  grade: string | null; final_score: number | null; image_url: string | null;
}

interface CategoryData {
  category: string;
  total: number;
  top: TopProduct | null;
}

export default function CategoriesPage() {
  const { lang } = useLang();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (en: string, zh: string, bm: string) =>
    lang === 'zh' ? zh : lang === 'bm' ? bm : en;

  useEffect(() => {
    const cats = ['wet', 'dry', 'freeze_dried', 'treat', 'supplement'];
    Promise.all(
      cats.map(cat =>
        Promise.all([
          fetch(`${API}/products?page_size=1&category=${cat}`).then(r => r.json()),
          fetch(`${API}/products?page_size=1&category=${cat}&sort_by=score_desc`).then(r => r.json()),
        ]).then(([all, top]) => ({
          category: cat,
          total: all.total ?? 0,
          top: top.items?.[0] ?? null,
        }))
      )
    ).then(data => {
      setCategories(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {tr('Categories', '分类', 'Kategori')}
          </h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-32" />
                  <div className="h-3 bg-gray-100 rounded-full w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {tr('Categories', '分类', 'Kategori')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {tr('Browse by food type', '按食物类型浏览', 'Semak mengikut jenis makanan')}
        </p>
      </div>

      {/* Category Cards */}
      <div className="space-y-3">
        {categories.map(({ category, total, top }) => {
          const meta = CATEGORY_META[category] ?? { emoji: '🐱', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100' };
          const label = getCategoryLabel(category, lang);

          return (
            <Link
              key={category}
              href={`/?category=${category}`}
              className={`block rounded-2xl border p-5 transition-all hover:shadow-md ${meta.bg}`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl flex-shrink-0">
                  {meta.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg font-bold ${meta.color}`}>{label}</h2>
                  <p className="text-sm text-gray-500">
                    {total} {tr('products', '件产品', 'produk')}
                  </p>

                  {/* Top product */}
                  {top && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {tr('Top:', '榜首：', 'Teratas:')} {top.name_en}
                    </p>
                  )}
                </div>

                {/* Top grade badge */}
                {top?.grade && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${GRADE_STYLE[top.grade] ?? 'bg-gray-400'}`}>
                      {top.grade}
                    </div>
                    <span className="text-[10px] text-gray-400">{tr('Best', '最佳', 'Terbaik')}</span>
                  </div>
                )}

                {/* Arrow */}
                <span className="text-gray-300 text-xl flex-shrink-0">›</span>
              </div>

              {/* Top product image strip (optional) */}
              {top?.image_url && (
                <div className="mt-3 flex items-center gap-2">
                  <img
                    src={top.image_url}
                    alt={top.name_en}
                    className="w-8 h-8 rounded-lg object-cover border border-white shadow-sm"
                  />
                  <span className="text-xs text-gray-400 truncate">{top.brand}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Quick compare CTA */}
      <div className="mt-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <span className="text-3xl">⚖️</span>
          <div>
            <h2 className="font-semibold">
              {tr('Compare Products', '比较产品', 'Bandingkan Produk')}
            </h2>
            <p className="text-sm text-white/80 mt-0.5">
              {tr('Use filters on the home page to compare categories side by side',
                '在首页使用筛选功能横向比较各类产品',
                'Guna penapis di halaman utama untuk bandingkan kategori')}
            </p>
          </div>
          <Link href="/" className="ml-auto text-2xl flex-shrink-0">→</Link>
        </div>
      </div>
    </div>
  );
}
