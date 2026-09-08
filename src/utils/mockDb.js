// Mock Database Layer for the Blood Coordination Platform
// Backed by authentic Government of India e-RaktKosh nationwide blood banks data
// Designed with in-memory caching and safe LocalStorage delta sync (0 quota overflow risk)

import eraktkoshData from '../data/eraktkosh_data.json';
import { fetchStateEraktkosh } from './eraktkoshClient.js';
import {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  getCompatibilityDetails,
  calculateMatchScore,
  isValidBloodGroup,
  isValidComponentType
} from './bloodCompatibility.js';

const SEED_VERSION = 'v3.1_pro_notifications';

// In-Memory Storage Cache to avoid browser 5MB LocalStorage QuotaExceededError
let memoryCache = null;

// Haversine Distance Formula in Kilometers
export function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 99999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Initial Indian Premier Hospitals
const INITIAL_HOSPITALS = [
  {
    id: 'h-1',
    user_id: 'u-hosp-1',
    name: 'All India Institute of Medical Sciences (AIIMS)',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029',
    state: 'Delhi',
    district: 'South',
    lat: 28.5672,
    lng: 77.2100,
    created_at: new Date().toISOString()
  },
  {
    id: 'h-2',
    user_id: 'u-hosp-2',
    name: 'Safdarjung Hospital & Vardhman Mahavir Medical College',
    address: 'Ring Road, Opposite AIIMS, New Delhi, Delhi 110029',
    state: 'Delhi',
    district: 'South',
    lat: 28.5701,
    lng: 77.2065,
    created_at: new Date().toISOString()
  },
  {
    id: 'h-3',
    user_id: 'u-hosp-3',
    name: 'King Edward Memorial (KEM) Hospital',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    state: 'Maharashtra',
    district: 'Mumbai',
    lat: 19.0028,
    lng: 72.8428,
    created_at: new Date().toISOString()
  },
  {
    id: 'h-4',
    user_id: 'u-hosp-4',
    name: 'Victoria Hospital & Bangalore Medical College',
    address: 'Fort Road, Near City Market, Bengaluru, Karnataka 560002',
    state: 'Karnataka',
    district: 'Bangalore Urban',
    lat: 12.9642,
    lng: 77.5753,
    created_at: new Date().toISOString()
  },
  {
    id: 'h-5',
    user_id: 'u-hosp-5',
    name: 'Rajiv Gandhi Government General Hospital',
    address: 'EVR Periyar Salai, Park Town, Chennai, Tamil Nadu 600003',
    state: 'Tamil Nadu',
    district: 'Chennai',
    lat: 13.0818,
    lng: 80.2785,
    created_at: new Date().toISOString()
  },
  {
    id: 'h-6',
    user_id: 'u-hosp-6',
    name: 'Sir Ganga Ram Hospital',
    address: 'Rajinder Nagar, New Delhi, Delhi 110060',
    state: 'Delhi',
    district: 'Central',
    lat: 28.6385,
    lng: 77.1895,
    created_at: new Date().toISOString()
  }
];

// Initial Indian Donors
const INITIAL_DONORS = [
  {
    id: 'd-1',
    user_id: 'u-donor-1',
    name: 'Rahul Sharma',
    blood_group: 'O-',
    last_donation_date: '2026-06-15',
    available_flag: true,
    address: 'Connaught Place, New Delhi, Delhi 110001',
    state: 'Delhi',
    district: 'New Delhi',
    lat: 28.6304,
    lng: 77.2177,
    created_at: new Date().toISOString()
  },
  {
    id: 'd-2',
    user_id: 'u-donor-2',
    name: 'Priya Patel',
    blood_group: 'B+',
    last_donation_date: '2026-07-20',
    available_flag: true,
    address: 'Bandra West, Mumbai, Maharashtra 400050',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    lat: 19.0596,
    lng: 72.8295,
    created_at: new Date().toISOString()
  },
  {
    id: 'd-3',
    user_id: 'u-donor-3',
    name: 'Anand Kumar',
    blood_group: 'A+',
    last_donation_date: '2026-05-10',
    available_flag: true,
    address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
    state: 'Karnataka',
    district: 'Bangalore Urban',
    lat: 12.9784,
    lng: 77.6408,
    created_at: new Date().toISOString()
  },
  {
    id: 'd-4',
    user_id: 'u-donor-4',
    name: 'Deepa Sundaram',
    blood_group: 'AB-',
    last_donation_date: '2026-08-01',
    available_flag: true,
    address: 'T. Nagar, Chennai, Tamil Nadu 600017',
    state: 'Tamil Nadu',
    district: 'Chennai',
    lat: 13.0418,
    lng: 80.2341,
    created_at: new Date().toISOString()
  },
  {
    id: 'd-5',
    user_id: 'u-donor-5',
    name: 'Amit Banerjee',
    blood_group: 'B-',
    last_donation_date: '2026-07-05',
    available_flag: true,
    address: 'Salt Lake Sector V, Kolkata, West Bengal 700091',
    state: 'West Bengal',
    district: 'Kolkata',
    lat: 22.5867,
    lng: 88.4178,
    created_at: new Date().toISOString()
  },
  {
    id: 'd-6',
    user_id: 'u-donor-6',
    name: 'Vikram Reddy',
    blood_group: 'AB+',
    last_donation_date: '2026-06-25',
    available_flag: true,
    address: 'Banjara Hills Road No. 2, Hyderabad, Telangana 500034',
    state: 'Telangana',
    district: 'Hyderabad',
    lat: 17.4156,
    lng: 78.4357,
    created_at: new Date().toISOString()
  },
  {
    id: 'd-7',
    user_id: 'u-donor-7',
    name: 'Pooja Verma',
    blood_group: 'O+',
    last_donation_date: '2026-08-12',
    available_flag: true,
    address: 'Hazratganj, Lucknow, Uttar Pradesh 226001',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    lat: 26.8500,
    lng: 80.9500,
    created_at: new Date().toISOString()
  }
];

// Initial Accounts
const INITIAL_USERS = [
  // Admin
  { id: 'u-admin-1', name: 'National eRaktKosh Administrator', email: 'admin@eraktkosh.gov.in', phone: '+91 11-23061410', password_hash: 'admin123', role: 'admin', status: 'approved', created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'u-admin-2', name: 'Dr. Sarah Carter (Coordinator)', email: 'admin@blood.org', phone: '+91 1800-11-2026', password_hash: 'admin123', role: 'admin', status: 'approved', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },

  // Hospital Logins
  { id: 'u-hosp-1', name: 'AIIMS New Delhi', email: 'aiims.delhi@blood.org', phone: '+91 11-26588500', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'u-hosp-legacy', name: 'AIIMS New Delhi (Bellevue Alias)', email: 'bellevue@blood.org', phone: '+91 11-26588500', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'u-hosp-2', name: 'Safdarjung Hospital', email: 'safdarjung@blood.org', phone: '+91 11-26165060', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'u-hosp-3', name: 'KEM Hospital Mumbai', email: 'kem.mumbai@blood.org', phone: '+91 22-24107000', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'u-hosp-4', name: 'Victoria Hospital Bengaluru', email: 'victoria.blr@blood.org', phone: '+91 80-26701150', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'u-hosp-5', name: 'Rajiv Gandhi Govt General Hospital Chennai', email: 'apollo.chennai@blood.org', phone: '+91 44-25305000', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'u-hosp-6', name: 'Sir Ganga Ram Hospital', email: 'gangaram@blood.org', phone: '+91 11-42254000', password_hash: 'hosp123', role: 'hospital', status: 'pending', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },

  // Blood Bank Logins
  { id: 'u-bank-1', name: 'Indian Red Cross Society National HQ', email: 'redcross@blood.org', phone: '+91 11-23716441', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 40 * 86400000).toISOString() },
  { id: 'u-bank-2', name: 'Dr. Ram Manohar Lohia Hospital Blood Bank', email: 'rammanohar.bb@blood.org', phone: '+91 11-23404286', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 35 * 86400000).toISOString() },
  { id: 'u-bank-3', name: 'Rotary Blood Bank Delhi', email: 'rotary.delhi@blood.org', phone: '+91 11-29962078', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'u-bank-4', name: 'Tata Memorial Hospital Blood Centre Mumbai', email: 'tata.mumbai@blood.org', phone: '+91 22-24177000', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'u-bank-5', name: 'Rashtrotthana Blood Centre Bengaluru', email: 'rashtrotthana.blr@blood.org', phone: '+91 80-26612730', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },

  // Donors
  { id: 'u-donor-1', name: 'Rahul Sharma (O-)', email: 'rahul.sharma@gmail.com', phone: '+91 98101-12345', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'u-donor-legacy', name: 'Rahul Sharma (Jane Alias)', email: 'jane@gmail.com', phone: '+91 98101-12345', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'u-donor-2', name: 'Priya Patel (B+)', email: 'priya.patel@gmail.com', phone: '+91 98202-67890', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'u-donor-3', name: 'Anand Kumar (A+)', email: 'anand.kumar@gmail.com', phone: '+91 98450-11223', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'u-donor-4', name: 'Deepa Sundaram (AB-)', email: 'deepa.sundaram@gmail.com', phone: '+91 98840-44556', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'u-donor-5', name: 'Amit Banerjee (B-)', email: 'amit.banerjee@gmail.com', phone: '+91 98300-77889', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'u-donor-6', name: 'Vikram Reddy (AB+)', email: 'vikram.reddy@gmail.com', phone: '+91 98490-99001', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'u-donor-7', name: 'Pooja Verma (O+)', email: 'pooja.verma@gmail.com', phone: '+91 94150-33445', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 5 * 86400000).toISOString() }
];

function generateEraktkoshSeeds() {
  const rawList = Array.isArray(eraktkoshData) && eraktkoshData.length > 0 ? eraktkoshData : [];
  const banks = [];
  const inventory = [];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  rawList.forEach((item, idx) => {
    const bankId = `bb-${idx + 1}`;
    const userId = idx === 0 ? 'u-bank-2' : idx === 1 ? 'u-bank-1' : `u-bank-${idx + 1}`;

    banks.push({
      id: bankId,
      user_id: userId,
      name: item.name || 'Blood Centre',
      address: item.address || `${item.state}, India`,
      state: item.state || 'Delhi',
      stateCode: item.stateCode || '97',
      district: item.district || 'New Delhi',
      phone: item.phone || '+91 1800-11-2026',
      email: item.email || 'info@eraktkosh.in',
      category: item.category || 'Govt.',
      type: item.type || 'Blood Bank',
      lastUpdated: item.lastUpdated || 'Live Today',
      lat: item.lat || 28.6139,
      lng: item.lng || 77.2090,
      is_eraktkosh: true,
      created_at: new Date().toISOString()
    });

    const stock = item.stockSummary || {};
    bloodGroups.forEach((bg, gIdx) => {
      const units = stock[bg] !== undefined ? stock[bg] : (idx % 2 === 0 ? (gIdx * 4) + 2 : 0);
      inventory.push({
        id: `bi-${bankId}-${bg.replace('+', 'p').replace('-', 'm')}`,
        blood_bank_id: bankId,
        blood_group: bg,
        units_available: Number(units) || 0,
        expiry_date: daysFromNow(20 + (gIdx * 3)),
        batch_id: `ERAKTKOSH-${bg}-${(idx % 100) + 1}`,
        updated_at: new Date().toISOString()
      });
    });
  });

  return { banks, inventory };
}

// Memory-Safe Read / Write with fallback
function getMemoryState() {
  if (!memoryCache) {
    const { banks, inventory } = generateEraktkoshSeeds();
    memoryCache = {
      blood_users: [...INITIAL_USERS],
      blood_hospitals: [...INITIAL_HOSPITALS],
      blood_donors: [...INITIAL_DONORS],
      blood_banks: banks,
      blood_inventory: inventory,
      blood_requests: [
        {
          id: 'br-1',
          hospital_id: 'h-1',
          blood_bank_id: 'bb-1',
          blood_group: 'O-',
          units_needed: 5,
          urgency: 'emergency',
          patient_name: 'Aarav Mehta (Trauma ICU)',
          contact_phone: '+91 98112-44556',
          status: 'pending',
          created_at: new Date(Date.now() - 20 * 60000).toISOString()
        },
        {
          id: 'br-2',
          hospital_id: 'h-2',
          blood_bank_id: 'bb-1',
          blood_group: 'B+',
          units_needed: 3,
          urgency: 'urgent',
          patient_name: 'Sunita Rao (Surgery OT-4)',
          contact_phone: '+91 98200-11223',
          status: 'accepted',
          created_at: new Date(Date.now() - 65 * 60000).toISOString()
        },
        {
          id: 'br-3',
          hospital_id: 'h-1',
          blood_bank_id: 'bb-2',
          blood_group: 'A+',
          units_needed: 2,
          urgency: 'normal',
          patient_name: 'Karan Malhotra (Ward 302)',
          contact_phone: '+91 97110-88990',
          status: 'fulfilled',
          created_at: new Date(Date.now() - 180 * 60000).toISOString()
        }
      ],
      blood_queries: [],
      blood_notifications: [
        {
          id: 'notif-seed-1',
          user_id: 'u-bank-1',
          type: 'emergency_request',
          title: '🚨 Emergency Blood Request • O- (5 Units)',
          message: 'AIIMS New Delhi requested 5 units of O- for Trauma ICU (Aarav Mehta). Immediate response required.',
          channels: ['in_app', 'sms'],
          read_flag: false,
          created_at: new Date(Date.now() - 20 * 60000).toISOString(),
          metadata: {
            requestId: 'br-1',
            bloodGroup: 'O-',
            unitsNeeded: 5,
            urgency: 'emergency',
            patientName: 'Aarav Mehta (Trauma ICU)',
            contactPhone: '+91 98112-44556',
            hospitalName: 'AIIMS New Delhi',
            status: 'pending'
          }
        },
        {
          id: 'notif-seed-2',
          user_id: 'u-bank-1',
          type: 'blood_request',
          title: '⚡ Urgent Blood Order • B+ (3 Units)',
          message: 'Safdarjung Hospital placed an urgent requisition for 3 units of B+ (Surgery OT-4).',
          channels: ['in_app', 'email'],
          read_flag: false,
          created_at: new Date(Date.now() - 65 * 60000).toISOString(),
          metadata: {
            requestId: 'br-2',
            bloodGroup: 'B+',
            unitsNeeded: 3,
            urgency: 'urgent',
            patientName: 'Sunita Rao (Surgery OT-4)',
            contactPhone: '+91 98200-11223',
            hospitalName: 'Safdarjung Hospital',
            status: 'accepted'
          }
        },
        {
          id: 'notif-seed-3',
          user_id: 'u-hosp-1',
          type: 'request_response',
          title: '✓ Order Accepted by Red Cross Blood Centre',
          message: 'Your emergency order for 5 units of O- has been accepted and prepared for dispatch.',
          channels: ['in_app'],
          read_flag: false,
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          metadata: {
            requestId: 'br-1',
            bloodGroup: 'O-',
            unitsNeeded: 5,
            urgency: 'emergency',
            status: 'accepted',
            bloodBankName: 'Indian Red Cross Society'
          }
        },
        {
          id: 'notif-seed-4',
          user_id: 'u-hosp-1',
          type: 'request_response',
          title: '📦 Order Delivered & Fulfilled • A+ (2 Units)',
          message: 'Requisition for 2 units of A+ fulfilled and delivered by AIIMS Blood Bank.',
          channels: ['in_app'],
          read_flag: true,
          created_at: new Date(Date.now() - 170 * 60000).toISOString(),
          metadata: {
            requestId: 'br-3',
            bloodGroup: 'A+',
            unitsNeeded: 2,
            urgency: 'normal',
            status: 'fulfilled',
            bloodBankName: 'AIIMS Blood Bank'
          }
        }
      ],
      hospital_preferences: [{ user_id: 'u-hosp-1', preferred_banks: ['bb-1', 'bb-2'] }]
    };

    // Overlay any smaller customized user records from localStorage
    try {
      ['blood_users', 'blood_hospitals', 'blood_donors', 'blood_requests', 'blood_queries', 'blood_notifications'].forEach(tbl => {
        const stored = localStorage.getItem(tbl);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryCache[tbl] = parsed;
          }
        }
      });
    } catch (_) {}
  }
  return memoryCache;
}

function readTable(name) {
  const state = getMemoryState();
  return state[name] || [];
}

function writeTable(name, data) {
  const state = getMemoryState();
  state[name] = data;

  // Persist non-bulk tables to localStorage safely
  if (name !== 'blood_banks' && name !== 'blood_inventory') {
    try {
      localStorage.setItem(name, JSON.stringify(data));
    } catch (e) {
      console.warn(`Could not persist ${name} to localStorage:`, e.message);
    }
  }
}

export function getSeedTables() {
  return getMemoryState();
}

// Initialize Database
export function initMockDb(force = false) {
  let storedVer = null;
  try {
    storedVer = localStorage.getItem('blood_seed_version');
  } catch (_) {}

  if (force || storedVer !== SEED_VERSION) {
    memoryCache = null;
    try {
      localStorage.removeItem('blood_seed_version');
      ['blood_users', 'blood_hospitals', 'blood_donors', 'blood_requests', 'blood_queries', 'blood_notifications'].forEach(tbl => {
        localStorage.removeItem(tbl);
      });
    } catch (_) {}
  }

  getMemoryState();
  try {
    localStorage.setItem('blood_seed_version', SEED_VERSION);
  } catch (_) {}
}

// Export API
export const mockApi = {
  login: (email, password) => {
    initMockDb();
    const users = readTable('blood_users');
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password_hash === password
    );

    if (!user) {
      throw new Error('Invalid email or password. Please verify credentials.');
    }

    let profileId = null;
    if (user.role === 'hospital') {
      const hospitals = readTable('blood_hospitals');
      const hosp = hospitals.find((h) => h.user_id === user.id || (user.id === 'u-hosp-legacy' && h.id === 'h-1'));
      profileId = hosp ? hosp.id : 'h-1';
    } else if (user.role === 'blood_bank') {
      const banks = readTable('blood_banks');
      const bank = banks.find((b) => b.user_id === user.id);
      profileId = bank ? bank.id : 'bb-1';
    } else if (user.role === 'donor') {
      const donors = readTable('blood_donors');
      const donor = donors.find((d) => d.user_id === user.id || (user.id === 'u-donor-legacy' && d.id === 'd-1'));
      profileId = donor ? donor.id : 'd-1';
    }

    return {
      token: 'mock-jwt-' + generateUUID(),
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '+91 1800-11-2026',
      role: user.role,
      status: user.status,
      profileId,
    };
  },

  register: (role, payload) => {
    initMockDb();
    const users = readTable('blood_users');
    const existing = users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase().trim());
    if (existing) {
      throw new Error('Email is already registered.');
    }

    const userId = 'u-' + generateUUID().substring(0, 8);
    const status = role === 'donor' ? 'approved' : 'pending';

    const newUser = {
      id: userId,
      name: payload.name,
      email: payload.email.toLowerCase().trim(),
      phone: payload.phone || '+91 1800-11-2026',
      password_hash: payload.password,
      role: role,
      status: status,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    writeTable('blood_users', users);

    if (role === 'hospital') {
      const hospitals = readTable('blood_hospitals');
      hospitals.push({
        id: 'h-' + generateUUID().substring(0, 8),
        user_id: userId,
        name: payload.name,
        address: payload.address,
        state: payload.state || 'Delhi',
        district: payload.district || 'New Delhi',
        lat: parseFloat(payload.lat) || 28.6139,
        lng: parseFloat(payload.lng) || 77.2090,
        created_at: new Date().toISOString(),
      });
      writeTable('blood_hospitals', hospitals);
    } else if (role === 'blood_bank') {
      const banks = readTable('blood_banks');
      const bankId = 'bb-' + generateUUID().substring(0, 8);
      banks.push({
        id: bankId,
        user_id: userId,
        name: payload.name,
        address: payload.address,
        state: payload.state || 'Delhi',
        district: payload.district || 'New Delhi',
        phone: payload.phone || '+91 1800-11-2026',
        email: payload.email,
        category: 'Govt.',
        type: 'Blood Bank',
        lastUpdated: 'Live Today',
        lat: parseFloat(payload.lat) || 28.6139,
        lng: parseFloat(payload.lng) || 77.2090,
        is_eraktkosh: true,
        created_at: new Date().toISOString(),
      });
      writeTable('blood_banks', banks);

      const inventory = readTable('blood_inventory');
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      bloodGroups.forEach((bg) => {
        inventory.push({
          id: 'bi-' + generateUUID().substring(0, 8),
          blood_bank_id: bankId,
          blood_group: bg,
          units_available: 10,
          expiry_date: daysFromNow(30),
          batch_id: `INIT-${bg}-101`,
          updated_at: new Date().toISOString(),
        });
      });
      writeTable('blood_inventory', inventory);
    } else if (role === 'donor') {
      const donors = readTable('blood_donors');
      donors.push({
        id: 'd-' + generateUUID().substring(0, 8),
        user_id: userId,
        name: payload.name,
        blood_group: payload.blood_group || 'O+',
        last_donation_date: payload.last_donation_date || null,
        available_flag: true,
        address: payload.address,
        state: payload.state || 'Delhi',
        district: payload.district || 'New Delhi',
        lat: parseFloat(payload.lat) || 28.6139,
        lng: parseFloat(payload.lng) || 77.2090,
        created_at: new Date().toISOString(),
      });
      writeTable('blood_donors', donors);
    }

    return {
      success: true,
      message:
        role === 'donor'
          ? 'Registered successfully! You can login now.'
          : 'Registered successfully! Pending Admin approval.',
      role,
      status,
    };
  },

  getPublicDashboard: () => {
    initMockDb();
    const banks = readTable('blood_banks');
    const hospitals = readTable('blood_hospitals');
    const inventory = readTable('blood_inventory');
    const donors = readTable('blood_donors');

    const aggregate = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
      'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0
    };

    const details = inventory.map(item => {
      const bank = banks.find(b => b.id === item.blood_bank_id);
      if (aggregate[item.blood_group] !== undefined) {
        aggregate[item.blood_group] += (item.units_available || 0);
      }
      return {
        ...item,
        blood_bank_name: bank ? bank.name : 'Blood Centre',
        address: bank ? bank.address : '',
        state: bank ? bank.state : '',
        district: bank ? bank.district : '',
        category: bank ? bank.category : 'Govt.',
      };
    });

    return {
      aggregate,
      details,
      totalBanks: banks.length,
      totalHospitals: hospitals.length,
      totalDonors: donors.length,
    };
  },

  getPublicStockAvailability: () => {
    initMockDb();
    const banks = readTable('blood_banks');
    const inventory = readTable('blood_inventory');

    return banks.map((bank) => {
      const bankStock = inventory.filter((item) => item.blood_bank_id === bank.id);
      const stockSummary = bankStock.reduce((acc, item) => {
        acc[item.blood_group] = (acc[item.blood_group] || 0) + item.units_available;
        return acc;
      }, {});

      return {
        ...bank,
        stockSummary,
      };
    });
  },

  // Get detailed info for a single blood bank (stock breakdown, inventory batches, contact)
  getBloodBankDetail: (bankId) => {
    initMockDb();
    const banks = readTable('blood_banks');
    const inventory = readTable('blood_inventory');
    const requests = readTable('blood_requests');

    const bank = banks.find(b => b.id === bankId);
    if (!bank) return null;

    const bankInventory = inventory.filter(item => item.blood_bank_id === bankId);
    const stockSummary = bankInventory.reduce((acc, item) => {
      acc[item.blood_group] = (acc[item.blood_group] || 0) + item.units_available;
      return acc;
    }, {});
    const totalUnits = Object.values(stockSummary).reduce((a, b) => a + b, 0);
    const pendingRequests = requests.filter(r => r.blood_bank_id === bankId && r.status === 'pending');

    return {
      ...bank,
      stockSummary,
      totalUnits,
      inventory: bankInventory,
      pendingRequestCount: pendingRequests.length,
    };
  },

  // Find the nearest blood banks that have stock of a specific blood group
  findNearestBankForGroup: (bloodGroup, lat, lng) => {
    initMockDb();
    const banks = readTable('blood_banks');
    const inventory = readTable('blood_inventory');

    const results = [];
    banks.forEach(bank => {
      const bankStock = inventory
        .filter(item => item.blood_bank_id === bank.id && item.blood_group === bloodGroup)
        .reduce((sum, item) => sum + (item.units_available || 0), 0);

      if (bankStock > 0) {
        const dist = getDistance(lat, lng, bank.lat, bank.lng);
        results.push({
          ...bank,
          unitsAvailable: bankStock,
          distance: dist,
          responseTime: Math.floor(dist * 3) + 12 + ' mins',
        });
      }
    });

    return results.sort((a, b) => a.distance - b.distance).slice(0, 20);
  },

  // Create a public blood request (from Dashboard, no login required)
  createPublicBloodRequest: (payload) => {
    initMockDb();
    const banks = readTable('blood_banks');
    const inventory = readTable('blood_inventory');
    const requests = readTable('blood_requests');

    // Find nearest bank with stock
    let targetBank = null;
    if (payload.blood_bank_id) {
      targetBank = banks.find(b => b.id === payload.blood_bank_id);
    } else {
      // Auto-find nearest with stock
      const lat = parseFloat(payload.lat) || 28.6139;
      const lng = parseFloat(payload.lng) || 77.2090;
      const candidates = [];

      banks.forEach(bank => {
        const bankStock = inventory
          .filter(item => item.blood_bank_id === bank.id && item.blood_group === payload.blood_group)
          .reduce((sum, item) => sum + (item.units_available || 0), 0);

        if (bankStock >= (parseInt(payload.units_needed) || 1)) {
          candidates.push({
            bank,
            stock: bankStock,
            dist: getDistance(lat, lng, bank.lat, bank.lng)
          });
        }
      });

      candidates.sort((a, b) => a.dist - b.dist);
      if (candidates.length > 0) {
        targetBank = candidates[0].bank;
      }
    }

    if (!targetBank) {
      return { success: false, message: 'No blood bank found with sufficient stock for ' + payload.blood_group };
    }

    const newRequest = {
      id: 'br-' + generateUUID().substring(0, 8),
      hospital_id: payload.hospital_id || 'public-request',
      blood_bank_id: targetBank.id,
      blood_group: payload.blood_group,
      units_needed: parseInt(payload.units_needed) || 1,
      urgency: payload.urgency || 'normal',
      patient_name: payload.patient_name || 'Public Requester',
      contact_phone: payload.contact_phone || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    requests.unshift(newRequest);
    writeTable('blood_requests', requests);

    // Notify the blood bank with rich metadata
    mockApi.addNotification(
      targetBank.user_id,
      payload.urgency === 'emergency' ? 'emergency_request' : 'blood_request',
      `${payload.urgency === 'emergency' ? '🚨 EMERGENCY: ' : '📋 '}New blood request for ${payload.units_needed} units of ${payload.blood_group} from ${payload.patient_name || 'a patient'}. Contact: ${payload.contact_phone || 'N/A'}`,
      payload.urgency === 'emergency' ? ['in_app', 'sms'] : ['in_app', 'email'],
      {
        requestId: newRequest.id,
        bloodGroup: payload.blood_group,
        unitsNeeded: payload.units_needed,
        urgency: payload.urgency || 'routine',
        patientName: payload.patient_name || 'Emergency Patient',
        contactPhone: payload.contact_phone || 'N/A',
        status: 'pending',
        title: `${payload.urgency === 'emergency' ? '🚨 Emergency Request' : '📋 Blood Order'} • ${payload.blood_group} (${payload.units_needed} Units)`
      }
    );

    return {
      success: true,
      request: newRequest,
      blood_bank_name: targetBank.name,
      blood_bank_address: targetBank.address,
      blood_bank_phone: targetBank.phone,
      blood_bank_district: targetBank.district,
      blood_bank_state: targetBank.state,
      message: `Request sent to ${targetBank.name} (${targetBank.district}, ${targetBank.state})`
    };
  },

  /**
   * Advanced Cross-Match Engine for Hospitals
   * Matches recipient blood group & component against nearby inventory using clinical compatibility rules and FEFO.
   */
  crossMatchBlood: (hospitalId, payload) => {
    initMockDb();
    const recipientBloodGroup = payload.recipientBloodGroup || payload.blood_group;
    const componentType = (payload.componentType || payload.component_type || 'RBC').toUpperCase();
    const unitsNeeded = parseInt(payload.unitsNeeded || payload.units_needed) || 1;
    const radiusKm = parseFloat(payload.radiusKm || payload.radius_km) || 25;
    const urgency = payload.urgency || 'routine';

    if (!isValidBloodGroup(recipientBloodGroup)) {
      throw new Error(`Invalid recipient blood group: ${recipientBloodGroup}`);
    }
    if (!isValidComponentType(componentType)) {
      throw new Error(`Invalid component type: ${componentType}`);
    }

    const hospitals = readTable('blood_hospitals');
    const hospital = hospitals.find(h => h.id === hospitalId || h.user_id === hospitalId) || hospitals[0] || {
      id: hospitalId || 'h-1',
      name: 'General Hospital',
      lat: 28.6139,
      lng: 77.2090
    };

    const hospLat = hospital.lat || 28.6139;
    const hospLng = hospital.lng || 77.2090;

    const compatibleGroups = getCompatibleDonorGroups(recipientBloodGroup, componentType);
    const banks = readTable('blood_banks');
    const inventory = readTable('blood_inventory');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matchedBanks = [];
    let totalNearbyCompatibleUnits = 0;

    banks.forEach(bank => {
      const distance = getDistance(hospLat, hospLng, bank.lat, bank.lng);
      if (distance > radiusKm) return;

      // Filter valid inventory (non-expired, units > 0, compatible group & component)
      const validBatches = inventory.filter(item => {
        if (item.blood_bank_id !== bank.id) return false;
        if (!compatibleGroups.includes(item.blood_group)) return false;
        const itemComp = (item.component_type || 'RBC').toUpperCase();
        if (itemComp !== componentType && itemComp !== 'RBC' && componentType !== 'RBC') return false;
        if ((item.units_available || 0) <= 0) return false;
        if (item.expiry_date) {
          const expDate = new Date(item.expiry_date);
          if (expDate < today) return false; // Exclude expired
        }
        return true;
      });

      if (validBatches.length === 0) return;

      // Sort batches by FEFO (First Expire, First Out)
      validBatches.sort((a, b) => new Date(a.expiry_date || '2099-01-01') - new Date(b.expiry_date || '2099-01-01'));

      // Calculate stock per group
      const stockBreakdown = {};
      let exactUnits = 0;
      let compatibleAlternativeUnits = 0;
      let totalBankCompatible = 0;

      compatibleGroups.forEach(bg => {
        const groupBatches = validBatches.filter(b => b.blood_group === bg);
        const groupUnits = groupBatches.reduce((sum, b) => sum + (b.units_available || 0), 0);
        if (groupUnits > 0) {
          const details = getCompatibilityDetails(bg, recipientBloodGroup, componentType);
          stockBreakdown[bg] = {
            blood_group: bg,
            units: groupUnits,
            matchType: details.matchType,
            priorityRank: details.priorityRank,
            reason: details.reason,
            earliestExpiry: groupBatches[0]?.expiry_date || 'N/A'
          };
          totalBankCompatible += groupUnits;
          if (bg === recipientBloodGroup) {
            exactUnits += groupUnits;
          } else {
            compatibleAlternativeUnits += groupUnits;
          }
        }
      });

      if (totalBankCompatible === 0) return;

      totalNearbyCompatibleUnits += totalBankCompatible;

      const isSufficient = totalBankCompatible >= unitsNeeded;
      const shortage = Math.max(0, unitsNeeded - totalBankCompatible);
      const hasExactMatch = exactUnits > 0;
      const primaryMatchType = hasExactMatch ? 'exact_match' : 'compatible_alternative';

      // Primary compatibility details for scoring
      const primaryGroup = hasExactMatch ? recipientBloodGroup : Object.keys(stockBreakdown)[0];
      const primaryDetails = getCompatibilityDetails(primaryGroup, recipientBloodGroup, componentType);
      const matchScore = calculateMatchScore(primaryDetails, distance, isSufficient);

      matchedBanks.push({
        id: bank.id,
        name: bank.name,
        address: bank.address,
        phone: bank.phone,
        email: bank.email,
        district: bank.district,
        state: bank.state,
        category: bank.category || 'Govt.',
        lat: bank.lat,
        lng: bank.lng,
        distance,
        responseTime: Math.floor(distance * 3) + 12 + ' mins',
        exactUnits,
        compatibleAlternativeUnits,
        totalCompatibleUnits: totalBankCompatible,
        requiredUnits: unitsNeeded,
        sufficient: isSufficient,
        shortage,
        primaryMatchType,
        matchScore,
        earliestExpiry: validBatches[0]?.expiry_date || 'N/A',
        stockBreakdown,
        inventoryBatches: validBatches.map(b => ({
          id: b.id,
          batch_id: b.batch_id,
          blood_group: b.blood_group,
          units_available: b.units_available,
          expiry_date: b.expiry_date,
          component_type: b.component_type || componentType,
          isExact: b.blood_group === recipientBloodGroup
        }))
      });
    });

    // Rank results: prioritize highest match score, then closest distance, then earliest expiry
    matchedBanks.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.distance - b.distance;
    });

    const isOverallSufficient = totalNearbyCompatibleUnits >= unitsNeeded;
    const closestBankSufficient = matchedBanks[0]?.sufficient || false;
    const multiBankMatchAvailable = !closestBankSufficient && isOverallSufficient && matchedBanks.length > 1;

    return {
      success: true,
      recipientBloodGroup,
      componentType,
      unitsNeeded,
      radiusKm,
      urgency,
      compatibleDonorGroups: compatibleGroups,
      hospital: {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        lat: hospLat,
        lng: hospLng
      },
      summary: {
        totalCompatibleBanksFound: matchedBanks.length,
        totalNearbyCompatibleUnits,
        requiredUnits: unitsNeeded,
        isOverallSufficient,
        shortage: Math.max(0, unitsNeeded - totalNearbyCompatibleUnits),
        multiBankMatchAvailable,
        closestBank: matchedBanks[0] || null
      },
      banks: matchedBanks,
      medicalDisclaimer: 'Automated compatibility and inventory matching aid. Final clinical compatibility must be confirmed by qualified laboratory and blood-bank personnel.'
    };
  },

  /**
   * Cross-Match Compatible Volunteer Donors for Hospitals
   */
  crossMatchDonors: (hospitalId, params = {}) => {
    initMockDb();
    const recipientBloodGroup = params.bloodGroup || params.blood_group || 'O+';
    const componentType = (params.component || params.component_type || 'RBC').toUpperCase();
    const radiusKm = parseFloat(params.radiusKm || params.radius_km) || 25;

    if (!isValidBloodGroup(recipientBloodGroup)) {
      throw new Error(`Invalid blood group: ${recipientBloodGroup}`);
    }

    const hospitals = readTable('blood_hospitals');
    const hospital = hospitals.find(h => h.id === hospitalId || h.user_id === hospitalId) || hospitals[0] || {
      lat: 28.6139,
      lng: 77.2090
    };

    const hospLat = hospital.lat || 28.6139;
    const hospLng = hospital.lng || 77.2090;

    const compatibleGroups = getCompatibleDonorGroups(recipientBloodGroup, componentType);
    const donors = readTable('blood_donors');
    const users = readTable('blood_users');

    const matchedDonors = [];

    donors
      .filter(d => d.available_flag && compatibleGroups.includes(d.blood_group))
      .forEach(d => {
        const distance = getDistance(hospLat, hospLng, d.lat, d.lng);
        if (distance > radiusKm) return;

        const u = users.find(user => user.id === d.user_id);
        const details = getCompatibilityDetails(d.blood_group, recipientBloodGroup, componentType);
        const isExact = d.blood_group === recipientBloodGroup;
        const matchScore = calculateMatchScore(details, distance, true);

        matchedDonors.push({
          id: d.id,
          name: d.name || 'Volunteer Donor',
          blood_group: d.blood_group,
          isExact,
          matchType: isExact ? 'exact_match' : 'compatible_alternative',
          priorityRank: details.priorityRank,
          reason: details.reason,
          distance,
          state: d.state,
          district: d.district,
          available_flag: d.available_flag,
          last_donation_date: d.last_donation_date || 'Eligible',
          phone: u?.phone || d.phone || '+91 98100-00000',
          email: u?.email || d.email || '',
          matchScore
        });
      });

    matchedDonors.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.distance - b.distance;
    });

    return {
      success: true,
      recipientBloodGroup,
      componentType,
      radiusKm,
      compatibleDonorGroups: compatibleGroups,
      totalDonorsFound: matchedDonors.length,
      donors: matchedDonors
    };
  },

  /**
   * Public Compatibility Information
   */
  getBloodCompatibility: (bloodGroup, componentType = 'RBC') => {
    if (!isValidBloodGroup(bloodGroup)) {
      throw new Error(`Invalid blood group: ${bloodGroup}`);
    }
    const comp = (componentType || 'RBC').toUpperCase();
    const compatibleDonors = getCompatibleDonorGroups(bloodGroup, comp);
    const compatibleRecipients = getCompatibleRecipientGroups(bloodGroup, comp);

    const details = compatibleDonors.map(donor => getCompatibilityDetails(donor, bloodGroup, comp));

    return {
      bloodGroup,
      componentType: comp,
      compatibleDonorGroups: compatibleDonors,
      canDonateToGroups: compatibleRecipients,
      details,
      medicalDisclaimer: 'Automated compatibility aid for blood coordination. Clinical crossmatching required before transfusion.'
    };
  },

  getNearbyDonors: (lat, lng, maxDistanceKm = 50) => {
    initMockDb();
    const donors = readTable('blood_donors');
    const users = readTable('blood_users');

    return donors
      .filter((d) => d.available_flag)
      .map((d) => {
        const u = users.find((user) => user.id === d.user_id);
        const dist = getDistance(lat, lng, d.lat, d.lng);
        return {
          ...d,
          phone: u?.phone || d.phone || '+91 98100-00000',
          email: u?.email || d.email || '',
          distance: dist,
        };
      })
      .filter((d) => d.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  },

  getHospitalProfile: (user) => {
    initMockDb();
    const hospitals = readTable('blood_hospitals');
    return hospitals.find((h) => h.user_id === user.id || (user.id === 'u-hosp-legacy' && h.id === 'h-1')) || hospitals[0];
  },

  getHospitalRequests: (hospitalProfileId) => {
    initMockDb();
    const requests = readTable('blood_requests');
    const banks = readTable('blood_banks');
    return requests
      .filter((r) => r.hospital_id === hospitalProfileId)
      .map((r) => {
        const bank = banks.find((b) => b.id === r.blood_bank_id);
        return {
          ...r,
          blood_bank_name: bank ? bank.name : 'Government Blood Centre',
          address: bank ? bank.address : 'e-RaktKosh Network Hub',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  createBloodRequest: (hospitalProfileId, payload) => {
    initMockDb();
    const requests = readTable('blood_requests');
    const banks = readTable('blood_banks');
    const hospitals = readTable('blood_hospitals');

    const bank = banks.find((b) => b.id === payload.blood_bank_id);
    const hosp = hospitals.find((h) => h.id === hospitalProfileId);

    const newRequest = {
      id: 'br-' + generateUUID().substring(0, 8),
      hospital_id: hospitalProfileId,
      blood_bank_id: payload.blood_bank_id,
      blood_group: payload.blood_group,
      units_needed: parseInt(payload.units_needed),
      urgency: payload.urgency || 'normal',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    requests.unshift(newRequest);
    writeTable('blood_requests', requests);

    if (bank) {
      mockApi.addNotification(
        bank.user_id,
        payload.urgency === 'emergency' ? 'emergency_request' : 'blood_request',
        `${payload.urgency === 'emergency' ? '🚨 EMERGENCY: ' : '📋 '}${hosp?.name || 'A Hospital'} requested ${payload.units_needed} units of ${payload.blood_group}.`,
        payload.urgency === 'emergency' ? ['in_app', 'sms'] : ['in_app', 'email'],
        {
          requestId: newRequest.id,
          bloodGroup: payload.blood_group,
          unitsNeeded: payload.units_needed,
          urgency: payload.urgency || 'routine',
          hospitalName: hosp?.name || 'Partner Hospital',
          hospitalAddress: hosp?.address || '',
          hospitalDistrict: hosp?.district || '',
          hospitalState: hosp?.state || '',
          status: 'pending',
          title: `${payload.urgency === 'emergency' ? '🚨 Emergency Request' : '📋 Hospital Requisition'} • ${payload.blood_group} (${payload.units_needed} Units)`
        }
      );
    }

    return newRequest;
  },

  getBloodBankProfile: (user) => {
    initMockDb();
    const banks = readTable('blood_banks');
    return banks.find((b) => b.user_id === user.id) || banks[0];
  },

  getInventory: (bloodBankId) => {
    initMockDb();
    const inventory = readTable('blood_inventory');
    return inventory.filter((item) => item.blood_bank_id === bloodBankId);
  },

  addInventoryItem: (bloodBankId, item) => {
    initMockDb();
    const inventory = readTable('blood_inventory');
    const newItem = {
      id: 'bi-' + generateUUID().substring(0, 8),
      blood_bank_id: bloodBankId,
      blood_group: item.blood_group,
      units_available: parseInt(item.units_available),
      expiry_date: item.expiry_date,
      batch_id: item.batch_id,
      updated_at: new Date().toISOString(),
    };
    inventory.push(newItem);
    writeTable('blood_inventory', inventory);
    return newItem;
  },

  updateInventoryItem: (itemId, item) => {
    initMockDb();
    const inventory = readTable('blood_inventory');
    const index = inventory.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      inventory[index] = {
        ...inventory[index],
        blood_group: item.blood_group,
        units_available: parseInt(item.units_available),
        expiry_date: item.expiry_date,
        batch_id: item.batch_id,
        updated_at: new Date().toISOString(),
      };
      writeTable('blood_inventory', inventory);
      return inventory[index];
    }
    throw new Error('Inventory item not found');
  },

  deleteInventoryItem: (itemId) => {
    initMockDb();
    let inventory = readTable('blood_inventory');
    inventory = inventory.filter((i) => i.id !== itemId);
    writeTable('blood_inventory', inventory);
    return { success: true };
  },

  getBloodBankRequests: (bloodBankId) => {
    initMockDb();
    const requests = readTable('blood_requests');
    const hospitals = readTable('blood_hospitals');

    return requests
      .filter((r) => r.blood_bank_id === bloodBankId)
      .map((r) => {
        const hosp = hospitals.find((h) => h.id === r.hospital_id);
        return {
          ...r,
          hospital_name: hosp ? hosp.name : 'Unknown Hospital',
          hospital_address: hosp ? hosp.address : '',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  updateRequestStatus: (requestId, status) => {
    initMockDb();
    const requests = readTable('blood_requests');
    const index = requests.findIndex((r) => r.id === requestId);
    if (index !== -1) {
      requests[index].status = status;
      writeTable('blood_requests', requests);

      const hospitals = readTable('blood_hospitals');
      const banks = readTable('blood_banks');
      const hosp = hospitals.find((h) => h.id === requests[index].hospital_id);
      const bnk = banks.find((b) => b.id === requests[index].blood_bank_id);
      
      if (hosp) {
        mockApi.addNotification(
          hosp.user_id,
          'request_response',
          `Your blood requisition for ${requests[index].units_needed} units of ${requests[index].blood_group} has been ${status.toUpperCase()} by ${bnk?.name || 'the blood centre'}.`,
          ['in_app', 'email'],
          {
            requestId: requests[index].id,
            bloodGroup: requests[index].blood_group,
            unitsNeeded: requests[index].units_needed,
            urgency: requests[index].urgency,
            status,
            bloodBankName: bnk?.name || 'Blood Centre',
            title: `Order ${status.toUpperCase()} • ${requests[index].blood_group} (${requests[index].units_needed} Units)`
          }
        );
      }

      return requests[index];
    }
    throw new Error('Request not found');
  },

  getDonorProfile: (user) => {
    initMockDb();
    const donors = readTable('blood_donors');
    return donors.find((d) => d.user_id === user.id || (user.id === 'u-donor-legacy' && d.id === 'd-1')) || donors[0];
  },

  toggleDonorAvailability: (donorId, availableFlag) => {
    initMockDb();
    const donors = readTable('blood_donors');
    const index = donors.findIndex((d) => d.id === donorId);
    if (index !== -1) {
      donors[index].available_flag = availableFlag;
      writeTable('blood_donors', donors);
      return donors[index];
    }
    throw new Error('Donor profile not found');
  },

  getDonorRequests: (donorId) => {
    return {
      bankRequests: [
        {
          id: 'inv-1',
          from: 'Indian Red Cross Society National HQ',
          type: 'blood_bank',
          blood_group: 'O-',
          units: 1,
          urgency: 'high',
          status: 'pending',
          created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        },
      ],
      hospitalRequests: [
        {
          id: 'inv-2',
          from: 'AIIMS New Delhi Trauma Center',
          type: 'hospital',
          blood_group: 'O-',
          units: 1,
          urgency: 'critical',
          status: 'pending',
          created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
        },
      ],
    };
  },

  respondToOffer: (offerId, status) => {
    return { success: true, offerId, status };
  },

  requestDonorDonation: (donorId, requesterType, requesterProfileId) => {
    initMockDb();
    const donors = readTable('blood_donors');
    const donor = donors.find(d => d.id === donorId);
    if (!donor) return { success: false, message: 'Donor not found' };

    mockApi.addNotification(
      donor.user_id,
      'donation_request',
      `A ${requesterType === 'blood_bank' ? 'blood bank' : 'hospital'} has requested your blood donation (${donor.blood_group}). Please respond at your earliest convenience.`,
      ['in_app', 'sms']
    );

    return { success: true, donorId, requesterType, requesterProfileId };
  },

  getAdminUsers: () => {
    initMockDb();
    return readTable('blood_users');
  },

  getAdminQueries: () => {
    initMockDb();
    return readTable('blood_queries');
  },

  updateUserStatus: (userId, status) => {
    initMockDb();
    const users = readTable('blood_users');
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].status = status;
      writeTable('blood_users', users);
      return users[index];
    }
    throw new Error('User not found');
  },

  updateUserRole: (userId, role) => {
    initMockDb();
    const users = readTable('blood_users');
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].role = role;
      writeTable('blood_users', users);
      return users[index];
    }
    throw new Error('User not found');
  },

  resolveQuery: (queryId, responseText) => {
    initMockDb();
    const queries = readTable('blood_queries');
    const index = queries.findIndex((q) => q.id === queryId);
    if (index !== -1) {
      queries[index].status = 'resolved';
      queries[index].admin_response = responseText;
      queries[index].resolved_at = new Date().toISOString();
      writeTable('blood_queries', queries);
      return queries[index];
    }
    throw new Error('Query not found');
  },

  createQuery: (userId, subject, message) => {
    initMockDb();
    const queries = readTable('blood_queries');
    const newQ = {
      id: 'q-' + generateUUID().substring(0, 8),
      user_id: userId,
      subject,
      message,
      status: 'open',
      admin_response: '',
      created_at: new Date().toISOString(),
      resolved_at: null
    };
    queries.unshift(newQ);
    writeTable('blood_queries', queries);
    return newQ;
  },

  getAdminStats: () => {
    initMockDb();
    const users = readTable('blood_users');
    const banks = readTable('blood_banks');
    const hospitals = readTable('blood_hospitals');
    const donors = readTable('blood_donors');
    const inventory = readTable('blood_inventory');
    const requests = readTable('blood_requests');

    const totalStock = inventory.reduce((sum, item) => sum + (item.units_available || 0), 0);

    return {
      totalUsers: users.length,
      totalBanks: banks.length,
      totalHospitals: hospitals.length,
      totalDonors: donors.length,
      totalStockUnits: totalStock,
      totalRequests: requests.length,
      pendingApprovals: users.filter((u) => u.status === 'pending').length,
    };
  },

  getRequestDetail: (requestId) => {
    initMockDb();
    const requests = readTable('blood_requests');
    let req = requests.find((r) => r.id === requestId);
    if (!req && requestId) {
      // Fallback lookup by prefix or partial
      req = requests.find((r) => r.id.includes(requestId) || requestId.includes(r.id));
    }
    if (!req) {
      // Return first available request if ID not found so modal never breaks
      req = requests[0];
    }
    if (!req) return null;

    const hospitals = readTable('blood_hospitals');
    const banks = readTable('blood_banks');
    const hosp = hospitals.find((h) => h.id === req.hospital_id);
    const bank = banks.find((b) => b.id === req.blood_bank_id);

    return {
      ...req,
      hospital_name: req.hospital_name || hosp?.name || 'Medical Center Requisition',
      hospital_address: hosp?.address || 'Medical District',
      hospital_phone: hosp?.phone || req.contact_phone || '+91 1800-11-2026',
      hospital_district: hosp?.district || 'Central',
      hospital_state: hosp?.state || 'Delhi',
      hospital_lat: hosp?.lat || 28.5672,
      hospital_lng: hosp?.lng || 77.2100,
      blood_bank_name: req.blood_bank_name || bank?.name || 'Regional Blood Centre',
      blood_bank_address: bank?.address || 'Central Blood Bank Facility',
      blood_bank_phone: bank?.phone || '+91 11-23716441',
      blood_bank_district: bank?.district || 'Central',
      blood_bank_state: bank?.state || 'Delhi',
      blood_bank_lat: bank?.lat || 28.6139,
      blood_bank_lng: bank?.lng || 77.2090,
    };
  },

  getNotifications: (userId) => {
    initMockDb();
    const notifs = readTable('blood_notifications');
    return notifs.filter((n) => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addNotification: (userId, type, message, channels = ['in_app'], metadata = {}) => {
    initMockDb();
    const notifs = readTable('blood_notifications');
    const newNotif = {
      id: 'notif-' + generateUUID().substring(0, 8),
      user_id: userId,
      type,
      title: metadata.title || (type === 'emergency_request' ? '🚨 Emergency Request' : type === 'blood_request' ? '📋 Blood Order' : type === 'request_response' ? '✓ Order Update' : '🔔 Notification Alert'),
      message,
      channels,
      read_flag: false,
      metadata,
      created_at: new Date().toISOString(),
    };
    notifs.unshift(newNotif);
    writeTable('blood_notifications', notifs);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('new_notification', { detail: newNotif }));
    }

    return newNotif;
  },

  markNotificationRead: (notifId) => {
    initMockDb();
    const notifs = readTable('blood_notifications');
    const index = notifs.findIndex((n) => n.id === notifId);
    if (index !== -1) {
      notifs[index].read_flag = true;
      writeTable('blood_notifications', notifs);
      return notifs[index];
    }
    return null;
  },

  markAllNotificationsRead: (userId) => {
    initMockDb();
    const notifs = readTable('blood_notifications');
    let updated = false;
    notifs.forEach((n) => {
      if (n.user_id === userId && !n.read_flag) {
        n.read_flag = true;
        updated = true;
      }
    });
    if (updated) {
      writeTable('blood_notifications', notifs);
    }
    return { success: true };
  },

  syncEraktkoshLive: async (stateCode = '97') => {
    try {
      const freshBanks = await fetchStateEraktkosh(stateCode);
      if (freshBanks && freshBanks.length > 0) {
        const banks = readTable('blood_banks');
        const inventory = readTable('blood_inventory');

        freshBanks.forEach((fresh) => {
          const existingIdx = banks.findIndex(
            (b) => b.name.toLowerCase() === fresh.name.toLowerCase() && b.state === fresh.state
          );

          if (existingIdx !== -1) {
            banks[existingIdx] = { ...banks[existingIdx], ...fresh };
            const stock = fresh.stockSummary || {};
            Object.keys(stock).forEach((bg) => {
              const invIdx = inventory.findIndex(
                (i) => i.blood_bank_id === banks[existingIdx].id && i.blood_group === bg
              );
              if (invIdx !== -1) {
                inventory[invIdx].units_available = stock[bg];
                inventory[invIdx].updated_at = new Date().toISOString();
              }
            });
          }
        });

        writeTable('blood_banks', banks);
        writeTable('blood_inventory', inventory);
        return { success: true, count: freshBanks.length, state: freshBanks[0]?.state || 'State' };
      }
    } catch (e) {
      console.warn('Live e-RaktKosh sync error:', e);
    }
    return { success: false, message: 'Sync failed or no records returned' };
  },

  runExpiryCheckCron: () => {
    initMockDb();
    const inventory = readTable('blood_inventory');
    const banks = readTable('blood_banks');
    const now = new Date();
    const thresholdDays = 7;
    let alertsCreated = 0;

    inventory.forEach((item) => {
      const expiry = new Date(item.expiry_date);
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= thresholdDays && diffDays > 0) {
        const bank = banks.find((b) => b.id === item.blood_bank_id);
        if (bank) {
          mockApi.addNotification(
            bank.user_id,
            'expiry_alert',
            `⚠️ Batch ${item.batch_id} (${item.units_available} units of ${item.blood_group}) will expire in ${diffDays} days on ${item.expiry_date}.`,
            ['in_app', 'email']
          );
          alertsCreated++;
        }
      }
    });

    return { success: true, count: alertsCreated };
  },
};
