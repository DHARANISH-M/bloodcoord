import React from 'react';

export default function CompatibilityBadge({ matchType = 'exact_match', className = '' }) {
  const isExact = matchType === 'exact_match' || matchType === 'exact';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition ${
        isExact
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/10'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isExact ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
      {isExact ? 'EXACT MATCH' : 'COMPATIBLE ALTERNATIVE'}
    </span>
  );
}
