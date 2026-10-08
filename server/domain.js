import crypto from 'node:crypto';
import { generateUUID, getDistance } from '../src/utils/mockDb.js';
import eraktkoshData from '../src/data/eraktkosh_data.json' with { type: 'json' };
import { ERAKTKOSH_STATES, fetchStateEraktkosh } from '../src/utils/eraktkoshClient.js';
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

function addNotificationInState(state, userId, type, message, sentVia = ['in_app'], metadata = {}) {
  const notification = {
    id: 'n-' + generateUUID().substring(0, 8),
    user_id: userId,
    type,
    title: metadata.title,
    message,
    read_flag: false,
    sent_via: sentVia,
    channels: sentVia,
    metadata,
    created_at: new Date().toISOString(),
  };
  state.blood_notifications.push(notification);
  return notification;
}

function requestNotificationMetadata(request, hospital, bank, status = request.status || 'pending') {
  return {
    requestId: request.id,
    bloodGroup: request.blood_group,
    unitsNeeded: request.units_needed,
    urgency: request.urgency || 'normal',
    patientName: request.patient_name || hospital?.name || 'Hospital request',
    contactPhone: request.contact_phone || hospital?.phone || '',
    status,
    hospitalName: hospital?.name || request.hospital_name || 'Hospital',
    bloodBankName: bank?.name || request.blood_bank_name || 'Blood Centre',
    title: `${status === 'pending' ? 'Blood Order' : 'Order ' + status.toUpperCase()} - ${request.blood_group} (${request.units_needed} Units)`,
  };
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

export async function getPublicStockAvailability() {
  const state = await readTables(['blood_banks', 'blood_inventory']);
  return state.blood_banks.map((bank) => {
    const bankStock = state.blood_inventory.filter((item) => item.blood_bank_id === bank.id);
    const stockSummary = bankStock.reduce((acc, item) => {
      acc[item.blood_group] = (acc[item.blood_group] || 0) + Number(item.units_available || 0);
      return acc;
    }, {});

    return {
      ...bank,
      stockSummary,
    };
  });
}

export async function getBloodBankDetail(bankId) {
  const state = await readTables(['blood_banks', 'blood_inventory', 'blood_requests']);
  const bank = state.blood_banks.find((item) => item.id === bankId);
  if (!bank) throw new AppError('Blood bank not found', 404);

  const inventory = state.blood_inventory.filter((item) => item.blood_bank_id === bankId);
  const stockSummary = inventory.reduce((acc, item) => {
    acc[item.blood_group] = (acc[item.blood_group] || 0) + Number(item.units_available || 0);
    return acc;
  }, {});
  const totalUnits = Object.values(stockSummary).reduce((total, units) => total + units, 0);
  const pendingRequestCount = state.blood_requests.filter(
    (request) => request.blood_bank_id === bankId && request.status === 'pending'
  ).length;

  return {
    ...bank,
    stockSummary,
    totalUnits,
    inventory,
    pendingRequestCount,
  };
}

export async function findNearestBankForGroup(bloodGroup, lat, lng) {
  const state = await readTables(['blood_banks', 'blood_inventory']);
  const results = state.blood_banks
    .map((bank) => {
      const unitsAvailable = state.blood_inventory
        .filter((item) => item.blood_bank_id === bank.id && item.blood_group === bloodGroup)
        .reduce((sum, item) => sum + Number(item.units_available || 0), 0);

      if (unitsAvailable <= 0) return null;
      const distance = getDistance(Number(lat), Number(lng), bank.lat, bank.lng);
      return {
        ...bank,
        unitsAvailable,
        distance,
        responseTime: Math.floor(distance * 3) + 12 + ' mins',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  return results.slice(0, 20);
}

export async function createPublicBloodRequest(payload) {
  return withTables(['blood_requests', 'blood_banks', 'blood_inventory', 'blood_hospitals', 'blood_notifications'], (state) => {
    const unitsNeeded = parseInt(payload.units_needed, 10) || 1;
    const urgency = payload.urgency || 'normal';
    const lat = Number(payload.lat) || 28.6139;
    const lng = Number(payload.lng) || 77.2090;
    let targetBank = payload.blood_bank_id
      ? state.blood_banks.find((bank) => bank.id === payload.blood_bank_id)
      : null;

    if (!targetBank) {
      const candidates = state.blood_banks
        .map((bank) => {
          const stock = state.blood_inventory
            .filter((item) => item.blood_bank_id === bank.id && item.blood_group === payload.blood_group)
            .reduce((sum, item) => sum + Number(item.units_available || 0), 0);
          if (stock < unitsNeeded) return null;
          return { bank, distance: getDistance(lat, lng, bank.lat, bank.lng) };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);

      targetBank = candidates[0]?.bank || null;
    }

    if (!targetBank) {
      return {
        success: false,
        message: `No blood bank found with sufficient stock for ${payload.blood_group}`,
      };
    }

    const hospital = payload.hospital_id
      ? state.blood_hospitals.find((item) => item.id === payload.hospital_id)
      : null;
    const request = {
      id: 'br-' + generateUUID().substring(0, 8),
      hospital_id: payload.hospital_id || 'public-request',
      blood_bank_id: targetBank.id,
      blood_group: payload.blood_group,
      units_needed: unitsNeeded,
      urgency,
      patient_name: payload.patient_name || hospital?.name || 'Public Requester',
      contact_phone: payload.contact_phone || hospital?.phone || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    state.blood_requests.unshift(request);

    const channels = urgency === 'emergency' ? ['in_app', 'sms'] : ['in_app', 'email'];
    addNotificationInState(
      state,
      targetBank.user_id,
      urgency === 'emergency' ? 'emergency_request' : 'blood_request',
      `New blood request for ${unitsNeeded} units of ${payload.blood_group} from ${request.patient_name}. Contact: ${request.contact_phone || 'N/A'}`,
      channels,
      requestNotificationMetadata(request, hospital, targetBank, 'pending')
    );

    return {
      success: true,
      request,
      blood_bank_name: targetBank.name,
      blood_bank_address: targetBank.address,
      blood_bank_phone: targetBank.phone,
      blood_bank_district: targetBank.district,
      blood_bank_state: targetBank.state,
      message: `Request sent to ${targetBank.name} (${targetBank.district}, ${targetBank.state})`,
    };
  });
}

export async function getAdminStats() {
  const state = await readTables(['blood_users', 'blood_banks', 'blood_hospitals', 'blood_donors', 'blood_inventory', 'blood_requests']);
  const totalStockUnits = state.blood_inventory.reduce(
    (sum, item) => sum + Number(item.units_available || 0),
    0
  );

  return {
    totalUsers: state.blood_users.length,
    totalBanks: state.blood_banks.length,
    totalHospitals: state.blood_hospitals.length,
    totalDonors: state.blood_donors.length,
    totalStockUnits,
    totalRequests: state.blood_requests.length,
    pendingApprovals: state.blood_users.filter((user) => user.status === 'pending').length,
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

export async function updateBloodRequestStatus(requestId, status, updatedByRole = null) {
  const allowedStatuses = ['pending', 'accepted', 'reserved', 'rejected', 'dispatched', 'fulfilled', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    throw new AppError('Unsupported request status', 400);
  }

  return withTables(['blood_requests', 'blood_hospitals', 'blood_banks', 'blood_notifications'], (state) => {
    const request = state.blood_requests.find((item) => item.id === requestId);
    if (!request) throw new AppError('Request not found', 404);

    request.status = status;
    const hospital = state.blood_hospitals.find((item) => item.id === request.hospital_id);
    const bank = state.blood_banks.find((item) => item.id === request.blood_bank_id);

    // If cancelled by hospital or status is cancelled: notify the blood bank
    if (updatedByRole === 'hospital' || status === 'cancelled') {
      if (bank) {
        addNotificationInState(
          state,
          bank.user_id,
          'request_response',
          `Order ${request.id.substring(0, 8)} (${request.units_needed} units of ${request.blood_group}) was CANCELLED by ${hospital?.name || 'the hospital'}.`,
          ['in_app', 'email'],
          requestNotificationMetadata(request, hospital, bank, 'cancelled')
        );
      }
    } else {
      // Updated by blood bank: notify the hospital
      if (hospital) {
        addNotificationInState(
          state,
          hospital.user_id,
          'request_response',
          `Your request for ${request.units_needed} units of ${request.blood_group} has been ${status.toUpperCase()} by ${bank?.name || 'the blood bank'}.`,
          ['in_app', 'email'],
          requestNotificationMetadata(request, hospital, bank, status)
        );
      }
    }

    return {
      ...request,
      hospital_name: hospital?.name,
      blood_bank_name: bank?.name,
    };
  });
}

export async function reserveBloodRequest(requestId) {
  return withTables(
    ['blood_requests', 'blood_hospitals', 'blood_banks', 'blood_inventory', 'blood_notifications'],
    (state) => {
      const request = state.blood_requests.find((r) => r.id === requestId);
      if (!request) throw new AppError('Request not found', 404);
      if (!['pending', 'accepted'].includes(request.status)) {
        throw new AppError(`Cannot reserve a request in '${request.status}' status.`, 400);
      }

      const hospital = state.blood_hospitals.find((h) => h.id === request.hospital_id);
      const bank = state.blood_banks.find((b) => b.id === request.blood_bank_id);

      // Check compatible stock exists
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const availableBatches = state.blood_inventory.filter(
        (inv) =>
          inv.blood_bank_id === request.blood_bank_id &&
          inv.blood_group === request.blood_group &&
          (inv.units_available || 0) > 0 &&
          (!inv.expiry_date || new Date(inv.expiry_date) >= today)
      );
      const totalAvailable = availableBatches.reduce((s, b) => s + (b.units_available || 0), 0);
      if (totalAvailable < request.units_needed) {
        throw new AppError(
          `Insufficient stock to reserve: ${totalAvailable} units available, ${request.units_needed} units required.`,
          400
        );
      }

      request.status = 'reserved';
      request.reserved_at = new Date().toISOString();

      // Notify hospital
      if (hospital) {
        addNotificationInState(
          state,
          hospital.user_id,
          'request_response',
          `Your blood requisition for ${request.units_needed} units of ${request.blood_group} has been RESERVED by ${bank?.name || 'the blood centre'}. Units are being prepared for dispatch.`,
          ['in_app', 'email'],
          requestNotificationMetadata(request, hospital, bank, 'reserved')
        );
      }

      return {
        ...request,
        hospital_name: hospital?.name,
        blood_bank_name: bank?.name,
      };
    }
  );
}

export async function issueBloodRequest(requestId) {
  return withTables(
    ['blood_requests', 'blood_hospitals', 'blood_banks', 'blood_inventory', 'blood_notifications'],
    (state) => {
      const request = state.blood_requests.find((r) => r.id === requestId);
      if (!request) throw new AppError('Request not found', 404);
      if (!['pending', 'accepted', 'reserved'].includes(request.status)) {
        throw new AppError(`Cannot issue blood for a request in '${request.status}' status.`, 400);
      }

      const hospital = state.blood_hospitals.find((h) => h.id === request.hospital_id);
      const bank = state.blood_banks.find((b) => b.id === request.blood_bank_id);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Collect valid batches sorted FEFO (First Expiry First Out)
      const validBatches = state.blood_inventory
        .filter(
          (inv) =>
            inv.blood_bank_id === request.blood_bank_id &&
            inv.blood_group === request.blood_group &&
            (inv.units_available || 0) > 0 &&
            (!inv.expiry_date || new Date(inv.expiry_date) >= today)
        )
        .sort(
          (a, b) =>
            new Date(a.expiry_date || '2099-01-01') - new Date(b.expiry_date || '2099-01-01')
        );

      const totalAvailable = validBatches.reduce((s, b) => s + (b.units_available || 0), 0);
      if (totalAvailable < request.units_needed) {
        throw new AppError(
          `Insufficient stock to issue: ${totalAvailable} units available, ${request.units_needed} units required.`,
          400
        );
      }

      // Deduct using FEFO order
      let remaining = request.units_needed;
      const issuedBatches = [];
      for (const batch of validBatches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.units_available, remaining);
        batch.units_available -= deduct;
        batch.updated_at = new Date().toISOString();
        remaining -= deduct;
        issuedBatches.push({
          batch_id: batch.batch_id,
          blood_group: batch.blood_group,
          units_deducted: deduct,
          expiry_date: batch.expiry_date,
        });
      }

      request.status = 'dispatched';
      request.dispatched_at = new Date().toISOString();
      request.issued_batches = issuedBatches;

      const batchSummary = issuedBatches
        .map((b) => `${b.units_deducted}u from Batch ${b.batch_id}`)
        .join(', ');

      // Notify hospital
      if (hospital) {
        addNotificationInState(
          state,
          hospital.user_id,
          'request_dispatched',
          `Blood DISPATCHED: ${request.units_needed} units of ${request.blood_group} dispatched by ${bank?.name || 'the blood centre'}. Issued from: ${batchSummary}.`,
          ['in_app', 'email', 'sms'],
          {
            ...requestNotificationMetadata(request, hospital, bank, 'dispatched'),
            issuedBatches,
            batchSummary,
            title: `🚑 Blood Dispatched • ${request.blood_group} (${request.units_needed} Units)`,
          }
        );
      }

      return {
        ...request,
        hospital_name: hospital?.name,
        blood_bank_name: bank?.name,
        issuedBatches,
        batchSummary,
      };
    }
  );
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
    const urgency = payload.urgency || 'normal';

    const request = {
      id: 'br-' + generateUUID().substring(0, 8),
      hospital_id: hospitalProfileId,
      blood_bank_id: payload.blood_bank_id,
      blood_group: payload.blood_group,
      units_needed: parseInt(payload.units_needed, 10),
      urgency,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    state.blood_requests.push(request);

    if (bank) {
      const channels = ['in_app', 'email'];
      const prefix = urgency === 'emergency' ? 'EMERGENCY ALERT: ' : '';
      if (urgency === 'emergency') channels.push('sms');

      addNotificationInState(
        state,
        bank.user_id,
        urgency === 'emergency' ? 'emergency_request' : 'blood_request',
        `${prefix}${hospital?.name || 'A Hospital'} has raised a ${urgency.toUpperCase()} request for ${payload.units_needed} units of ${payload.blood_group}.`,
        channels,
        requestNotificationMetadata(request, hospital, bank, 'pending')
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

export async function getRequestDetail(requestId) {
  const state = await readTables(['blood_requests', 'blood_hospitals', 'blood_banks']);
  const request = state.blood_requests.find((item) => item.id === requestId);
  if (!request) throw new AppError('Request not found', 404);

  const hospital = state.blood_hospitals.find((item) => item.id === request.hospital_id);
  const bank = state.blood_banks.find((item) => item.id === request.blood_bank_id);

  return {
    ...request,
    hospital_name: request.hospital_name || hospital?.name || 'Medical Center Requisition',
    hospital_address: hospital?.address || 'Medical District',
    hospital_phone: hospital?.phone || request.contact_phone || '+91 1800-11-2026',
    hospital_district: hospital?.district || 'Central',
    hospital_state: hospital?.state || 'Delhi',
    hospital_lat: hospital?.lat || 28.5672,
    hospital_lng: hospital?.lng || 77.21,
    blood_bank_name: request.blood_bank_name || bank?.name || 'Regional Blood Centre',
    blood_bank_address: bank?.address || 'Central Blood Bank Facility',
    blood_bank_phone: bank?.phone || '+91 11-23716441',
    blood_bank_district: bank?.district || 'Central',
    blood_bank_state: bank?.state || 'Delhi',
    blood_bank_lat: bank?.lat || 28.6139,
    blood_bank_lng: bank?.lng || 77.209,
  };
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

export async function broadcastEmergencySos(payload) {
  const { hospitalId, userId, bloodGroup = 'O-', units = 1, patientName, notes, lat, lng } = payload;
  const unitsNeeded = Number(units) || 1;

  return withTables(['blood_hospitals', 'blood_banks', 'blood_donors', 'blood_requests', 'blood_notifications'], (state) => {
    const hospital = state.blood_hospitals.find((h) => h.id === hospitalId || h.user_id === userId);
    const hospitalName = hospital?.name || patientName || 'Emergency Hospital';
    const hospitalUserId = hospital?.user_id || userId;

    const compatibleDonorGroups = getCompatibleDonorGroups(bloodGroup, 'whole_blood');

    // 1. Alert compatible available donors (Required Members)
    let notifiedDonors = 0;
    state.blood_donors.forEach((donor) => {
      if (donor.user_id === hospitalUserId) return; // Do not send alert to the same requester
      if (donor.available_flag === false) return;
      if (!compatibleDonorGroups.includes(donor.blood_group)) return;

      addNotificationInState(
        state,
        donor.user_id,
        'emergency_request',
        `🚨 URGENT EMERGENCY SOS: ${hospitalName} urgently requires ${unitsNeeded} units of ${bloodGroup} blood. You are an eligible compatible donor (${donor.blood_group}). Please check if you can volunteer!`,
        ['in_app', 'sms'],
        {
          urgency: 'emergency',
          bloodGroup,
          unitsNeeded,
          hospitalName,
          patientName: patientName || 'Emergency Patient',
          isSos: true,
          title: `🚨 Emergency SOS • ${bloodGroup} Needed`
        }
      );
      notifiedDonors++;
    });

    // 2. Alert blood banks (Required Members)
    let notifiedBanks = 0;
    state.blood_banks.forEach((bank) => {
      if (bank.user_id === hospitalUserId) return;
      addNotificationInState(
        state,
        bank.user_id,
        'emergency_request',
        `🚨 EMERGENCY SOS BROADCAST: ${hospitalName} dispatched an emergency SOS requisition for ${unitsNeeded} units of ${bloodGroup} blood.`,
        ['in_app', 'sms', 'email'],
        {
          urgency: 'emergency',
          bloodGroup,
          unitsNeeded,
          hospitalName,
          patientName: patientName || 'Emergency Patient',
          isSos: true,
          title: `🚨 Emergency SOS Call • ${bloodGroup} (${unitsNeeded} Units)`
        }
      );
      notifiedBanks++;
    });

    // 3. Create emergency blood request record
    const primaryBank = state.blood_banks[0];
    const sosRequest = {
      id: 'sos-' + generateUUID().substring(0, 8),
      hospital_id: hospital?.id || 'h-emergency',
      blood_bank_id: primaryBank?.id || 'bb-1',
      blood_group: bloodGroup,
      units_needed: unitsNeeded,
      urgency: 'emergency',
      patient_name: patientName || `${hospitalName} Emergency`,
      contact_phone: hospital?.phone || '',
      status: 'pending',
      is_sos: true,
      notes: notes || 'Emergency SOS Broadcast across national network',
      created_at: new Date().toISOString(),
    };
    state.blood_requests.unshift(sosRequest);

    // 4. Send OUTGOING confirmation to hospital (NOT an incoming emergency action alert to themselves)
    if (hospitalUserId) {
      addNotificationInState(
        state,
        hospitalUserId,
        'sos_dispatched',
        `✓ SOS BROADCAST DISPATCHED: Urgent need of ${unitsNeeded} units of ${bloodGroup} transmitted to ${notifiedBanks} blood centres and ${notifiedDonors} compatible donors nationwide.`,
        ['in_app'],
        {
          requestId: sosRequest.id,
          urgency: 'emergency',
          bloodGroup,
          unitsNeeded,
          notifiedBanks,
          notifiedDonors,
          title: '✓ SOS Broadcast Dispatched'
        }
      );
    }

    return {
      success: true,
      requestId: sosRequest.id,
      notifiedDonors,
      notifiedBanks,
      bloodGroup,
      unitsNeeded,
      message: `Emergency SOS broadcast successfully transmitted to ${notifiedBanks} blood centres and ${notifiedDonors} compatible donors.`
    };
  });
}

export async function syncEraktkoshLive(stateCode = 'all') {
  const isAllStates = !stateCode || stateCode === 'all' || stateCode === 'ALL';

  if (isAllStates) {
    // Pan-India synchronization across all 36 states and UTs
    return withTables(['blood_banks', 'blood_inventory'], (state) => {
      let updatedBanks = 0;
      let updatedInventory = 0;
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
      const rawList = Array.isArray(eraktkoshData) && eraktkoshData.length > 0 ? eraktkoshData : [];

      rawList.forEach((item, idx) => {
        const bankName = (item.name || '').trim().toLowerCase();
        let existingBank = state.blood_banks.find(
          (b) => b.name?.trim().toLowerCase() === bankName && b.state === item.state
        );

        if (!existingBank) {
          const bankId = `bb-${state.blood_banks.length + 1}`;
          existingBank = {
            id: bankId,
            user_id: `u-bank-${state.blood_banks.length + 1}`,
            name: item.name || 'Blood Centre',
            address: item.address || `${item.state}, India`,
            state: item.state || 'Delhi',
            stateCode: item.stateCode || '97',
            district: item.district || 'District Hub',
            phone: item.phone || '+91 1800-11-2026',
            email: item.email || 'info@eraktkosh.in',
            category: item.category || 'Govt.',
            type: item.type || 'Blood Bank',
            lastUpdated: item.lastUpdated || 'Live Today',
            lat: item.lat || 28.6139,
            lng: item.lng || 77.2090,
            is_eraktkosh: true,
            created_at: new Date().toISOString()
          };
          state.blood_banks.push(existingBank);
          updatedBanks++;
        } else {
          existingBank.address = item.address || existingBank.address;
          existingBank.district = item.district || existingBank.district;
          existingBank.category = item.category || existingBank.category;
          existingBank.lastUpdated = item.lastUpdated || 'Live Today';
          existingBank.is_eraktkosh = true;
          updatedBanks++;
        }

        const stock = item.stockSummary || {};
        bloodGroups.forEach((bg, gIdx) => {
          let invItem = state.blood_inventory.find(
            (inv) => inv.blood_bank_id === existingBank.id && inv.blood_group === bg
          );
          const units = stock[bg] !== undefined ? Number(stock[bg]) : (idx % 2 === 0 ? (gIdx * 4) + 2 : 0);

          if (!invItem) {
            invItem = {
              id: `bi-${existingBank.id}-${bg.replace('+', 'p').replace('-', 'm')}`,
              blood_bank_id: existingBank.id,
              blood_group: bg,
              units_available: units,
              expiry_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
              batch_id: `ERAKTKOSH-${bg}-${(idx % 100) + 1}`,
              updated_at: new Date().toISOString()
            };
            state.blood_inventory.push(invItem);
          } else {
            invItem.units_available = units;
            invItem.updated_at = new Date().toISOString();
          }
          updatedInventory++;
        });
      });

      return {
        success: true,
        allStates: true,
        count: state.blood_banks.length,
        updatedBanks,
        updatedInventory,
        statesCount: 36,
        state: 'All 36 States & UTs (Pan-India)',
        message: `Successfully synchronized ${state.blood_banks.length} blood centres across all 36 States & UTs nationwide.`
      };
    });
  }

  // Single state sync
  let freshBanks = [];
  try {
    freshBanks = await fetchStateEraktkosh(stateCode);
  } catch (_) {}

  return withTables(['blood_banks', 'blood_inventory'], (state) => {
    let updatedBanks = 0;
    let updatedInventory = 0;
    const targetBanks = (freshBanks && freshBanks.length > 0) 
      ? freshBanks 
      : (Array.isArray(eraktkoshData) ? eraktkoshData.filter(b => b.stateCode === stateCode.toString() || b.state === stateCode) : []);

    targetBanks.forEach((fresh) => {
      const existingIndex = state.blood_banks.findIndex(
        (bank) => bank.name?.toLowerCase() === fresh.name?.toLowerCase() && bank.state === fresh.state
      );

      if (existingIndex !== -1) {
        const bank = {
          ...state.blood_banks[existingIndex],
          ...fresh,
          id: state.blood_banks[existingIndex].id,
          user_id: state.blood_banks[existingIndex].user_id,
          lastUpdated: 'Live Just Now',
          is_eraktkosh: true
        };
        state.blood_banks[existingIndex] = bank;
        updatedBanks++;

        Object.entries(fresh.stockSummary || {}).forEach(([bloodGroup, units]) => {
          const inventoryItem = state.blood_inventory.find(
            (item) => item.blood_bank_id === bank.id && item.blood_group === bloodGroup
          );
          if (inventoryItem) {
            inventoryItem.units_available = Number(units) || 0;
            inventoryItem.updated_at = new Date().toISOString();
            updatedInventory++;
          }
        });
      }
    });

    const stateName = targetBanks[0]?.state || 'State';
    return {
      success: true,
      allStates: false,
      count: targetBanks.length || state.blood_banks.length,
      updatedBanks,
      updatedInventory,
      state: stateName,
      syncedAt: new Date().toISOString(),
    };
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

export async function markAllNotificationsRead(userId) {
  return withTables(['blood_notifications'], (state) => {
    state.blood_notifications.forEach((notification) => {
      if (notification.user_id === userId) notification.read_flag = true;
    });
    return { success: true };
  });
}

export async function addNotification(userId, type, message, sentVia = ['in_app'], metadata = {}) {
  return withTables(['blood_notifications'], (state) => {
    return addNotificationInState(state, userId, type, message, sentVia, metadata);
  });
}

export async function resetAllData() {
  return resetStore();
}
