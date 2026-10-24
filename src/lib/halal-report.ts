import type { Product } from './api';
import { catalogueProducts, isCatSupply } from './catalogue';
import { malaysiaProducts, marketReview, halalStatus, type HalalStatus } from './malaysia';

/**
 * 清真证据审计 —— 全部从真实核查数据计算，不写死任何数字。
 *
 * ⚠️ 这个页面的全部价值在于准确。两条红线：
 *
 * 1. 「未核查」绝不等于「非清真」。
 *    目录里绝大多数产品我们根本没查过。把它们算进任何负面统计，
 *    等于对没调查过的品牌作指控 —— 在马来西亚的清真议题上，
 *    这既不诚实也有法律风险。页面必须把两者分开陈述。
 *
 * 2. 「无猪肉」不等于「清真」。
 *    清真认证涵盖屠宰方式、交叉污染、整条供应链。
 *    品牌自称无猪肉是有用信息，但不是认证。
 */

export interface HalalEntry {
  id: string;
  name: string;
  nameBm: string | null;
  nameZh: string | null;
  brand: string;
  status: HalalStatus;
  certifier: string | null;
  certificateNumber: string | null;
  expires: string | null;
  scope: string | null;
  source: string | null;
  checkedAt: string | null;
  variantRequired: boolean;
}

export interface HalalReport {
  /** 已实地核查的食品数 */
  checkedCount: number;
  /** 目录中尚未核查的食品数 */
  uncheckedCount: number;
  /** 目录食品总数 */
  catalogueCount: number;
  /** 最近一次核查日期 */
  lastCheckedAt: string | null;
  /** 按证据等级分组，已排序 */
  tiers: { status: HalalStatus; entries: HalalEntry[] }[];
  counts: Record<HalalStatus, number>;
}

/** 证据强度由高到低 —— 页面展示顺序 */
export const TIER_ORDER: HalalStatus[] = [
  'verified',
  'expired_evidence',
  'brand_claim',
  'pork_free_claim',
  'unverified',
];

function toEntry(p: Product): HalalEntry {
  const r = marketReview(p.id);
  return {
    id: p.id,
    name: p.name_en,
    nameBm: p.name_bm,
    nameZh: p.name_zh,
    brand: p.brand,
    status: halalStatus(r),
    certifier: r?.certifier ?? null,
    certificateNumber: r?.certificate_number ?? null,
    expires: r?.certificate_expires ?? null,
    scope: r?.certificate_scope ?? null,
    source: r?.halal_source ?? null,
    checkedAt: r?.checked_at ?? null,
    variantRequired: r?.variant_required ?? false,
  };
}

export function buildHalalReport(): HalalReport {
  // 只统计食品 —— 猫砂、玩具、猫包谈清真没有意义
  const checked = malaysiaProducts.filter((p) => !isCatSupply(p) && !!marketReview(p.id));
  const catalogue = catalogueProducts.filter((p) => !isCatSupply(p));

  const entries = checked.map(toEntry);

  const counts = TIER_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: entries.filter((e) => e.status === s).length }),
    {} as Record<HalalStatus, number>,
  );

  const tiers = TIER_ORDER.map((status) => ({
    status,
    entries: entries
      .filter((e) => e.status === status)
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)),
  })).filter((t) => t.entries.length > 0);

  const dates = entries.map((e) => e.checkedAt).filter(Boolean) as string[];

  return {
    checkedCount: entries.length,
    // 目录里减去已核查的，就是还没查的
    uncheckedCount: Math.max(0, catalogue.length - entries.length),
    catalogueCount: catalogue.length,
    lastCheckedAt: dates.length ? dates.sort().at(-1)! : null,
    tiers,
    counts,
  };
}
