'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'en' | 'zh' | 'bm';

const STORAGE_KEY = 'ml_lang'; // same key as community.html

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'bm' || stored === 'en') {
      setLangState(stored);
    } else {
      const nav = (navigator.language || '').toLowerCase();
      if (nav.startsWith('zh')) setLangState('zh');
      else if (nav.startsWith('ms') || nav.startsWith('bm')) setLangState('bm');
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// Product names always stay in English — never use pickName for product names
export function pickName(en: string, zh: string | null, bm: string | null, lang: Lang): string {
  if (lang === 'zh' && zh) return zh;
  if (lang === 'bm' && bm) return bm;
  return en;
}

// ── Translations ────────────────────────────────────────────────────────────

const T: Record<string, Record<Lang, string>> = {
  // Bottom Nav
  'nav.home':       { en: 'Home',     zh: '首页',   bm: 'Utama'    },
  'nav.products':   { en: 'Products', zh: '产品',   bm: 'Produk'   },
  'nav.cats':       { en: 'Cats',     zh: '猫咪',   bm: 'Kucing'   },
  'nav.me':         { en: 'Me',       zh: '我',     bm: 'Saya'     },
  // Category tabs
  'cat.all':          { en: 'All',          zh: '全部', bm: 'Semua'           },
  'cat.wet':          { en: 'Wet Food',     zh: '湿粮', bm: 'Makanan Basah'   },
  'cat.dry':          { en: 'Dry Food',     zh: '干粮', bm: 'Makanan Kering'  },
  'cat.freeze_dried': { en: 'Freeze-Dried', zh: '冻干', bm: 'Beku Kering'     },
  'cat.treat':        { en: 'Treats',       zh: '零食', bm: 'Makanan Ringan'  },
  'cat.supplement':   { en: 'Supplement',   zh: '保健品',bm: 'Suplemen'       },
  // Product detail — info
  'detail.weight': { en: 'Weight', zh: '重量', bm: 'Berat' },
  'detail.origin': { en: 'Origin', zh: '产地', bm: 'Asal'  },
  // Product detail — score
  'detail.score':          { en: 'MeowLah Score',   zh: 'MeowLah 评分', bm: 'Skor MeowLah'      },
  'detail.scoreBreakdown': { en: 'Score Breakdown',  zh: '评分细则',     bm: 'Pecahan Skor'      },
  'detail.scorePending':   {
    en: 'Score not yet computed for this product.',
    zh: '此产品评分尚未计算。',
    bm: 'Skor produk ini belum dikira.',
  },
  'detail.gradeCap': { en: 'Grade capped at', zh: '评级限制于', bm: 'Gred dihadkan kepada' },
  // Product detail — nutrition
  'detail.nutrition':     { en: 'Nutrition Analysis', zh: '营养分析',  bm: 'Analisis Nutrisi' },
  'detail.verified':      { en: '✓ Verified',         zh: '✓ 已验证', bm: '✓ Disahkan'       },
  'nutr.protein':         { en: '🥩 Protein',         zh: '🥩 蛋白质', bm: '🥩 Protein'       },
  'nutr.fat':             { en: '🫧 Fat',              zh: '🫧 脂肪',   bm: '🫧 Lemak'         },
  'nutr.moisture':        { en: '💧 Moisture',         zh: '💧 水分',   bm: '💧 Kelembapan'    },
  'nutr.fiber':           { en: '🌿 Fiber',            zh: '🌿 纤维',   bm: '🌿 Serat'         },
  'nutr.ash':             { en: '⚗️ Ash',              zh: '⚗️ 灰分',   bm: '⚗️ Abu'           },
  'nutr.carbs':           { en: '🌾 Carbs',            zh: '🌾 碳水',   bm: '🌾 Karbohidrat'   },
  // Product detail — ingredients
  'detail.ingredients':   { en: 'Ingredients',        zh: '成分',      bm: 'Bahan'                 },
  'detail.flaggedCount':  { en: 'flagged',             zh: '项标记',    bm: 'ditanda'               },
  'detail.flaggedTitle':  { en: 'Flagged ingredients:', zh: '被标记成分：', bm: 'Bahan yang ditanda:' },
  // Dimension score labels
  'dim.protein':           { en: 'Protein',           zh: '蛋白质',   bm: 'Protein'          },
  'dim.fat':               { en: 'Fat',               zh: '脂肪',     bm: 'Lemak'            },
  'dim.protein_quality':   { en: 'Protein Quality',   zh: '蛋白质品质',bm: 'Kualiti Protein'  },
  'dim.moisture':          { en: 'Moisture',          zh: '水分',     bm: 'Kelembapan'       },
  'dim.moisture_adequacy': { en: 'Moisture',          zh: '水分充足',  bm: 'Kecukupan Air'    },
  'dim.ingredient_quality':{ en: 'Ingredient Quality',zh: '食材品质', bm: 'Kualiti Bahan'    },
  'dim.quality':           { en: 'Ingredient Quality',zh: '食材品质', bm: 'Kualiti Bahan'    },
  'dim.value_for_money':   { en: 'Value for Money',   zh: '性价比',   bm: 'Nilai Wang'       },
  'dim.value':             { en: 'Value for Money',   zh: '性价比',   bm: 'Nilai Wang'       },
  'dim.freshness':         { en: 'Freshness',         zh: '新鲜度',   bm: 'Kesegaran'        },
  'dim.carb':              { en: 'Carbohydrate',      zh: '碳水化合物',bm: 'Karbohidrat'      },
  'dim.ash':               { en: 'Ash',               zh: '灰分',     bm: 'Abu'              },
  'dim.fiber':             { en: 'Fiber',             zh: '纤维',     bm: 'Serat'            },
  'dim.protein_fat':       { en: 'Lean Muscle Balance', zh: '营养均衡度',  bm: 'Keseimbangan Otot'  },
  'dim.calcium_phosphorus':{ en: 'Calcium/Phosphorus',  zh: '钙磷比',     bm: 'Kalsium/Fosforus'   },
  // Nutrition detail extra
  'detail.dmNote': {
    en: '* Carbohydrate % shown on dry matter (DM) basis — comparable across wet & dry foods.',
    zh: '* 碳水含量以干物质（DM）基准计算，便于与干粮横向对比。',
    bm: '* % Karbohidrat dikira atas asas bahan kering (DM) — boleh dibanding dengan makanan kering.',
  },
  'detail.scoreNote': {
    en: '* Each dimension is scored /100. Final score is a weighted average.',
    zh: '* 各维度满分100分，综合分为加权平均值。',
    bm: '* Setiap dimensi dinilai /100. Skor akhir ialah purata berwajaran.',
  },
  'detail.priceDisclaimer': {
    en: '* Price is indicative. Actual price may vary on Shopee & Lazada.',
    zh: '* 价格仅供参考，实际价格以 Shopee 及 Lazada 为准。',
    bm: '* Harga adalah anggaran. Harga sebenar mungkin berbeza di Shopee & Lazada.',
  },
  'detail.goodProtein': { en: 'Quality animal protein', zh: '优质动物蛋白', bm: 'Protein haiwan berkualiti' },
  'detail.flaggedLabel':{ en: 'Flagged ingredient',     zh: '标记成分',    bm: 'Bahan bermasalah'          },
  'detail.summary':     { en: 'MeowLah Verdict', zh: 'MeowLah 总结', bm: 'Rumusan MeowLah' },
  'detail.summaryPros': { en: 'Strengths',        zh: '优点',         bm: 'Kelebihan'       },
  'detail.summaryCons': { en: 'Weaknesses',       zh: '缺点',         bm: 'Kelemahan'       },
  'detail.summaryUses': { en: 'Best for',         zh: '适合场景',     bm: 'Terbaik untuk'   },
};

/** Translate a key for the given language, falling back to English */
export function t(key: string, lang: Lang): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

/** Hook that returns a pre-applied translator for the current language */
export function useTrans() {
  const { lang } = useLang();
  return (key: string) => t(key, lang);
}

/** Get a translated category label */
export function getCategoryLabel(category: string, lang: Lang): string {
  const key = `cat.${category}`;
  return T[key]?.[lang] ?? T[key]?.en ?? category;
}

/** Get a translated dimension score label */
export function getDimLabel(key: string, lang: Lang): string {
  const tKey = `dim.${key}`;
  return T[tKey]?.[lang] ?? T[tKey]?.en ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
