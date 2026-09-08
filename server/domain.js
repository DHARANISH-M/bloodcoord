import crypto from 'node:crypto';
import { generateUUID, getDistance } from '../src/utils/mockDb.js';
import { readTables, resetStore, withTables } from './store.js';
import {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  getCompatibilityDetails,
  calculateMatchScore,
  isValidBloodGroup,
  isValidComponentType
} from './services/bloodCompatibility.service.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${key}`;
}

function verifyPassword(storedPassword, password) {
  if (!storedPassword) return false;
  if (!storedPassword.startsWith('scrypt:')) return storedPassword === password;

  const [, salt, key] = storedPassword.split(':');
  const testKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), testKey);
}

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function profileIdForUser(user, state) {
  if (user.role === 'blood_bank') {
    return state.blood_banks.find((bank) => bank.user_id === user.id)?.id || null;
  }
  if (user.role === 'hospital') {
    return state.blood_hospitals.find((hospital) => hospital.user_id === user.id)?.id || null;
  }
  if (user.role === 'donor') {
    return state.blood_donors.find((donor) => donor.user_id === user.id)?.id || null;
  }
  return null;
}

function publicUser(user, state) {
  return {
    token: `api-token-${user.id}-${Date.now()}`,
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    profileId: profileIdForUser(user, state),
  };
}

function addNotificationInState(state, userId, type, message, sentVia = ['in_app']) {
  const notification = {
    id: 'n-' + generateUUID().substring(0, 8),
    user_id: userId,
    type,
    message,
    read_flag: false,
    sent_via: sentVia,
    created_at: new Date().toISOString(),
  };
  state.blood_notifications.push(notification);
  return notification;
}

function getPreferenceRecord(state, userId) {
  let record = state.hospital_preferences.find((item) => item.user_id === userId);
  if (!record) {
    record = { user_id: userId, preferred_banks: [], updated_at: new Date().toISOString() };
    state.hospital_preferences.push(record);
  }
  return record;
}

export async function register(role, payload) {
  if (!['admin', 'blood_bank', 'hospital', 'donor'].includes(role)) {
    throw new AppError('Unsupported registration role.');
  }

  return withTables(
    ['blood_users', 'blood_banks', 'blood_hospitals', 'blood_donors', 'blood_notifications'],
    (state) => {
      if (state.blood_users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new AppError('Email is already registered.');
      }

      const userId = 'u-' + generateUUID().substring(0, 8);
      const user = {
        id: userId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || '',
        password_hash: hashPassword(payload.password),
        role,
        status: role === 'donor' ? 'approved' : 'pending',
        created_at: new Date().toISOString(),
      };

      state.blood_users.push(user);

      if (role === 'blood_bank') {
        state.blood_banks.push({
          id: 'bb-' + generateUUID().substring(0, 8),
          user_id: userId,
          name: payload.name,
          address: payload.address || '',
          district: payload.district || '',
          lat: asNumber(payload.lat, 40.7527),
          lng: asNumber(payload.lng, -73.9772),
          created_at: new Date().toISOString(),
        });
      } else if (role === 'hospital') {
        state.blood_hospitals.push({
          id: 'h-' + generateUUID().substring(0, 8),
          user_id: userId,
          name: payload.name,
          address: payload.address || '',
          district: payload.district || '',
          lat: asNumber(payload.lat, 40.7388),
          lng: asNumber(payload.lng, -73.9765),
          created_at: new Date().toISOString(),
        });
      } else if (role === 'donor') {
        state.blood_donors.push({
          id: 'd-' + generateUUID().substring(0, 8),
          user_id: userId,
          name: payload.name,
          blood_group: payload.blood_group || 'O+',
          last_donation_date: payload.last_donation_date || null,
          available_flag: true,
          address: payload.address || '',
          district: payload.district || '',
          lat: asNumber(payload.lat, 40.7644),
          lng: asNumber(payload.lng, -73.9744),
          created_at: new Date().toISOString(),
        });
      }

      if (role !== 'donor') {
        state.blood_users
          .filter((admin) => admin.role === 'admin')
          .forEach((admin) => {
            addNotificationInState(
              state,
              admin.id,
              'registration_request',
              `Registration Queue Notice: ${payload.name} requested ${role.replace('_', ' ')} access.`,
              ['in_app']
            );
          });
      }

      return {
        success: true,
        message: role === 'donor'
          ? 'Registered successfully! You can login now.'
          : 'Registered successfully! Pending Admin approval.',
      };
    }
  );
}

export async function login(email, password) {
  const state = await readTables(['blood_users', 'blood_banks', 'blood_hospitals', 'blood_donors']);
  const user = state.blood_users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !verifyPassword(user.password_hash, password)) {
    throw new AppError('Invalid email or password.', 401);
  }

  return publicUser(user, state);
}

export async function getPublicDashboard() {
  const state = await readTables(['blood_inventory', 'blood_banks', 'blood_hospitals', 'blood_donors']);
  const aggregate = Object.fromEntries(BLOOD_GROUPS.map((group) => [group, 0]));

  state.blood_inventory.forEach((item) => {
    if (aggregate[item.blood_group] !== undefined) {
      aggregate[item.blood_group] += Number(item.units_available) || 0;
    }
  });

  const details = state.blood_inventory.map((inv) => {
    const bank = state.blood_banks.find((b) => b.id === inv.blood_bank_id);
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
    totalBanks: state.blood_banks.length,
    totalHospitals: state.blood_hospitals.length,
    totalDonors: state.blood_donors.length,
  };
}

export async function getAdminUsers() {
  const { blood_users: users } = await readTables(['blood_users']);
  return users;
}

export async function updateUserStatus(userId, status) {
  return withTables(['blood_users', 'blood_notifications'], (state) => {
    const user = state.blood_users.find((u) => u.id === userId);
    if (!user) throw new AppError('User not found', 404);

    user.status = status;
    addNotificationInState(
      state,
      userId,
      'account_status',
      `Your account status has been updated to: ${status.toUpperCase()}`,
      ['in_app', 'email']
    );
    return user;
  });
}

export async function updateUserRole(userId, role) {
  return withTables(['blood_users'], (state) => {
    const user = state.blood_users.find((u) => u.id === userId);
    if (!user) throw new AppError('User not found', 404);
    user.role = role;
    return user;
  });
}

export async function getAdminQueries() {
  const state = await readTables(['blood_queries', 'blood_users']);
  return state.blood_queries.map((query) => {
    const user = state.blood_users.find((u) => u.id === query.user_id);
    return {
      ...query,
      user_name: user?.name || 'Unknown User',
      user_role: user?.role || '',
      user_email: user?.email || '',
    };
  });
}

export async function resolveQuery(queryId, responseText) {
  return withTables(['blood_queries', 'blood_notifications'], (state) => {
    const query = state.blood_queries.find((item) => item.id === queryId);
    if (!query) throw new AppError('Query not found', 404);

    query.status = 'resolved';
    query.admin_response = responseText;
    query.resolved_at = new Date().toISOString();

    addNotificationInState(
      state,
      query.user_id,
      'query_resolved',
      `Your support query regarding "${query.subject}" has been resolved. Response: "${responseText}"`,
      ['in_app', 'email']
    );

    return query;
  });
}

export async function createQuery(userId, subject, message) {
  return withTables(['blood_queries', 'blood_notifications', 'blood_users'], (state) => {
    const query = {
      id: 'q-' + generateUUID().substring(0, 8),
      user_id: userId,
      subject,
      message,
      status: 'open',
      admin_response: '',
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    state.blood_queries.push(query);

    state.blood_users
      .filter((user) => user.role === 'admin')
      .forEach((admin) => {
        addNotificationInState(
          state,
          admin.id,
          'support_query',
          `New support inquiry submitted: "${subject}"`,
          ['in_app']
        );
      });

    return query;
  });
}

export async function getBloodBankProfile(userId, profileId) {
  const { blood_banks: banks } = await readTables(['blood_banks']);
  return banks.find((bank) => bank.id === profileId || bank.user_id === userId) || null;
}

export async function getHospitalProfile(userId, profileId) {
  const { blood_hospitals: hospitals } = await readTables(['blood_hospitals']);
  return hospitals.find((hospital) => hospital.id === profileId || hospital.user_id === userId) || null;
}

export async function getDonorProfile(userId, profileId) {
  const { blood_donors: donors } = await readTables(['blood_donors']);
  return donors.find((donor) => donor.id === profileId || donor.user_id === userId) || null;
}

export async function getInventory(bankProfileId) {
  const { blood_inventory: inventory } = await readTables(['blood_inventory']);
  return inventory.filter((item) => item.blood_bank_id === bankProfileId);
}

export async function addInventoryItem(bankProfileId, payload) {
  return withTables(['blood_inventory'], (state) => {
    const item = {
      id: 'bi-' + generateUUID().substring(0, 8),
      blood_bank_id: bankProfileId,
      blood_group: payload.blood_group,
      units_available: parseInt(payload.units_available, 10),
      expiry_date: payload.expiry_date,
      batch_id: payload.batch_id,
      updated_at: new Date().toISOString(),
    };
    state.blood_inventory.push(item);
    return item;
  });
}

export async function updateInventoryItem(itemId, payload) {
  return withTables(['blood_inventory'], (state) => {
    const item = state.blood_inventory.find((inv) => inv.id === itemId);
    if (!item) throw new AppError('Item not found', 404);

    item.blood_group = payload.blood_group;
    item.units_available = parseInt(payload.units_available, 10);
    item.expiry_date = payload.expiry_date;
    item.batch_id = payload.batch_id;
    item.updated_at = new Date().toISOString();

    return item;
  });
}

export async function deleteInventoryItem(itemId) {
  return withTables(['blood_inventory'], (state) => {
    const countBefore = state.blood_inventory.length;
    state.blood_inventory = state.blood_inventory.filter((item) => item.id !== itemId);
    if (state.blood_inventory.length === countBefore) throw new AppError('Item not found', 404);
    return { success: true };
  });
}

export async function getNearbyDonors(lat, lng, maxDistanceKm = 15) {
  const state = await readTables(['blood_donors', 'blood_users']);
  return state.blood_donors
    .filter((donor) => donor.available_flag)
    .map((donor) => {
      const user = state.blood_users.find((item) => item.id === donor.user_id);
      return {
        ...donor,
        phone: user?.phone || '',
        email: user?.email || '',
        distance: getDistance(Number(lat), Number(lng), donor.lat, donor.lng),
      };
    })
    .filter((donor) => donor.distance <= Number(maxDistanceKm))
    .sort((a, b) => a.distance - b.distance);
}

export async function getBloodBankRequests(bankProfileId) {
  const state = await readTables(['blood_requests', 'blood_hospitals']);
  return state.blood_requests
    .filter((request) => request.blood_bank_id === bankProfileId)
    .map((request) => {
      const hospital = state.blood_hospitals.find((item) => item.id === request.hospital_id);
      return {
        ...request,
        hospital_name: hospital?.name || 'Unknown Hospital',
        hospital_address: hospital?.address || '',
        district: hospital?.district || '',
        lat: hospital?.lat,
        lng: hospital?.lng,
      };
    });
}

export async function updateBloodRequestStatus(requestId, status) {
  return withTables(['blood_requests', 'blood_hospitals', 'blood_notifications'], (state) => {
    const request = state.blood_requests.find((item) => item.id === requestId);
    if (!request) throw new AppError('Request not found', 404);

    request.status = status;
    const hospital = state.blood_hospitals.find((item) => item.id === request.hospital_id);
    if (hospital) {
      addNotificationInState(
        state,
        hospital.user_id,
        'request_response',
        `Your request for ${request.units_needed} units of ${request.blood_group} has been ${status.toUpperCase()} by the blood bank.`,
        ['in_app', 'email']
      );
    }

    return request;
  });
}

export async function getHospitalBloodBanks(hospitalProfileId, userId) {
  const state = await readTables(['blood_hospitals', 'blood_banks', 'blood_inventory', 'hospital_preferences']);
  const hospital = state.blood_hospitals.find((item) => item.id === hospitalProfileId);
  if (!hospital) throw new AppError('Hospital profile not found', 404);

  const preferredBanks = state.hospital_preferences.find((item) => item.user_id === userId)?.preferred_banks || [];
  return state.blood_banks
    .map((bank) => {
      const bankStock = state.blood_inventory.filter((item) => item.blood_bank_id === bank.id);
      const stockSummary = bankStock.reduce((acc, curr) => {
        acc[curr.blood_group] = (acc[curr.blood_group] || 0) + Number(curr.units_available || 0);
        return acc;
      }, {});
      const distance = getDistance(hospital.lat, hospital.lng, bank.lat, bank.lng);

      return {
        ...bank,
        distance,
        stockSummary,
        responseTime: Math.floor(distance * 3) + 12 + ' mins',
        isPreferred: preferredBanks.includes(bank.id),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

export async function crossMatchBlood(hospitalId, payload) {
  const recipientBloodGroup = payload.recipientBloodGroup || payload.blood_group;
  const componentType = (payload.componentType || payload.component_type || 'RBC').toUpperCase();
  const unitsNeeded = parseInt(payload.unitsNeeded || payload.units_needed, 10) || 1;
  const radiusKm = parseFloat(payload.radiusKm || payload.radius_km) || 25;
  const urgency = payload.urgency || 'routine';

  if (!isValidBloodGroup(recipientBloodGroup)) {
    throw new AppError(`Invalid recipient blood group: ${recipientBloodGroup}`, 400);
  }
  if (!isValidComponentType(componentType)) {
    throw new AppError(`Invalid component type: ${componentType}`, 400);
  }

  const state = await readTables(['blood_hospitals', 'blood_banks', 'blood_inventory']);
  const hospital = state.blood_hospitals.find((item) => item.id === hospitalId || item.user_id === hospitalId) || state.blood_hospitals[0] || {
    id: hospitalId || 'h-1',
    name: 'General Hospital',
    lat: 28.6139,
    lng: 77.2090,
  };

  const hospLat = hospital.lat || 28.6139;
  const hospLng = hospital.lng || 77.2090;

  const compatibleGroups = getCompatibleDonorGroups(recipientBloodGroup, componentType);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const matchedBanks = [];
  let totalNearbyCompatibleUnits = 0;

  state.blood_banks.forEach((bank) => {
    const distance = getDistance(hospLat, hospLng, bank.lat, bank.lng);
    if (distance > radiusKm) return;

    const validBatches = state.blood_inventory.filter((item) => {
      if (item.blood_bank_id !== bank.id) return false;
      if (!compatibleGroups.includes(item.blood_group)) return false;
      const itemComp = (item.component_type || 'RBC').toUpperCase();
      if (itemComp !== componentType && itemComp !== 'RBC' && componentType !== 'RBC') return false;
      if ((item.units_available || 0) <= 0) return false;
      if (item.expiry_date && new Date(item.expiry_date) < today) return false;
      return true;
    });

    if (validBatches.length === 0) return;

    validBatches.sort((a, b) => new Date(a.expiry_date || '2099-01-01') - new Date(b.expiry_date || '2099-01-01'));

    const stockBreakdown = {};
    let exactUnits = 0;
    let compatibleAlternativeUnits = 0;
    let totalBankCompatible = 0;

    compatibleGroups.forEach((bg) => {
      const groupBatches = validBatches.filter((b) => b.blood_group === bg);
      const groupUnits = groupBatches.reduce((sum, b) => sum + (b.units_available || 0), 0);
      if (groupUnits > 0) {
        const details = getCompatibilityDetails(bg, recipientBloodGroup, componentType);
        stockBreakdown[bg] = {
          blood_group: bg,
          units: groupUnits,
          matchType: details.matchType,
          priorityRank: details.priorityRank,
          reason: details.reason,
          earliestExpiry: groupBatches[0]?.expiry_date || 'N/A',
        };
        totalBankCompatible += groupUnits;
        if (bg === recipientBloodGroup) exactUnits += groupUnits;
        else compatibleAlternativeUnits += groupUnits;
      }
    });

    if (totalBankCompatible === 0) return;

    totalNearbyCompatibleUnits += totalBankCompatible;
    const isSufficient = totalBankCompatible >= unitsNeeded;
    const shortage = Math.max(0, unitsNeeded - totalBankCompatible);
    const hasExactMatch = exactUnits > 0;
    const primaryMatchType = hasExactMatch ? 'exact_match' : 'compatible_alternative';

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
      inventoryBatches: validBatches.map((b) => ({
        id: b.id,
        batch_id: b.batch_id,
        blood_group: b.blood_group,
        units_available: b.units_available,
        expiry_date: b.expiry_date,
        component_type: b.component_type || componentType,
        isExact: b.blood_group === recipientBloodGroup,
      })),
    });
  });

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
      lng: hospLng,
    },
    summary: {
      totalCompatibleBanksFound: matchedBanks.length,
      totalNearbyCompatibleUnits,
      requiredUnits: unitsNeeded,
      isOverallSufficient,
      shortage: Math.max(0, unitsNeeded - totalNearbyCompatibleUnits),
      multiBankMatchAvailable,
      closestBank: matchedBanks[0] || null,
    },
    banks: matchedBanks,
    medicalDisclaimer: 'Automated compatibility aid. Final clinical compatibility must be confirmed by laboratory serological crossmatching.',
  };
}

export async function crossMatchDonors(hospitalId, query = {}) {
  const recipientBloodGroup = query.bloodGroup || query.blood_group || 'O+';
  const componentType = (query.component || query.component_type || 'RBC').toUpperCase();
  const radiusKm = parseFloat(query.radiusKm || query.radius_km) || 25;

  if (!isValidBloodGroup(recipientBloodGroup)) {
    throw new AppError(`Invalid blood group: ${recipientBloodGroup}`, 400);
  }

  const state = await readTables(['blood_hospitals', 'blood_donors', 'blood_users']);
  const hospital = state.blood_hospitals.find((item) => item.id === hospitalId || item.user_id === hospitalId) || state.blood_hospitals[0] || {
    lat: 28.6139,
    lng: 77.2090,
  };

  const hospLat = hospital.lat || 28.6139;
  const hospLng = hospital.lng || 77.2090;
  const compatibleGroups = getCompatibleDonorGroups(recipientBloodGroup, componentType);

  const matchedDonors = [];
  state.blood_donors
    .filter((d) => d.available_flag && compatibleGroups.includes(d.blood_group))
    .forEach((d) => {
      const distance = getDistance(hospLat, hospLng, d.lat, d.lng);
      if (distance > radiusKm) return;

      const user = state.blood_users.find((u) => u.id === d.user_id);
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
        phone: user?.phone || d.phone || '+91 98100-00000',
        email: user?.email || d.email || '',
        matchScore,
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
    donors: matchedDonors,
  };
}

export function getBloodCompatibility(bloodGroup, componentType = 'RBC') {
  if (!isValidBloodGroup(bloodGroup)) {
    throw new AppError(`Invalid blood group: ${bloodGroup}`, 400);
  }
  const comp = (componentType || 'RBC').toUpperCase();
  const compatibleDonors = getCompatibleDonorGroups(bloodGroup, comp);
  const compatibleRecipients = getCompatibleRecipientGroups(bloodGroup, comp);
  const details = compatibleDonors.map((donor) => getCompatibilityDetails(donor, bloodGroup, comp));

  return {
    bloodGroup,
    componentType: comp,
    compatibleDonorGroups: compatibleDonors,
    canDonateToGroups: compatibleRecipients,
    details,
    medicalDisclaimer: 'Automated compatibility aid for blood coordination.',
  };
}

export async function createBloodRequest(hospitalProfileId, payload) {
  return withTables(['blood_requests', 'blood_banks', 'blood_hospitals', 'blood_notifications'], (state) => {
    const bank = state.blood_banks.find((item) => item.id === payload.blood_bank_id);
    const hospital = state.blood_hospitals.find((item) => item.id === hospitalProfileId);

    const request = {
      id: 'br-' + generateUUID().substring(0, 8),
      hospital_id: hospitalProfileId,
      blood_bank_id: payload.blood_bank_id,
      blood_group: payload.blood_group,
      units_needed: parseInt(payload.units_needed, 10),
      urgency: payload.urgency,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    state.blood_requests.push(request);

    if (bank) {
      const channels = ['in_app', 'email'];
      const prefix = payload.urgency === 'emergency' ? 'EMERGENCY ALERT: ' : '';
      if (payload.urgency === 'emergency') channels.push('sms');

      addNotificationInState(
        state,
        bank.user_id,
        'emergency_request',
        `${prefix}${hospital?.name || 'A Hospital'} has raised a ${payload.urgency.toUpperCase()} request for ${payload.units_needed} units of ${payload.blood_group}.`,
        channels
      );
    }

    return request;
  });
}

export async function getHospitalRequests(hospitalProfileId) {
  const state = await readTables(['blood_requests', 'blood_banks']);
  return state.blood_requests
    .filter((request) => request.hospital_id === hospitalProfileId)
    .map((request) => {
      const bank = state.blood_banks.find((item) => item.id === request.blood_bank_id);
      return {
        ...request,
        blood_bank_name: bank?.name || 'Unknown Blood Bank',
        address: bank?.address || '',
      };
    });
}

export async function getHospitalPreferences(userId) {
  const { hospital_preferences: preferences } = await readTables(['hospital_preferences']);
  return preferences.find((item) => item.user_id === userId)?.preferred_banks || [];
}

export async function updateHospitalPreferences(userId, preferredBanks) {
  return withTables(['hospital_preferences'], (state) => {
    const record = getPreferenceRecord(state, userId);
    record.preferred_banks = preferredBanks;
    record.updated_at = new Date().toISOString();
    return record.preferred_banks;
  });
}

export async function updateHospitalProfile(hospitalProfileId, payload) {
  return withTables(['blood_hospitals', 'blood_users'], (state) => {
    const hospital = state.blood_hospitals.find((item) => item.id === hospitalProfileId);
    if (!hospital) throw new AppError('Hospital profile not found', 404);

    hospital.name = payload.name;
    hospital.address = payload.address;

    const user = state.blood_users.find((item) => item.id === payload.userId || item.id === hospital.user_id);
    if (user) {
      user.name = payload.name;
      user.phone = payload.phone || user.phone;
    }

    return hospital;
  });
}

export async function getDonorRequests(donorProfileId) {
  const state = await readTables(['blood_donation_offers', 'blood_donors', 'blood_banks', 'blood_hospitals']);
  const donor = state.blood_donors.find((item) => item.id === donorProfileId);
  if (!donor) return { bankRequests: [], hospitalRequests: [] };

  const offers = state.blood_donation_offers
    .filter((offer) => offer.donor_id === donorProfileId)
    .map((offer) => {
      const target = offer.target_type === 'blood_bank'
        ? state.blood_banks.find((bank) => bank.id === offer.target_id)
        : state.blood_hospitals.find((hospital) => hospital.id === offer.target_id);

      return {
        ...offer,
        target_name: target?.name || 'Unknown Target',
        address: target?.address || '',
        lat: target?.lat,
        lng: target?.lng,
        blood_group: donor.blood_group,
      };
    });

  return {
    bankRequests: offers.filter((offer) => offer.target_type === 'blood_bank'),
    hospitalRequests: offers.filter((offer) => offer.target_type === 'hospital'),
  };
}

export async function respondToOffer(offerId, status) {
  return withTables(['blood_donation_offers', 'blood_donors', 'blood_banks', 'blood_hospitals', 'blood_notifications'], (state) => {
    const offer = state.blood_donation_offers.find((item) => item.id === offerId);
    if (!offer) throw new AppError('Offer not found', 404);

    offer.status = status;
    const donor = state.blood_donors.find((item) => item.id === offer.donor_id);
    const targetOwnerUserId = offer.target_type === 'blood_bank'
      ? state.blood_banks.find((bank) => bank.id === offer.target_id)?.user_id
      : state.blood_hospitals.find((hospital) => hospital.id === offer.target_id)?.user_id;

    if (targetOwnerUserId && donor) {
      addNotificationInState(
        state,
        targetOwnerUserId,
        'donation_offer',
        `Donor ${donor.name} has ${status.toUpperCase()} your donation request for ${donor.blood_group} blood.`,
        ['in_app', 'email']
      );
    }

    return offer;
  });
}

export async function toggleDonorAvailability(donorProfileId, availableFlag) {
  return withTables(['blood_donors'], (state) => {
    const donor = state.blood_donors.find((item) => item.id === donorProfileId);
    if (!donor) throw new AppError('Donor profile not found', 404);
    donor.available_flag = Boolean(availableFlag);
    return donor;
  });
}

export async function requestDonorDonation(donorId, requesterType, requesterProfileId) {
  return withTables(['blood_donation_offers', 'blood_donors', 'blood_notifications'], (state) => {
    const donor = state.blood_donors.find((item) => item.id === donorId);
    if (!donor) throw new AppError('Donor not found', 404);

    const exists = state.blood_donation_offers.some(
      (offer) =>
        offer.donor_id === donorId &&
        offer.target_type === requesterType &&
        offer.target_id === requesterProfileId &&
        offer.status === 'pending'
    );
    if (exists) throw new AppError('An active request to this donor is already pending.');

    const offer = {
      id: 'do-' + generateUUID().substring(0, 8),
      donor_id: donorId,
      target_type: requesterType,
      target_id: requesterProfileId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    state.blood_donation_offers.push(offer);

    addNotificationInState(
      state,
      donor.user_id,
      'donation_offer',
      `You have received a new blood donation request from a nearby ${requesterType === 'blood_bank' ? 'Blood Bank' : 'Hospital'}.`,
      ['in_app', 'email']
    );

    return offer;
  });
}

export async function runExpiryCheckCron() {
  return withTables(['blood_inventory', 'blood_banks', 'blood_notifications'], (state) => {
    const thresholdDays = 5;
    const today = new Date();
    let count = 0;

    state.blood_inventory.forEach((item) => {
      const expiry = new Date(item.expiry_date);
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays > thresholdDays) return;

      const bank = state.blood_banks.find((candidate) => candidate.id === item.blood_bank_id);
      if (!bank) return;

      const isDuplicate = state.blood_notifications.some(
        (notification) =>
          notification.user_id === bank.user_id &&
          notification.type === 'expiry_alert' &&
          notification.message.includes(item.batch_id)
      );

      if (!isDuplicate) {
        addNotificationInState(
          state,
          bank.user_id,
          'expiry_alert',
          `CRITICAL ALERT: Batch ${item.batch_id} (${item.units_available} units of ${item.blood_group}) is expiring on ${item.expiry_date} (${diffDays} days left).`,
          ['in_app', 'email']
        );
        count++;
      }
    });

    return { success: true, count };
  });
}

export async function getNotifications(userId) {
  const { blood_notifications: notifications } = await readTables(['blood_notifications']);
  return notifications
    .filter((notification) => notification.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function markNotificationRead(notificationId) {
  return withTables(['blood_notifications'], (state) => {
    const notification = state.blood_notifications.find((item) => item.id === notificationId);
    if (!notification) throw new AppError('Notification not found', 404);
    notification.read_flag = true;
    return notification;
  });
}

export async function addNotification(userId, type, message, sentVia = ['in_app']) {
  return withTables(['blood_notifications'], (state) => {
    return addNotificationInState(state, userId, type, message, sentVia);
  });
}

export async function resetAllData() {
  return resetStore();
}
