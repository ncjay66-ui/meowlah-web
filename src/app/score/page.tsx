'use client';
import { useState } from 'react';
import { useTrans, useLang } from '@/lib/language';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://meowlah-production.up.railway.app';

const GRADE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  S:  { bg: 'bg-violet-500', text: 'text-white', label: 'Excellent' },
  A:  { bg: 'bg-emerald-500', text: 'text-white', label: 'Great' },
  B:  { bg: 'bg-lime-500',    text: 'text-white', label: 'Good' },
  C:  { bg: 'bg-yellow-400',  text: 'text-white', label: 'Average' },
  D:  { bg: 'bg-orange-500',  text: 'text-white', label: 'Below Average' },
  F:  { bg: 'bg-red-500',     text: 'text-white', label: 'Poor' },
};

const DIM_ICONS: Record<string, string> = {
  protein: '🥩', fat: '🫧', moisture: '💧', moisture_adequacy: '💧',
  protein_quality: '⭐', ingredient_quality: '🌿', quality: '🌿',
  value_for_money: '💰', value: '💰', freshness: '✨', carb: '🌾',
  ash: '⚗️', fiber: '🌿', protein_fat: '⚖️', calcium_phosphorus: '🦴',
};

interface DimScore { score: number; weight: number }
interface Report {
  final_score: number;
  grade: string;
  grade_cap?: string;
  grade_cap_reason?: string;
  dimension_scores: Record<string, DimScore>;
  deductions?: { reason: string; amount: number }[];
  warnings?: string[];
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-lime-500' :
                score >= 40 ? 'bg-yellow-400' : score >= 20 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

export default function ScorePage() {
  const tr = useTrans();
  const { lang } = useLang();

  const [mode, setMode] = useState<'text' | 'manual'>('text');
  const [ingredientsText, setIngredientsText] = useState('');
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [manualVals, setManualVals] = useState({
    protein: '', fat: '', moisture: '', ash: '', fiber: '',
    calcium: '', phosphorus: '', taurine: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScore() {
    setLoading(true); setError(null); setResult(null);
    try {
      let resp;
      if (mode === 'text') {
        if (!ingredientsText.trim()) { setError('Please paste the ingredients list.'); setLoading(false); return; }
        resp = await fetch(`${API}/score/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ingredientsText, product_name: productName, brand, require_complete: false }),
        });
      } else {
        const { protein, fat, moisture, ash, fiber } = manualVals;
        if (!protein || !fat || !moisture || !ash || !fiber) { setError('Please fill in all required fields.'); setLoading(false); return; }
        resp = await fetch(`${API}/score/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: productName || 'My Cat Food', brand: brand || 'Unknown',
            protein: +protein, fat: +fat, moisture: +moisture, ash: +ash, fiber: +fiber,
            calcium: manualVals.calcium ? +manualVals.calcium : undefined,
            phosphorus: manualVals.phosphorus ? +manualVals.phosphorus : undefined,
            taurine: manualVals.taurine ? +manualVals.taurine : undefined,
          }),
        });
      }
      const data = await resp.json();
      if (!resp.ok) {
        const msg = data?.detail?.message || data?.detail || JSON.stringify(data);
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } else {
        setResult(data.report);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  const gradeStyle = result ? (GRADE_STYLE[result.grade] ?? { bg: 'bg-gray-400', text: 'text-white', label: 'Unknown' }) : null;
  const dims = result ? Object.entries(result.dimension_scores) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'zh' ? 'AI 成分评分' : lang === 'bm' ? 'Penilaian AI' : 'AI Ingredient Scorer'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === 'zh'
            ? '粘贴任何猫粮的成分列表，立即获得 MeowLah 评分'
            : lang === 'bm'
            ? 'Tampal senarai bahan sebarang makanan kucing dan dapatkan skor MeowLah serta-merta'
            : 'Paste the ingredient list of any cat food and get an instant MeowLah score'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
        x(['text', 'manual'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m ? 'bg-white shadow text-orange-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'text'
              ? (lang === 'zh' ? '📋 粘贴成分' : '📋 Paste Ingredients')
              : (lang === 'zh' ? '🔢 手动输入营养值' : '🔢 Enter Nutrition Values')}
          </button>
        ))}
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        {/* Product name + brand */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {lang === 'zh' ? '产品名称（可选）' : 'Product Name (optional)'}
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder={lang === 'zh' ? '例：Rawz 主食罐' : 'e.g. Rawz Chicken Pâté'}
              value={productName} onChange={e => setProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {lang === 'zh' ? '品牌（可选）' : 'Brand (optional)'}
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder={lang === 'zh' ? '例：Rawz' : 'e.g. Rawz'}
              value={brand} onChange={e => setBrand(e.target.value)}
            />
          </div>
        </div>

        {mode === 'text' ? (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {lang === 'zh' ? '成分列表 *' : 'Ingredients List *'}
            </label>
            <textarea
              rows={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none font-mono"
              placeholder={lang === 'zh'
                ? '在此粘贴成分列表...\n例：Chicken, Water Sufficient for Processing, Chicken Liver, Dried Egg Product...'
                : 'Paste ingredient list here...\ne.g. Chicken, Water Sufficient for Processing, Chicken Liver, Dried Egg Product, Carrageenan...'}
              value={ingredientsText} onChange={e => setIngredientsText(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'zh'
                ? '可同时包含成分和营养保证值（蛋白质%, 脂肪%, 水分%等）'
                : 'Can include both ingredient list and guaranteed analysis (Protein%, Fat%, Moisture%, etc.)'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {lang === 'zh' ? '* 必填项（以干基百分比填写）' : '* Required fields (as-fed % from label)'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'protein', label: lang === 'zh' ? '🥩 蛋白质 %*' : '🥩 Protein %*' },
                { key: 'fat',     label: lang === 'zh' ? '🫧 脂肪 %*' : '🫧 Fat %*' },
                { key: 'moisture',label: lang === 'zh' ? '💧 水分 %*' : '💧 Moisture %*' },
                { key: 'ash',     label: lang === 'zh' ? '⚗️ 灰分 %*' : '⚗️ Ash %*' },
                { key: 'fiber',   label: lang === 'zh' ? '🌿 纤维 %*' : '🌿 Fiber %*' },
                { key: 'calcium', label: lang === 'zh' ? '🦴 钙 %' : '🦴 Calcium %' },
                { key: 'phosphorus', label: lang === 'zh' ? 'P 磷 %' : 'P Phosphorus %' },
                { key: 'taurine',    label: lang === 'zh' ? '牛磺酸 mg/kg' : 'Taurine mg/kg' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                  <input
                    type="number" min="0" step="0.1"
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="0.0"
                    value={manualVals[key as keyof typeof manualVals]}
                    onChange={e => setManualVals(v => ({ ...v, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleScore}
          disabled={loading}
          className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin">⟳</span> {lang === 'zh' ? '评分中...' : 'Scoring…'}</>
          ) : (
            <>{lang === 'zh' ? '⭐ 立即评分' : '⭐ Score Now'}</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          <strong>{lang === 'zh' ? '错误：' : 'Error: '}</strong>{error}
        </div>
      )}

      {/* Result */}
      {result && gradeStyle && (
        <div className="space-y-4">
          {/* Grade Hero */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl font-black ${gradeStyle.bg} ${gradeStyle.text} mb-3`}>
              {result.grade}
            </div>
            <div className="text-3xl font-black text-gray-900">{Math.round(result.final_score)}<span className="text-lg font-medium text-gray-400">/100</span></div>
            <div className="text-sm text-gray-500 mt-1">{gradeStyle.label}</div>
            {productName && <div className="text-sm font-medium text-gray-700 mt-2">{productName}{brand ? ` — ${brand}` : ''}</div>}
            {result.grade_cap && (
              <div className="mt-3 text-xs bg-orange-50 text-orange-700 rounded-lg px-3 py-2">
                {tr('detail.gradeCap')} <strong>{result.grade_cap}</strong>
                {result.grade_cap_reason && <> · {result.grade_cap_reason}</>}
              </div>
            )}
          </div>

          {/* Dimension Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">{tr('detail.scoreBreakdown')}</h2>
            <div className="space-y-3">
              {dims.map(([key, dim]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{DIM_ICONS[key] ?? '📊'} {key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <span className="text-gray-400">×{dim.weight}</span>
                  </div>
                  <ScoreBar score={dim.score} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{tr('detail.scoreNote')}</p>
          </div>

          {/* Deductions */}
          {result.deductions && result.deductions.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
              <h2 className="font-semibold text-red-700 mb-3">⚠️ {lang === 'zh' ? '扣分项' : 'Deductions'}</h2>
              <div className="space-y-2">
                {result.deductions.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{d.reason}</span>
                    <span className="text-red-600 font-semibold">−{d.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="bg-yellow-50 rounded-2xl border border-yellow-100 p-5">
              <h2 className="font-semibold text-yellow-800 mb-3">💡 {lang === 'zh' ? '注意事项' : 'Notes'}</h2>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-yellow-800 flex gap-2"><span>•</span><span>{w}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* How it works note */}
          <div className="text-center text-xs text-gray-400 pb-4">
            {lang === 'zh'
              ? '评分基于成分品质、营养比例及马来西亚市场价格数据'
              : 'Scores based on ingredient quality, nutritional profile, and Malaysia market pricing'}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !loading && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-5xl mb-3">⭐</div>
          <p className="text-sm">
            {lang === 'zh'
              ? '粘贴成分表开始评分'
              : 'Paste an ingredient list to get started'}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-left max-w-sm mx-auto">
            {[
              { grade: 'S', desc: lang === 'zh' ? '顶级原料，无添加' : 'Premium ingredients, no fillers' },
              { grade: 'A', desc: lang === 'zh' ? '优质猫粮标准' : 'High quality, great choice' },
              { grade: 'B', desc: lang === 'zh' ? '日常选择' : 'Solid everyday option' },
            ].map(({ grade, desc }) => (
              <div key={grade} className="bg-white rounded-xl border border-gray-100 p-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white mb-2 ${GRADE_STYLE[grade]?.bg}`}>{grade}</div>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
