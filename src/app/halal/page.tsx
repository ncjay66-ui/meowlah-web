import type { Metadata } from 'next';
import HalalReport from '@/components/HalalReport';
import { halalCopy as C } from '@/lib/halal-copy';
import { SITE, HREFLANG, OG_LOCALE } from '@/lib/seo';

const PATHS = {
  en: `${SITE}/halal`,
  bm: `${SITE}/ms/halal`,
  zh: `${SITE}/zh/halal`,
};

export const metadata: Metadata = {
  title: { absolute: C.metaTitle.en },
  description: C.metaDescription.en,
  alternates: {
    canonical: PATHS.en,
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
    url: PATHS.en,
    title: C.metaTitle.en,
    description: C.metaDescription.en,
    locale: OG_LOCALE.en,
  },
};

export default function HalalPage() {
  return <HalalReport lang="en" />;
}
