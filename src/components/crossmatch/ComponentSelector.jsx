import React from 'react';
import { COMPONENT_TYPES } from '../../utils/bloodCompatibility';

const COMPONENT_METADATA = {
  RBC: {
    label: 'Red Blood Cells (RBC)',
    shortLabel: 'RBC / PRBC',
    badge: 'RBC',
    desc: 'Packed red cells for anemia, trauma, and acute blood loss.',
    icon: '🩸',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  PLASMA: {
    label: 'Fresh Frozen Plasma (FFP)',
    shortLabel: 'Plasma (FFP)',
    badge: 'PLASMA',
    desc: 'Coagulation factors and volume replenishment.',
    icon: '🧪',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  PLATELETS: {
    label: 'Platelet Concentrate',
    shortLabel: 'Platelets (RDP/SDP)',
    badge: 'PLATELETS',
    desc: 'Clotting promotion for thrombocytopenia and bleeding.',
    icon: '🧬',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  WHOLE_BLOOD: {
    label: 'Whole Blood (WB)',
    shortLabel: 'Whole Blood',
    badge: 'WHOLE BLOOD',
    desc: 'Unfractionated blood for massive hemorrhage (Strict isogroup).',
    icon: '🔴',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  }
};

export default function ComponentSelector({ value, onChange, label = "Blood Component" }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {COMPONENT_TYPES.map((type) => {
          const isSelected = value === type;
          const meta = COMPONENT_METADATA[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between min-w-0 ${
                isSelected
                  ? 'bg-orange-50/80 dark:bg-[#f54e00]/15 border-[#f54e00] ring-1 ring-[#f54e00] text-ink shadow-sm'
                  : 'bg-surface-card border-hairline hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-ink'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="text-base shrink-0">{meta.icon}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 tracking-wide ${meta.badgeColor}`}>
                  {meta.badge || type}
                </span>
              </div>
              <div className="mt-2 min-w-0">
                <div className="font-bold text-xs text-ink truncate">{meta.shortLabel}</div>
                <div className="text-[10px] text-muted line-clamp-2 mt-0.5 leading-tight">
                  {meta.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
