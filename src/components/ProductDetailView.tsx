'use client';
import { useState, useEffect } from 'react';
import { ProductDetail, CATEGORY_COLORS } from '@/lib/api';
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

function isPlaceholder(url: string | null | undefined) {
  if (!url) return true;
  return url.includes('placehold.co') || url.includes('via.placeholder');
}

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

function buildRec(product: ProductDetail, lang: Lang) {
  const nutr = product.nutrition;
  const score = product.score;
  const grade = score?.grade ?? 'C';
  const isWet = (nutr?.moisture_pct ?? 0) > 25;
  const protein = nutr?.protein_pct ?? 0;
  const moisture = nutr?.moisture_pct ?? 0;
  const carbDm = nutr?.carb_pct_calc ?? null;
  const flagged = nutr?.flagged_ingredients ?? [];

  const pros: string[] = [];
  const cons: string[] = [];
  const uses: string[] = [];

  // Pros
  if (product.is_halal) pros.push(lang === 'zh' ? '✅ 清真认证' : lang === 'bm' ? '✅ Pensijilan Halal' : '✅ Halal certified');
  if (isWet && moisture >= 75) pros.push(lang === 'zh' ? '✅ 高水分，有助猫咪补水' : lang === 'bm' ? '✅ Kelembapan tinggi, bantu kucing minum lebih' : '✅ High moisture — great for hydration');
  if (grade === 'S' || grade === 'A') pros.push(lang === 'zh' ? '✅ 营养评分优秀' : lang === 'bm' ? '✅ Skor nutrisi cemerlang' : '✅ Excellent nutrition score');
  if (grade === 'B') pros.push(lang === 'zh' ? '✅ 整体营养不错' : lang === 'bm' ? '✅ Nutrisi keseluruhan baik' : '✅ Good overall nutrition');
  if (carbDm !== null && carbDm < 15) pros.push(lang === 'zh' ? '✅ 碳水含量低，适合猫咪' : lang === 'bm' ? '✅ Karbohidrat rendah, sesuai untuk kucing' : '✅ Low carbohydrates — cats are obligate carnivores');
  if (product.is_local_brand) pros.push(lang === 'zh' ? '✅ 本地品牌，新鲜度更有保障' : lang === 'bm' ? '✅ Jenama tempatan, lebih segar' : '✅ Local brand — fresher supply chain');

  // Cons
  if (isWet && protein < 6)
    cons.push(lang === 'zh' ? '❌ 蛋白质偏低，不宜作主食' : lang === 'bm' ? '❌ Protein rendah, tidak sesuai sebagai makanan utama' : '❌ Low protein — not suitable as main meal');
  if (!isWet && protein < 25)
    cons.push(lang === 'zh' ? '❌ 蛋白质偏低' : lang === 'bm' ? '❌ Protein rendah' : '❌ Low protein content');
  if (carbDm !== null && carbDm > 30)
    cons.push(lang === 'zh' ? '❌ 碳水偏高（干物质），注意控糖' : lang === 'bm' ? '❌ Karbohidrat tinggi (basis DM)' : '❌ High carbohydrates (DM) — watch out for diabetes risk');
  if (flagged.length > 0)
    cons.push(lang === 'zh' ? `❌ 含 ${flagged.length} 种标记成分（如 ${flagged.slice(0, 2).join('、')}）` : lang === 'bm' ? `❌ Mengandungi ${flagged.length} bahan bermasalah` : `❌ Contains ${flagged.length} flagged ingredient${flagged.length > 1 ? 's' : ''} (e.g. ${flagged.slice(0, 2).join(', ')})`);
  if (grade === 'D' || grade === 'F')
    cons.push(lang === 'zh' ? '❌ 综合评分偏低，不建议长期作为主食' : lang === 'bm' ? '❌ Skor keseluruhan rendah, tidak disyorkan sebagai makanan utama' : '❌ Low score — not recommended as primary food');

  // Use cases
  if (isWet && moisture >= 80)
    uses.push(lang === 'zh' ? '💧 补水神器，适合挑食猫咪' : lang === 'bm' ? '💧 Bagus untuk hidrasi kucing cerewet' : '💧 Great for hydration & picky eaters');
  if (product.category === 'treat')
    uses.push(lang === 'zh' ? '🎁 作为零食奖励使用' : lang === 'bm' ? '🎁 Guna sebagai hadiah' : '🎁 Use as an occasional treat/reward');
  if ((grade === 'A' || grade === 'S') && protein >= (isWet ? 9 : 35))
    uses.push(lang === 'zh' ? '🍽️ 可作日常主食' : lang === 'bm' ? '🍽️ Sesuai sebagai makanan utama harian' : '🍽️ Suitable as daily main meal');
  if (grade === 'C' || grade === 'D' || grade === 'F')
    uses.push(lang === 'zh' ? '🔄 建议搭配高蛋白主食混喂' : lang === 'bm' ? '🔄 Disyorkan campur dengan makanan berkualiti tinggi' : '🔄 Mix with higher-protein food for balance');

  // Ensure at least one entry per section
  if (pros.length === 0) pros.push(lang === 'zh' ? '— 暂无突出优点' : lang === 'bm' ? '— Tiada kelebihan ketara' : '— No standout strengths found');
  if (cons.length === 0) cons.push(lang === 'zh' ? '— 暂无明显缺点' : lang === 'bm' ? '— Tiada kelemahan ketara' : '— No major downsides found');
  if (uses.length === 0) uses.push(lang === 'zh' ? '🐱 偶尔作为辅食' : lang === 'bm' ? '🐱 Kadang-kadang sebagai makanan tambahan' : '🐱 Occasional supplementary food');

  return { pros, cons, uses };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { product: ProductDetail; }

export default function ProductDetailView({ product }: Props) {
  const { lang } = useLang();
  const tr = useTrans();
  const [imgError, setImgError] = useState(false);
  const [resolvedImg, setResolvedImg] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const displayName = product.name_en;

  useEffect(() => {
    if (!isPlaceholder(product.image_url) || resolvedImg !== null) return;
    let alive = true;
    setFetching(true);
    const brand = encodeURIComponent(product.brand || '');
    const name = encodeURIComponent(product.name_en || '');
    fetch(`/api/product-image?brand=${brand}&name=${name}`)
      .then(r => r.json())
      .then(d => { if (alive) { setResolvedImg(d.url || ''); setFetching(false); } })
      .catch(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, [product.id, product.brand, product.name_en, product.image_url]); // eslint-disable-line

  const src = (!isPlaceholder(product.image_url) && !imgError)
    ? product.image_url
    : (resolvedImg && !imgError ? resolvedImg : null);

  const { score, nutrition } = product;
  const gradeStyle = score?.grade ? (GRADE_STYLES[score.grade] ?? GRADE_STYLES['C']) : null;
  const paws = score ? scoreToPaws(score.final_score) : 0;

  const bestPrice = product.prices?.length
    ? product.prices.reduce((best, p) => p.price_myr < best.price_myr ? p : best, product.prices[0])
    : null;
  const displayPrice = bestPrice?.price_myr ?? product.price_myr;

  const isWet = (nutrition?.moisture_pct ?? 0) > 25;

  // Carbs: show DM note when wet food
  const carbDm = nutrition?.carb_pct_calc;
  const showCarbDmNote = carbDm != null && isWet;

  // Nutrition hints
  const pHint = nutrition ? proteinHint(nutrition.protein_pct, isWet, lang) : null;
  const fHint = nutrition ? fatHint(nutrition.fat_pct, isWet, lang) : null;
  const cHint = carbDm != null ? carbHint(carbDm, lang) : null;

  // Recommendation
  const rec = buildRec(product, lang);

  return (
    <div className="space-y-3">

      {/* ── Main Card ── */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <div className="grid md:grid-cols-2">

          {/* Image */}
          <div className="relative bg-gray-50 flex items-center justify-center min-h-64 overflow-hidden">
            {src ? (
              <img
                src={src}
                alt={displayName}
                className="w-full h-full object-cover max-h-72 md:max-h-full"
                onError={() => { setImgError(true); setResolvedImg(null); }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-64">
                {fetching
                  ? <div className="w-8 h-8 border-3 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
                  : <span className="text-8xl opacity-15">{CAT_EMOJI[product.category] ?? '🐱'}</span>
                }
              </div>
            )}

            {/* Grade badge overlay */}
            {gradeStyle && (
              <div className={`absolute top-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center font-black text-[17px] ${gradeStyle.bg} ${gradeStyle.text} shadow-md`}>
                {score!.grade}
              </div>
            )}

            {/* Halal dot */}
            {product.is_halal && (
              <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                HALAL
              </span>
            )}
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

            {/* Buy buttons */}
            <div className="flex gap-2">
              {product.shopee_url ? (
                <a href={product.shopee_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 bg-[#EE4D2D] text-white text-[13px] font-semibold py-2.5 px-4 rounded-xl text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  🛍️ Shopee
                </a>
              ) : (
                <div className="flex-1 bg-gray-100 text-gray-300 text-[13px] font-semibold py-2.5 px-4 rounded-xl text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                  🛍️ Shopee
                </div>
              )}
              {product.lazada_url ? (
                <a href={product.lazada_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 bg-[#0F146D] text-white text-[13px] font-semibold py-2.5 px-4 rounded-xl text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  🏪 Lazada
                </a>
              ) : (
                <div className="flex-1 bg-gray-100 text-gray-300 text-[13px] font-semibold py-2.5 px-4 rounded-xl text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                  🏪 Lazada
                </div>
              )}
            </div>

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
          <p className="text-[13px] text-gray-400">{tr('detail.scorePending')}</p>
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

      {/* ── MeowLah 总结 (Recommendation) Card ── */}
      {(rec.pros.length > 0 || rec.cons.length > 0) && (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[18px]">🎯</span>
            <h2 className="text-[15px] font-bold text-gray-800">{tr('detail.summary')}</h2>
          </div>

          <div className="space-y-3">
            {/* Pros */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{tr('detail.summaryPros')}</p>
              <div className="space-y-1">
                {rec.pros.map((p, i) => (
                  <p key={i} className="text-[13px] text-gray-700">{p}</p>
                ))}
              </div>
            </div>

            {/* Cons */}
            <div className="pt-2.5 border-t border-gray-50">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{tr('detail.summaryCons')}</p>
              <div className="space-y-1">
                {rec.cons.map((c, i) => (
                  <p key={i} className="text-[13px] text-gray-700">{c}</p>
                ))}
              </div>
            </div>

            {/* Uses */}
            <div className="pt-2.5 border-t border-gray-50">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{tr('detail.summaryUses')}</p>
              <div className="space-y-1">
                {rec.uses.map((u, i) => (
                  <p key={i} className="text-[13px] text-gray-700">{u}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
