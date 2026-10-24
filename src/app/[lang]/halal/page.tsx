import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HalalReport from '@/components/HalalReport';
import { halalCopy as C } from '@/lib/halal-copy';
// ⚠️ 从纯模块 locale 导入，不要从 language.tsx（'use client'）
import { PREFIX_TO_LANG, PREFIXED_PARAMS, HREFLANG, OG_LOCALE } from '@/lib/locale';
import { SITE } from '@/lib/seo';

const PATHS = {
  en: `${SITE}/halal`,
  bm: `${SITE}/ms/halal`,
  zh: `${SITE}/zh/halal`,
};

export function generateStaticParams() {
  return PREFIXED_PARAMS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const internal = PREFIX_TO_LANG[lang];
  if (!internal) return { title: 'Not found', robots: { index: false, follow: false } };

  return {
    title: { absolute: C.metaTitle[internal] },
    description: C.metaDescription[internal],
    alternates: {
      canonical: PATHS[internal],
      languages: {
        [HREFLANG.en]: PATHS.en,
        [HREFLANG.bm]: PATHS.bm,
        [HREFLANG.zh]: PATHS.zh,
        'x-default': PATHS.en,
      },
    },
    openGraph: {
      type: 'article',
      siteName: 'MeowLah',
      url: PATHS[internal],
      title: C.metaTitle[internal],
      description: C.metaDescription[internal],
      locale: OG_LOCALE[internal],
    },
  };
}

export default async function LocalisedHalalPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const internal = PREFIX_TO_LANG[lang];
  if (!internal) notFound();
  return <HalalReport lang={internal} />;
}
