import type { Metadata } from 'next';
import './globals.css';
import './shopping.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { LanguageProvider } from '@/lib/language';

export const metadata: Metadata = {
  title: 'MeowLah - Malaysia Cat Food Rating',
  description: 'Find the best cat food for your cat. AI-powered nutrition scoring for 100+ products in Malaysia.',
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
    <html lang="en">
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
