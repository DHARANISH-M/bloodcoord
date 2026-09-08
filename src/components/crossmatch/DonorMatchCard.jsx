import React, { useState } from 'react';
import CompatibilityBadge from './CompatibilityBadge';

export default function DonorMatchCard({ donor, onContactDonor }) {
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="p-4 rounded-2xl border border-hairline bg-surface-card hover:shadow-md transition space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f54e00]/10 text-[#f54e00] font-black text-sm flex items-center justify-center border border-rose-100">
            {donor.blood_group}
          </div>
          <div>
            <h4 className="font-bold text-xs text-ink">{donor.name}</h4>
            <p className="text-[10px] text-muted">
              {donor.district ? `${donor.district}, ${donor.state}` : 'Registered Donor'}
            </p>
          </div>
        </div>
        <CompatibilityBadge matchType={donor.matchType} />
      </div>

      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-canvas rounded-xl text-center text-[10px] border border-hairline/60">
        <div>
          <span className="text-muted block">Distance</span>
          <strong className="text-ink text-xs">{donor.distance?.toFixed(1)} km</strong>
        </div>
        <div>
          <span className="text-muted block">Status</span>
          <strong className="text-emerald-600 text-xs">Available</strong>
        </div>
        <div>
          <span className="text-muted block">Match Score</span>
          <strong className="text-[#f54e00] text-xs">{donor.matchScore}/100</strong>
        </div>
      </div>

      <p className="text-[10px] text-body leading-tight bg-slate-50 p-2 rounded-lg border border-hairline/60">
        {donor.reason}
      </p>

      {/* Action / Masked Contact */}
      <div className="pt-2 border-t border-hairline/60 flex items-center justify-between">
        {showContact ? (
          <div className="text-xs font-mono font-bold text-ink">
            📞 {donor.phone}
          </div>
        ) : (
          <span className="text-[10px] text-muted">
            Last active: {donor.last_donation_date || 'Recently'}
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setShowContact(true);
            if (onContactDonor) onContactDonor(donor);
          }}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
        >
          {showContact ? 'Invite Dispatched ✓' : 'Contact Donor'}
        </button>
      </div>
    </div>
  );
}
