const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://meowlah-production.up.railway.app';

export type Category = 'wet' | 'dry' | 'freeze_dried' | 'treat' | 'supplement';

export interface Product {
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

export interface ProductListResponse { total: number; page: number; page_size: number; items: Product[]; }

export type SortBy = 'score_desc' | 'score_asc' | 'price_asc' | 'price_desc' | 'value_asc';

export interface ProductFilters {
  page?: number; page_size?: number; category?: Category;
  is_halal?: boolean; is_local_brand?: boolean; brand?: string;
  min_price?: number; max_price?: number;
  grade?: string;           // e.g. "A", "B", "S"
  sort_by?: SortBy;         // v2.1: sort order
}

export async function getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams({ active_only: 'true' });
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  const res = await fetch(`${API_URL}/products?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function searchProducts(query: string, filters: ProductFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams({ q: query, active_only: 'true' });
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  const res = await fetch(`${API_URL}/products/search?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to search products');
  return res.json();
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const res = await fetch(`${API_URL}/products/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export const CATEGORY_LABELS: Record<Category, string> = {
  wet: 'Wet', dry: 'Dry', freeze_dried: 'Freeze-Dried', treat: 'Treat', supplement: 'Supplement',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  wet: 'bg-blue-100 text-blue-700', dry: 'bg-amber-100 text-amber-700',
  freeze_dried: 'bg-purple-100 text-purple-700', treat: 'bg-pink-100 text-pink-700', supplement: 'bg-green-100 text-green-700',
};

export const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500', B: 'bg-lime-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500',
};
