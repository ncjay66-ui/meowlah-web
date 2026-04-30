'use client';

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 mb-5 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
      </svg>
      Back
    </button>
  );
}
