import axios from 'axios';
import { mockApi, getDistance, initMockDb } from './mockDb.js';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000';
const USE_MOCK = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'false') ? false : true;

function asError(error) {
  return new Error(error.response?.data?.message || error.message || 'Request failed');
}

async function request(config) {
  try {
    const res = await axios({ baseURL: API, ...config });
    return res.data;
  } catch (error) {
    throw asError(error);
  }
}

export const dataApi = {
  isMock: USE_MOCK,

  register(role, payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.register(role, payload));
    return request({ method: 'post', url: `/api/auth/register/${role}`, data: payload });
  },

  login(email, password) {
    if (USE_MOCK) return Promise.resolve(mockApi.login(email, password));
    return request({ method: 'post', url: '/api/auth/login', data: { email, password } });
  },

  getPublicDashboard() {
    if (USE_MOCK) return Promise.resolve(mockApi.getPublicDashboard());
    return request({ method: 'get', url: '/api/dashboard/public' });
  },

  // Full stock availability with per-bank detail
  getPublicStockAvailability() {
    if (USE_MOCK) return Promise.resolve(mockApi.getPublicStockAvailability());
    return request({ method: 'get', url: '/api/dashboard/stock' });
  },

  // Get detailed info for a single blood bank
  getBloodBankDetail(bankId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getBloodBankDetail(bankId));
    return request({ method: 'get', url: `/api/blood-banks/${bankId}/detail` });
  },

  // Find nearest bank with stock for a blood group
  findNearestBankForGroup(bloodGroup, lat, lng) {
    if (USE_MOCK) return Promise.resolve(mockApi.findNearestBankForGroup(bloodGroup, lat, lng));
    return request({ method: 'get', url: '/api/blood-banks/nearest', params: { bloodGroup, lat, lng } });
  },

  // Create a public blood request (from dashboard, no login required)
  createPublicBloodRequest(payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.createPublicBloodRequest(payload));
    return request({ method: 'post', url: '/api/blood-requests/public', data: payload });
  },

  // Advanced Cross-Match for Hospital
  crossMatchBlood(payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.crossMatchBlood(payload.hospitalId, payload));
    return request({ method: 'post', url: '/api/hospital/cross-match', data: payload });
  },

  // Compatible Donor Search for Hospital
  crossMatchDonors(params) {
    if (USE_MOCK) return Promise.resolve(mockApi.crossMatchDonors(params.hospitalId, params));
    return request({ method: 'get', url: '/api/hospital/cross-match/donors', params });
  },

  // Blood Compatibility Matrix lookup
  getBloodCompatibility(bloodGroup, componentType = 'RBC') {
    if (USE_MOCK) return Promise.resolve(mockApi.getBloodCompatibility(bloodGroup, componentType));
    return request({
      method: 'get',
      url: `/api/public/blood-compatibility/${encodeURIComponent(bloodGroup)}`,
      params: { component: componentType }
    });
  },

  getAdminUsers() {
    if (USE_MOCK) return Promise.resolve(mockApi.getAdminUsers());
    return request({ method: 'get', url: '/api/admin/users' });
  },

  getAdminQueries() {
    if (USE_MOCK) return Promise.resolve(mockApi.getAdminQueries());
    return request({ method: 'get', url: '/api/admin/queries' });
  },

  updateUserStatus(userId, status) {
    if (USE_MOCK) return Promise.resolve(mockApi.updateUserStatus(userId, status));
    return request({ method: 'patch', url: `/api/admin/users/${userId}/status`, data: { status } });
  },

  updateUserRole(userId, role) {
    if (USE_MOCK) return Promise.resolve(mockApi.updateUserRole(userId, role));
    return request({ method: 'patch', url: `/api/admin/users/${userId}/role`, data: { role } });
  },

  resolveQuery(queryId, responseText) {
    if (USE_MOCK) return Promise.resolve(mockApi.resolveQuery(queryId, responseText));
    return request({ method: 'patch', url: `/api/admin/queries/${queryId}/resolve`, data: { responseText } });
  },

  createQuery(userId, subject, message) {
    if (USE_MOCK) return Promise.resolve(mockApi.createQuery(userId, subject, message));
    return request({ method: 'post', url: '/api/queries', data: { userId, subject, message } });
  },

  getBloodBankProfile(user) {
    if (USE_MOCK) return Promise.resolve(mockApi.getBloodBankProfile(user));
    return request({ method: 'get', url: '/api/blood-banks/profile', params: { userId: user.id, profileId: user.profileId } });
  },

  getHospitalProfile(user) {
    if (USE_MOCK) return Promise.resolve(mockApi.getHospitalProfile(user));
    return request({ method: 'get', url: '/api/hospitals/profile', params: { userId: user.id, profileId: user.profileId } });
  },

  getDonorProfile(user) {
    if (USE_MOCK) return Promise.resolve(mockApi.getDonorProfile(user));
    return request({ method: 'get', url: '/api/donors/profile', params: { userId: user.id, profileId: user.profileId } });
  },

  getInventory(bankProfileId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getInventory(bankProfileId));
    return request({ method: 'get', url: `/api/blood-banks/${bankProfileId}/inventory` });
  },

  addInventoryItem(bankProfileId, payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.addInventoryItem(bankProfileId, payload));
    return request({ method: 'post', url: `/api/blood-banks/${bankProfileId}/inventory`, data: payload });
  },

  updateInventoryItem(itemId, payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.updateInventoryItem(itemId, payload));
    return request({ method: 'put', url: `/api/inventory/${itemId}`, data: payload });
  },

  deleteInventoryItem(itemId) {
    if (USE_MOCK) return Promise.resolve(mockApi.deleteInventoryItem(itemId));
    return request({ method: 'delete', url: `/api/inventory/${itemId}` });
  },

  getNearbyDonors(lat, lng, maxDistanceKm = 50) {
    if (USE_MOCK) return Promise.resolve(mockApi.getNearbyDonors(lat, lng, maxDistanceKm));
    return request({ method: 'get', url: '/api/donors/nearby', params: { lat, lng, maxDistanceKm } });
  },

  getBloodBankRequests(bankProfileId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getBloodBankRequests(bankProfileId));
    return request({ method: 'get', url: `/api/blood-banks/${bankProfileId}/requests` });
  },

  updateBloodRequestStatus(requestId, status, updatedByRole = null) {
    if (USE_MOCK) return Promise.resolve(mockApi.updateRequestStatus(requestId, status, updatedByRole));
    return request({ method: 'patch', url: `/api/blood-requests/${requestId}/status`, data: { status, updatedByRole } });
  },

  updateRequestStatus(requestId, status, updatedByRole = null) {
    if (USE_MOCK) return Promise.resolve(mockApi.updateRequestStatus(requestId, status, updatedByRole));
    return request({ method: 'patch', url: `/api/blood-requests/${requestId}/status`, data: { status, updatedByRole } });
  },

  reserveBloodRequest(requestId) {
    if (USE_MOCK) return Promise.resolve(mockApi.reserveBloodRequest(requestId));
    return request({ method: 'post', url: `/api/blood-requests/${requestId}/reserve` });
  },

  issueBloodRequest(requestId) {
    if (USE_MOCK) return Promise.resolve(mockApi.issueBloodRequest(requestId));
    return request({ method: 'post', url: `/api/blood-requests/${requestId}/issue` });
  },

  broadcastEmergencySos(payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.broadcastEmergencySos(payload));
    return request({ method: 'post', url: '/api/broadcast/sos', data: payload });
  },

  getHospitalBloodBanks(hospitalProfileId, userId) {
    if (USE_MOCK) {
      const profile = mockApi.getHospitalProfile({ id: userId, profileId: hospitalProfileId });
      const banks = mockApi.getPublicStockAvailability();
      return Promise.resolve(
        banks.map(bank => {
          const dist = profile && profile.lat && bank.lat
            ? getDistance(profile.lat, profile.lng, bank.lat, bank.lng)
            : 999;
          return {
            ...bank,
            distance: Number(dist) || 0,
            responseTime: Math.floor((Number(dist) || 1) * 3) + 12 + ' mins',
            isPreferred: false
          };
        }).sort((a, b) => a.distance - b.distance)
      );
    }
    return request({ method: 'get', url: `/api/hospitals/${hospitalProfileId}/blood-banks`, params: { userId } });
  },

  getHospitalRequests(hospitalProfileId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getHospitalRequests(hospitalProfileId));
    return request({ method: 'get', url: `/api/hospitals/${hospitalProfileId}/requests` });
  },

  createBloodRequest(hospitalProfileId, payload) {
    if (USE_MOCK) return Promise.resolve(mockApi.createBloodRequest(hospitalProfileId, payload));
    return request({ method: 'post', url: `/api/hospitals/${hospitalProfileId}/requests`, data: payload });
  },

  getHospitalPreferences(userId) {
    if (USE_MOCK) return Promise.resolve(JSON.parse(localStorage.getItem('hosp_preferred_banks') || '[]'));
    return request({ method: 'get', url: `/api/hospitals/preferences/${userId}` });
  },

  updateHospitalPreferences(userId, preferredBanks) {
    if (USE_MOCK) {
      localStorage.setItem('hosp_preferred_banks', JSON.stringify(preferredBanks));
      return Promise.resolve(preferredBanks);
    }
    return request({ method: 'put', url: `/api/hospitals/preferences/${userId}`, data: { preferredBanks } });
  },

  updateHospitalProfile(hospitalProfileId, payload) {
    if (USE_MOCK) {
      // Use mockApi for profile updates
      const profile = mockApi.getHospitalProfile({ id: payload.userId, profileId: hospitalProfileId });
      if (profile) {
        profile.name = payload.name;
        profile.address = payload.address;
      }
      return Promise.resolve(profile);
    }
    return request({ method: 'patch', url: `/api/hospitals/${hospitalProfileId}/profile`, data: payload });
  },

  getDonorRequests(donorProfileId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getDonorRequests(donorProfileId));
    return request({ method: 'get', url: `/api/donors/${donorProfileId}/requests` });
  },

  respondToOffer(offerId, status) {
    if (USE_MOCK) return Promise.resolve(mockApi.respondToOffer(offerId, status));
    return request({ method: 'patch', url: `/api/donation-offers/${offerId}/status`, data: { status } });
  },

  toggleDonorAvailability(donorProfileId, availableFlag) {
    if (USE_MOCK) return Promise.resolve(mockApi.toggleDonorAvailability(donorProfileId, availableFlag));
    return request({ method: 'patch', url: `/api/donors/${donorProfileId}/availability`, data: { availableFlag } });
  },

  requestDonorDonation(donorId, requesterType, requesterProfileId) {
    if (USE_MOCK) return Promise.resolve(mockApi.requestDonorDonation(donorId, requesterType, requesterProfileId));
    return request({ method: 'post', url: '/api/donation-offers', data: { donorId, requesterType, requesterProfileId } });
  },

  runExpiryCheckCron() {
    if (USE_MOCK) return Promise.resolve(mockApi.runExpiryCheckCron());
    return request({ method: 'post', url: '/api/cron/expiry-check' });
  },

  syncEraktkoshLive(stateCode = 'all') {
    if (USE_MOCK) return mockApi.syncEraktkoshLive(stateCode);
    return request({ method: 'post', url: '/api/eraktkosh/sync', data: { stateCode } });
  },

  getRequestDetail(requestId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getRequestDetail(requestId));
    return request({ method: 'get', url: `/api/requests/${requestId}` });
  },

  getNotifications(userId) {
    if (USE_MOCK) return Promise.resolve(mockApi.getNotifications(userId));
    return request({ method: 'get', url: `/api/users/${userId}/notifications` });
  },

  markNotificationRead(notificationId) {
    if (USE_MOCK) return Promise.resolve(mockApi.markNotificationRead(notificationId));
    return request({ method: 'patch', url: `/api/notifications/${notificationId}/read` });
  },

  markAllNotificationsRead(userId) {
    if (USE_MOCK) return Promise.resolve(mockApi.markAllNotificationsRead(userId));
    return request({ method: 'patch', url: `/api/users/${userId}/notifications/read-all` });
  },

  addNotification(userId, type, message, sentVia = ['in_app'], metadata = {}) {
    if (USE_MOCK) return Promise.resolve(mockApi.addNotification(userId, type, message, sentVia, metadata));
    return request({ method: 'post', url: '/api/notifications', data: { userId, type, message, sentVia, metadata } });
  },

  resetSeedData() {
    if (USE_MOCK) {
      localStorage.clear();
      initMockDb(true);
      return Promise.resolve({ success: true });
    }
    return request({ method: 'post', url: '/api/dev/reset' });
  },

  getAdminStats() {
    if (USE_MOCK) return Promise.resolve(mockApi.getAdminStats());
    return request({ method: 'get', url: '/api/admin/stats' });
  },
};
