import React from 'react';
import CompatibilityBadge from './CompatibilityBadge';
import CompatibilityDisclaimer from './CompatibilityDisclaimer';

export default function MatchDetailsModal({ matchData, onClose }) {
  if (!matchData) return null;

  const { bank, recipientBloodGroup, componentType, requiredUnits } = matchData;
  const breakdown = bank.stockBreakdown || {};

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-hairline" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-hairline sticky top-0 bg-surface-card rounded-t-3xl z-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔬</span>
              <h3 className="text-lg font-black text-ink">Clinical Cross-Match Analysis</h3>
            </div>
            <p className="text-xs text-muted mt-1">
              Matching analysis for {bank.name} • {bank.distance?.toFixed(1)} km away
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-canvas hover:bg-slate-100 text-muted hover:text-ink transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Request Context Strip */}
        <div className="p-5 bg-canvas border-b border-hairline grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted">Recipient Group</span>
            <div className="text-sm font-black text-[#f54e00] mt-0.5">{recipientBloodGroup}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-muted">Component</span>
            <div className="text-sm font-bold text-ink mt-0.5">{componentType}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-muted">Units Required</span>
            <div className="text-sm font-black text-ink mt-0.5">{requiredUnits} units</div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-muted">Match Score</span>
            <div className="text-sm font-black text-emerald-600 mt-0.5">{bank.matchScore} / 100</div>
          </div>
        </div>

        {/* Detailed Stock Compatibility Table */}
        <div className="p-6 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-ink">
            Compatible Inventory Breakdown (FEFO Ranked)
          </h4>

          <div className="space-y-3">
            {Object.values(breakdown).map((groupInfo) => (
              <div key={groupInfo.blood_group} className="p-4 rounded-2xl bg-canvas border border-hairline space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#f54e00]/10 text-[#f54e00] font-black flex items-center justify-center text-xs">
                      {groupInfo.blood_group}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-ink">{groupInfo.units} Units Available</span>
                      <div className="text-[10px] text-muted">Earliest Expiry: {groupInfo.earliestExpiry}</div>
                    </div>
                  </div>
                  <CompatibilityBadge matchType={groupInfo.matchType} />
                </div>
                <p className="text-xs text-body bg-surface-card p-2.5 rounded-xl border border-hairline/70 leading-relaxed">
                  {groupInfo.reason}
                </p>
              </div>
            ))}
          </div>

          {/* Medical Safety Banner */}
          <CompatibilityDisclaimer />
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-hairline bg-canvas rounded-b-3xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
