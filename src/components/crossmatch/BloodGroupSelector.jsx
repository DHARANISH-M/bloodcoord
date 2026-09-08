import React from 'react';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';

export default function BloodGroupSelector({ value, onChange, label = "Recipient Blood Group" }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {BLOOD_GROUPS.map((bg) => {
          const isSelected = value === bg;
          return (
            <button
              key={bg}
              type="button"
              onClick={() => onChange(bg)}
              className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all border ${
                isSelected
                  ? 'bg-[#f54e00] border-[#f54e00] text-white shadow-md shadow-orange-500/20 scale-105'
                  : 'bg-surface-card border-hairline text-ink hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {bg}
            </button>
          );
        })}
      </div>
    </div>
  );
}
