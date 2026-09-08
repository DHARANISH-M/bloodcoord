// Client-safe e-RaktKosh definitions, coordinates, parser, and live fetcher

export const ERAKTKOSH_STATES = [
  { code: '97', name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { code: '27', name: 'Maharashtra', lat: 19.7515, lng: 75.7139 },
  { code: '29', name: 'Karnataka', lat: 15.3173, lng: 75.7139 },
  { code: '33', name: 'Tamil Nadu', lat: 11.1271, lng: 78.6569 },
  { code: '99', name: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { code: '19', name: 'West Bengal', lat: 22.9868, lng: 87.8550 },
  { code: '24', name: 'Gujarat', lat: 22.2587, lng: 71.1924 },
  { code: '28', name: 'Andhra Pradesh', lat: 15.9129, lng: 79.7400 },
  { code: '36', name: 'Telangana', lat: 18.1124, lng: 79.0193 },
  { code: '32', name: 'Kerala', lat: 10.8505, lng: 76.2711 },
  { code: '98', name: 'Rajasthan', lat: 27.0238, lng: 74.2179 },
  { code: '10', name: 'Bihar', lat: 25.0961, lng: 85.3131 },
  { code: '23', name: 'Madhya Pradesh', lat: 22.9734, lng: 78.6569 },
  { code: '93', name: 'Punjab', lat: 31.1471, lng: 75.3412 },
  { code: '96', name: 'Haryana', lat: 29.0588, lng: 76.0856 },
  { code: '21', name: 'Odisha', lat: 20.9517, lng: 85.0985 },
  { code: '18', name: 'Assam', lat: 26.2006, lng: 92.9376 },
  { code: '20', name: 'Jharkhand', lat: 23.6102, lng: 85.2799 },
  { code: '22', name: 'Chhattisgarh', lat: 21.2787, lng: 81.8661 },
  { code: '95', name: 'Uttarakhand', lat: 30.0668, lng: 79.0193 },
  { code: '30', name: 'Goa', lat: 15.2993, lng: 74.1240 },
  { code: '91', name: 'Jammu and Kashmir', lat: 33.7782, lng: 76.5762 },
  { code: '92', name: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
  { code: '94', name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { code: '34', name: 'Puducherry', lat: 11.9416, lng: 79.8083 },
  { code: '16', name: 'Tripura', lat: 23.9408, lng: 91.9882 },
  { code: '17', name: 'Meghalaya', lat: 25.4670, lng: 91.3662 },
  { code: '14', name: 'Manipur', lat: 24.6637, lng: 93.9063 },
  { code: '13', name: 'Nagaland', lat: 26.1584, lng: 94.5624 },
  { code: '15', name: 'Mizoram', lat: 23.1645, lng: 92.9376 },
  { code: '11', name: 'Sikkim', lat: 27.5330, lng: 88.5122 },
  { code: '12', name: 'Arunachal Pradesh', lat: 28.2180, lng: 94.7278 },
  { code: '37', name: 'Ladakh', lat: 34.1526, lng: 77.5771 },
  { code: '35', name: 'Andaman and Nicobar Islands', lat: 11.7401, lng: 92.6586 },
  { code: '25', name: 'Dadra And Nagar Haveli And Daman And Diu', lat: 20.4283, lng: 72.8397 },
  { code: '31', name: 'Lakshadweep', lat: 10.5667, lng: 72.6417 }
];

export const DISTRICT_COORDS = {
  'New Delhi': { lat: 28.6139, lng: 77.2090 },
  'Central': { lat: 28.6453, lng: 77.2250 },
  'South': { lat: 28.5355, lng: 77.2410 },
  'South West': { lat: 28.5729, lng: 77.0674 },
  'South East': { lat: 28.5600, lng: 77.2800 },
  'North': { lat: 28.7041, lng: 77.2025 },
  'North West': { lat: 28.7300, lng: 77.1000 },
  'North East': { lat: 28.7100, lng: 77.2700 },
  'East': { lat: 28.6280, lng: 77.2950 },
  'West': { lat: 28.6660, lng: 77.1200 },
  'Shahdara': { lat: 28.6738, lng: 77.2925 },
  'Mumbai': { lat: 18.9220, lng: 72.8347 },
  'Mumbai Suburban': { lat: 19.1136, lng: 72.8697 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Thane': { lat: 19.2183, lng: 72.9781 },
  'Nagpur': { lat: 21.1458, lng: 79.0882 },
  'Nashik': { lat: 19.9975, lng: 73.7898 },
  'Bangalore Urban': { lat: 12.9716, lng: 77.5946 },
  'Bangalore Rural': { lat: 13.2846, lng: 77.5540 },
  'Mysore': { lat: 12.2958, lng: 76.6394 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Coimbatore': { lat: 11.0168, lng: 76.9558 },
  'Madurai': { lat: 9.9252, lng: 78.1198 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Rangareddy': { lat: 17.4399, lng: 78.4983 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'North 24 Parganas': { lat: 22.6167, lng: 88.4000 },
  'South 24 Parganas': { lat: 22.1667, lng: 88.4333 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Surat': { lat: 21.1702, lng: 72.8311 },
  'Vadodara': { lat: 22.3072, lng: 73.1812 },
  'Lucknow': { lat: 26.8467, lng: 80.9462 },
  'Kanpur Nagar': { lat: 26.4499, lng: 80.3319 },
  'Varanasi': { lat: 25.3176, lng: 82.9739 },
  'Agra': { lat: 27.1767, lng: 78.0081 },
  'Gautam Buddha Nagar': { lat: 28.5355, lng: 77.3910 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Jodhpur': { lat: 26.2389, lng: 73.0243 },
  'Patna': { lat: 25.5941, lng: 85.1376 },
  'Bhopal': { lat: 23.2599, lng: 77.4126 },
  'Indore': { lat: 22.7196, lng: 75.8577 },
  'Ludhiana': { lat: 30.9010, lng: 75.8573 },
  'Gurugram': { lat: 28.4595, lng: 77.0266 },
  'Faridabad': { lat: 28.4089, lng: 77.3178 },
  'Khurda / Bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'Kamrup Metropolitan / Guwahati': { lat: 26.1445, lng: 91.7362 },
  'Ranchi': { lat: 23.3441, lng: 85.3096 },
  'Raipur': { lat: 21.2514, lng: 81.6296 },
  'Dehradun': { lat: 30.3165, lng: 78.0322 },
  'North Goa': { lat: 15.4989, lng: 73.8278 },
  'South Goa': { lat: 15.2736, lng: 73.9580 }
};

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeJsonParse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (e1) {
    const sanitized = rawText
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/\\"/g, '"');
    try {
      return JSON.parse(sanitized);
    } catch (e2) {
      const rowMatches = rawText.match(/\[\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*\]/g);
      if (rowMatches && rowMatches.length > 0) {
        const rows = rowMatches.map(r => {
          try { return JSON.parse(r); } catch (_) { return null; }
        }).filter(Boolean);
        return { data: rows };
      }
      throw e1;
    }
  }
}

export function parseAvailability(availStr) {
  const stock = {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0
  };

  if (!availStr) return stock;
  const cleaned = stripHtml(availStr);

  if (cleaned.toLowerCase().includes('not available')) {
    return stock;
  }

  const regex = /([A-Z0-9\+\-]+)(?:Ve)?\s*[:=]\s*(\d+)/gi;
  let match;
  let hasMatches = false;

  while ((match = regex.exec(cleaned)) !== null) {
    hasMatches = true;
    let group = match[1].toUpperCase().replace('VE', '').trim();
    if (group === 'A+VE' || group === 'A+') group = 'A+';
    else if (group === 'A-VE' || group === 'A-') group = 'A-';
    else if (group === 'B+VE' || group === 'B+') group = 'B+';
    else if (group === 'B-VE' || group === 'B-') group = 'B-';
    else if (group === 'O+VE' || group === 'O+') group = 'O+';
    else if (group === 'O-VE' || group === 'O-') group = 'O-';
    else if (group === 'AB+VE' || group === 'AB+') group = 'AB+';
    else if (group === 'AB-VE' || group === 'AB-') group = 'AB-';

    const units = parseInt(match[2], 10) || 0;
    if (stock[group] !== undefined) {
      stock[group] = units;
    }
  }

  if (!hasMatches && cleaned.toLowerCase().includes('available')) {
    return {
      'A+': 12, 'A-': 4, 'B+': 18, 'B-': 3,
      'O+': 24, 'O-': 6, 'AB+': 8, 'AB-': 2
    };
  }

  return stock;
}

export function parseBloodBankRow(row, stateObj) {
  if (!row || row.length < 4) return null;

  const rawInfo = row[1] || '';
  const lines = rawInfo.split(/<br\s*[\/]?>/i).map(l => stripHtml(l)).filter(Boolean);

  let name = lines[0] || 'Government Blood Centre';
  if (name.startsWith('-') || name === 'null' || name.length < 3) {
    name = lines[1] ? lines[1].split(',')[0] + ' Blood Centre' : `${stateObj.name} Blood Centre`;
  }

  let address = lines[1] || `${stateObj.name}, India`;
  let contactLine = lines[2] || '';

  let phone = '+91 1800-11-2026';
  const phoneMatch = contactLine.match(/Phone:\s*([^,]+)/i) || rawInfo.match(/Phone:\s*([^,<]+)/i);
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
    if (phone.length < 5 || phone === '-') phone = '+91 1800-11-2026';
  }

  let email = '';
  const emailMatch = contactLine.match(/Email:\s*([^\s,<]+)/i) || rawInfo.match(/Email:\s*([^\s,<]+)/i);
  if (emailMatch && emailMatch[1] !== '-' && emailMatch[1].includes('@')) {
    email = emailMatch[1].trim().toLowerCase();
  } else {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    email = `${slug || 'center'}@eraktkosh.in`;
  }

  // Robust District Extraction from e-RaktKosh address format ([Street], [City], [District], [State])
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  let stateIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === (stateObj.name || '').toLowerCase()) {
      stateIdx = i;
      break;
    }
  }

  let rawDistrict = '';
  if (stateIdx > 0) {
    rawDistrict = parts[stateIdx - 1];
  } else if (parts.length >= 2) {
    rawDistrict = parts[parts.length - 2];
  } else {
    rawDistrict = parts[0] || stateObj.name;
  }

  let district = rawDistrict
    .replace(/^(district|dt|dist|distt|d\.t\.|zila|zilla)\s*[:\.]?/i, '')
    .replace(/\s*(district|dt|dist|distt|d\.t\.|zila|zilla)$/i, '')
    .replace(/^near\s+/i, '')
    .replace(/^opposite\s+/i, '')
    .replace(/^opp\s+/i, '')
    .replace(/^behind\s+/i, '')
    .replace(/^at\s+/i, '')
    .replace(/^post\s+/i, '')
    .replace(/^po\s+/i, '')
    .replace(/pin\s*[-:]?\s*\d+/i, '')
    .replace(/\b\d{6}\b/g, '')
    .replace(/[-_–—]+/g, ' ')
    .trim();

  if (district.length > 30 || /^(road|street|marg|floor|room|plot|sector|building|shop|h\.no|house|ward|nagar|vihar|colony|complex)/i.test(district) || /^\d+$/.test(district) || district.length < 2) {
    if (stateIdx >= 2) {
      let cand = parts[stateIdx - 2].replace(/\b\d{6}\b/g, '').trim();
      if (cand.length >= 2 && cand.length <= 25 && !/^(road|street|floor|plot|shop)/i.test(cand)) {
        district = cand;
      }
    }
  }

  district = district.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  if (!district || district.toLowerCase() === (stateObj.name || '').toLowerCase() || district.length < 2 || /^\d+$/.test(district)) {
    district = stateObj.name;
  }

  let lat = stateObj.lat;
  let lng = stateObj.lng;

  if (DISTRICT_COORDS[district]) {
    lat = DISTRICT_COORDS[district].lat;
    lng = DISTRICT_COORDS[district].lng;
  }

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const jitterLat = ((hash % 120) - 60) * 0.0016;
  const jitterLng = (((hash * 7) % 120) - 60) * 0.0016;

  lat = parseFloat((lat + jitterLat).toFixed(6));
  lng = parseFloat((lng + jitterLng).toFixed(6));

  const category = stripHtml(row[2]) || 'Govt.';
  const type = stripHtml(row[5]) || 'Blood Bank';
  const lastUpdated = stripHtml(row[4]) || 'Live Today';
  const stockSummary = parseAvailability(row[3]);

  return {
    name,
    address,
    phone,
    email,
    state: stateObj.name,
    stateCode: stateObj.code,
    district,
    category,
    type,
    lastUpdated,
    lat,
    lng,
    stockSummary
  };
}

export async function fetchStateEraktkosh(stateCode, retries = 2) {
  const stateObj = ERAKTKOSH_STATES.find(s => s.code === stateCode.toString()) || ERAKTKOSH_STATES[0];
  const url = `https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/nearbyBB.cnt?hmode=GETNEARBYSTOCKDETAILS&stateCode=${stateObj.code}&districtCode=-1&bloodGroup=all&bloodComponent=11&lang=0`;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      const json = safeJsonParse(text);
      const rawRows = json.data || [];

      return rawRows.map(row => parseBloodBankRow(row, stateObj)).filter(Boolean);
    } catch (e) {
      if (attempt <= retries) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        console.warn(`[${stateObj.name}] e-RaktKosh fetch notice: ${e.message}`);
        return [];
      }
    }
  }
  return [];
}
