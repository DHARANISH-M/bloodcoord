import React from 'react';

export default function CompatibilitySummary({
  summary,
  recipientBloodGroup,
  componentType,
  unitsNeeded,
  radiusKm,
  urgency
}) {
  if (!summary) return null;

  const {
    totalCompatibleBanksFound,
    totalNearbyCompatibleUnits,
    isOverallSufficient,
    shortage,
    multiBankMatchAvailable
  } = summary;

  return (
    <div className="space-y-3">
      {/* Alert Header */}
      {multiBankMatchAvailable && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wider text-amber-950">
              Multi-Blood-Bank Match Available
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              The closest blood bank alone cannot fulfill your required <strong>{unitsNeeded} units</strong>. However, a combined <strong>{totalNearbyCompatibleUnits} compatible units</strong> are available across <strong>{totalCompatibleBanksFound} nearby blood banks</strong> within {radiusKm} km.
            </p>
          </div>
        </div>
      )}

      {!isOverallSufficient && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3 shadow-sm">
          <span className="text-xl">🚨</span>
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wider text-rose-950">
              Critical Regional Stock Shortage
            </div>
            <p className="text-xs text-rose-800 mt-0.5">
              Required: <strong>{unitsNeeded} units</strong> • Total Nearby Compatible Available: <strong>{totalNearbyCompatibleUnits} units</strong> • Regional Shortage: <strong>{shortage} units</strong>. Consider expanding your search radius or requesting emergency volunteer donor mobilization.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-surface-card border border-hairline rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Recipient</span>
          <div className="text-base font-black text-[#f54e00] mt-0.5 flex items-center gap-1.5">
            <span>{recipientBloodGroup}</span>
            <span className="text-xs font-semibold text-slate-500">({componentType})</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-hairline rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Required Volume</span>
          <div className="text-base font-black text-ink mt-0.5">
            {unitsNeeded} <span className="text-xs font-normal text-muted">units</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-hairline rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Nearby Stock Total</span>
          <div className={`text-base font-black mt-0.5 ${isOverallSufficient ? 'text-emerald-700' : 'text-rose-600'}`}>
            {totalNearbyCompatibleUnits} <span className="text-xs font-normal text-muted">units</span>
          </div>
        </div>

        <div className="p-3.5 bg-surface-card border border-hairline rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Centers Inside Radius</span>
          <div className="text-base font-black text-ink mt-0.5">
            {totalCompatibleBanksFound} <span className="text-xs font-normal text-muted">within {radiusKm}km</span>
          </div>
        </div>
      </div>
    </div>
  );
}
