// Automated Verification Test for Advanced Cross-Match & Blood Compatibility System
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  getCompatibilityDetails,
  calculateMatchScore
} from '../server/services/bloodCompatibility.service.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log('================================================================');
console.log('🔬 ADVANCED BLOOD CROSS-MATCH & COMPATIBILITY VERIFICATION SUITE');
console.log('================================================================\n');

// 1. RBC Compatibility Tests
console.log('--- 1. RBC Compatibility Matrix Tests ---');
const aPlusDonors = getCompatibleDonorGroups('A+', 'RBC');
assert(
  JSON.stringify(aPlusDonors) === JSON.stringify(['A+', 'A-', 'O+', 'O-']),
  'A+ recipient can receive from A+, A-, O+, O- RBC'
);

const oMinusDonors = getCompatibleDonorGroups('O-', 'RBC');
assert(
  JSON.stringify(oMinusDonors) === JSON.stringify(['O-']),
  'O- recipient can ONLY receive from O- RBC'
);

const abPlusDonors = getCompatibleDonorGroups('AB+', 'RBC');
assert(
  abPlusDonors.length === 8,
  'AB+ recipient is universal RBC recipient (all 8 groups compatible)'
);

assert(isCompatible('O-', 'A+', 'RBC') === true, 'O- is compatible donor for A+ RBC');
assert(isCompatible('O+', 'A-', 'RBC') === false, 'O+ is INCOMPATIBLE for A- RBC (Rh mismatch)');
assert(isCompatible('B+', 'A+', 'RBC') === false, 'B+ is INCOMPATIBLE for A+ RBC (ABO mismatch)');
assert(isCompatible('A+', 'B+', 'RBC') === false, 'A+ is INCOMPATIBLE for B+ RBC');

// 2. Plasma & Component Compatibility Tests
console.log('\n--- 2. Plasma & Component Compatibility Tests ---');
const abPlasmaDonors = getCompatibleDonorGroups('A+', 'PLASMA');
assert(
  abPlasmaDonors.includes('AB+') && abPlasmaDonors.includes('AB-'),
  'A+ plasma recipient can receive from AB+ and AB- universal plasma donors'
);

const oPlasmaDonors = getCompatibleDonorGroups('O+', 'PLASMA');
assert(
  oPlasmaDonors.length === 8,
  'O+ recipient is universal plasma recipient (can receive plasma from any group)'
);

// 3. Match Details & Clinical Explanation
console.log('\n--- 3. Clinical Match Details & Ranking ---');
const exactDetails = getCompatibilityDetails('A+', 'A+', 'RBC');
assert(exactDetails.matchType === 'exact_match', 'A+ on A+ is classified as EXACT MATCH');
assert(exactDetails.priorityRank === 1, 'Exact match has Priority Rank 1');

const oMinusForAPlus = getCompatibilityDetails('O-', 'A+', 'RBC');
assert(oMinusForAPlus.matchType === 'compatible_alternative', 'O- for A+ is classified as COMPATIBLE ALTERNATIVE');
assert(oMinusForAPlus.reason.includes('universal'), 'Includes clinical explanation of universal donor');

const incompatible = getCompatibilityDetails('B+', 'A+', 'RBC');
assert(incompatible.compatible === false, 'B+ on A+ is marked incompatible');
assert(incompatible.matchType === 'incompatible', 'Match type is incompatible');

// 4. Smart Score Calculation
console.log('\n--- 4. Smart Match Score Ranking ---');
const exactScoreNearby = calculateMatchScore(exactDetails, 2.5, true);
const exactScoreFar = calculateMatchScore(exactDetails, 35.0, true);
const alternativeScore = calculateMatchScore(oMinusForAPlus, 2.5, true);
const incompScore = calculateMatchScore(incompatible, 2.5, true);

assert(exactScoreNearby > exactScoreFar, 'Closer exact match has higher score than far exact match');
assert(exactScoreNearby > alternativeScore, 'Exact match scores higher than alternative match at same distance');
assert(incompScore === 0, 'Incompatible match always scores 0');

// 5. Multi-Group Matching & Expiry Priority Simulation
console.log('\n--- 5. Inventory FEFO & Sufficiency Simulation ---');
const mockInventory = [
  { blood_group: 'A+', units_available: 2, expiry_date: '2026-09-10' },
  { blood_group: 'A-', units_available: 3, expiry_date: '2026-09-05' },
  { blood_group: 'O+', units_available: 4, expiry_date: '2026-09-12' },
  { blood_group: 'O-', units_available: 2, expiry_date: '2026-09-01' },
  { blood_group: 'B+', units_available: 10, expiry_date: '2026-09-15' } // Incompatible
];

const compatibleGroups = getCompatibleDonorGroups('A+', 'RBC');
const validBatches = mockInventory.filter(item => compatibleGroups.includes(item.blood_group));

assert(!validBatches.some(b => b.blood_group === 'B+'), 'B+ is strictly excluded from A+ compatible batches');
const totalCompatibleUnits = validBatches.reduce((acc, curr) => acc + curr.units_available, 0);
assert(totalCompatibleUnits === 11, `Calculated 11 compatible units (A+:2, A-:3, O+:4, O-:2), got ${totalCompatibleUnits}`);

// FEFO Ordering check
validBatches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
assert(validBatches[0].blood_group === 'O-' && validBatches[0].expiry_date === '2026-09-01', 'FEFO correctly prioritizes earliest expiring batch first');

console.log('\n================================================================');
console.log('🎉 ALL ADVANCED CROSS-MATCH SUITE TESTS PASSED WITH 100% SUCCESS!');
console.log('================================================================');
