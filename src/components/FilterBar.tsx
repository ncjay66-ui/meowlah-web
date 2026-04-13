'use client';
import { CATEGORY_LABELS } from '@/lib/api';

interface FilterBarProps {
  search: string; onSearch: (v: string) => void;
  category: string; onCategory: (v: string) => void;
  halalOnly: boolean; onHalal: (v: boolean) => void;
  localOnly: boolean; onLocal: (v: boolean) => void;
}

const CATEGORIES = [{ value: '', label: 'All' }, ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))];

export default function FilterBar({ search, onSearch, category, onCategory, halalOnly, onHalal, localOnly, onLocal }: FilterBarProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search brand or product..." value={search} onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => onCategory(cat.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${category === cat.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat.label}
          </button>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div onClick={() => onHalal(!halalOnly)} className={`w-10 h-5 rounded-full transition-colors relative ${halalOnly ? 'bg-green-500' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${halalOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600">Halal Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div onClick={() => onLocal(!localOnly)} className={`w-10 h-5 rounded-full transition-colors relative ${localOnly ? 'bg-orange-500' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${localOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600">🇲🇾 Local Brand</span>
        </label>
      </div>
    </div>
  );
}
