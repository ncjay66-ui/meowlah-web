import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-xl leading-none">🐾</span>
          <span className="text-[17px] font-black tracking-tight leading-none">
            <span style={{ color: '#FF6B35' }}>Meow</span><span className="text-gray-900">Lah</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
