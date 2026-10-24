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
    images: [{ url: '/icon.png', width: 192, height: 192, alt: 'MeowLah' }],
  },
  twitter: {
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ['/icon.png'],
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
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // en-MY 比 en 更准确，告诉 Google 这是面向马来西亚的内容
    <html lang="en-MY">
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
