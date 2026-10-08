import express from 'express';
import cors from 'cors';
import { checkDatabase } from './db.js';
import { initializeStore } from './store.js';
import * as domain from './domain.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const route = (handler) => async (req, res, next) => {
  try {
    const data = await handler(req, res);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

app.get('/api/health', route(async () => {
  const db = await checkDatabase();
  return { ok: true, db };
}));

app.post('/api/auth/register/:role', route(async (req) => {
  return domain.register(req.params.role, req.body);
}));

app.post('/api/auth/login', route(async (req) => {
  return domain.login(req.body.email, req.body.password);
}));

app.get('/api/dashboard/public', route(async () => domain.getPublicDashboard()));
app.get('/api/dashboard/stock', route(async () => domain.getPublicStockAvailability()));

app.get('/api/blood-banks/nearest', route(async (req) => {
  return domain.findNearestBankForGroup(req.query.bloodGroup, req.query.lat, req.query.lng);
}));
app.get('/api/blood-banks/:bankId/detail', route(async (req) => {
  return domain.getBloodBankDetail(req.params.bankId);
}));

app.get('/api/admin/users', route(async () => domain.getAdminUsers()));
app.get('/api/admin/stats', route(async () => domain.getAdminStats()));
app.patch('/api/admin/users/:userId/status', route(async (req) => {
  return domain.updateUserStatus(req.params.userId, req.body.status);
}));
app.patch('/api/admin/users/:userId/role', route(async (req) => {
  return domain.updateUserRole(req.params.userId, req.body.role);
}));
app.get('/api/admin/queries', route(async () => domain.getAdminQueries()));
app.patch('/api/admin/queries/:queryId/resolve', route(async (req) => {
  return domain.resolveQuery(req.params.queryId, req.body.responseText);
}));

app.post('/api/queries', route(async (req) => {
  return domain.createQuery(req.body.userId, req.body.subject, req.body.message);
}));

app.get('/api/blood-banks/profile', route(async (req) => {
  return domain.getBloodBankProfile(req.query.userId, req.query.profileId);
}));
app.get('/api/blood-banks/:bankId/inventory', route(async (req) => {
  return domain.getInventory(req.params.bankId);
}));
app.post('/api/blood-banks/:bankId/inventory', route(async (req) => {
  return domain.addInventoryItem(req.params.bankId, req.body);
}));
app.put('/api/inventory/:itemId', route(async (req) => {
  return domain.updateInventoryItem(req.params.itemId, req.body);
}));
app.delete('/api/inventory/:itemId', route(async (req) => {
  return domain.deleteInventoryItem(req.params.itemId);
}));
app.get('/api/blood-banks/:bankId/requests', route(async (req) => {
  return domain.getBloodBankRequests(req.params.bankId);
}));

app.get('/api/hospitals/profile', route(async (req) => {
  return domain.getHospitalProfile(req.query.userId, req.query.profileId);
}));
app.get('/api/hospitals/:hospitalId/blood-banks', route(async (req) => {
  return domain.getHospitalBloodBanks(req.params.hospitalId, req.query.userId);
}));
app.get('/api/hospitals/:hospitalId/requests', route(async (req) => {
  return domain.getHospitalRequests(req.params.hospitalId);
}));
app.post('/api/hospitals/:hospitalId/requests', route(async (req) => {
  return domain.createBloodRequest(req.params.hospitalId, req.body);
}));
app.patch('/api/hospitals/:hospitalId/profile', route(async (req) => {
  return domain.updateHospitalProfile(req.params.hospitalId, req.body);
}));
app.get('/api/hospitals/preferences/:userId', route(async (req) => {
  return domain.getHospitalPreferences(req.params.userId);
}));
app.put('/api/hospitals/preferences/:userId', route(async (req) => {
  return domain.updateHospitalPreferences(req.params.userId, req.body.preferredBanks || []);
}));

// Cross-Match Endpoints
app.post('/api/hospital/cross-match', route(async (req) => {
  return domain.crossMatchBlood(req.body.hospitalId, req.body);
}));
app.get('/api/hospital/cross-match/donors', route(async (req) => {
  return domain.crossMatchDonors(req.query.hospitalId, req.query);
}));
app.get('/api/public/blood-compatibility/:bloodGroup', route(async (req) => {
  return domain.getBloodCompatibility(req.params.bloodGroup, req.query.component);
}));

app.get('/api/donors/profile', route(async (req) => {
  return domain.getDonorProfile(req.query.userId, req.query.profileId);
}));
app.get('/api/donors/nearby', route(async (req) => {
  return domain.getNearbyDonors(req.query.lat, req.query.lng, req.query.maxDistanceKm || 15);
}));
app.get('/api/donors/:donorId/requests', route(async (req) => {
  return domain.getDonorRequests(req.params.donorId);
}));
app.patch('/api/donors/:donorId/availability', route(async (req) => {
  return domain.toggleDonorAvailability(req.params.donorId, req.body.availableFlag);
}));

app.post('/api/donation-offers', route(async (req) => {
  return domain.requestDonorDonation(req.body.donorId, req.body.requesterType, req.body.requesterProfileId);
}));
app.patch('/api/donation-offers/:offerId/status', route(async (req) => {
  return domain.respondToOffer(req.params.offerId, req.body.status);
}));

app.post('/api/blood-requests/public', route(async (req) => {
  return domain.createPublicBloodRequest(req.body);
}));
app.post('/api/broadcast/sos', route(async (req) => {
  return domain.broadcastEmergencySos(req.body);
}));
app.post('/api/emergency/sos', route(async (req) => {
  return domain.broadcastEmergencySos(req.body);
}));
app.patch('/api/blood-requests/:requestId/status', route(async (req) => {
  return domain.updateBloodRequestStatus(req.params.requestId, req.body.status, req.body.updatedByRole);
}));
app.post('/api/blood-requests/:requestId/reserve', route(async (req) => {
  return domain.reserveBloodRequest(req.params.requestId);
}));
app.post('/api/blood-requests/:requestId/issue', route(async (req) => {
  return domain.issueBloodRequest(req.params.requestId);
}));
app.get('/api/requests/:requestId', route(async (req) => {
  return domain.getRequestDetail(req.params.requestId);
}));

app.get('/api/users/:userId/notifications', route(async (req) => {
  return domain.getNotifications(req.params.userId);
}));
app.post('/api/notifications', route(async (req) => {
  return domain.addNotification(req.body.userId, req.body.type, req.body.message, req.body.sentVia, req.body.metadata);
}));
app.patch('/api/notifications/:notificationId/read', route(async (req) => {
  return domain.markNotificationRead(req.params.notificationId);
}));
app.patch('/api/users/:userId/notifications/read-all', route(async (req) => {
  return domain.markAllNotificationsRead(req.params.userId);
}));

app.post('/api/cron/expiry-check', route(async () => domain.runExpiryCheckCron()));
app.post('/api/eraktkosh/sync', route(async (req) => domain.syncEraktkoshLive(req.body.stateCode)));
app.post('/api/dev/reset', route(async () => domain.resetAllData()));

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || 'Server error' });
});

initializeStore()
  .then(() => {
    app.listen(port, () => {
      console.log(`BloodCoord API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize BloodCoord API:', error.message);
    process.exit(1);
  });
