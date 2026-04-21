'use client';
import { useEffect, useState, useCallback } from 'react';
import { getProducts, searchProducts, Product, Category, SortBy } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useTrans, useLang, getCategoryLabel } from '@/lib/language';

const CATEGORY_VALUES = ['', 'wet', 'dry', 'freeze_dried', 'treat', 'supplement'] as const;
const PAGE_SIZE = 20;
const GRADE_OPTIONS = ['', 'S', 'A', 'B', 'C', 'D', 'F'] as const;

const GRADE_CHIP: Record<string, string> = {
  S: 'bg-violet-500 text-white',
  A: 'bg-emerald-500 text-white',
  B: 'bg-lime-500 text-white',
  C: 'bg-yellow-400 text-white',
  D: 'bg-orange-500 text-white',
  F: 'bg-red-500 text-white',
};

const SORT_OPTIONS: { value: SortBy; icon: string }[] = [
  { value: 'score_desc', icon: '🏆' },
  { value: 'price_asc',  icon: '💰' },
  { value: 'value_asc',  icon: '🧬' },
];

// Skeleton card that matches the real ProductCard layout
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Image area */}
      <div className="relative aspect-square bg-gray-100">
        <div className="absolute bottom-2 right-2 w-6 h-4 bg-gray-200 rounded-full" />
      </div>
      {/* Info area */}
      <div className="px-3 pt-2.5 pb-3">
        <div className="h-2 bg-gray-100 rounded-full w-14 mb-1.5" />
        <div className="h-3 bg-gray-100 rounded-full w-full mb-1" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5 mb-3" />
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-100 rounded-full w-16" />
          <div className="h-2.5 bg-gray-100 rounded-full w-8" />
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full w-20 mt-1" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('');
  const [halalOnly, setHalalOnly] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [grade, setGrade]         = useState('');
  const [sortBy, setSortBy]       = useState<SortBy>('score_desc');
  const [page, setPage]           = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const tr = useTrans();
  const { lang } = useLang();

  const [search] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('q') ?? '';
    }
    return '';
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        page,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
        ...(category ? { category: category as Category } : {}),
        ...(halalOnly ? { is_halal: true } : {}),
        ...(localOnly ? { is_local_brand: true } : {}),
        ...(grade ? { grade } : {}),
      };
      const result = search
        ? await searchProducts(search, filters)
        : await getProducts(filters);
      setProducts(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [category, halalOnly, localOnly, grade, sortBy, page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset to page 1 whenever filters or sort changes
  const handleCategory = (val: string) => { setCategory(val); setPage(1); };
  const handleGrade    = (val: string) => { setGrade(val);    setPage(1); };
  const handleSort     = (val: SortBy) => { setSortBy(val);  setPage(1); };
  const handleHalal    = () => { setHalalOnly(h => !h); setPage(1); };
  const handleLocal    = () => { setLocalOnly(l => !l); setPage(1); };

  const toggleFilterPanel = () => setShowFilters(f => !f);

  // Count active non-sort filters for badge
  const activeFilterCount = (halalOnly ? 1 : 0) + (localOnly ? 1 : 0) + (grade ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto pb-24">

      {/* ── Category tabs — sticky under navbar ── */}
      <div className="bg-white sticky top-14 z-40" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 sm:px-6 py-3">
          {CATEGORY_VALUES.map((val) => (
            <button
              key={val}
              onClick={() => handleCategory(val)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium shrink-0 transition-all ${
                category === val
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {val === '' ? tr('cat.all') : getCategoryLabel(val, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6">

        {/* ── Filter / Sort toolbar ── */}
        <div className="flex items-center gap-2 py-3">

          {/* Halal toggle */}
          <button
            onClick={handleHalal}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${
              halalOnly ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            ☪️ {tr('filter.halalOnly')}
          </button>

          {/* Local brand toggle */}
          <button
            onClick={handleLocal}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${
              localOnly ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            🇲🇾 {lang === 'zh' ? '本地' : lang === 'bm' ? 'Tempatan' : 'Local'}
          </button>

          {/* Filter expand button — shows active count badge */}
          <button
            onClick={toggleFilterPanel}
            className={`relative flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all shrink-0 ${
              showFilters || grade
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            ⚙️ {tr('filter.grade')}{grade ? ` · ${grade}` : ''}
          </button>

          {/* Sort quick-pick */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSort(opt.value)}
                title={tr(`sort.${opt.value}` as Parameters<typeof tr>[0])}
                className={`w-8 h-8 rounded-full text-[14px] flex items-center justify-center transition-all ${
                  sortBy === opt.value ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-[12px] text-gray-400 shrink-0">
            {total} {tr('filter.products')}
          </span>
        </div>

        {/* ── Desktop inline filter panel ── */}
        {showFilters && (
          <div className="hidden sm:block bg-gray-50 rounded-2xl p-4 mb-3 space-y-3">
            {/* Grade chips */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {tr('filter.grade')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {GRADE_OPTIONS.map(g => (
                  <button
                    key={g}
                    onClick={() => handleGrade(g)}
                    className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all ${
                      grade === g
                        ? g === '' ? 'bg-gray-700 text-white' : GRADE_CHIP[g]
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {g === '' ? tr('filter.allGrades') : g}
                  </button>
                ))}
              </div>
            </div>
            {/* Sort full list */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {tr('sort.label')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(['score_desc', 'score_asc', 'price_asc', 'price_desc', 'value_asc'] as SortBy[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => { handleSort(opt); setShowFilters(false); }}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      sortBy === opt
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tr(`sort.${opt}` as Parameters<typeof tr>[0])}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile bottom sheet filter panel ── */}
        {showFilters && (
          <>
            {/* Backdrop */}
            <div
              className="sm:hidden fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowFilters(false)}
            />
            {/* Sheet — sits above BottomNav (h-14) */}
            <div className="sm:hidden fixed bottom-14 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl">
              <div className="px-4 pt-3 pb-6">
                {/* Drag handle */}
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

                {/* Grade */}
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {tr('filter.grade')}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {GRADE_OPTIONS.map(g => (
                    <button
                      key={g}
                      onClick={() => handleGrade(g)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                        grade === g
                          ? g === '' ? 'bg-gray-700 text-white' : GRADE_CHIP[g]
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {g === '' ? tr('filter.allGrades') : g}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {tr('sort.label')}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(['score_desc', 'score_asc', 'price_asc', 'price_desc', 'value_asc'] as SortBy[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => { handleSort(opt); setShowFilters(false); }}
                      className={`px-3 py-2 rounded-full text-[13px] font-medium transition-all ${
                        sortBy === opt
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tr(`sort.${opt}` as Parameters<typeof tr>[0])}
                    </button>
                  ))}
                </div>

                {/* Done */}
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 bg-orange-500 text-white rounded-full text-[14px] font-semibold"
                >
                  {tr('filter.done')}
                  {activeFilterCount > 0 && (
                    <span className="ml-1.5 bg-white/30 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Search label */}
        {search && (
          <p className="text-[13px] text-gray-400 mb-3">
            &ldquo;<span className="text-gray-700 font-medium">{search}</span>&rdquo;
          </p>
        )}

        {/* ── Section heading ── */}
        <h2 className="text-[15px] font-bold text-gray-900 mb-3">
          {search ? tr('home.searchResults') : tr('home.topPicks')}
        </h2>

        {/* ── Product grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <span className="text-5xl">🐱</span>
            <p className="text-[15px] font-semibold text-gray-700">{tr('home.noProducts')}</p>
            <p className="text-[13px] text-gray-400">{tr('home.tryFilter')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} rank={(page - 1) * PAGE_SIZE + i + 1} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">

            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-[13px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            >
              ← {tr('page.prev')}
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number | null;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (i === 0) {
                  pageNum = 1;
                } else if (i === 6) {
                  pageNum = totalPages;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                const isEllipsis = totalPages > 7 && (
                  (i === 1 && pageNum! > 2) || (i === 5 && pageNum! < totalPages - 1)
                );
                if (isEllipsis) {
                  return <span key={i} className="w-8 text-center text-[13px] text-gray-400">…</span>;
                }
                return (
                  <button
                    key={i}
                    onClick={() => setPage(pageNum!)}
                    className={`w-8 h-8 rounded-full text-[13px] font-semibold transition-all ${
                      page === pageNum
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-[13px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            >
              {tr('page.next')} →
            </button>
          </div>
        )}

        {/* Page X of Y label */}
        {!loading && totalPages > 1 && (
          <p className="text-[11px] text-gray-400 text-center mt-2 mb-4">
            {lang === 'zh'
              ? `第 ${page} 页，共 ${totalPages} 页`
              : lang === 'bm'
              ? `Halaman ${page} ${tr('page.of')} ${totalPages}`
              : `Page ${page} of ${totalPages}`}
          </p>
        )}

      </div>
    </div>
  );
}
