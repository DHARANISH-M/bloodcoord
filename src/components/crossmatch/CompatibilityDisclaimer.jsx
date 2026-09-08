import React from 'react';

export default function CompatibilityDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 leading-snug">
        <span className="text-amber-600 text-xs shrink-0">⚠️</span>
        <span>
          <strong>Clinical Note:</strong> Automated compatibility aid for inventory coordination. Does not replace laboratory serological crossmatch or clinical clearance.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5 shadow-sm">
      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-800 text-[11px]">
        <span>⚠️</span>
        <span>Medical & Transfusion Safety Notice</span>
      </div>
      <p className="text-[11px] leading-relaxed text-amber-900/90">
        This compatibility matching result is an automated digital inventory coordination aid. It identifies theoretically compatible ABO/Rh donor stocks based on component type and proximity. It <strong>does not replace</strong> pre-transfusion laboratory blood typing, antibody screening, serological crossmatching, or standard hospital clinical safety protocols. Final compatibility must be confirmed by certified blood-bank and clinical personnel.
      </p>
    </div>
  );
}
