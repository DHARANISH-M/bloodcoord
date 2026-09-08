import React from 'react';
import CompatibilityBadge from './CompatibilityBadge';
import EmergencyMatchBadge from './EmergencyMatchBadge';

export default function MatchResultCard({
  bank,
  recipientBloodGroup,
  componentType,
  unitsNeeded,
  urgency = 'routine',
  onSelectRequest,
  onViewDetails,
  onViewMap
}) {
  const isEmergency = urgency === 'emergency';
  const hasShortage = !bank.sufficient;

  return (
    <div className={`p-5 rounded-2xl border transition-all bg-surface-card hover:shadow-md ${
      isEmergency ? 'border-rose-300 ring-1 ring-rose-400/20' : 'border-hairline hover:border-slate-300'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 border-b border-hairline/60 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-sm text-ink truncate">{bank.name}</h4>
            <span className="text-[10px] font-bold text-muted bg-canvas px-2 py-0.5 rounded-full border border-hairline">
              {bank.district}, {bank.state}
            </span>
            {isEmergency && <EmergencyMatchBadge />}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted mt-1">
            <span className="font-bold text-[#f54e00]">📍 {bank.distance?.toFixed(1)} km away</span>
            <span>•</span>
            <span>⏱️ Est. {bank.responseTime}</span>
            <span>•</span>
            <span className="text-slate-600 font-semibold">{bank.category}</span>
          </div>
        </div>

        {/* Match Score Badge */}
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white font-black text-xs">
            <span>Score:</span>
            <span className="text-[#f54e00]">{bank.matchScore}</span>
            <span className="text-[10px] text-slate-400">/100</span>
          </div>
        </div>
      </div>

      {/* Stock Breakdown Grid */}
      <div className="py-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted flex justify-between items-center">
          <span>Compatible Stock (FEFO Priority)</span>
          <span className="text-slate-500">Earliest Expiry: <strong className="text-ink">{bank.earliestExpiry}</strong></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(bank.stockBreakdown || {}).map((item) => (
            <div
              key={item.blood_group}
              className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                item.blood_group === recipientBloodGroup
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-canvas border-hairline text-ink'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-black text-sm text-[#f54e00]">{item.blood_group}</span>
                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                  item.matchType === 'exact_match' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.matchType === 'exact_match' ? 'EXACT' : 'COMPAT'}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base font-black text-ink">{item.units}</span>
                <span className="text-[9px] text-muted">units</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supply Sufficiency Status */}
      <div className="py-2.5 px-3 rounded-xl bg-canvas border border-hairline/70 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-muted font-semibold">Required:</span>{' '}
            <strong className="text-ink">{unitsNeeded} units</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted font-semibold">Compatible Total:</span>{' '}
            <strong className="text-emerald-700">{bank.totalCompatibleUnits} units</strong>
          </div>
        </div>

        <div>
          {hasShortage ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              ⚠️ Shortage: {bank.shortage} units
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Sufficient Units
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-hairline/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {onViewMap && (
            <button
              type="button"
              onClick={() => onViewMap(bank)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-canvas border border-hairline hover:bg-slate-100 text-ink transition flex items-center gap-1"
            >
              🗺️ Map
            </button>
          )}
          {onViewDetails && (
            <button
              type="button"
              onClick={() => onViewDetails(bank)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-canvas border border-hairline hover:bg-slate-100 text-ink transition"
            >
              🔬 Analysis
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelectRequest(bank)}
          className="px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider shadow-sm flex items-center gap-1.5"
        >
          <span>🩸</span>
          <span>Request Blood</span>
        </button>
      </div>
    </div>
  );
}
