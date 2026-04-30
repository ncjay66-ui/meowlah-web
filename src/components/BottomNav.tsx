'use client';
import { useTrans } from '@/lib/language';

// Navigate back to community.html with the right tab open
const go = (hash: string) => { window.location.href = `/${hash}`; };

export default function BottomNav() {
  const tr = useTrans();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-50" style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.08)', height: 56 }}>
      <div className="max-w-4xl mx-auto flex h-full">

        {/* Home */}
        <button onClick={() => go('#home')} className="flex-1 flex flex-col items-center justify-center gap-[3px] text-gray-400 hover:text-gray-600 transition-colors text-[10px] font-bold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          {tr('nav.home')}
        </button>

        {/* Products — always active on product detail page */}
        <button onClick={() => go('#product')} className="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors text-[10px] font-bold" style={{ color: '#FF6B35' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="3" y="3" width="8" height="8" rx="2"/>
            <rect x="13" y="3" width="8" height="8" rx="2"/>
            <rect x="3" y="13" width="8" height="8" rx="2"/>
            <rect x="13" y="13" width="8" height="8" rx="2"/>
          </svg>
          {tr('nav.products')}
        </button>

        {/* Create (centre FAB) */}
        <div className="flex-1 flex items-center justify-center">
          <button onClick={() => go('#create')} className="w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-90" style={{ background: '#FF6B35' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        {/* Cats */}
        <button onClick={() => go('#cats')} className="flex-1 flex flex-col items-center justify-center gap-[3px] text-gray-400 hover:text-gray-600 transition-colors text-[10px] font-bold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6V3l3 3"/>
            <path d="M20 6V3l-3 3"/>
            <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/>
            <circle cx="9" cy="12" r="1" fill="currentColor"/>
            <circle cx="15" cy="12" r="1" fill="currentColor"/>
            <path d="M9.5 16c.83.63 2.17.63 3 0" strokeLinecap="round"/>
          </svg>
          {tr('nav.cats')}
        </button>

        {/* Me */}
        <button onClick={() => go('#profile')} className="flex-1 flex flex-col items-center justify-center gap-[3px] text-gray-400 hover:text-gray-600 transition-colors text-[10px] font-bold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
          </svg>
          {tr('nav.me')}
        </button>

      </div>
    </nav>
  );
}
