'use client';
import { useState, useEffect, useRef } from 'react';
import BuyingOptions from './BuyingOptions';
import MarketEvidence from './MarketEvidence';
import ShoppingImage from './ShoppingImage';
import { referencePrice, purpose, words } from '@/lib/shopping';
import { ProductDetail, CATEGORY_COLORS } from '@/lib/api';
import { isCatSupply } from '@/lib/catalogue';
import { useLang, useTrans, getCategoryLabel, getDimLabel, Lang } from '@/lib/language';

const CAT_EMOJI: Record<string, string> = {
  wet: '🐟', dry: '🌾', freeze_dried: '❄️', treat: '🍬', supplement: '💊',
};

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  S: { bg: 'bg-violet-500',  text: 'text-white', label: '极品 Outstanding' },
  A: { bg: 'bg-emerald-500', text: 'text-white', label: '优秀 Excellent' },
  B: { bg: 'bg-lime-500',    text: 'text-white', label: '良好 Good' },
  C: { bg: 'bg-yellow-400',  text: 'text-white', label: '一般 Average' },
  D: { bg: 'bg-orange-500',  text: 'text-white', label: '偏低 Below Avg' },
  F: { bg: 'bg-red-500',     text: 'text-white', label: '差 Poor' },
};

// Good animal protein ingredients to highlight green
const GOOD_PROTEINS = [
  'tuna', 'salmon', 'chicken', 'turkey', 'beef', 'duck', 'lamb',
  'mackerel', 'sardine', 'herring', 'cod', 'shrimp', 'clam', 'oyster',
  'crab', 'anchovy', 'fish meal', 'pork', 'liver', 'deboned', 'boneless',
  'squid', 'octopus', 'scallop', 'prawn', 'tilapia', 'snapper', 'seabass',
  'catfish', 'meat',
];

function PawIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-7 transition-all duration-200"
      fill={filled ? '#F97316' : '#E5E7EB'}>
      <ellipse cx="50" cy="64" rx="24" ry="20" />
      <ellipse cx="20" cy="40" rx="10" ry="13" />
      <ellipse cx="39" cy="28" rx="10" ry="13" />
      <ellipse cx="61" cy="28" rx="10" ry="13" />
      <ellipse cx="80" cy="40" rx="10" ry="13" />
    </svg>
  );
}

function scoreToPaws(score: number) {
  if (score >= 80) return 5;
  if (score >= 65) return 4;
  if (score >= 50) return 3;
  if (score >= 35) return 2;
  return 1;
}

// ── Qualitative hints ───────────────────────────────────────────────────────

interface Hint { label: string; color: string; bg: string }

function proteinHint(pct: number, isWet: boolean, lang: Lang): Hint | null {
  // Thresholds on as-fed basis
  const thresholds = isWet
    ? [{ min: 0, max: 5,  label: { en: 'Low',     zh: '偏低', bm: 'Rendah'  }, color: 'text-red-500',    bg: 'bg-red-50'    },
       { min: 5, max: 9,  label: { en: 'Average',  zh: '一般', bm: 'Sedang'  }, color: 'text-amber-500',  bg: 'bg-amber-50'  },
       { min: 9, max: 14, label: { en: 'Good',     zh: '良好', bm: 'Baik'    }, color: 'text-lime-600',   bg: 'bg-lime-50'   },
       { min: 14,max: 999,label: { en: 'Excellent',zh: '优秀', bm: 'Cemerlang'},color: 'text-emerald-600',bg: 'bg-emerald-50'}]
    : [{ min: 0, max: 25, label: { en: 'Low',      zh: '偏低', bm: 'Rendah'  }, color: 'text-red-500',    bg: 'bg-red-50'    },
       { min: 25,max: 35, label: { en: 'Average',  zh: '一般', bm: 'Sedang'  }, color: 'text-amber-500',  bg: 'bg-amber-50'  },
       { min: 35,max: 45, label: { en: 'Good',     zh: '良好', bm: 'Baik'    }, color: 'text-lime-600',   bg: 'bg-lime-50'   },
       { min: 45,max: 999,label: { en: 'Excellent',zh: '优秀', bm: 'Cemerlang'},color: 'text-emerald-600',bg: 'bg-emerald-50'}];
  const t = thresholds.find(t => pct >= t.min && pct < t.max);
  if (!t) return null;
  return { label: t.label[lang] ?? t.label.en, color: t.color, bg: t.bg };
}

function fatHint(pct: number, isWet: boolean, lang: Lang): Hint | null {
  const thresholds = isWet
    ? [{ min: 0,  max: 1.5,label: { en: 'Low',  zh: '偏低', bm: 'Rendah'  }, color: 'text-blue-500',  bg: 'bg-blue-50'  },
       { min: 1.5,max: 6,  label: { en: 'Normal',zh: '正常', bm: 'Normal'  }, color: 'text-emerald-600',bg:'bg-emerald-50'},
       { min: 6,  max: 999,label: { en: 'High',  zh: '偏高', bm: 'Tinggi'  }, color: 'text-orange-500',bg: 'bg-orange-50'}]
    : [{ min: 0,  max: 8,  label: { en: 'Low',  zh: '偏低', bm: 'Rendah'  }, color: 'text-blue-500',  bg: 'bg-blue-50'  },
       { min: 8,  max: 18, label: { en: 'Normal',zh: '正常', bm: 'Normal'  }, color: 'text-emerald-600',bg:'bg-emerald-50'},
       { min: 18, max: 999,label: { en: 'High',  zh: '偏高', bm: 'Tinggi'  }, color: 'text-orange-500',bg: 'bg-orange-50'}];
  const t = thresholds.find(t => pct >= t.min && pct < t.max);
  if (!t) return null;
  return { label: t.label[lang] ?? t.label.en, color: t.color, bg: t.bg };
}

function carbHint(pct: number, lang: Lang): Hint | null {
  // Carbs are on DM basis — lower is better for cats
  const thresholds = [
    { min: 0,  max: 15, label: { en: 'Low ✓', zh: '低 ✓',  bm: 'Rendah ✓'  }, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { min: 15, max: 30, label: { en: 'Medium', zh: '中等',  bm: 'Sederhana'  }, color: 'text-amber-500',   bg: 'bg-amber-50'   },
    { min: 30, max: 999,label: { en: 'High',   zh: '偏高',  bm: 'Tinggi'     }, color: 'text-red-500',     bg: 'bg-red-50'     },
  ];
  const t = thresholds.find(t => pct >= t.min && pct < t.max);
  if (!t) return null;
  return { label: t.label[lang] ?? t.label.en, color: t.color, bg: t.bg };
}

// ── Components ───────────────────────────────────────────────────────────────

function NutritionBar({ label, value, color, max = 100, hint, isDm }:
  { label: string; value: number; color: string; max?: number; hint?: Hint | null; isDm?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 gap-1.5">
        <span className="text-[12px] font-medium text-gray-600 shrink-0">
          {label}{isDm && <span className="text-[9px] text-gray-400 ml-0.5">DM</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {hint && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${hint.color} ${hint.bg}`}>
              {hint.label}
            </span>
          )}
          <span className="text-[12px] font-bold text-gray-800 shrink-0">{value.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(value, 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] font-medium text-gray-600">{label}</span>
        <span className="text-[12px] font-bold text-gray-700">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HighlightIngredients({ raw, flagged }: { raw: string; flagged: string[] | null }) {
  if (!raw) return null;

  const lowerFlagged = (flagged ?? []).map(f => f.toLowerCase());
  const lowerGood = GOOD_PROTEINS.map(g => g.toLowerCase());

  const parts = raw.split(',');
  return (
    <p className="text-[13px] text-gray-600 leading-relaxed">
      {parts.map((part, i) => {
        const trimmed = part.trim().toLowerCase();
        const isBad  = lowerFlagged.some(f => trimmed.includes(f));
        const isGood = !isBad && lowerGood.some(g => trimmed.includes(g));
        return (
          <span key={i}>
            {i > 0 && ', '}
            {isBad
              ? <span className="bg-red-50 text-red-600 font-medium px-0.5 rounded" title="Flagged ingredient">{part.trim()}</span>
              : isGood
              ? <span className="bg-emerald-50 text-emerald-700 font-medium px-0.5 rounded" title="Quality animal protein">{part.trim()}</span>
              : <span>{part.trim()}</span>
            }
          </span>
        );
      })}
    </p>
  );
}

// ── Recommendation Card (MeowLah 总结) ────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

interface Props { product: ProductDetail; }

export default function ProductDetailView({ product }: Props) {
  const { lang } = useLang();
  const tr = useTrans();
  const [showStickyBuy, setShowStickyBuy] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const displayName = product.name_en;

  // Show sticky buy bar when original buttons scroll out of view
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBuy(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nutrition = product.nutrition;
  const score = product.score_status === 'current' && product.score_version &&
    product.score?.engine_version === product.score_version ? product.score : null;
  const gradeStyle = score?.grade ? (GRADE_STYLES[score.grade] ?? GRADE_STYLES['C']) : null;
  const paws = score ? scoreToPaws(score.final_score) : 0;

  const displayPrice = referencePrice(product);
  const w = (en: string, zh: string, bm: string) => words(lang, en, zh, bm);

  const isWet = (nutrition?.moisture_pct ?? 0) > 25;

  // Carbs: show DM note when wet food
  const carbDm = nutrition?.carb_pct_calc;
  const showCarbDmNote = carbDm != null && isWet;

  // Nutrition hints
  const pHint = nutrition ? proteinHint(nutrition.protein_pct, isWet, lang) : null;
  const fHint = nutrition ? fatHint(nutrition.fat_pct, isWet, lang) : null;
  const cHint = carbDm != null ? carbHint(carbDm, lang) : null;

  // Recommendation


  return (
    <div className="space-y-3">

      {/* ── Main Card ── */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <div className="grid md:grid-cols-2">

          {/* Image */}
          <div className="shop-detail-image relative bg-gray-50 flex items-center justify-center min-h-64 overflow-hidden">
            <ShoppingImage key={product.image_url} url={product.image_url} name={displayName} />
            {/* Grade badge overlay */}
            {gradeStyle && (
              <div className={`absolute top-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center font-black text-[17px] ${gradeStyle.bg} ${gradeStyle.text} shadow-md`}>
                {score!.grade}
              </div>
            )}

            {/* Legacy brand-wide halal flag is deliberately not displayed. */}
          </div>

          {/* Info */}
          <div className="p-5 flex flex-col gap-3.5">

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[product.category] ?? 'bg-gray-100 text-gray-600'}`}>
                {CAT_EMOJI[product.category]} {getCategoryLabel(product.category, lang)}
              </span>
              {product.is_local_brand && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500">{tr('filter.localBrand')}</span>
              )}
              {product.food_purpose === 'complementary' && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                  🍬 {lang === 'zh' ? '零食/辅食' : lang === 'bm' ? 'Makanan Ringan' : 'Treat / Snack'}
                </span>
              )}
              {product.is_prescription && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-600">
                  🩺 {lang === 'zh' ? '处方粮' : lang === 'bm' ? 'Makanan Preskripsi' : 'Prescription'}
                </span>
              )}
            </div>

            {/* Name */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{product.brand}</p>
              <h1 className="text-[19px] font-bold text-gray-900 leading-tight">{product.name_en}</h1>
              {((lang === 'zh' && product.name_zh) || (lang === 'bm' && product.name_bm)) && (
                <p className="text-[13px] text-gray-400 mt-0.5">
                  {lang === 'bm' ? product.name_bm : product.name_zh}
                </p>
              )}
            </div>

            {/* Price */}
            {displayPrice && (
              <div>
                <span className="text-[26px] font-black text-orange-500 leading-none">
                  RM {Number(displayPrice).toFixed(2)}
                </span>
                {product.weight_g && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {product.weight_g}g · RM {(Number(displayPrice) / product.weight_g * 100).toFixed(2)}/100g
                  </p>
                )}
              </div>
            )}

            {/* Price disclaimer */}
            <p className="text-[11px] text-gray-400 -mt-1">
              {tr('detail.priceDisclaimer')}
            </p>

            <div className="shop-detail-intro">{purpose(product, lang)}<br />{w('Check the packaging for life stage and feeding instructions before choosing.', '购买前核对包装上的适用年龄和喂食说明。', 'Semak umur dan arahan pemakanan pada pembungkusan.')}</div>
            <a href="#buying-options" className="shop-primary">{w('View buying options', '查看购买选项', 'Lihat pilihan membeli')} ↗</a>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2">
              {product.weight_g && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-0.5">{tr('detail.weight')}</p>
                  <p className="text-[14px] font-bold text-gray-800">{product.weight_g}g</p>
                </div>
              )}
              {product.country_origin && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-0.5">{tr('detail.origin')}</p>
                  <p className="text-[14px] font-bold text-gray-800">{product.country_origin}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MarketEvidence id={product.id} />
      <div ref={buyRef}><BuyingOptions product={product} /></div>
      <details className="bg-white rounded-2xl p-5 text-sm text-gray-600">
        <summary className="cursor-pointer font-semibold">{w('About this data & score', '数据与评分依据', 'Tentang data & skor')}</summary>
        <p className="mt-3">{w('Source recorded in catalogue:', '商品资料记录的来源：', 'Sumber dalam katalog:')} {nutrition?.source || w('Not provided', '暂未提供', 'Tidak diberikan')}</p>
        <p className="mt-2">{w('Score calculated:', '评分计算时间：', 'Skor dikira:')} {score?.computed_at && Number.isFinite(Date.parse(score.computed_at)) ? new Date(score.computed_at).toISOString().slice(0,10) : '—'}</p>
        <p className="mt-2">{w('The score summarises available nutrition data. It does not establish suitability for every cat or verify the current merchant listing.', '评分概括现有营养资料，不代表适合每只猫，也不等于已核验商家的当前商品。', 'Skor merumuskan data nutrisi yang ada, bukan jaminan kesesuaian untuk setiap kucing atau pengesahan penyenaraian penjual.')}</p>
      </details>
      {/* ── Score Card ── */}
      {score ? (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[18px]">{score.food_purpose === 'complementary' ? '🍬' : '🐾'}</span>
            <h2 className="text-[15px] font-bold text-gray-800">
              {score.food_purpose === 'complementary'
                ? (lang === 'zh' ? '零食评价' : lang === 'bm' ? 'Penilaian Makanan Ringan' : 'Snack Evaluation')
                : tr('detail.score')}
            </h2>
            {score.food_purpose === 'complementary' && (
              <span className="ml-auto text-[10px] text-purple-400 font-medium">
                {lang === 'zh' ? '专属权重' : lang === 'bm' ? 'Pemberat Khas' : 'Snack weights'}
              </span>
            )}
          </div>

          {/* Grade + score + paws */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[28px] ${gradeStyle?.bg} ${gradeStyle?.text} shadow-sm shrink-0`}>
              {score.grade}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-black text-gray-900 leading-none">{Math.round(score.final_score)}</span>
                <span className="text-[14px] text-gray-400 font-medium">/ 100</span>
              </div>
              <p className="text-[12px] text-gray-500 mt-0.5">{gradeStyle?.label}</p>
            </div>
            <div className="ml-auto flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => <PawIcon key={i} filled={i <= paws} />)}
            </div>
          </div>

          {/* Complementary label + hydration badge */}
          {score.food_purpose === 'complementary' && (score.complementary_label || (score.hydration_score != null && score.hydration_score >= 70)) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {score.complementary_label && (
                <span className="text-[12px] font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-700">
                  {score.complementary_label}
                </span>
              )}
              {score.hydration_score != null && score.hydration_score >= 70 && (
                <span className="text-[12px] font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700">
                  💧 {lang === 'zh'
                    ? `骗水指标 ${Math.round(score.hydration_score)}`
                    : lang === 'bm'
                    ? `Skor Hidrasi ${Math.round(score.hydration_score)}`
                    : `Hydration ${Math.round(score.hydration_score)}`}
                </span>
              )}
            </div>
          )}

          {/* Grade cap warning */}
          {score.grade_cap && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2 items-start">
              <span className="text-amber-500 text-[14px] shrink-0">⚠️</span>
              <p className="text-[12px] text-amber-700">
                <span className="font-semibold">{tr('detail.gradeCap')} {score.grade_cap}</span>
                {score.grade_cap_reason && ` — ${score.grade_cap_reason}`}
              </p>
            </div>
          )}

          {/* Dimension scores */}
          {score.dimension_scores && Object.keys(score.dimension_scores).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{tr('detail.scoreBreakdown')}</p>
              {Object.entries(score.dimension_scores).map(([key, val]) => (
                <ScoreBar
                  key={key}
                  label={getDimLabel(key, lang)}
                  value={val}
                />
              ))}
              <p className="text-[10px] text-gray-400 mt-2">{tr('detail.scoreNote')}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">🐾</span>
            <h2 className="text-[15px] font-bold text-gray-800">{tr('detail.score')}</h2>
          </div>
          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map(i => <PawIcon key={i} filled={false} />)}
          </div>
          <p className="text-[13px] text-gray-500">{isCatSupply(product)
            ? tr('detail.scoreNotApplicable')
            : product.score_status === 'stale' || (!product.score_status && product.final_score != null)
              ? tr('detail.scoreStale')
              : product.score_status === 'unverified'
                ? tr('detail.scoreNeedsVerification')
              : product.food_purpose === 'complementary'
                ? tr('detail.scoreSnackPending')
                : tr('detail.scorePending')}</p>
        </div>
      )}

      {/* ── Nutrition Card ── */}
      {nutrition && (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[18px]">🧪</span>
            <h2 className="text-[15px] font-bold text-gray-800">{tr('detail.nutrition')}</h2>
            {nutrition.verified && (
              <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{tr('detail.verified')}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <NutritionBar label={tr('nutr.protein')} value={nutrition.protein_pct} color="bg-emerald-500" max={isWet ? 20 : 60} hint={pHint} />
              <NutritionBar label={tr('nutr.fat')} value={nutrition.fat_pct} color="bg-amber-400" max={isWet ? 15 : 40} hint={fHint} />
              <NutritionBar label={tr('nutr.moisture')} value={nutrition.moisture_pct} color="bg-sky-400" max={100} />
            </div>
            <div>
              <NutritionBar label={tr('nutr.fiber')} value={nutrition.fiber_pct} color="bg-lime-500" max={10} />
              <NutritionBar label={tr('nutr.ash')} value={nutrition.ash_pct} color="bg-gray-400" max={15} />
              {carbDm != null && (
                <NutritionBar
                  label={tr('nutr.carbs')}
                  value={carbDm}
                  color="bg-orange-300"
                  max={50}
                  hint={cHint}
                  isDm={showCarbDmNote}
                />
              )}
            </div>
          </div>

          {/* DM explanation note */}
          {showCarbDmNote && (
            <p className="text-[10px] text-gray-400 mt-1 pt-2 border-t border-gray-50">
              {tr('detail.dmNote')}
            </p>
          )}

          {/* Extra nutrients */}
          {(nutrition.calcium_pct || nutrition.phosphorus_pct || nutrition.taurine_mg) && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-2">
              {nutrition.calcium_pct && (
                <span className="text-[11px] bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">
                  Ca {nutrition.calcium_pct.toFixed(2)}%
                </span>
              )}
              {nutrition.phosphorus_pct && (
                <span className="text-[11px] bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">
                  P {nutrition.phosphorus_pct.toFixed(2)}%
                </span>
              )}
              {nutrition.taurine_mg && (
                <span className="text-[11px] bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">
                  Taurine {nutrition.taurine_mg.toFixed(0)}mg
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Ingredients Card ── */}
      {nutrition?.ingredients_raw && (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">📋</span>
            <h2 className="text-[15px] font-bold text-gray-800">{tr('detail.ingredients')}</h2>
            {nutrition.flagged_ingredients && nutrition.flagged_ingredients.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                ⚠️ {nutrition.flagged_ingredients.length} {tr('detail.flaggedCount')}
              </span>
            )}
          </div>
          <HighlightIngredients raw={nutrition.ingredients_raw} flagged={nutrition.flagged_ingredients} />

          {/* Legend */}
          <div className="flex gap-3 mt-3 pt-2.5 border-t border-gray-50">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 shrink-0" />
              <span className="text-[10px] text-gray-400">{tr('detail.goodProtein')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 shrink-0" />
              <span className="text-[10px] text-gray-400">{tr('detail.flaggedLabel')}</span>
            </div>
          </div>

          {nutrition.flagged_ingredients && nutrition.flagged_ingredients.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-[11px] text-gray-400 mb-1.5">{tr('detail.flaggedTitle')}</p>
              <div className="flex flex-wrap gap-1.5">
                {nutrition.flagged_ingredients.map((f, i) => (
                  <span key={i} className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showStickyBuy && <div className="shop-detail-sticky"><span className="text-xs text-gray-500">{w('Check pack & seller', '核对规格与商家', 'Semak pek & penjual')}</span><a href="#buying-options">{w('Buying options', '查看购买选项', 'Pilihan membeli')} ↗</a></div>}

    </div>
  );
}
