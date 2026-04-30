'use client';
import { useEffect, useState } from 'react';

interface StoredUser { display_name?: string; avatar_url?: string | null; }

const go = (hash: string) => { window.location.href = `/${hash}`; };

export default function Navbar() {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('ml_user') || 'null');
      if (u) setUser(u);
    } catch { /* ignore */ }
  }, []);

  const initial = (user?.display_name || '?')[0].toUpperCase();

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)', height: 48 }}>
      <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-1.5" style={{ textDecoration: 'none' }}>
          <span className="text-xl leading-none">🐾</span>
          <span className="text-[17px] font-black tracking-tight leading-none">
            <span style={{ color: '#FF6B35' }}>Meow</span><span className="text-gray-900">Lah</span>
          </span>
        </a>

        {/* Right icons — mirror community header */}
        <div className="flex items-center gap-0.5">

          {/* Leaderboard */}
          <button onClick={() => go('#leaderboard')} className="p-1.5 text-gray-700 hover:text-orange-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
          </button>

          {/* Messages */}
          <button onClick={() => go('#messages')} className="p-1.5 text-gray-700 hover:text-orange-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          {/* Notifications */}
          <button onClick={() => go('#notifications')} className="p-1.5 text-gray-700 hover:text-orange-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          {/* Avatar / login */}
          <button onClick={() => go('#profile')} className="ml-1">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={initial} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FF6B35', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>
                {user ? initial : '?'}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
