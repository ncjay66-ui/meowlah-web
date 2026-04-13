'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLang, useTrans } from '@/lib/language';

const LANGS = [
  { code: 'en' as const, label: 'EN' },
  { code: 'zh' as const, label: 'ZH' },
  { code: 'bm' as const, label: 'BM' },
];

export default function Navbar() {
  const [search, setSearch] = useState('');
  const { lang, setLang } = useLang();
  const tr = useTrans();

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-1">
          <span className="text-xl leading-none">🐾</span>
          <span className="text-[16px] font-bold text-gray-900 tracking-tight">MeowLah</span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim())
                window.location.href = `/?q=${encodeURIComponent(search.trim())}`;
            }}
            placeholder={tr('nav.searchPlaceholder')}
            className="w-full bg-gray-100 rounded-full px-4 pr-10 py-2 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-400 transition-all"
          />
          <button
            onClick={() => { if (search.trim()) window.location.href = `/?q=${encodeURIComponent(search.trim())}`; }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>

        {/* Lang switcher */}
        <div className="hidden sm:flex items-center bg-gray-100 rounded-full p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                lang === l.code
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
