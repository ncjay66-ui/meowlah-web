import type { Metadata } from 'next';
import './globals.css';
import './shopping.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { LanguageProvider } from '@/lib/language';

const SITE = 'https://www.meowlah.com';
const DEFAULT_TITLE = 'MeowLah — Independent Cat Food Scores for Malaysia';
const DEFAULT_DESCRIPTION =
  'Independent nutrition scores, real prices and halal evidence for 600+ cat foods sold in Malaysia. We are not paid to change ratings.';

export const metadata: Metadata = {
  // metadataBase 必须有：否则 OG 图片用相对路径，分享到 WhatsApp/FB 不显示
  metadataBase: new URL(SITE),
  title: {
    default: DEFAULT_TITLE,
    // 子页面只要写自己的 title，会自动补上 " | MeowLah"
    template: '%s | MeowLah',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: 'MeowLah',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'MeowLah',
    url: SITE,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: 'en_MY',
    // 1200x630 是 WhatsApp / FB / X 的大卡片尺寸。
    // 之前这里填的是 192px 的 icon.png —— 尺寸不够，分享出去只会显示一个小方块缩略图。
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MeowLah' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    // Google 搜索结果的站点图标优先读 /favicon.ico（必须是根域名可取，见 meowlah-prod/vercel.json）。
    // 它只渲染到 16-32px，所以这几张图里是猫头特写，不是整枚带字的徽章。
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

// Google 用 Organization.logo 决定知识面板/搜索结果里展示哪张品牌图。
// 不给的话它只能自己从页面里猜，猜不到就留空 —— 这是之前搜索结果没有标识的原因之一。
const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MeowLah',
  url: SITE,
  logo: `${SITE}/logo.png`,
  image: `${SITE}/og-image.png`,
  description: DEFAULT_DESCRIPTION,
  areaServed: { '@type': 'Country', name: 'Malaysia' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // en-MY 比 en 更准确，告诉 Google 这是面向马来西亚的内容
    <html lang="en-MY">
      <head>
        <script
          type="application/ld+json"
          // 内容是上面写死的常量，不含任何外部输入
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
      </head>
      <body className="min-h-screen">
        <LanguageProvider>
          <Navbar />
          <main>{children}</main>
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
