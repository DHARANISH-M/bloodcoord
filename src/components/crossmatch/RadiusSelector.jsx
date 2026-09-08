import React from 'react';

const RADIUS_OPTIONS = [
  { value: 10, label: '10 km', desc: 'Immediate Local' },
  { value: 25, label: '25 km', desc: 'City Wide' },
  { value: 50, label: '50 km', desc: 'District Region' },
  { value: 100, label: '100 km', desc: 'State Corridor' },
];

export default function RadiusSelector({ value, onChange, label = "Search Radius" }) {
  const currentVal = parseFloat(value) || 25;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </label>
        <span className="text-xs font-black text-[#f54e00]">{currentVal} km</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RADIUS_OPTIONS.map((opt) => {
          const isSelected = currentVal === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`py-2 px-2.5 rounded-xl text-center border transition ${
                isSelected
                  ? 'bg-slate-900 border-slate-900 text-white font-bold'
                  : 'bg-surface-card border-hairline text-ink hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="text-xs font-bold">{opt.label}</div>
              <div className={`text-[9px] truncate ${isSelected ? 'text-slate-300' : 'text-muted'}`}>
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
