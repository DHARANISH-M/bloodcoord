const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/eraktkosh_data.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function extractDistrict(address, name, state) {
  if (!address) return state;
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  
  // Find state index
  let stateIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === (state || '').toLowerCase()) {
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
    rawDistrict = parts[0] || state;
  }

  // Clean rawDistrict
  let dist = rawDistrict
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

  // If dist is too long or contains street keywords or is purely numeric, check if previous part is better
  if (dist.length > 30 || /^(road|street|marg|floor|room|plot|sector|building|shop|h\.no|house|ward|nagar|vihar|colony|complex)/i.test(dist) || /^\d+$/.test(dist) || dist.length < 2) {
    if (stateIdx >= 2) {
      let cand = parts[stateIdx - 2].replace(/\b\d{6}\b/g, '').trim();
      if (cand.length >= 2 && cand.length <= 25 && !/^(road|street|floor|plot|shop)/i.test(cand)) {
        dist = cand;
      }
    }
  }

  // Clean title case
  dist = dist.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  if (!dist || dist.toLowerCase() === (state || '').toLowerCase() || dist.length < 2 || /^\d+$/.test(dist)) {
    dist = state;
  }
  return dist;
}

let count = 0;
rawData.forEach(item => {
  const newDist = extractDistrict(item.address, item.name, item.state);
  item.district = newDist;
  count++;
});

fs.writeFileSync(dataPath, JSON.stringify(rawData, null, 2), 'utf8');
console.log(`Successfully updated ${count} blood banks in eraktkosh_data.json with clean district data.`);
