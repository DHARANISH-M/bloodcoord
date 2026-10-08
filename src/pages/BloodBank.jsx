import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dataApi } from '../utils/api'
import Sidebar from '../components/Sidebar'
import RequestQuickModal from '../components/notifications/RequestQuickModal'
import {
  getCompatibleDonorGroups,
  getCompatibilityDetails,
  isCompatible
} from '../utils/bloodCompatibility'

export default function BloodBank(){
  const { user, logout, isDarkMode, setIsDarkMode } = useAuth()
  const navigate = useNavigate()
  
  // Layout and Tab states
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Data states
  const [inventory, setInventory] = useState([])
  const [nearbyDonors, setNearbyDonors] = useState([])
  const [requests, setRequests] = useState([])
  const [bankInfo, setBankInfo] = useState(null)
  const [notifications, setNotifications] = useState([])

  // Quick Action Modal states for notifications
  const [selectedNotifReqId, setSelectedNotifReqId] = useState(null)
  const [selectedNotifReqObj, setSelectedNotifReqObj] = useState(null)
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState('all')

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editItemId, setEditItemId] = useState(null)
  const [bloodGroup, setBloodGroup] = useState('O-')
  const [units, setUnits] = useState('5')
  const [expiry, setExpiry] = useState('')
  const [batchId, setBatchId] = useState('')
  
  // Dispatch result modal
  const [issuedDispatchResult, setIssuedDispatchResult] = useState(null)

  const [msg, setMsg] = useState(null)

  const reloadData = async () => {
    try {
      if (!user) return
      const profile = await dataApi.getBloodBankProfile(user)
      if (profile) {
        const [inventoryList, donorsList, requestList, notificationList] = await Promise.all([
          dataApi.getInventory(profile.id),
          dataApi.getNearbyDonors(profile.lat || 28.6139, profile.lng || 77.2090, 50),
          dataApi.getBloodBankRequests(profile.id),
          dataApi.getNotifications(user.id)
        ])
        setBankInfo(profile)
        setInventory(inventoryList || [])
        setNearbyDonors(donorsList || [])
        setRequests(requestList || [])
        setNotifications(notificationList || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    reloadData()
  }, [user])

  const triggerCronCheck = async () => {
    try {
      const res = await dataApi.runExpiryCheckCron()
      setMsg({ text: `node-cron Expiry Check triggered! Generated ${res.count} new notification alerts for expiring blood batches.`, type: 'success' })
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }



  const handleSaveInventory = async (e) => {
    e.preventDefault()
    if (!expiry || !batchId) {
      alert('Please fill out all fields')
      return
    }

    try {
      const payload = { blood_group: bloodGroup, units_available: units, expiry_date: expiry, batch_id: batchId }
      if (editItemId) {
        await dataApi.updateInventoryItem(editItemId, payload)
        setMsg({ text: 'Batch updated successfully', type: 'success' })
      } else {
        await dataApi.addInventoryItem(bankInfo.id, payload)
        setMsg({ text: 'Batch added successfully', type: 'success' })
      }
      // Reset form
      setEditItemId(null)
      setShowForm(false)
      setBatchId('')
      setExpiry('')
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleEdit = (item) => {
    setEditItemId(item.id)
    setBloodGroup(item.blood_group)
    setUnits(item.units_available.toString())
    setExpiry(item.expiry_date)
    setBatchId(item.batch_id)
    setShowForm(true)
  }

  const handleDelete = async (itemId) => {
    if (window.confirm('Delete this blood batch reference?')) {
      try {
        await dataApi.deleteInventoryItem(itemId)
        setMsg({ text: 'Batch deleted successfully', type: 'success' })
        await reloadData()
      } catch (e) {
        setMsg({ text: e.message, type: 'error' })
      }
    }
  }

  const [selectedAnalysisReq, setSelectedAnalysisReq] = useState(null)

  const analyzeRequestCompatibility = (req) => {
    if (!req) return null
    const reqGroup = req.blood_group || 'A+'
    const comp = (req.component_type || 'RBC').toUpperCase()
    const compatibleGroups = getCompatibleDonorGroups(reqGroup, comp)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stockMap = {}
    let totalCompatibleUnits = 0
    let exactUnits = 0

    compatibleGroups.forEach(bg => {
      const batches = inventory.filter(item => {
        if (item.blood_group !== bg) return false
        if ((item.units_available || 0) <= 0) return false
        if (item.expiry_date && new Date(item.expiry_date) < today) return false
        return true
      })
      const units = batches.reduce((sum, b) => sum + (b.units_available || 0), 0)
      const details = getCompatibilityDetails(bg, reqGroup, comp)

      stockMap[bg] = {
        blood_group: bg,
        units,
        matchType: details.matchType,
        reason: details.reason,
        batches
      }
      totalCompatibleUnits += units
      if (bg === reqGroup) exactUnits += units
    })

    return {
      request: req,
      recipientBloodGroup: reqGroup,
      componentType: comp,
      unitsNeeded: req.units_needed || 1,
      compatibleGroups,
      stockMap,
      exactUnits,
      totalCompatibleUnits,
      isSufficient: totalCompatibleUnits >= (req.units_needed || 1),
      shortage: Math.max(0, (req.units_needed || 1) - totalCompatibleUnits)
    }
  }

  const handleVerifiedAccept = async (reqId) => {
    try {
      const targetReq = requests.find(r => r.id === reqId)
      if (targetReq) {
        const analysis = analyzeRequestCompatibility(targetReq)
        if (analysis.totalCompatibleUnits < targetReq.units_needed) {
          if (!window.confirm(`Warning: Your current compatible inventory (${analysis.totalCompatibleUnits} units) is less than the requested ${targetReq.units_needed} units. Do you still wish to accept for partial dispatch?`)) {
            return
          }
        }
      }
      await dataApi.updateBloodRequestStatus(reqId, 'accepted')
      setMsg({ text: `Cross-match verified! Hospital request marked as ACCEPTED. Logistics notification dispatched.`, type: 'success' })
      setSelectedAnalysisReq(null)
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRespondToRequest = async (reqId, status) => {
    if (status === 'accepted') {
      return handleVerifiedAccept(reqId)
    }
    try {
      await dataApi.updateBloodRequestStatus(reqId, status)
      setMsg({ text: `Hospital request marked as ${status.toUpperCase()}. Notification sent.`, type: 'success' })
      setSelectedAnalysisReq(null)
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRequestDonor = async (donorId) => {
    try {
      await dataApi.requestDonorDonation(donorId, 'blood_bank', bankInfo.id)
      setMsg({ text: 'Donation request dispatched to the donor. They are notified.', type: 'success' })
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleReserveRequest = async (reqId) => {
    try {
      await dataApi.reserveBloodRequest(reqId)
      setMsg({ text: 'Blood units RESERVED for this request. Hospital notified.', type: 'success' })
      setSelectedAnalysisReq(null)
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleIssueRequest = async (reqId) => {
    try {
      const result = await dataApi.issueBloodRequest(reqId)
      setMsg({ text: `Blood ISSUED & DISPATCHED! ${result.batchSummary || ''}. Inventory updated (FEFO). Hospital dispatch notification sent.`, type: 'success' })
      setSelectedAnalysisReq(null)
      setIssuedDispatchResult(result)
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const getDaysLeft = (expiryStr) => {
    const diff = new Date(expiryStr) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen overflow-hidden text-left bg-canvas">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        unreadNotifCount={notifications.filter(n => !n.read_flag).length}
        user={user}
        handleLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative transition-colors bg-canvas">
        {/* Header Bar */}
        <header className="border-b px-6 py-4 flex justify-between items-center shadow-sm z-30 transition-colors bg-surface-card border-hairline text-ink">
          <div className="flex items-center space-x-4">
            <h2 className="text-base font-bold tracking-[0.65px] uppercase font-condensed">
              {activeTab === 'dashboard' ? 'INVENTORY MANAGER' : 
               activeTab === 'requests' ? 'HOSPITAL REQUESTS' : 
               activeTab === 'donors' ? 'DONOR INVITES' : 
               'ALERTS CENTER'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="h-8.5 w-8.5 bg-[#f54e00] text-white font-bold text-xs rounded-xl flex items-center justify-center">
                {bankInfo?.name?.slice(0,2).toUpperCase() || 'BB'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-ink">{bankInfo?.name || 'Blood Bank'}</span>
                <span className="text-[9px] text-[#f54e00] font-bold uppercase tracking-wider">
                  {bankInfo?.district || 'Manhattan'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {msg && (
            <div className={`p-4 rounded-xl text-xs font-bold text-center border ${
              msg.type === 'error' ? 'bg-[#f54e00]/10 border-red-100 text-[#d04200]' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              {msg.text}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Controls Strip */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 bg-surface-card border border-hairline rounded-xl shadow-none text-xs">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={triggerCronCheck}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition uppercase tracking-wider font-sans text-[10px]"
                  >
                    Run Expiry Cron
                  </button>
                </div>
                <button
                  onClick={() => {
                    setEditItemId(null)
                    setBatchId('')
                    setExpiry('')
                    setShowForm(!showForm)
                  }}
                  className="px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-lg transition uppercase tracking-wider font-sans text-[10px]"
                >
                  {showForm ? 'Close Form' : 'Add New Batch'}
                </button>
              </div>

              {/* Add/Edit Inventory Batch Form */}
              {showForm && (
                <form onSubmit={handleSaveInventory} className="bg-slate-50 border border-hairline p-6 rounded-2xl shadow-sm grid md:grid-cols-4 gap-4 items-end text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">Blood Group</label>
                    <select 
                      value={bloodGroup} 
                      onChange={e => setBloodGroup(e.target.value)}
                      className="w-full bg-surface-card border border-hairline rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">Units Count</label>
                    <input 
                      type="number"
                      min="1"
                      value={units}
                      onChange={e => setUnits(e.target.value)}
                      className="w-full bg-surface-card border border-hairline rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">Expiry Date</label>
                    <input 
                      type="date"
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      className="w-full bg-surface-card border border-hairline rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">Batch Code ID</label>
                    <input 
                      type="text"
                      placeholder="e.g. BAT-A1-100"
                      value={batchId}
                      onChange={e => setBatchId(e.target.value)}
                      className="w-full bg-surface-card border border-hairline rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-4 flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 bg-surface-card border border-hairline text-body text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#f54e00] text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      {editItemId ? 'Update Batch' : 'Store Batch'}
                    </button>
                  </div>
                </form>
              )}

              {/* Inventory CRUD Registry */}
              <div className="bg-surface-card border border-hairline rounded-2xl shadow-none overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-hairline flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Internal Inventory Registry</span>
                  <span className="text-[10px] bg-[#f54e00]/10 text-[#d04200] font-extrabold px-2.5 py-1 rounded-full">
                    {inventory.length} Batches Active
                  </span>
                </div>

                {inventory.length === 0 ? (
                  <div className="p-12 text-center text-muted">
                    No inventory batches saved. Click "Add New Batch" to register stock.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-muted">
                      <thead className="text-xs font-bold text-muted uppercase tracking-wider border-b border-hairline">
                        <tr>
                          <th className="px-6 py-4">Group</th>
                          <th className="px-6 py-4">Qty</th>
                          <th className="px-6 py-4">Batch ID</th>
                          <th className="px-6 py-4">Expiry Timeline</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {inventory.map(item => {
                          const daysLeft = getDaysLeft(item.expiry_date)
                          const isExpiring = daysLeft >= 0 && daysLeft <= 5

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center justify-center font-extrabold text-sm w-9 h-9 rounded-full bg-[#f54e00]/10 text-[#d04200] border border-rose-100">
                                  {item.blood_group}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-extrabold text-slate-800">
                                {item.units_available} units
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-muted">
                                {item.batch_id}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-slate-700 font-semibold">{item.expiry_date}</span>
                                  {isExpiring ? (
                                    <span className="inline-flex text-[9px] font-extrabold uppercase text-amber-600 mt-1 animate-pulse">
                                      Expiring in {daysLeft} days!
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted mt-1">({daysLeft} days left)</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="text-xs text-body hover:text-[#f54e00] font-bold"
                                >
                                  Edit
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-xs text-red-500 hover:text-[#d04200] font-bold"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="bg-surface-card border border-hairline rounded-2xl shadow-none overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-hairline flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Incoming Hospital Requests</span>
                <span className="text-[10px] bg-[#f54e00]/10 text-[#d04200] font-extrabold px-2.5 py-1 rounded-full">
                  {requests.length} Pending requests
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-muted">
                  <thead className="text-xs font-bold text-muted uppercase tracking-wider border-b border-hairline">
                    <tr>
                      <th className="px-6 py-4">Requesting Hospital</th>
                      <th className="px-6 py-4">Blood Group Type</th>
                      <th className="px-6 py-4">Units Requested</th>
                      <th className="px-6 py-4">Priority Status</th>
                      <th className="px-6 py-4">Request Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-muted">
                          No incoming requests from hospitals.
                        </td>
                      </tr>
                    ) : (
                      requests.map((r) => {
                        const isEmergency = r.urgency === 'emergency';
                        const isPending = r.status === 'pending';

                        return (
                          <tr 
                            key={r.id} 
                            className={`transition ${
                              isEmergency && isPending
                                ? 'bg-[#f54e00]/15 border-l-4 border-l-red-600 hover:bg-[#f54e00]/10' 
                                : 'hover:bg-slate-50/55'
                            }`}
                          >
                            <td className="px-6 py-4 text-left">
                              <div className="font-bold text-slate-700">{r.hospital_name}</div>
                              <div className="text-xs text-muted">{r.hospital_address} ({r.district})</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center font-extrabold text-sm w-9 h-9 rounded-full bg-[#f54e00]/10 text-[#d04200] border border-rose-100">
                                {r.blood_group}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-black text-slate-800 text-base">
                              {r.units_needed} units
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                isEmergency ? 'bg-[#f54e00]/10 text-[#d04200] animate-pulse' : 'bg-slate-100 text-body'
                              }`}>
                                {r.urgency}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                r.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                                r.status === 'reserved' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                r.status === 'dispatched' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                                r.status === 'fulfilled' || r.status === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                                'bg-[#f54e00]/10 border-red-100 text-[#d04200]'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {r.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => setSelectedAnalysisReq(r)}
                                    className="px-2.5 py-1.5 bg-canvas hover:bg-slate-100 text-ink border border-hairline font-bold text-xs rounded-lg transition"
                                    title="Analyze Blood Compatibility"
                                  >
                                    🔬 Analyze
                                  </button>
                                  <button
                                    onClick={() => handleRespondToRequest(r.id, 'accepted')}
                                    className="px-3 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold text-xs rounded-lg transition shadow-sm"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRespondToRequest(r.id, 'rejected')}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-body border border-hairline font-bold text-xs rounded-lg transition"
                                  >
                                    Decline
                                  </button>
                                </>
                              ) : r.status === 'accepted' ? (
                                <>
                                  <button
                                    onClick={() => setSelectedAnalysisReq(r)}
                                    className="px-2.5 py-1.5 bg-canvas hover:bg-slate-100 text-ink border border-hairline font-bold text-xs rounded-lg transition"
                                    title="Analyze Blood Compatibility"
                                  >
                                    🔬 Analyze
                                  </button>
                                  <button
                                    onClick={() => handleReserveRequest(r.id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
                                  >
                                    🔒 Reserve
                                  </button>
                                  <button
                                    onClick={() => handleIssueRequest(r.id)}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
                                  >
                                    🚑 Issue
                                  </button>
                                </>
                              ) : r.status === 'reserved' ? (
                                <button
                                  onClick={() => handleIssueRequest(r.id)}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
                                >
                                  🚑 Issue & Dispatch
                                </button>
                              ) : (
                                <span className="text-xs text-muted font-semibold uppercase">Processed</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CROSS-MATCH COMPATIBILITY & REQUEST ANALYSIS */}
          {activeTab === 'cross_match' && (
            <div className="space-y-6 text-left">
              <div className="bg-surface-card border border-hairline p-6 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔬</span>
                  <div>
                    <h3 className="text-base font-black text-ink uppercase tracking-wider">
                      Cross-Match & Compatibility Verification Console
                    </h3>
                    <p className="text-xs text-muted">
                      Verify theoretical ABO/Rh compatibility, FEFO non-expired stock, and potential substitute units for incoming hospital orders.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {requests.map(req => {
                  const analysis = analyzeRequestCompatibility(req);
                  const isEmergency = req.urgency === 'emergency';

                  return (
                    <div
                      key={req.id}
                      className={`p-6 rounded-2xl border bg-surface-card transition shadow-sm space-y-4 ${
                        isEmergency ? 'border-rose-300 ring-1 ring-rose-400/20' : 'border-hairline'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-full bg-[#f54e00]/10 text-[#f54e00] font-black flex items-center justify-center text-sm border border-rose-100">
                              {req.blood_group}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-sm text-ink">{req.hospital_name || 'Hospital Order'}</h4>
                              <p className="text-[10px] text-muted">{req.hospital_address || 'Verified Clinic'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isEmergency ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {req.urgency || 'routine'}
                          </span>
                          <div className="text-xs font-bold text-ink mt-1">
                            Required: <span className="text-[#f54e00] font-black">{req.units_needed} units</span>
                          </div>
                        </div>
                      </div>

                      {/* Compatible Inventory Breakdown in This Bank */}
                      <div className="p-4 bg-canvas rounded-xl border border-hairline/80 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted">
                          <span>Your Compatible Available Stock</span>
                          <span className="text-emerald-700 font-black">{analysis.totalCompatibleUnits} Units Total</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.values(analysis.stockMap).map(grp => (
                            <div key={grp.blood_group} className="p-2 rounded-lg bg-surface-card border border-hairline text-center">
                              <div className="text-xs font-black text-[#f54e00]">{grp.blood_group}</div>
                              <div className="text-xs font-bold text-ink mt-0.5">{grp.units} u</div>
                              <div className={`text-[8px] font-extrabold uppercase mt-0.5 ${
                                grp.matchType === 'exact_match' ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {grp.matchType === 'exact_match' ? 'Exact' : 'Compat'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sufficiency Status */}
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          {analysis.isSufficient ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              ✓ Sufficient stock available to fulfill
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              ⚠️ Shortage: Needs {analysis.shortage} more units
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          req.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                          req.status === 'accepted' ? 'bg-emerald-100 text-emerald-900' :
                          req.status === 'reserved' ? 'bg-blue-100 text-blue-900' :
                          req.status === 'dispatched' ? 'bg-purple-100 text-purple-900' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {['pending', 'accepted', 'reserved'].includes(req.status) && (
                        <div className="pt-2 border-t border-hairline flex gap-2 flex-wrap">
                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerifiedAccept(req.id)}
                                className="flex-1 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                              >
                                Verify &amp; Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondToRequest(req.id, 'rejected')}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-body text-xs font-bold rounded-xl transition uppercase"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {req.status === 'accepted' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReserveRequest(req.id)}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                              >
                                🔒 Reserve Units
                              </button>
                              <button
                                type="button"
                                onClick={() => handleIssueRequest(req.id)}
                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                              >
                                🚑 Issue &amp; Dispatch
                              </button>
                            </>
                          )}
                          {req.status === 'reserved' && (
                            <button
                              type="button"
                              onClick={() => handleIssueRequest(req.id)}
                              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                            >
                              🚑 Issue &amp; Dispatch
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {requests.length === 0 && (
                  <div className="col-span-2 p-16 text-center text-muted bg-surface-card border border-hairline rounded-3xl">
                    No active hospital requests to cross-match.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'donors' && (
            <div className="bg-surface-card border border-hairline rounded-2xl shadow-none overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-6 py-4 bg-slate-50 border-b border-hairline text-left">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nearby Available Donors (Range 15km)</span>
                  <p className="text-[10px] text-muted mt-0.5">Calculated using coordinate distance math (PostGIS mode).</p>
                </div>

                <div className="divide-y divide-hairline overflow-y-auto">
                  {nearbyDonors.length === 0 ? (
                    <div className="p-12 text-center text-muted text-xs">
                      No available donors found in near range.
                    </div>
                  ) : (
                    nearbyDonors.map(donor => (
                      <div key={donor.id} className="p-5 hover:bg-slate-50 transition flex justify-between items-center text-left">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{donor.name}</div>
                          <div className="text-[10px] text-muted font-semibold uppercase mt-0.5 font-sans">
                            Distance: {donor.distance != null ? Number(donor.distance).toFixed(1) : '0.0'} km away • Available
                          </div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">
                            Contact: {donor.phone}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <span className="inline-flex items-center justify-center font-extrabold text-xs w-7 h-7 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                            {donor.blood_group}
                          </span>
                          <button
                            onClick={() => handleRequestDonor(donor.id)}
                            className="px-3 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-extrabold text-[10px] uppercase tracking-wider rounded transition font-sans"
                          >
                            Invite
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS / ALERTS CENTER */}
          {activeTab === 'notifications' && (() => {
            const filteredNotifs = notifications.filter(n => {
              if (notifFilter === 'all') return true
              if (notifFilter === 'emergency') return n.type === 'emergency_request' || n.metadata?.urgency === 'emergency'
              if (notifFilter === 'accepted') return n.metadata?.status === 'accepted' || n.type === 'request_response' || (n.title || '').toLowerCase().includes('accepted')
              if (notifFilter === 'reserved') return n.metadata?.status === 'reserved' || (n.title || '').toLowerCase().includes('reserved')
              if (notifFilter === 'dispatched') return n.metadata?.status === 'dispatched' || (n.title || '').toLowerCase().includes('dispatched')
              if (notifFilter === 'expiry') return n.type === 'expiry_alert' || (n.title || '').toLowerCase().includes('expire')
              return true
            })

            return (
              <div className="bg-surface-card border border-hairline rounded-3xl shadow-sm overflow-hidden text-left font-sans space-y-0">
                <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🔔</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">Clinical Alerts Center</span>
                        <span className="text-[10px] bg-[#f54e00] text-white font-black px-2.5 py-0.5 rounded-full font-mono">
                          {notifications.filter(n => !n.read_flag).length} Unread
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Real-time blood requisitions, acceptance tracking, and expiry alerts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {notifications.some(n => !n.read_flag) && (
                      <button
                        onClick={async () => {
                          if (!user) return
                          await dataApi.markAllNotificationsRead(user.id)
                          setNotifications(prev => prev.map(n => ({ ...n, read_flag: true })))
                        }}
                        className="text-xs font-bold text-slate-300 hover:text-white underline transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="p-4 bg-slate-50 border-b border-hairline flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter Alerts:</span>
                  {[
                    { id: 'all', label: `All (${notifications.length})` },
                    { id: 'accepted', label: '✓ Accepted / Active' },
                    { id: 'emergency', label: '🚨 Emergency' },
                    { id: 'reserved', label: '🔒 Reserved' },
                    { id: 'dispatched', label: '🚑 In Transit' },
                    { id: 'expiry', label: '⚠️ Expiry' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setNotifFilter(f.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                        notifFilter === f.id
                          ? 'bg-[#f54e00] text-white border-[#f54e00] shadow-xs'
                          : 'bg-surface-card border-hairline text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-hairline overflow-y-auto max-h-[640px]">
                  {filteredNotifs.length === 0 ? (
                    <div className="p-16 text-center text-muted space-y-2">
                      <span className="text-3xl block">🔔</span>
                      <div className="text-sm font-bold text-slate-700">All alerts clear in this filter</div>
                      <div className="text-xs text-muted">No notifications matching the selected category.</div>
                    </div>
                  ) : (
                    filteredNotifs.map((notif) => {
                      const isEmergency = notif.type === 'emergency_request' || notif.metadata?.urgency === 'emergency'
                      const isAccepted = notif.metadata?.status === 'accepted' || notif.type === 'request_response' || (notif.title || '').toLowerCase().includes('accepted')
                      const isReserved = notif.metadata?.status === 'reserved' || (notif.title || '').toLowerCase().includes('reserved')
                      const isDispatched = notif.metadata?.status === 'dispatched' || (notif.title || '').toLowerCase().includes('dispatched')
                      const isExpiry = notif.type === 'expiry_alert' || (notif.title || '').toLowerCase().includes('expire')
                      const bg = notif.metadata?.bloodGroup
                      const reqId = notif.metadata?.requestId || null
                      const matchedReq = reqId ? requests.find(r => r.id === reqId) : null

                      return (
                        <div 
                          key={notif.id}
                          className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition group ${
                            !notif.read_flag 
                              ? isAccepted 
                                ? 'bg-emerald-50/60 border-l-4 border-emerald-500' 
                                : isReserved 
                                ? 'bg-blue-50/60 border-l-4 border-blue-500'
                                : 'bg-rose-50/40 border-l-4 border-[#f54e00]' 
                              : isAccepted 
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/40 border-l-4 border-emerald-400' 
                              : isReserved
                              ? 'bg-blue-50/20 hover:bg-blue-50/40 border-l-4 border-blue-400'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg font-mono ${
                                isAccepted 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : isReserved
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : isDispatched
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : isEmergency 
                                  ? 'bg-rose-100 text-rose-800 animate-pulse border border-rose-300' 
                                  : isExpiry
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-200 text-slate-800'
                              }`}>
                                {isAccepted ? '✓ ACCEPTED & ALLOCATED' : isReserved ? '🔒 UNITS RESERVED (FEFO)' : isDispatched ? '🚑 IN TRANSIT' : notif.type.replace('_', ' ')}
                              </span>

                              {bg && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono shadow-xs">
                                  {bg} • {notif.metadata?.unitsNeeded || 1} Units
                                </span>
                              )}

                              {notif.metadata?.urgency && (
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  notif.metadata.urgency === 'emergency' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {notif.metadata.urgency}
                                </span>
                              )}

                              {reqId && (
                                <span className="text-[10px] text-muted font-mono font-bold">
                                  #{reqId.toUpperCase()}
                                </span>
                              )}

                              <span className="text-[10px] text-muted font-mono ml-auto">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Title & Message */}
                            <div className="text-sm font-extrabold text-slate-900 leading-snug">
                              {notif.title || notif.message}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {notif.message}
                            </p>

                            {/* Metadata Substrip (Patient, Hospital, Phone) */}
                            {notif.metadata && (notif.metadata.hospitalName || notif.metadata.patientName) && (
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-700 bg-surface-card/80 p-2.5 rounded-xl border border-hairline/80">
                                {notif.metadata.hospitalName && (
                                  <span className="font-semibold flex items-center gap-1">
                                    <span>🏨</span> {notif.metadata.hospitalName}
                                  </span>
                                )}
                                {notif.metadata.patientName && (
                                  <span className="text-slate-600 flex items-center gap-1">
                                    <span>👤</span> Patient: <strong>{notif.metadata.patientName}</strong>
                                  </span>
                                )}
                                {notif.metadata.contactPhone && (
                                  <a href={`tel:${notif.metadata.contactPhone}`} className="text-[#f54e00] font-bold hover:underline ml-auto flex items-center gap-1">
                                    <span>📞</span> {notif.metadata.contactPhone}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions Right Column */}
                          <div className="flex flex-wrap lg:flex-col items-stretch justify-center gap-2 shrink-0 pt-2 lg:pt-0">
                            {/* If order is accepted */}
                            {isAccepted && reqId && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (matchedReq) handleReserveRequest(matchedReq.id)
                                    else handleReserveRequest(reqId)
                                  }}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                                >
                                  <span>🔒</span> Reserve FEFO
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (matchedReq) handleIssueRequest(matchedReq.id)
                                    else handleIssueRequest(reqId)
                                  }}
                                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                                >
                                  <span>🚑</span> Issue & Dispatch
                                </button>
                              </>
                            )}

                            {/* If order is reserved */}
                            {isReserved && reqId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (matchedReq) handleIssueRequest(matchedReq.id)
                                  else handleIssueRequest(reqId)
                                }}
                                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                              >
                                <span>🚑</span> Issue & Dispatch
                              </button>
                            )}

                            {/* Cross-match compatibility button */}
                            {reqId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const reqObj = matchedReq || {
                                    id: reqId,
                                    blood_group: notif.metadata?.bloodGroup || 'O+',
                                    units_needed: notif.metadata?.unitsNeeded || 1,
                                    urgency: notif.metadata?.urgency || 'normal',
                                    hospital_name: notif.metadata?.hospitalName || 'Hospital',
                                    patient_name: notif.metadata?.patientName || 'Patient',
                                    status: notif.metadata?.status || 'accepted'
                                  }
                                  setSelectedAnalysisReq(reqObj)
                                }}
                                className="px-3 py-1.5 bg-surface-card hover:bg-slate-100 text-slate-700 border border-hairline rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                              >
                                <span>🔬</span> Cross-Match
                              </button>
                            )}

                            {/* General open modal */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await dataApi.markNotificationRead(notif.id)
                                  setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read_flag: true } : n))
                                } catch (_) {}
                                if (reqId) {
                                  setSelectedNotifReqId(reqId)
                                  setSelectedNotifReqObj(notif.metadata || null)
                                  setIsNotifModalOpen(true)
                                }
                              }}
                              className="px-3.5 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                            >
                              <span>👉</span> Details
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })()}

          {/* Direct Requisition Action Modal from Notifications */}
          <RequestQuickModal
            requestId={selectedNotifReqId}
            initialRequest={selectedNotifReqObj}
            isOpen={isNotifModalOpen}
            onClose={() => setIsNotifModalOpen(false)}
            onStatusUpdated={() => reloadData()}
            currentUserRole="blood_bank"
          />

          {/* Cross-Match Request Analysis Modal */}
          {selectedAnalysisReq && (() => {
            const analysis = analyzeRequestCompatibility(selectedAnalysisReq);
            return (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedAnalysisReq(null)}>
                <div className="bg-surface-card rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-hairline" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b border-hairline flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔬</span>
                        <h3 className="text-base font-black text-ink">Compatibility & Inventory Analysis</h3>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        Order from {selectedAnalysisReq.hospital_name || 'Hospital'} • {selectedAnalysisReq.units_needed} units of {selectedAnalysisReq.blood_group}
                      </p>
                    </div>
                    <button onClick={() => setSelectedAnalysisReq(null)} className="p-2 rounded-xl bg-canvas hover:bg-slate-100 text-muted">✕</button>
                  </div>

                  <div className="p-6 space-y-4 text-left">
                    <div className="p-4 bg-canvas rounded-2xl border border-hairline space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted font-bold uppercase text-[10px]">Recipient Blood Group</span>
                        <span className="font-black text-[#f54e00]">{analysis.recipientBloodGroup}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted font-bold uppercase text-[10px]">Component</span>
                        <span className="font-bold text-ink">{analysis.componentType}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted font-bold uppercase text-[10px]">Requested Volume</span>
                        <span className="font-black text-ink">{analysis.unitsNeeded} units</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted font-bold uppercase text-[10px]">Total Compatible in Stock</span>
                        <span className="font-black text-emerald-700">{analysis.totalCompatibleUnits} units</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-muted">Stock Breakdown by Priority</h4>
                      <div className="space-y-2">
                        {Object.values(analysis.stockMap).map(grp => (
                          <div key={grp.blood_group} className="p-3 bg-canvas rounded-xl border border-hairline flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#f54e00]">{grp.blood_group}</span>
                              <span className="text-muted text-[11px]">({grp.matchType === 'exact_match' ? 'Exact isogroup' : 'Compatible alternative'})</span>
                            </div>
                            <span className="font-bold text-ink">{grp.units} Units</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 leading-tight">
                      ⚠️ <strong>Clinical Notice:</strong> Acceptance verifies that compatible non-expired batches are present in inventory. Standard hospital laboratory cross-matching should still be performed prior to transfusion.
                    </div>
                  </div>

                  <div className="p-5 border-t border-hairline bg-canvas rounded-b-3xl flex justify-between items-center gap-2">
                    <button
                      onClick={() => setSelectedAnalysisReq(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-body text-xs font-bold rounded-xl"
                    >
                      Close
                    </button>
                    <div className="flex gap-2">
                      {selectedAnalysisReq.status === 'pending' && (
                        <button
                          onClick={() => handleVerifiedAccept(selectedAnalysisReq.id)}
                          className="px-5 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl uppercase tracking-wider"
                        >
                          Verify &amp; Accept
                        </button>
                      )}
                      {selectedAnalysisReq.status === 'accepted' && (
                        <>
                          <button
                            onClick={() => handleReserveRequest(selectedAnalysisReq.id)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl uppercase tracking-wider"
                          >
                            🔒 Reserve
                          </button>
                          <button
                            onClick={() => handleIssueRequest(selectedAnalysisReq.id)}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl uppercase tracking-wider"
                          >
                            🚑 Issue
                          </button>
                        </>
                      )}
                      {selectedAnalysisReq.status === 'reserved' && (
                        <button
                          onClick={() => handleIssueRequest(selectedAnalysisReq.id)}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl uppercase tracking-wider"
                        >
                          🚑 Issue &amp; Dispatch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Dispatch Receipt Modal */}
          {issuedDispatchResult && (
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIssuedDispatchResult(null)}
            >
              <div
                className="bg-surface-card rounded-3xl shadow-2xl max-w-md w-full border border-hairline overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🚑</span>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-wider">Blood Dispatched</h3>
                      <p className="text-xs text-purple-200 mt-0.5">Inventory deducted via FEFO · Hospital notified</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-canvas rounded-xl border border-hairline">
                      <div className="text-muted font-bold uppercase text-[10px] mb-1">Blood Group</div>
                      <div className="font-black text-[#f54e00] text-base">{issuedDispatchResult.blood_group}</div>
                    </div>
                    <div className="p-3 bg-canvas rounded-xl border border-hairline">
                      <div className="text-muted font-bold uppercase text-[10px] mb-1">Total Issued</div>
                      <div className="font-black text-ink text-base">{issuedDispatchResult.units_needed} units</div>
                    </div>
                  </div>

                  {issuedDispatchResult.issuedBatches && issuedDispatchResult.issuedBatches.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-muted mb-2">FEFO Batch Deduction Log</div>
                      <div className="space-y-1.5">
                        {issuedDispatchResult.issuedBatches.map((b, i) => (
                          <div key={i} className="flex justify-between items-center p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-xs">
                            <div>
                              <span className="font-black text-purple-800 font-mono">{b.batch_id}</span>
                              <span className="text-muted ml-2">· Exp: {b.expiry_date}</span>
                            </div>
                            <span className="font-black text-purple-700">−{b.units_deducted}u</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[10px] text-emerald-900 leading-relaxed">
                    ✓ <strong>Dispatch confirmed.</strong> Inventory updated in real-time. Hospital has received an SMS + email dispatch notification with batch traceability details.
                  </div>
                </div>

                <div className="p-5 border-t border-hairline bg-canvas">
                  <button
                    onClick={() => setIssuedDispatchResult(null)}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition"
                  >
                    Close Dispatch Receipt
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
