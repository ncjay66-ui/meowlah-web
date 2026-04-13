'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTrans } from '@/lib/language';

const NAV_ITEMS = [
  {
    href: '/',
    labelKey: 'nav.home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9" fill="white" stroke={active ? 'white' : 'currentColor'} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    href: '/categories',
    labelKey: 'nav.categories',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'}/>
        <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'}/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'}/>
        <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? 'currentColor' : 'none'}/>
      </svg>
    ),
  },
  {
    href: '/score',
    labelKey: 'nav.aiScore',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    href: '/community',
    labelKey: 'nav.community',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" fill={active ? 'currentColor' : 'none'}/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.8"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeWidth="1.8"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const tr = useTrans();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-50" style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.06)' }}>
      <div className="max-w-4xl mx-auto flex h-14">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon(active)}
              <span className="text-[10px] font-medium">{tr(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
