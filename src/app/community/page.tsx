'use client';
import { useEffect, useState } from 'react';
import { useLang } from '@/lib/language';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://meowlah-production.up.railway.app';

const GRADE_STYLE: Record<string, string> = {
  S: 'bg-violet-500', A: 'bg-emerald-500', B: 'bg-lime-500',
  C: 'bg-yellow-400', D: 'bg-orange-500',  F: 'bg-red-500',
};

interface TopProduct {
  id: string; name_en: string; brand: string; category: string;
  grade: string | null; final_score: number | null; image_url: string | null;
  price_myr: number | null;
}

export default function CommunityPage() {
  const { lang } = useLang();
  const [topWet, setTopWet]   = useState<TopProduct[]>([]);
  const [topDry, setTopDry]   = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/products?page_size=5&sort_by=score_desc&category=wet`).then(r=>r.json()),
      fetch(`${API}/products?page_size=5&sort_by=score_desc&category=dry`).then(r=>r.json()),
    ]).then(([wet, dry]) => {
      setTopWet((wet.items||[]).filter((p: TopProduct) => p.grade));
      setTopDry((dry.items||[]).filter((p: TopProduct) => p.grade));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tr = (en: string, zh: string, bm: string) => lang === 'zh' ? zh : lang === 'bm' ? bm : en;

  function ProductRow({ p, rank }: { p: TopProduct; rank: number }) {
    return (
      <Link href={`/products/${p.id}`} className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 -mx-2 transition-colors">
        <span className="text-sm font-bold text-gray-400 w-5 text-center">{rank}</span>
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {p.image_url
            ? <img src={p.image_url} alt={p.name_en} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">🐱</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{p.name_en}</p>
          <p className="text-xs text-gray-400">{p.brand}</p>
        </div>
        {p.grade && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${GRADE_STYLE[p.grade] ?? 'bg-gray-400'}`}>
            {p.grade}
          </div>
        )}
        {p.final_score && (
          <span className="text-sm font-semibold text-gray-700 w-8 text-right">{Math.round(p.final_score)}</span>
        )}
      </Link>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {tr('Community', '社区', 'Komuniti')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {tr('Top-rated cat foods rated by MeowLah AI', 'MeowLah AI 精选评级猫粮', 'Makanan kucing terbaik dinilai oleh AI MeowLah')}
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🚀</span>
          <div>
            <h2 className="font-semibold text-orange-900 mb-1">
              {tr('User Reviews Coming Soon', '用户评价即将上线', 'Ulasan Pengguna Akan Datang')}
            </h2>
            <p className="text-sm text-orange-700">
              {tr(
                'We\'re building a community review system so Malaysian cat owners can share their experiences. Stay tuned!',
                '我们正在开发社区评价系统，让马来西亚猫主人分享使用心得，敬请期待！',
                'Kami sedang membina sistem ulasan komuniti untuk pemilik kucing Malaysia berkongsi pengalaman. Nantikan!'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Try AI Scorer CTA */}
      <Link href="/score" className="block mb-6">
        <div className="bg-gradient-to-r from-violet-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⭐</span>
            <div>
              <h2 className="font-semibold text-lg">
                {tr('Score Any Cat Food Instantly', '立即为任意猫粮评分', 'Nilai Mana-mana Makanan Kucing Sekarang')}
              </h2>
              <p className="text-sm text-white/80 mt-1">
                {tr('Paste ingredients → get AI score in seconds', '粘贴成分 → 几秒内获得 AI 评分', 'Tampal bahan → skor AI dalam sekelip mata')}
              </p>
            </div>
            <span className="ml-auto text-2xl">→</span>
          </div>
        </div>
      </Link>

      {/* Top Rated Lists */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <div className="animate-spin text-3xl mb-2">⟳</div>
          <p className="text-sm">{tr('Loading…', '加载中…', 'Memuatkan…')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Wet Food */}
          {topWet.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">
                  🏆 {tr('Top Wet Food', '湿粮榜', 'Makanan Basah Terbaik')}
                </h2>
                <Link href="/?category=wet&sort=score_desc" className="text-xs text-orange-500 hover:underline">
                  {tr('See all →', '查看全部 →', 'Lihat semua →')}
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {topWet.map((p, i) => <ProductRow key={p.id} p={p} rank={i+1} />)}
              </div>
            </div>
          )}

          {/* Top Dry Food */}
          {topDry.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">
                  🏆 {tr('Top Dry Food', '干粮榜', 'Makanan Kering Terbaik')}
                </h2>
                <Link href="/?category=dry&sort=score_desc" className="text-xs text-orange-500 hover:underline">
                  {tr('See all →', '查看全部 →', 'Lihat semua →')}
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {topDry.map((p, i) => <ProductRow key={p.id} p={p} rank={i+1} />)}
              </div>
            </div>
          )}

          {/* No scored products notice */}
          {topWet.length === 0 && topDry.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-sm">{tr('No scored products yet. Scores are being computed!', '暂无评分产品，正在计算中！', 'Tiada produk yang dinilaikan lagi.')}</p>
            </div>
          )}

          {/* Grade Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              {tr('MeowLah Grade Scale', 'MeowLah 评级说明', 'Skala Gred MeowLah')}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { grade: 'S', range: '90–100', desc: tr('Exceptional quality', '卓越品质', 'Kualiti luar biasa') },
                { grade: 'A', range: '80–89',  desc: tr('High quality', '优质', 'Kualiti tinggi') },
                { grade: 'B', range: '65–79',  desc: tr('Good choice', '良好选择', 'Pilihan baik') },
                { grade: 'C', range: '50–64',  desc: tr('Average', '一般', 'Sederhana') },
                { grade: 'D', range: '35–49',  desc: tr('Below average', '低于标准', 'Di bawah purata') },
                { grade: 'F', range: '0–34',   desc: tr('Poor quality', '品质差', 'Kualiti rendah') },
              ].map(({ grade, range, desc }) => (
                <div key={grade} className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${GRADE_STYLE[grade]}`}>
                    {grade}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{range}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-800 mb-2">
              {tr('How MeowLah Scores Work', 'MeowLah 如何评分', 'Cara Skor MeowLah Berfungsi')}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {tr(
                'MeowLah uses an AI engine to analyse cat food ingredients and nutritional profiles. Scores are based on protein quality, moisture content, ingredient safety, and value for money. Prescription foods are excluded from scoring.',
                'MeowLah 使用 AI 引擎分析猫粮成分和营养成分。评分基于蛋白质品质、水分含量、成分安全性和性价比。处方粮不纳入评分体系。',
                'MeowLah menggunakan enjin AI untuk menganalisis bahan dan profil nutrisi makanan kucing. Skor berdasarkan kualiti protein, kandungan lembapan, keselamatan bahan, dan nilai wang. Makanan preskripsi dikecualikan.'
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
