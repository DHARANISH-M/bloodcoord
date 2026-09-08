import React from 'react';
import MapView from '../MapView';

export default function CrossMatchMap({
  hospital,
  banks = [],
  donors = [],
  activeTarget = null,
  recipientBloodGroup = 'A+',
  componentType = 'RBC'
}) {
  const center = [hospital?.lat || 28.6139, hospital?.lng || 77.2090];

  const markers = [
    {
      lat: hospital?.lat || 28.6139,
      lng: hospital?.lng || 77.2090,
      label: `🏨 ${hospital?.name || 'Your Hospital'} (Requester)`
    }
  ];

  banks.forEach((b) => {
    const isTarget = activeTarget && activeTarget.id === b.id;
    const stockInfo = Object.entries(b.stockBreakdown || {})
      .map(([grp, info]) => `${grp}:${info.units}u`)
      .join(', ');

    markers.push({
      lat: b.lat,
      lng: b.lng,
      label: `${isTarget ? '🎯 ' : '🏥 '}${b.name} (${b.distance?.toFixed(1)} km) • Compatible: ${b.totalCompatibleUnits} units (${stockInfo})`
    });
  });

  donors.forEach((d) => {
    markers.push({
      lat: d.lat || (hospital?.lat || 28.6139) + 0.02,
      lng: d.lng || (hospital?.lng || 77.2090) + 0.02,
      label: `👤 Donor (${d.blood_group}) • ${d.distance?.toFixed(1)} km`
    });
  });

  return (
    <div className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-hairline relative">
      <MapView center={center} zoom={11} markers={markers} />
    </div>
  );
}
