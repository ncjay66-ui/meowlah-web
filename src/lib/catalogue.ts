import library from '@/data/product-library.json';
import type { Product, ProductFilters } from './api';
import { malaysiaProducts, halalStatus, marketReview } from './malaysia';
import type { Lang } from './language';
import { merchantLink } from './shopping';

export const isCatSupply = (p: Product) => ['toys','litter','litter_box','scratchers','carrier'].includes(p.category);
const hasAffiliateOffer = (p: Product) => !!(merchantLink(p, 'shopee')?.affiliate || merchantLink(p, 'lazada')?.affiliate);
export const catalogueProducts: Product[] = [...malaysiaProducts, ...(library as Product[]).filter(p => !malaysiaProducts.some(m => m.id === p.id))]
  .filter((p,index,items)=>items.findIndex(other=>other.id===p.id)===index)
  .filter(p => !!p.image_url && hasAffiliateOffer(p) && marketReview(p.id)?.availability !== 'out_of_stock_observed');
export function selectCatalogue(filters: ProductFilters, query: string, halal: string, scope: string, lang: Lang) {
  const q = query.trim().toLowerCase();
  let items = catalogueProducts.filter(p => (!q || `${p.name_en} ${p.name_zh || ''} ${p.name_bm || ''} ${p.brand}`.toLowerCase().includes(q)) &&
    (!filters.category || p.category === filters.category) && (!filters.is_local_brand || p.is_local_brand) &&
    (!halal || (!isCatSupply(p) && halalStatus(marketReview(p.id)) === halal)) &&
    (filters.max_price == null || (p.price_myr != null && p.price_myr <= filters.max_price)));
  if (scope === 'recommended') items = items.filter(p => {
    const r = marketReview(p.id); if (!r) return false;
    return lang !== 'bm' || isCatSupply(p) || ['verified','brand_claim','pork_free_claim'].includes(halalStatus(r));
  });
  const priority = (p: Product) => isCatSupply(p) ? 3 : ({verified:0,brand_claim:1,pork_free_claim:2,expired_evidence:4,unverified:5})[halalStatus(marketReview(p.id))];
  if (lang === 'bm' && filters.sort_by === 'score_desc') items = [...items].sort((a,b)=>priority(a)-priority(b));
  if (filters.sort_by?.startsWith('price')) items = [...items].sort((a,b)=>a.price_myr==null ? b.price_myr==null?0:1 : b.price_myr==null?-1:(a.price_myr-b.price_myr)*(filters.sort_by==='price_asc'?1:-1));
  const size=filters.page_size||12, page=filters.page||1;
  return {items:items.slice((page-1)*size,page*size),total:items.length};
}
