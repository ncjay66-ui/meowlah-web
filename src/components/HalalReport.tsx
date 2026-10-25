import Link from 'next/link';
import type { Lang } from '@/lib/locale';
import { LANG_TO_PREFIX } from '@/lib/locale';
import { halalLabel, type HalalStatus } from '@/lib/malaysia';
import { buildHalalReport, type HalalEntry } from '@/lib/halal-report';
import { halalCopy as C, regulatorySources } from '@/lib/halal-copy';

/**
 * 服务端组件（没有 'use client'）—— 内容必须出现在 HTML 里，
 * 这整页存在的意义就是被 Google 读到。
 */

const TIER_STYLE: Record<HalalStatus, { dot: string; chip: string }> = {
  verified:         { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  expired_evidence: { dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  brand_claim:      { dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-800 border-sky-200' },
  pork_free_claim:  { dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-800 border-violet-200' },
  unverified:       { dot: 'bg-gray-400',    chip: 'bg-gray-50 text-gray-700 border-gray-200' },
};

function productHref(id: string, lang: Lang) {
  const prefix = LANG_TO_PREFIX[lang];
  return prefix ? `/${prefix}/products/${id}` : `/products/${id}`;
}

function entryName(e: HalalEntry, lang: Lang) {
  if (lang === 'bm' && e.nameBm) return e.nameBm;
  if (lang === 'zh' && e.nameZh) return e.nameZh;
  return e.name;
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 border border-gray-100">
      <div className={`text-[26px] font-bold leading-none ${accent ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[12px] leading-snug text-gray-500">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-[17px] font-bold text-gray-900 mb-2.5">{title}</h2>
      <div className="text-[14px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function HalalReport({ lang }: { lang: Lang }) {
  const r = buildHalalReport();

  return (
    <article className="max-w-3xl mx-auto px-4 py-6 pb-28">
      <h1 className="text-[23px] font-bold text-gray-900 leading-tight">{C.pageTitle[lang]}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-gray-700">{C.intro[lang]}</p>

      {/* 三个数字一上来就把话说清楚 */}
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        <Stat value={r.checkedCount} label={C.statChecked[lang]} />
        <Stat value={r.counts.verified ?? 0} label={C.statVerified[lang]} accent={(r.counts.verified ?? 0) > 0} />
        <Stat value={r.uncheckedCount} label={C.statUnchecked[lang]} />
      </div>

      {/* 监管现实 —— 放最前面，因为它是理解下面一切的前提 */}
      <Section title={C.regulatoryHeading[lang]}>
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3">
          <p>{C.regulatoryBody[lang]}</p>
          <p className="text-[13px] text-sky-900/70 leading-relaxed">{C.regulatoryCaveat[lang]}</p>
        </div>

        <div className="mt-3">
          <p className="text-[12px] font-semibold text-gray-500 mb-1.5">{C.sourcesHeading[lang]}</p>
          <ul className="space-y-1">
            {regulatorySources.map((s) => (
              <li key={s.url} className="text-[12px] leading-relaxed">
                <a
                  href={s.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-sky-700 hover:underline"
                >
                  {s.label[lang]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 那该看什么 */}
      <Section title={C.lookForHeading[lang]}>{C.lookForBody[lang]}</Section>

      {/* 核心科普：无猪肉 ≠ 清真 */}
      <Section title={C.porkFreeHeading[lang]}>
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
          {C.porkFreeBody[lang]}
        </div>
      </Section>

      {/* 审计范围 —— 必须显眼 */}
      <Section title={C.scopeHeading[lang]}>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          {C.scopeBody[lang]}
        </div>
      </Section>

      {/* 证据等级定义 */}
      <Section title={C.tiersHeading[lang]}>
        <p className="mb-3">{C.tiersIntro[lang]}</p>
        <dl className="space-y-2.5">
          {(Object.keys(C.tierExplain) as HalalStatus[]).map((s) => (
            <div key={s} className="flex gap-3">
              <span className={`mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full ${TIER_STYLE[s].dot}`} />
              <div>
                <dt className="text-[14px] font-semibold text-gray-900">{halalLabel(s, lang)}</dt>
                <dd className="text-[13px] leading-relaxed text-gray-600">{C.tierExplain[s][lang]}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Section>

      {/* 实际核查结果 */}
      <Section title={C.resultsHeading[lang]}>
        <div className="space-y-6">
          {r.tiers.map(({ status, entries }) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${TIER_STYLE[status].dot}`} />
                <h3 className="text-[14px] font-bold text-gray-900">{halalLabel(status, lang)}</h3>
                <span className="text-[12px] text-gray-400">· {entries.length}</span>
              </div>

              <ul className="space-y-2">
                {entries.map((e) => (
                  <li key={e.id} className="bg-white rounded-2xl border border-gray-100 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={productHref(e.id, lang)}
                          className="text-[14px] font-semibold text-gray-900 hover:text-orange-600 transition-colors"
                        >
                          {entryName(e, lang)}
                        </Link>
                        <div className="text-[12px] text-gray-500 mt-0.5">{e.brand}</div>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] px-2 py-1 rounded-full border ${TIER_STYLE[status].chip}`}
                      >
                        {halalLabel(status, lang)}
                      </span>
                    </div>

                    {(e.certifier || e.expires || e.source || e.checkedAt) && (
                      <dl className="mt-2.5 pt-2.5 border-t border-gray-100 grid gap-1 text-[12px]">
                        {e.certifier && (
                          <div className="flex gap-2">
                            <dt className="text-gray-400 w-24 shrink-0">{C.certifierLabel[lang]}</dt>
                            <dd className="text-gray-700">
                              {e.certifier}
                              {e.certificateNumber ? ` · ${e.certificateNumber}` : ''}
                            </dd>
                          </div>
                        )}
                        {e.expires && (
                          <div className="flex gap-2">
                            <dt className="text-gray-400 w-24 shrink-0">{C.expiresLabel[lang]}</dt>
                            <dd className="text-gray-700">{e.expires}</dd>
                          </div>
                        )}
                        {e.checkedAt && (
                          <div className="flex gap-2">
                            <dt className="text-gray-400 w-24 shrink-0">{C.checkedLabel[lang]}</dt>
                            <dd className="text-gray-700">{e.checkedAt}</dd>
                          </div>
                        )}
                        {e.source && (
                          <div className="flex gap-2">
                            <dt className="text-gray-400 w-24 shrink-0">{C.sourceLabel[lang]}</dt>
                            <dd className="min-w-0">
                              <a
                                href={e.source}
                                target="_blank"
                                rel="nofollow noopener noreferrer"
                                className="text-sky-700 hover:underline break-all"
                              >
                                {e.source.replace(/^https?:\/\//, '').slice(0, 54)}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {e.scope && (
                      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">{e.scope}</p>
                    )}
                    {e.variantRequired && (
                      <p className="mt-1.5 text-[12px] text-amber-700">{C.variantNote[lang]}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title={C.methodHeading[lang]}>{C.methodBody[lang]}</Section>
      <Section title={C.brandsHeading[lang]}>{C.brandsBody[lang]}</Section>

      <footer className="mt-10 pt-5 border-t border-gray-200 space-y-2">
        {r.lastCheckedAt && (
          <p className="text-[12px] text-gray-500">
            {C.lastUpdated[lang]}: {r.lastCheckedAt}
          </p>
        )}
        <p className="text-[12px] leading-relaxed text-gray-500">{C.disclaimer[lang]}</p>
      </footer>
    </article>
  );
}
