const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://meowlah-production.up.railway.app';

export type Category = 'wet' | 'dry' | 'freeze_dried' | 'treat' | 'supplement' | 'toys' | 'litter' | 'litter_box' | 'scratchers';

export interface Product {
  species?: 'cat'; specification?: string;
  id: string; name_en: string; name_zh: string | null; name_bm: string | null;
  brand: string; category: Category; weight_g: number | null;
  is_halal: boolean; is_local_brand: boolean; country_origin: string | null;
  image_url: string | null; shopee_url: string | null; lazada_url: string | null;
  affiliate_shopee: string | null; affiliate_lazada: string | null;
  grade: string | null; final_score: number | null; price_myr: number | null; price_per_protein_g: number | null;
  // v2.1 双轨评价
  food_purpose: 'complete' | 'complementary' | null;
  is_prescription: boolean | null;
}

export interface ProductNutritionDetail {
  protein_pct: number; fat_pct: number; moisture_pct: number;
  ash_pct: number; fiber_pct: number;
  calcium_pct: number | null; phosphorus_pct: number | null;
  taurine_mg: number | null; carb_pct_calc: number | null;
  ingredients_raw: string | null; flagged_ingredients: string[] | null;
  verified: boolean; source: string | null;
}

export interface ProductScoreDetail {
  final_score: number; grade: string; raw_score: number;
  grade_cap: string | null; grade_cap_reason: string | null;
  dimension_scores: Record<string, number>;
  deductions: Record<string, number> | null;
  vfm_index: number | null; computed_at: string;
  // v2.1 双轨评价附加字段（complementary 专属）
  food_purpose: 'complete' | 'complementary' | null;
  hydration_score: number | null;
  complementary_label: string | null;
}

export interface ProductPriceDetail {
  platform: string; price_myr: number;
  price_per_100g: number | null; price_per_protein_g: number | null;
  in_stock: boolean; discount_pct: number | null;
  promo_label: string | null; scraped_at: string;
}

export interface ProductDetail extends Product {
  halal_cert_no: string | null;
  nutrition: ProductNutritionDetail | null;
  score: ProductScoreDetail | null;
  prices: ProductPriceDetail[];
}

export interface ProductListResponse { total: number; page: number; page_size: number; items: Product[]; searchLimited?: boolean; }

export type SortBy = 'score_desc' | 'score_asc' | 'price_asc' | 'price_desc' | 'value_asc';

export interface ProductFilters {
  page?: number; page_size?: number; category?: Category;
  is_halal?: boolean; is_local_brand?: boolean; brand?: string;
  min_price?: number; max_price?: number;
  grade?: string;           // e.g. "A", "B", "S"
  sort_by?: SortBy;         // v2.1: sort order
}

export async function getProducts(filters: ProductFilters = {}, signal?: AbortSignal): Promise<ProductListResponse> {
  const params = new URLSearchParams({ active_only: 'true' });
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  const res = await fetch(`${API_URL}/products?${params}`, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function searchProducts(query: string, filters: ProductFilters = {}, signal?: AbortSignal): Promise<ProductListResponse> {
  const params = new URLSearchParams({ q: query, active_only: 'true' });
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  const res = await fetch(`${API_URL}/products/search?${params}`, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('Failed to search products');
  const data = await res.json();
  if (Number.isFinite(data.total) && Number.isFinite(data.page)) return data;
  // Legacy API returns at most 30 matches without filtering or pagination.
  const items: Product[] = (data.items || []).filter((p: Product) =>
    (!filters.category || p.category === filters.category) &&
    (!filters.is_local_brand || p.is_local_brand) && (!filters.is_halal || p.is_halal) &&
    (!filters.grade || p.grade === filters.grade) &&
    (!filters.max_price || (p.price_myr != null && Number(p.price_myr) <= filters.max_price)));
  const field = filters.sort_by?.startsWith('price') ? 'price_myr' : filters.sort_by === 'value_asc' ? 'price_per_protein_g' : 'final_score';
  const ascending = filters.sort_by?.endsWith('asc');
  items.sort((a, b) => a[field] == null ? b[field] == null ? 0 : 1 : b[field] == null ? -1 : (Number(a[field]) - Number(b[field])) * (ascending ? 1 : -1));
  const page = filters.page || 1, size = filters.page_size || 20;
  return { total: items.length, page, page_size: size, items: items.slice((page - 1) * size, page * size), searchLimited: true };
}

export class ApiNotFoundError extends Error { constructor() { super('not_found'); } }
export class ApiUnavailableError extends Error { constructor() { super('unavailable'); } }

export async function getProduct(id: string): Promise<ProductDetail> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/products/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ApiUnavailableError();
  }
  if (res.status === 404) throw new ApiNotFoundError();
  if (!res.ok) throw new ApiUnavailableError();
  const detail: ProductDetail = await res.json();
  // The legacy detail response omits summary fields used by the catalogue.
  // Merge only an exact ID match, never a similarly named flavour or pack.
  if (detail.price_myr === undefined || detail.food_purpose === undefined) {
    try {
      const summaryResponse = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(detail.name_en)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const summary = (summaryData.items as Product[] | undefined)?.find(item => item.id === id);
        if (summary) return { ...summary, ...detail, price_myr: detail.price_myr ?? summary.price_myr, food_purpose: detail.food_purpose ?? summary.food_purpose, is_prescription: detail.is_prescription ?? summary.is_prescription };
      }
    } catch { /* Recorded detail data remains usable if summary lookup is unavailable. */ }
  }
  return detail;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  toys: 'Cat Toys', litter: 'Cat Litter', litter_box: 'Litter Boxes', scratchers: 'Scratchers',
  wet: 'Wet', dry: 'Dry', freeze_dried: 'Freeze-Dried', treat: 'Treat', supplement: 'Supplement',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  toys: 'bg-orange-100 text-orange-700', litter: 'bg-green-100 text-green-700', litter_box: 'bg-blue-100 text-blue-700', scratchers: 'bg-amber-100 text-amber-700',
  wet: 'bg-blue-100 text-blue-700', dry: 'bg-amber-100 text-amber-700',
  freeze_dried: 'bg-purple-100 text-purple-700', treat: 'bg-pink-100 text-pink-700', supplement: 'bg-green-100 text-green-700',
};

export const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500', B: 'bg-lime-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500',
};
