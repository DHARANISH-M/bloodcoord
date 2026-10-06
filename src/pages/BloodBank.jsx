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

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editItemId, setEditItemId] = useState(null)
  const [bloodGroup, setBloodGroup] = useState('O-')
  const [units, setUnits] = useState('5')
  const [expiry, setExpiry] = useState('')
  const [batchId, setBatchId] = useState('')
  
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
                                r.status === 'fulfilled' || r.status === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                                'bg-[#f54e00]/10 border-red-100 text-[#d04200]'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => setSelectedAnalysisReq(r)}
                                className="px-2.5 py-1.5 bg-canvas hover:bg-slate-100 text-ink border border-hairline font-bold text-xs rounded-lg transition"
                                title="Analyze Blood Compatibility"
                              >
                                🔬 Analyze
                              </button>
                              {isPending ? (
                                <>
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
                          req.status === 'accepted' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {req.status === 'pending' && (
                        <div className="pt-2 border-t border-hairline flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifiedAccept(req.id)}
                            className="flex-1 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                          >
                            Verify & Accept Order
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondToRequest(req.id, 'rejected')}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-body text-xs font-bold rounded-xl transition uppercase"
                          >
                            Decline
                          </button>
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
          {activeTab === 'notifications' && (
            <div className="bg-surface-card border border-hairline rounded-2xl shadow-none overflow-hidden text-left font-sans space-y-0">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Clinical Alerts Center</span>
                  <span className="text-[10px] bg-[#f54e00] text-white font-black px-2 py-0.5 rounded-full">
                    {notifications.filter(n => !n.read_flag).length} Unread
                  </span>
                </div>
                {notifications.some(n => !n.read_flag) && (
                  <button
                    onClick={async () => {
                      if (!user) return
                      await dataApi.markAllNotificationsRead(user.id)
                      setNotifications(prev => prev.map(n => ({ ...n, read_flag: true })))
                    }}
                    className="text-[10px] font-bold text-slate-300 hover:text-white underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="divide-y divide-hairline overflow-y-auto max-h-[600px]">
                {notifications.length === 0 ? (
                  <div className="p-16 text-center text-muted space-y-2">
                    <span className="text-3xl block">🔔</span>
                    <div className="text-sm font-bold text-slate-700">All alerts clear</div>
                    <div className="text-xs text-muted">No pending blood requisitions or batch notices.</div>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isEmergency = notif.type === 'emergency_request' || notif.metadata?.urgency === 'emergency'
                    const isUpdate = notif.type === 'request_response'
                    const bg = notif.metadata?.bloodGroup

                    return (
                      <div 
                        key={notif.id}
                        onClick={async () => {
                          try {
                            await dataApi.markNotificationRead(notif.id)
                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read_flag: true } : n))
                          } catch (_) {}
                          const reqId = notif.metadata?.requestId || null
                          if (reqId) {
                            setSelectedNotifReqId(reqId)
                            setSelectedNotifReqObj(notif.metadata || null)
                            setIsNotifModalOpen(true)
                          }
                        }}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer transition group ${
                          !notif.read_flag ? 'bg-rose-50/30 border-l-4 border-[#f54e00]' : ''
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isEmergency 
                                ? 'bg-rose-100 text-rose-800 animate-pulse' 
                                : isUpdate 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : notif.type === 'expiry_alert'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {notif.type.replace('_', ' ')}
                            </span>
                            {bg && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono">
                                {bg} • {notif.metadata?.unitsNeeded || 1} Units
                              </span>
                            )}
                            <span className="text-[10px] text-muted font-mono">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-slate-900 group-hover:text-[#d04200] transition">
                            {notif.title || notif.message}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {notif.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            className="px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white rounded-xl text-xs font-bold transition shadow-none flex items-center gap-1"
                          >
                            <span>👉</span> Open Request
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

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

                  <div className="p-5 border-t border-hairline bg-canvas rounded-b-3xl flex justify-between items-center">
                    <button
                      onClick={() => setSelectedAnalysisReq(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-body text-xs font-bold rounded-xl"
                    >
                      Close
                    </button>
                    {selectedAnalysisReq.status === 'pending' && (
                      <button
                        onClick={() => handleVerifiedAccept(selectedAnalysisReq.id)}
                        className="px-5 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl uppercase tracking-wider"
                      >
                        Verify & Accept Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  )
}
