import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrossMatch } from '../../hooks/useCrossMatch';
import { dataApi } from '../../utils/api';
import BloodGroupSelector from './BloodGroupSelector';
import ComponentSelector from './ComponentSelector';
import UnitsInput from './UnitsInput';
import RadiusSelector from './RadiusSelector';
import CompatibilitySummary from './CompatibilitySummary';
import MatchResultCard from './MatchResultCard';
import MatchDetailsModal from './MatchDetailsModal';
import CrossMatchMap from './CrossMatchMap';
import DonorMatchCard from './DonorMatchCard';
import CompatibilityDisclaimer from './CompatibilityDisclaimer';
import Loader from '../Loader';

export default function CrossMatchPanel({ onOrderDispatched, defaultBloodGroup = 'A+' }) {
  const { user } = useAuth();
  const {
    bloodResults,
    donorResults,
    loading,
    error,
    status,
    searchBloodMatches,
    searchDonorMatches
  } = useCrossMatch(user);

  // Search parameters
  const [recipientBloodGroup, setRecipientBloodGroup] = useState(defaultBloodGroup);
  const [componentType, setComponentType] = useState('RBC');
  const [unitsNeeded, setUnitsNeeded] = useState(4);
  const [radiusKm, setRadiusKm] = useState(25);
  const [urgency, setUrgency] = useState('routine');
  const [activeTab, setActiveTab] = useState('banks'); // 'banks' | 'donors' | 'map'

  // Modal states
  const [selectedMatchForModal, setSelectedMatchForModal] = useState(null);
  const [targetBankForMap, setTargetBankForMap] = useState(null);
  const [toast, setToast] = useState(null);

  // Initial search on mount
  useEffect(() => {
    handleSearchBlood();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSearchBlood = async (e) => {
    if (e) e.preventDefault();
    try {
      await searchBloodMatches({
        recipientBloodGroup,
        componentType,
        unitsNeeded,
        radiusKm,
        urgency
      });
      setActiveTab('banks');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSearchDonors = async () => {
    try {
      await searchDonorMatches({
        recipientBloodGroup,
        componentType,
        radiusKm
      });
      setActiveTab('donors');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Direct order creation from matched result
  const handleRequestFromBank = async (bank) => {
    try {
      const payload = {
        hospital_id: user?.profileId || user?.id,
        blood_bank_id: bank.id,
        blood_group: recipientBloodGroup,
        component_type: componentType,
        units_needed: unitsNeeded,
        urgency,
        patient_name: `Cross-Match Recipient (${recipientBloodGroup} ${componentType})`,
        match_score: bank.matchScore,
        match_type: bank.primaryMatchType
      };

      const res = await dataApi.createBloodRequest(user?.profileId || user?.id, payload);
      showToast(`Cross-match blood request for ${unitsNeeded} units dispatched to ${bank.name}!`);

      if (onOrderDispatched) {
        onOrderDispatched(res);
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch order', 'error');
    }
  };

  const handleContactDonor = async (donor) => {
    try {
      await dataApi.requestDonorDonation(donor.id, 'hospital', user?.profileId || user?.id);
      showToast(`Compatibility donation request sent to volunteer donor (${donor.blood_group})!`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col text-left">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-lg text-xs font-bold tracking-wider flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Analysis Details Modal */}
      {selectedMatchForModal && (
        <MatchDetailsModal
          matchData={selectedMatchForModal}
          onClose={() => setSelectedMatchForModal(null)}
        />
      )}

      {/* Main Grid: Left Control Console, Right Results View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:items-stretch lg:h-full">

        {/* LEFT COLUMN: CROSS-MATCH PARAMETERS FORM */}
        <div className="lg:col-span-5 bg-surface-card border border-hairline p-6 rounded-3xl shadow-sm space-y-6 lg:h-full lg:overflow-y-auto overscroll-contain custom-scrollbar">
          <div className="border-b border-hairline/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔬</span>
              <div>
                <h3 className="text-base font-black text-ink uppercase tracking-wider">
                  Find Compatible Blood
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Automated clinical cross-match & proximity ranking engine
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearchBlood} className="space-y-5">
            {/* 1. Recipient Blood Group */}
            <BloodGroupSelector
              value={recipientBloodGroup}
              onChange={setRecipientBloodGroup}
            />

            {/* 2. Blood Component */}
            <ComponentSelector
              value={componentType}
              onChange={setComponentType}
            />

            {/* 3. Units Needed */}
            <UnitsInput
              value={unitsNeeded}
              onChange={setUnitsNeeded}
            />

            {/* 4. Search Radius */}
            <RadiusSelector
              value={radiusKm}
              onChange={setRadiusKm}
            />

            {/* 5. Urgency Level */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                Order Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'routine', label: 'Routine', icon: '📋' },
                  { id: 'urgent', label: 'Urgent', icon: '⚡' },
                  { id: 'emergency', label: 'Emergency', icon: '🚨' }
                ].map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      urgency === u.id
                        ? u.id === 'emergency'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30'
                          : 'bg-[#f54e00] text-white border-[#f54e00]'
                        : 'bg-surface-card border-hairline text-ink hover:bg-slate-50'
                    }`}
                  >
                    {u.icon} {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? '⏳' : '🔬'}</span>
                <span>{loading ? 'Cross-Matching...' : 'Find Compatible Blood'}</span>
              </button>

              <button
                type="button"
                onClick={handleSearchDonors}
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>👥</span>
                <span>Find Compatible Donors</span>
              </button>
            </div>

            {/* Medical Disclaimer in Panel */}
            <CompatibilityDisclaimer compact />
          </form>
        </div>

        {/* RIGHT COLUMN: CROSS-MATCH RESULTS & SPATIAL MAP */}
        <div className="lg:col-span-7 space-y-6 lg:h-full lg:overflow-y-auto overscroll-contain custom-scrollbar pr-1.5">

          {/* Sub-Nav View Switcher */}
          <div className="flex justify-between items-center bg-surface-card/95 backdrop-blur border border-hairline p-2 rounded-2xl sticky top-0 z-10 shadow-sm">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('banks')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'banks'
                    ? 'bg-[#f54e00] text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                🏥 Blood Banks ({bloodResults?.banks?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!donorResults) handleSearchDonors();
                  setActiveTab('donors');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'donors'
                    ? 'bg-[#f54e00] text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                👥 Donors ({donorResults?.donors?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'map'
                    ? 'bg-[#f54e00] text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                🗺️ Proximity Map
              </button>
            </div>

            <div className="text-[11px] font-bold text-muted hidden sm:block pr-2">
              Radius: <strong className="text-ink">{radiusKm} km</strong>
            </div>
          </div>

          {/* Summary Indicator Header */}
          {bloodResults && (
            <CompatibilitySummary
              summary={bloodResults.summary}
              recipientBloodGroup={recipientBloodGroup}
              componentType={componentType}
              unitsNeeded={unitsNeeded}
              radiusKm={radiusKm}
              urgency={urgency}
            />
          )}

          {/* TAB 1: BLOOD BANKS MATCH RESULTS */}
          {activeTab === 'banks' && (
            <div className="space-y-4">
              {loading && (
                <div className="p-12 text-center text-muted bg-surface-card border border-hairline rounded-3xl space-y-3 flex flex-col items-center justify-center">
                  <Loader size={70} />
                  <div className="text-xs font-bold uppercase tracking-wider text-ink mt-2">
                    Querying PostGIS & FEFO Compatible Inventories...
                  </div>
                </div>
              )}

              {!loading && bloodResults?.banks?.length === 0 && (
                <div className="p-12 text-center text-muted bg-surface-card border border-hairline rounded-3xl space-y-3">
                  <span className="text-4xl block">🔍</span>
                  <div className="text-sm font-bold text-ink">
                    No compatible blood banks found within {radiusKm} km.
                  </div>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Try expanding your search radius to 50km or 100km, or search for compatible volunteer donors.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRadiusKm(50);
                      handleSearchBlood();
                    }}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl transition"
                  >
                    Expand Radius to 50 km
                  </button>
                </div>
              )}

              {!loading && bloodResults?.banks?.map((bank) => (
                <MatchResultCard
                  key={bank.id}
                  bank={bank}
                  recipientBloodGroup={recipientBloodGroup}
                  componentType={componentType}
                  unitsNeeded={unitsNeeded}
                  urgency={urgency}
                  onSelectRequest={handleRequestFromBank}
                  onViewDetails={(b) => {
                    setSelectedMatchForModal({
                      bank: b,
                      recipientBloodGroup,
                      componentType,
                      requiredUnits: unitsNeeded
                    });
                  }}
                  onViewMap={(b) => {
                    setTargetBankForMap(b);
                    setActiveTab('map');
                  }}
                />
              ))}
            </div>
          )}

          {/* TAB 2: COMPATIBLE VOLUNTEER DONORS */}
          {activeTab === 'donors' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-hairline rounded-2xl text-xs text-muted flex justify-between items-center">
                <span>Compatible volunteer donors with <strong>{bloodResults?.compatibleDonorGroups?.join(', ')}</strong> within {radiusKm} km</span>
                <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                  {donorResults?.donors?.length || 0} Donors Available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {donorResults?.donors?.map((donor) => (
                  <DonorMatchCard
                    key={donor.id}
                    donor={donor}
                    onContactDonor={handleContactDonor}
                  />
                ))}
              </div>

              {donorResults?.donors?.length === 0 && (
                <div className="p-12 text-center text-muted bg-surface-card border border-hairline rounded-3xl">
                  No active volunteer donors with compatible blood groups found in this radius.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPATIAL MAP VIEW */}
          {activeTab === 'map' && (
            <div className="bg-surface-card border border-hairline p-4 rounded-3xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  Proximity Map: Matching Supply Centers for {recipientBloodGroup} ({componentType})
                </span>
                {targetBankForMap && (
                  <span className="text-[10px] font-bold text-[#f54e00]">
                    Selected: {targetBankForMap.name}
                  </span>
                )}
              </div>

              <div className="h-[420px]">
                <CrossMatchMap
                  hospital={bloodResults?.hospital}
                  banks={bloodResults?.banks || []}
                  donors={donorResults?.donors || []}
                  activeTarget={targetBankForMap}
                  recipientBloodGroup={recipientBloodGroup}
                  componentType={componentType}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
