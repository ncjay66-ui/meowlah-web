import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { LanguageProvider } from '@/lib/language';

const geist = Geist({ subsets: ['latin'] });

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
      <body className={`${geist.className} min-h-screen`}>
        <LanguageProvider>
          <Navbar />
          <main>{children}</main>
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
