// Mock Database Layer using localStorage for the Blood Coordination Platform

const SEED_VERSION = 'v1.2';

// Haversine Distance Formula in Kilometers
export function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 99999;
  const R = 6371; // Earth radius in km
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

// Generate UUID simple version
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Default Seeds
const INITIAL_USERS = [
  { id: 'u-admin-1', name: 'Dr. Sarah Carter (Operator)', email: 'admin@blood.org', phone: '+1 555-0100', password_hash: 'admin123', role: 'admin', status: 'approved', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'u-bank-1', name: 'Red Cross Midtown Center', email: 'redcross@blood.org', phone: '+1 555-0111', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'u-bank-2', name: 'Brooklyn Blood Depot', email: 'brooklyn@blood.org', phone: '+1 555-0122', password_hash: 'bank123', role: 'blood_bank', status: 'pending', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'u-bank-3', name: 'Queens Blood Logistics Hub', email: 'queens@blood.org', phone: '+1 555-0188', password_hash: 'bank123', role: 'blood_bank', status: 'approved', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'u-hosp-1', name: 'Bellevue Hospital Center', email: 'bellevue@blood.org', phone: '+1 555-0133', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'u-hosp-2', name: 'Mount Sinai Hospital', email: 'mountsinai@blood.org', phone: '+1 555-0144', password_hash: 'hosp123', role: 'hospital', status: 'pending', created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'u-hosp-3', name: 'Lenox Hill Medical Center', email: 'lenox@blood.org', phone: '+1 555-0199', password_hash: 'hosp123', role: 'hospital', status: 'approved', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'u-donor-1', name: 'John Doe', email: 'john@gmail.com', phone: '+1 555-0155', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'u-donor-2', name: 'Jane Smith', email: 'jane@gmail.com', phone: '+1 555-0166', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'u-donor-3', name: 'Bob Jones', email: 'bob@gmail.com', phone: '+1 555-0177', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'u-donor-4', name: 'Alice Williams', email: 'alice@gmail.com', phone: '+1 555-0188', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'u-donor-5', name: 'Charlie Green', email: 'charlie@gmail.com', phone: '+1 555-0211', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'u-donor-6', name: 'Diana Prince', email: 'diana@gmail.com', phone: '+1 555-0222', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'u-donor-7', name: 'Evan Wright', email: 'evan@gmail.com', phone: '+1 555-0233', password_hash: 'donor123', role: 'donor', status: 'approved', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
];

const INITIAL_BLOOD_BANKS = [
  { id: 'bb-1', user_id: 'u-bank-1', name: 'Red Cross Midtown Center', address: '440 9th Ave, New York, NY', district: 'Manhattan', lat: 40.752726, lng: -73.977229, created_at: new Date().toISOString() },
  { id: 'bb-2', user_id: 'u-bank-2', name: 'Brooklyn Blood Depot', address: '120 Schermerhorn St, Brooklyn, NY', district: 'Brooklyn', lat: 40.692455, lng: -73.987303, created_at: new Date().toISOString() },
  { id: 'bb-3', user_id: 'u-bank-3', name: 'Queens Blood Logistics Hub', address: '82-11 37th Ave, Queens, NY', district: 'Queens', lat: 40.7484, lng: -73.8861, created_at: new Date().toISOString() },
];

const INITIAL_HOSPITALS = [
  { id: 'h-1', user_id: 'u-hosp-1', name: 'Bellevue Hospital Center', address: '462 1st Ave, New York, NY', district: 'Manhattan', lat: 40.738871, lng: -73.976527, created_at: new Date().toISOString() },
  { id: 'h-2', user_id: 'u-hosp-2', name: 'Mount Sinai Hospital', address: '1468 Madison Ave, New York, NY', district: 'Manhattan', lat: 40.790074, lng: -73.952586, created_at: new Date().toISOString() },
  { id: 'h-3', user_id: 'u-hosp-3', name: 'Lenox Hill Medical Center', address: '100 E 77th St, New York, NY', district: 'Manhattan', lat: 40.7738, lng: -73.9594, created_at: new Date().toISOString() },
];

const INITIAL_DONORS = [
  { id: 'd-1', user_id: 'u-donor-1', name: 'John Doe', blood_group: 'A+', last_donation_date: '2026-05-12', available_flag: true, lat: 40.7644, lng: -73.9744, created_at: new Date().toISOString() },
  { id: 'd-2', user_id: 'u-donor-2', name: 'Jane Smith', blood_group: 'O-', last_donation_date: '2026-07-20', available_flag: true, lat: 40.7306, lng: -73.9975, created_at: new Date().toISOString() },
  { id: 'd-3', user_id: 'u-donor-3', name: 'Bob Jones', blood_group: 'B+', last_donation_date: '2026-06-01', available_flag: true, lat: 40.6782, lng: -73.9442, created_at: new Date().toISOString() },
  { id: 'd-4', user_id: 'u-donor-4', name: 'Alice Williams', blood_group: 'AB-', last_donation_date: '2026-08-10', available_flag: true, lat: 40.7549, lng: -73.9840, created_at: new Date().toISOString() },
  { id: 'd-5', user_id: 'u-donor-5', name: 'Charlie Green', blood_group: 'B-', last_donation_date: '2026-07-15', available_flag: true, lat: 40.7410, lng: -73.8820, created_at: new Date().toISOString() },
  { id: 'd-6', user_id: 'u-donor-6', name: 'Diana Prince', blood_group: 'AB+', last_donation_date: '2026-05-30', available_flag: true, lat: 40.7680, lng: -73.9540, created_at: new Date().toISOString() },
  { id: 'd-7', user_id: 'u-donor-7', name: 'Evan Wright', blood_group: 'O+', last_donation_date: '2026-08-01', available_flag: true, lat: 40.7128, lng: -74.0060, created_at: new Date().toISOString() },
];

// Helper to calculate future date relative to now
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const INITIAL_INVENTORY = [
  { id: 'bi-1', blood_bank_id: 'bb-1', blood_group: 'A+', units_available: 24, expiry_date: daysFromNow(25), batch_id: 'BAT-A1-098', updated_at: new Date().toISOString() },
  { id: 'bi-2', blood_bank_id: 'bb-1', blood_group: 'O-', units_available: 6, expiry_date: daysFromNow(2), batch_id: 'BAT-O2-114', updated_at: new Date().toISOString() }, 
  { id: 'bi-3', blood_bank_id: 'bb-1', blood_group: 'B+', units_available: 12, expiry_date: daysFromNow(18), batch_id: 'BAT-B1-762', updated_at: new Date().toISOString() },
  { id: 'bi-4', blood_bank_id: 'bb-1', blood_group: 'AB-', units_available: 3, expiry_date: daysFromNow(4), batch_id: 'BAT-AB3-231', updated_at: new Date().toISOString() }, 
  { id: 'bi-5', blood_bank_id: 'bb-2', blood_group: 'O-', units_available: 10, expiry_date: daysFromNow(30), batch_id: 'BAT-O2-901', updated_at: new Date().toISOString() },
  { id: 'bi-6', blood_bank_id: 'bb-3', blood_group: 'B-', units_available: 18, expiry_date: daysFromNow(15), batch_id: 'BAT-B2-441', updated_at: new Date().toISOString() },
  { id: 'bi-7', blood_bank_id: 'bb-3', blood_group: 'O+', units_available: 45, expiry_date: daysFromNow(20), batch_id: 'BAT-O1-325', updated_at: new Date().toISOString() },
  { id: 'bi-8', blood_bank_id: 'bb-3', blood_group: 'AB+', units_available: 8, expiry_date: daysFromNow(3), batch_id: 'BAT-AB1-552', updated_at: new Date().toISOString() }, // Expiring in 3 days!
];

const INITIAL_REQUESTS = [
  { id: 'br-1', hospital_id: 'h-1', blood_bank_id: 'bb-1', blood_group: 'O-', units_needed: 5, urgency: 'emergency', status: 'pending', created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'br-2', hospital_id: 'h-1', blood_bank_id: 'bb-1', blood_group: 'A+', units_needed: 10, urgency: 'normal', status: 'fulfilled', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'br-3', hospital_id: 'h-3', blood_bank_id: 'bb-1', blood_group: 'B+', units_needed: 8, urgency: 'urgent', status: 'pending', created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 'br-4', hospital_id: 'h-3', blood_bank_id: 'bb-3', blood_group: 'O+', units_needed: 15, urgency: 'normal', status: 'pending', created_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 'br-5', hospital_id: 'h-1', blood_bank_id: 'bb-3', blood_group: 'B-', units_needed: 4, urgency: 'emergency', status: 'fulfilled', created_at: new Date(Date.now() - 36 * 3600000).toISOString() },
];

const INITIAL_QUERIES = [
  { id: 'q-1', user_id: 'u-hosp-1', subject: 'Emergency Escalation Flow Clarification', message: 'If Twilio fail-safety is active, does the dashboard provide fallback notification status updates for supervisors?', status: 'open', admin_response: '', created_at: new Date(Date.now() - 48 * 3600000).toISOString(), resolved_at: null },
  { id: 'q-2', user_id: 'u-donor-1', subject: 'Interval between donations', message: 'What is the required waiting period between donating whole blood and platelets?', status: 'resolved', admin_response: 'For whole blood, the interval is 56 days. For platelets, it is 7 days up to 24 times a year.', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'q-3', user_id: 'u-bank-3', subject: 'Cold chain storage audit logs', message: 'Is there a way to export temperature compliance logs directly to PDF for the health department inspectors?', status: 'open', admin_response: '', created_at: new Date(Date.now() - 12 * 3600000).toISOString(), resolved_at: null },
  { id: 'q-4', user_id: 'u-donor-3', subject: 'Updating registered address coordinates', message: 'I recently relocated from Brooklyn to Queens. Can you update my GPS tracking boundaries so I receive local invites?', status: 'resolved', admin_response: 'Certainly. You can update your coordinates via the Availability Settings tab inside your Volunteer Console.', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), resolved_at: new Date(Date.now() - 1 * 86400000).toISOString() },
];

const INITIAL_NOTIFICATIONS = [
  // Red Cross Midtown Center (u-bank-1) Alerts
  { id: 'n-1', user_id: 'u-bank-1', type: 'expiry_alert', message: 'Inventory Alert: Batch BAT-O2-114 (O-, 6 units) is expiring on ' + daysFromNow(2) + ' (within 5 days threshold).', read_flag: false, sent_via: ['in_app', 'email'], created_at: new Date(Date.now() - 100000).toISOString() },
  { id: 'n-2', user_id: 'u-bank-1', type: 'emergency_request', message: 'EMERGENCY: Bellevue Hospital Center requested 5 units of O- blood immediately.', read_flag: false, sent_via: ['in_app', 'email', 'sms'], created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n-3', user_id: 'u-bank-1', type: 'info', message: 'System Notice: Proximity mapping API updated. Nearest donors calculations are now active.', read_flag: true, sent_via: ['in_app'], created_at: new Date(Date.now() - 86400000).toISOString() },
  
  // Queens Blood Logistics Hub (u-bank-3) Alerts
  { id: 'n-4', user_id: 'u-bank-3', type: 'expiry_alert', message: 'Inventory Alert: Batch BAT-AB1-552 (AB+, 8 units) is expiring on ' + daysFromNow(3) + ' (within 5 days threshold).', read_flag: false, sent_via: ['in_app', 'email'], created_at: new Date(Date.now() - 500000).toISOString() },
  { id: 'n-5', user_id: 'u-bank-3', type: 'emergency_request', message: 'EMERGENCY: Lenox Hill Medical Center requested 8 units of B+ blood immediately.', read_flag: false, sent_via: ['in_app', 'email', 'sms'], created_at: new Date(Date.now() - 2 * 3600000).toISOString() },

  // Bellevue Hospital (u-hosp-1) Alerts
  { id: 'n-6', user_id: 'u-hosp-1', type: 'info', message: 'Dispatch Complete: Order #br-2 (A+, 10 units) from Red Cross Midtown has been marked as FULFILLED and is en route.', read_flag: false, sent_via: ['in_app', 'email'], created_at: new Date(Date.now() - 1200000).toISOString() },
  
  // Lenox Hill Hospital (u-hosp-3) Alerts
  { id: 'n-7', user_id: 'u-hosp-3', type: 'info', message: 'Dispatch Notice: Request #br-5 (B-, 4 units) has been accepted by Queens Hub.', read_flag: false, sent_via: ['in_app'], created_at: new Date(Date.now() - 4000000).toISOString() },
  
  // Volunteer Donor John Doe (u-donor-1) Alerts
  { id: 'n-8', user_id: 'u-donor-1', type: 'info', message: 'Invitation Received: Red Cross Midtown Center has invited you to volunteer donate A+ blood at their Manhattan facility.', read_flag: false, sent_via: ['in_app', 'email'], created_at: new Date(Date.now() - 1800000).toISOString() },

  // Admin Operator Sarah Carter (u-admin-1) Alerts
  { id: 'n-9', user_id: 'u-admin-1', type: 'info', message: 'Registration Queue Notice: Brooklyn Blood Depot (u-bank-2) registration request is pending review.', read_flag: false, sent_via: ['in_app'], created_at: new Date(Date.now() - 25 * 3600000).toISOString() },
  { id: 'n-10', user_id: 'u-admin-1', type: 'info', message: 'Registration Queue Notice: Mount Sinai Hospital (u-hosp-2) registration request is pending review.', read_flag: false, sent_via: ['in_app'], created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
];

const INITIAL_DONATION_OFFERS = [
  { id: 'do-1', donor_id: 'd-1', target_type: 'blood_bank', target_id: 'bb-1', status: 'pending', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'do-2', donor_id: 'd-2', target_type: 'hospital', target_id: 'h-1', status: 'pending', created_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 'do-3', donor_id: 'd-3', target_type: 'blood_bank', target_id: 'bb-1', status: 'accepted', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'do-4', donor_id: 'd-4', target_type: 'blood_bank', target_id: 'bb-3', status: 'declined', created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
];

// DB Loader/Initializer
export function initMockDb(force = false) {
  const currentVer = localStorage.getItem('blood_db_version');
  if (currentVer !== SEED_VERSION || force) {
    localStorage.setItem('blood_users', JSON.stringify(INITIAL_USERS));
    localStorage.setItem('blood_banks', JSON.stringify(INITIAL_BLOOD_BANKS));
    localStorage.setItem('blood_hospitals', JSON.stringify(INITIAL_HOSPITALS));
    localStorage.setItem('blood_donors', JSON.stringify(INITIAL_DONORS));
    localStorage.setItem('blood_inventory', JSON.stringify(INITIAL_INVENTORY));
    localStorage.setItem('blood_requests', JSON.stringify(INITIAL_REQUESTS));
    localStorage.setItem('blood_queries', JSON.stringify(INITIAL_QUERIES));
    localStorage.setItem('blood_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem('blood_donation_offers', JSON.stringify(INITIAL_DONATION_OFFERS));
    localStorage.setItem('blood_db_version', SEED_VERSION);
  }
}

// Low-Level Getters & Setters
function readTable(key) {
  initMockDb();
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function writeTable(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// API Emulators
export const mockApi = {
  // Auth API
  register: (role, payload) => {
    const users = readTable('blood_users');
    if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error('Email is already registered.');
    }

    const userId = 'u-' + generateUUID().substring(0, 8);
    const newUser = {
      id: userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password_hash: payload.password, // storing flat for mock
      role: role,
      status: role === 'donor' ? 'approved' : 'pending', // Onboarding rule: Donors are instant, BB/Hospitals pending
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    writeTable('blood_users', users);

    // Profile updates based on Role
    if (role === 'blood_bank') {
      const banks = readTable('blood_banks');
      banks.push({
        id: 'bb-' + generateUUID().substring(0, 8),
        user_id: userId,
        name: payload.name,
        address: payload.address,
        district: payload.district,
        lat: parseFloat(payload.lat) || 40.7527,
        lng: parseFloat(payload.lng) || -73.9772,
        created_at: new Date().toISOString(),
      });
      writeTable('blood_banks', banks);
    } else if (role === 'hospital') {
      const hospitals = readTable('blood_hospitals');
      hospitals.push({
        id: 'h-' + generateUUID().substring(0, 8),
        user_id: userId,
        name: payload.name,
        address: payload.address,
        district: payload.district,
        lat: parseFloat(payload.lat) || 40.7388,
        lng: parseFloat(payload.lng) || -73.9765,
        created_at: new Date().toISOString(),
      });
      writeTable('blood_hospitals', hospitals);
    } else if (role === 'donor') {
      const donors = readTable('blood_donors');
      donors.push({
        id: 'd-' + generateUUID().substring(0, 8),
        user_id: userId,
        name: payload.name,
        blood_group: payload.blood_group,
        last_donation_date: payload.last_donation_date || null,
        available_flag: true,
        lat: parseFloat(payload.lat) || 40.7644,
        lng: parseFloat(payload.lng) || -73.9744,
        created_at: new Date().toISOString(),
      });
      writeTable('blood_donors', donors);
    }

    return { success: true, message: role === 'donor' ? 'Registered successfully! You can login now.' : 'Registered successfully! Pending Admin approval.' };
  },

  login: (email, password) => {
    const users = readTable('blood_users');
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password_hash !== password) {
      throw new Error('Invalid email or password.');
    }

    // Role-based profile load
    let profileId = null;
    if (user.role === 'blood_bank') {
      const bank = readTable('blood_banks').find((b) => b.user_id === user.id);
      profileId = bank?.id;
    } else if (user.role === 'hospital') {
      const hosp = readTable('blood_hospitals').find((h) => h.user_id === user.id);
      profileId = hosp?.id;
    } else if (user.role === 'donor') {
      const donor = readTable('blood_donors').find((d) => d.user_id === user.id);
      profileId = donor?.id;
    }

    return {
      token: 'mock-jwt-' + generateUUID(),
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profileId: profileId,
    };
  },

  // Public Dashboard
  getPublicDashboard: () => {
    const inventory = readTable('blood_inventory');
    const banks = readTable('blood_banks');
    const hospitals = readTable('blood_hospitals');

    // Aggregate by blood group
    const aggregate = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
      'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0,
    };

    inventory.forEach((item) => {
      if (aggregate[item.blood_group] !== undefined) {
        aggregate[item.blood_group] += item.units_available;
      }
    });

    // Details for search
    const details = inventory.map((inv) => {
      const bank = banks.find((b) => b.id === inv.blood_bank_id);
      return {
        id: inv.id,
        blood_bank_name: bank?.name || 'Unknown Blood Bank',
        district: bank?.district || 'Unknown District',
        address: bank?.address || '',
        blood_group: inv.blood_group,
        units_available: inv.units_available,
        expiry_date: inv.expiry_date,
        batch_id: inv.batch_id,
        lat: bank?.lat,
        lng: bank?.lng,
      };
    });

    return {
      aggregate,
      details,
      totalBanks: banks.length,
      totalHospitals: hospitals.length,
    };
  },

  // Admin Operations
  getAdminUsers: () => readTable('blood_users'),
  
  updateUserStatus: (userId, status) => {
    const users = readTable('blood_users');
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    users[userIndex].status = status;
    writeTable('blood_users', users);

    // Notify user
    mockApi.addNotification(userId, 'account_status', `Your account status has been updated to: ${status.toUpperCase()}`, ['in_app', 'email']);
    return users[userIndex];
  },

  updateUserRole: (userId, role) => {
    const users = readTable('blood_users');
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    users[userIndex].role = role;
    writeTable('blood_users', users);
    return users[userIndex];
  },

  getAdminQueries: () => {
    const queries = readTable('blood_queries');
    const users = readTable('blood_users');
    return queries.map((q) => {
      const user = users.find((u) => u.id === q.user_id);
      return {
        ...q,
        user_name: user?.name || 'Unknown User',
        user_role: user?.role || '',
        user_email: user?.email || '',
      };
    });
  },

  resolveQuery: (queryId, responseText) => {
    const queries = readTable('blood_queries');
    const queryIndex = queries.findIndex((q) => q.id === queryId);
    if (queryIndex === -1) throw new Error('Query not found');
    
    queries[queryIndex].status = 'resolved';
    queries[queryIndex].admin_response = responseText;
    queries[queryIndex].resolved_at = new Date().toISOString();
    writeTable('blood_queries', queries);

    // Trigger Notification to Query Submitter
    mockApi.addNotification(
      queries[queryIndex].user_id,
      'query_resolved',
      `Your support query regarding "${queries[queryIndex].subject}" has been resolved. Response: "${responseText}"`,
      ['in_app', 'email']
    );

    return queries[queryIndex];
  },

  createQuery: (userId, subject, message) => {
    const queries = readTable('blood_queries');
    const newQuery = {
      id: 'q-' + generateUUID().substring(0, 8),
      user_id: userId,
      subject,
      message,
      status: 'open',
      admin_response: '',
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    queries.push(newQuery);
    writeTable('blood_queries', queries);
    return newQuery;
  },

  // Blood Bank Operations
  getInventory: (bankProfileId) => {
    const inventory = readTable('blood_inventory');
    return inventory.filter((inv) => inv.blood_bank_id === bankProfileId);
  },

  addInventoryItem: (bankProfileId, payload) => {
    const inventory = readTable('blood_inventory');
    const newItem = {
      id: 'bi-' + generateUUID().substring(0, 8),
      blood_bank_id: bankProfileId,
      blood_group: payload.blood_group,
      units_available: parseInt(payload.units_available),
      expiry_date: payload.expiry_date,
      batch_id: payload.batch_id,
      updated_at: new Date().toISOString(),
    };
    inventory.push(newItem);
    writeTable('blood_inventory', inventory);
    return newItem;
  },

  updateInventoryItem: (itemId, payload) => {
    const inventory = readTable('blood_inventory');
    const index = inventory.findIndex((inv) => inv.id === itemId);
    if (index === -1) throw new Error('Item not found');
    inventory[index] = {
      ...inventory[index],
      blood_group: payload.blood_group,
      units_available: parseInt(payload.units_available),
      expiry_date: payload.expiry_date,
      batch_id: payload.batch_id,
      updated_at: new Date().toISOString(),
    };
    writeTable('blood_inventory', inventory);
    return inventory[index];
  },

  deleteInventoryItem: (itemId) => {
    let inventory = readTable('blood_inventory');
    inventory = inventory.filter((inv) => inv.id !== itemId);
    writeTable('blood_inventory', inventory);
    return { success: true };
  },

  getNearbyDonors: (lat, lng, maxDistanceKm = 15) => {
    const donors = readTable('blood_donors');
    const users = readTable('blood_users');

    return donors
      .filter((d) => d.available_flag)
      .map((d) => {
        const u = users.find((user) => user.id === d.user_id);
        const dist = getDistance(lat, lng, d.lat, d.lng);
        return {
          ...d,
          phone: u?.phone || '',
          email: u?.email || '',
          distance: dist,
        };
      })
      .filter((d) => d.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  },

  getBloodBankRequests: (bankProfileId) => {
    const requests = readTable('blood_requests');
    const hospitals = readTable('blood_hospitals');
    return requests
      .filter((r) => r.blood_bank_id === bankProfileId)
      .map((r) => {
        const h = hospitals.find((hosp) => hosp.id === r.hospital_id);
        return {
          ...r,
          hospital_name: h?.name || 'Unknown Hospital',
          hospital_address: h?.address || '',
          district: h?.district || '',
          lat: h?.lat,
          lng: h?.lng,
        };
      });
  },

  respondToRequest: (requestId, status) => {
    const requests = readTable('blood_requests');
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) throw new Error('Request not found');
    requests[index].status = status;
    writeTable('blood_requests', requests);

    // Get hospital owner user_id to notify
    const hospitals = readTable('blood_hospitals');
    const hospital = hospitals.find((h) => h.id === requests[index].hospital_id);
    if (hospital) {
      mockApi.addNotification(
        hospital.user_id,
        'request_response',
        `Your request for ${requests[index].units_needed} units of ${requests[index].blood_group} has been ${status.toUpperCase()} by the blood bank.`,
        ['in_app', 'email']
      );
    }
    return requests[index];
  },

  // Hospital Operations
  searchBloodBanks: (bloodGroup, hospitalLat, hospitalLng) => {
    const inventory = readTable('blood_inventory');
    const banks = readTable('blood_banks');
    
    // Group units by blood bank for that blood group
    const results = [];
    banks.forEach((bank) => {
      const items = inventory.filter((inv) => inv.blood_bank_id === bank.id && inv.blood_group === bloodGroup);
      const totalUnits = items.reduce((acc, curr) => acc + curr.units_available, 0);

      if (totalUnits > 0) {
        const distance = getDistance(hospitalLat, hospitalLng, bank.lat, bank.lng);
        results.push({
          ...bank,
          units_available: totalUnits,
          distance,
          batches: items,
        });
      }
    });

    return results.sort((a, b) => a.distance - b.distance);
  },

  createBloodRequest: (hospitalProfileId, payload) => {
    const requests = readTable('blood_requests');
    const banks = readTable('blood_banks');
    const bank = banks.find((b) => b.id === payload.blood_bank_id);
    const hospitals = readTable('blood_hospitals');
    const hosp = hospitals.find((h) => h.id === hospitalProfileId);

    const newRequest = {
      id: 'br-' + generateUUID().substring(0, 8),
      hospital_id: hospitalProfileId,
      blood_bank_id: payload.blood_bank_id,
      blood_group: payload.blood_group,
      units_needed: parseInt(payload.units_needed),
      urgency: payload.urgency, // 'normal' | 'emergency'
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    requests.push(newRequest);
    writeTable('blood_requests', requests);

    // Notify Blood Bank
    if (bank) {
      const channels = ['in_app', 'email'];
      let msgPrefix = '';
      if (payload.urgency === 'emergency') {
        channels.push('sms'); // Twilio Trigger Info
        msgPrefix = 'EMERGENCY ALERT: ';
      }

      mockApi.addNotification(
        bank.user_id,
        'emergency_request',
        `${msgPrefix}${hosp?.name || 'A Hospital'} has raised a ${payload.urgency.toUpperCase()} request for ${payload.units_needed} units of ${payload.blood_group}.`,
        channels
      );
    }

    return newRequest;
  },

  getHospitalRequests: (hospitalProfileId) => {
    const requests = readTable('blood_requests');
    const banks = readTable('blood_banks');
    return requests
      .filter((r) => r.hospital_id === hospitalProfileId)
      .map((r) => {
        const b = banks.find((bank) => bank.id === r.blood_bank_id);
        return {
          ...r,
          blood_bank_name: b?.name || 'Unknown Blood Bank',
          address: b?.address || '',
        };
      });
  },

  // Donor Operations
  getDonorRequests: (donorProfileId) => {
    const offers = readTable('blood_donation_offers');
    const donors = readTable('blood_donors');
    const donor = donors.find((d) => d.id === donorProfileId);
    if (!donor) return { bankRequests: [], hospitalRequests: [] };

    // Fetch related banks/hospitals to render request names
    const banks = readTable('blood_banks');
    const hospitals = readTable('blood_hospitals');

    const mappedOffers = offers
      .filter((o) => o.donor_id === donorProfileId)
      .map((o) => {
        let targetName = 'Unknown Target';
        let address = '';
        let lat = 0;
        let lng = 0;
        if (o.target_type === 'blood_bank') {
          const b = banks.find((bank) => bank.id === o.target_id);
          targetName = b?.name || 'Blood Bank';
          address = b?.address || '';
          lat = b?.lat;
          lng = b?.lng;
        } else {
          const h = hospitals.find((hosp) => hosp.id === o.target_id);
          targetName = h?.name || 'Hospital';
          address = h?.address || '';
          lat = h?.lat;
          lng = h?.lng;
        }

        return {
          ...o,
          target_name: targetName,
          address,
          lat,
          lng,
          blood_group: donor.blood_group,
        };
      });

    return {
      bankRequests: mappedOffers.filter((o) => o.target_type === 'blood_bank'),
      hospitalRequests: mappedOffers.filter((o) => o.target_type === 'hospital'),
    };
  },

  respondToOffer: (offerId, status) => {
    const offers = readTable('blood_donation_offers');
    const index = offers.findIndex((o) => o.id === offerId);
    if (index === -1) throw new Error('Offer not found');
    offers[index].status = status; // 'accepted', 'declined', 'completed'
    writeTable('blood_donation_offers', offers);

    // If accepted/completed, trigger notification to the requester
    const donors = readTable('blood_donors');
    const donor = donors.find((d) => d.id === offers[index].donor_id);
    
    let targetOwnerUserId = null;
    if (offers[index].target_type === 'blood_bank') {
      const bank = readTable('blood_banks').find((b) => b.id === offers[index].target_id);
      targetOwnerUserId = bank?.user_id;
    } else {
      const hosp = readTable('blood_hospitals').find((h) => h.id === offers[index].target_id);
      targetOwnerUserId = hosp?.user_id;
    }

    if (targetOwnerUserId && donor) {
      mockApi.addNotification(
        targetOwnerUserId,
        'donation_offer',
        `Donor ${donor.name} has ${status.toUpperCase()} your donation request for ${donor.blood_group} blood.`,
        ['in_app', 'email']
      );
    }

    return offers[index];
  },

  toggleDonorAvailability: (donorProfileId, availableFlag) => {
    const donors = readTable('blood_donors');
    const index = donors.findIndex((d) => d.id === donorProfileId);
    if (index === -1) throw new Error('Donor profile not found');
    donors[index].available_flag = availableFlag;
    writeTable('blood_donors', donors);
    return donors[index];
  },

  // Cron Simulation (Blood Expiry Check)
  runExpiryCheckCron: () => {
    const inventory = readTable('blood_inventory');
    const banks = readTable('blood_banks');
    const thresholdDays = 5;
    const today = new Date();
    
    let notificationsAdded = 0;
    const notifications = readTable('blood_notifications');

    inventory.forEach((item) => {
      const expiry = new Date(item.expiry_date);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= thresholdDays) {
        // Find blood bank user_id
        const bank = banks.find((b) => b.id === item.blood_bank_id);
        if (bank) {
          const alertMsg = `CRITICAL ALERT: Batch ${item.batch_id} (${item.units_available} units of ${item.blood_group}) is expiring on ${item.expiry_date} (${diffDays} days left).`;
          
          // Avoid duplicate notification for same batch recently
          const isDuplicate = notifications.some(
            (n) => n.user_id === bank.user_id && n.type === 'expiry_alert' && n.message.includes(item.batch_id)
          );

          if (!isDuplicate) {
            const newNotif = {
              id: 'n-' + generateUUID().substring(0, 8),
              user_id: bank.user_id,
              type: 'expiry_alert',
              message: alertMsg,
              read_flag: false,
              sent_via: ['in_app', 'email'],
              created_at: new Date().toISOString(),
            };
            notifications.push(newNotif);
            notificationsAdded++;
          }
        }
      }
    });

    if (notificationsAdded > 0) {
      writeTable('blood_notifications', notifications);
    }

    return { success: true, count: notificationsAdded };
  },

  // Notifications API
  getNotifications: (userId) => {
    const notifs = readTable('blood_notifications');
    return notifs.filter((n) => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  markNotificationRead: (notifId) => {
    const notifs = readTable('blood_notifications');
    const index = notifs.findIndex((n) => n.id === notifId);
    if (index === -1) throw new Error('Notification not found');
    notifs[index].read_flag = true;
    writeTable('blood_notifications', notifs);
    return notifs[index];
  },

  addNotification: (userId, type, message, sentVia = ['in_app']) => {
    const notifs = readTable('blood_notifications');
    const newNotif = {
      id: 'n-' + generateUUID().substring(0, 8),
      user_id: userId,
      type,
      message,
      read_flag: false,
      sent_via: sentVia,
      created_at: new Date().toISOString(),
    };
    notifs.push(newNotif);
    writeTable('blood_notifications', notifs);

    // Dispatches a window custom event so other active React pages update notification badges in real-time
    window.dispatchEvent(new CustomEvent('new_notification', { detail: newNotif }));
    return newNotif;
  },

  // Simulated request creation by blood bank / hospital to donor
  requestDonorDonation: (donorId, requesterType, requesterProfileId) => {
    const offers = readTable('blood_donation_offers');
    const donors = readTable('blood_donors');
    const donor = donors.find((d) => d.id === donorId);
    if (!donor) throw new Error('Donor not found');

    // Check if open request already exists
    const exists = offers.some(
      (o) => o.donor_id === donorId && o.target_type === requesterType && o.target_id === requesterProfileId && o.status === 'pending'
    );
    if (exists) throw new Error('An active request to this donor is already pending.');

    const newOffer = {
      id: 'do-' + generateUUID().substring(0, 8),
      donor_id: donorId,
      target_type: requesterType,
      target_id: requesterProfileId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    offers.push(newOffer);
    writeTable('blood_donation_offers', offers);

    // Notify donor
    mockApi.addNotification(
      donor.user_id,
      'donation_offer',
      `You have received a new blood donation request from a nearby ${requesterType === 'blood_bank' ? 'Blood Bank' : 'Hospital'}.`,
      ['in_app', 'email']
    );

    return newOffer;
  },
};
