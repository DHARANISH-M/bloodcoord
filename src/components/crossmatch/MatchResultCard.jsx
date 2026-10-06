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
  const stockItems = Object.values(bank.stockBreakdown || {});
  const surplus = Math.max(0, (bank.totalCompatibleUnits || 0) - unitsNeeded);

  // Dynamic grid column class based on number of stock items
  const gridColsClass =
    stockItems.length === 1
      ? 'grid-cols-1 sm:grid-cols-2'
      : stockItems.length === 2
      ? 'grid-cols-2 sm:grid-cols-2'
      : stockItems.length === 3
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`p-5 rounded-2xl border transition-all bg-surface-card hover:shadow-md space-y-4 ${
      isEmergency ? 'border-rose-400 ring-1 ring-rose-400/30' : 'border-hairline hover:border-slate-300'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 pb-3 border-b border-hairline/60">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm sm:text-base text-ink leading-snug">
              {bank.name}
            </h4>
            {isEmergency && <EmergencyMatchBadge />}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-bold text-[#f54e00] flex items-center gap-1">
              <span>📍</span> {bank.distance?.toFixed(1)} km away
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span>⏱️</span> Est. {bank.responseTime}
            </span>
            <span>•</span>
            <span className="bg-canvas border border-hairline px-2 py-0.5 rounded-md text-[10px] font-semibold text-ink">
              {bank.category || 'Govt.'}
            </span>
            <span>•</span>
            <span className="text-[11px]">{bank.district}, {bank.state}</span>
          </div>
        </div>

        {/* Match Score Badge */}
        <div className="shrink-0 flex items-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Match</span>
            <span className="font-black text-sm text-[#f54e00] font-mono">{bank.matchScore}</span>
            <span className="text-[10px] text-slate-500 font-mono">/100</span>
          </div>
        </div>
      </div>

      {/* Compatible Stock Section */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f54e00]"></span>
            Compatible Stock (FEFO Priority)
          </span>
          {bank.earliestExpiry && (
            <span className="text-muted text-[11px]">
              Earliest Expiry: <strong className="text-ink font-mono">{bank.earliestExpiry}</strong>
            </span>
          )}
        </div>

        {/* Stock items - Dynamic clean grid */}
        <div className={`grid ${gridColsClass} gap-2.5`}>
          {stockItems.map((item) => {
            const isExact = item.matchType === 'exact_match';
            return (
              <div
                key={item.blood_group}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isExact
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                    : 'bg-canvas border-hairline text-ink'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base font-black font-mono text-ink">
                    {item.blood_group}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wide ${
                    isExact
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}>
                    {isExact ? 'Exact' : 'Compat'}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black font-mono text-ink leading-none">
                    {item.units}
                  </span>
                  <span className="text-[10px] text-muted font-medium">units</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supply Sufficiency Bar */}
      <div className="p-3 rounded-xl bg-canvas border border-hairline flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">
        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-muted text-[11px]">Required: </span>
            <strong className="text-ink font-semibold">{unitsNeeded} units</strong>
          </div>
          <div className="h-3 w-px bg-hairline"></div>
          <div>
            <span className="text-muted text-[11px]">Compatible Total: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{bank.totalCompatibleUnits} units</strong>
          </div>
        </div>

        <div>
          {hasShortage ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
              <span>⚠️</span> Shortage: {bank.shortage} units
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <span>✓</span> Sufficient Units {surplus > 0 ? `(${surplus} surplus)` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onViewMap && (
            <button
              type="button"
              onClick={() => onViewMap(bank)}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-canvas border border-hairline hover:bg-slate-100 dark:hover:bg-slate-800 text-ink transition flex items-center justify-center gap-1.5 leading-none"
            >
              <span className="text-xs leading-none select-none flex items-center">🗺️</span>
              <span className="leading-none flex items-center">Map</span>
            </button>
          )}
          {onViewDetails && (
            <button
              type="button"
              onClick={() => onViewDetails(bank)}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-canvas border border-hairline hover:bg-slate-100 dark:hover:bg-slate-800 text-ink transition flex items-center justify-center gap-1.5 leading-none"
            >
              <span className="text-xs leading-none select-none flex items-center">🔬</span>
              <span className="leading-none flex items-center">Analysis</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelectRequest(bank)}
          className="h-9 px-5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl transition uppercase tracking-wide shadow-sm flex items-center justify-center gap-2 hover:shadow-md active:scale-95 leading-none"
        >
          <span className="text-xs leading-none select-none flex items-center">🩸</span>
          <span className="leading-none flex items-center">Request Blood</span>
        </button>
      </div>
    </div>
  );
}
