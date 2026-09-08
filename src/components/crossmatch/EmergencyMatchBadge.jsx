import React from 'react';

export default function EmergencyMatchBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
      🔴 EMERGENCY MATCH
    </span>
  );
}
