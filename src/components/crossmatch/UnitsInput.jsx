import React from 'react';

export default function UnitsInput({ value, onChange, label = "Units Required", min = 1, max = 50 }) {
  const numVal = parseInt(value) || 1;

  const handleStep = (delta) => {
    const next = Math.min(max, Math.max(min, numVal + delta));
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={numVal <= min}
          className="w-10 h-10 rounded-xl bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40 font-bold text-base flex items-center justify-center text-ink transition"
        >
          -
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) onChange(Math.min(max, Math.max(min, val)));
          }}
          className="flex-1 h-10 text-center font-black text-sm bg-surface-card border border-hairline rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
        />
        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={numVal >= max}
          className="w-10 h-10 rounded-xl bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40 font-bold text-base flex items-center justify-center text-ink transition"
        >
          +
        </button>
      </div>
      <div className="flex gap-1 mt-1">
        {[1, 2, 4, 6, 10].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
              numVal === preset
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-surface-card border-hairline text-muted hover:bg-slate-100'
            }`}
          >
            {preset}u
          </button>
        ))}
      </div>
    </div>
  );
}
