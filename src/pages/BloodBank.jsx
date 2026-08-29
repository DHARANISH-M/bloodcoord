import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mockApi } from '../utils/mockDb'
import Sidebar from '../components/Sidebar'

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
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editItemId, setEditItemId] = useState(null)
  const [bloodGroup, setBloodGroup] = useState('O-')
  const [units, setUnits] = useState('5')
  const [expiry, setExpiry] = useState('')
  const [batchId, setBatchId] = useState('')
  
  const [msg, setMsg] = useState(null)

  const reloadData = () => {
    try {
      const banks = JSON.parse(localStorage.getItem('blood_banks') || '[]')
      const profile = banks.find(b => b.id === user.profileId || b.user_id === user.id)
      if (profile) {
        setBankInfo(profile)
        setInventory(mockApi.getInventory(profile.id))
        setNearbyDonors(mockApi.getNearbyDonors(profile.lat, profile.lng, 15)) // 15km range
        setRequests(mockApi.getBloodBankRequests(profile.id))
        setNotifications(mockApi.getNotifications(profile.id) || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    reloadData()
  }, [user])

  const triggerCronCheck = () => {
    try {
      const res = mockApi.runExpiryCheckCron()
      setMsg({ text: `node-cron Expiry Check triggered! Generated ${res.count} new notification alerts for expiring blood batches.`, type: 'success' })
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleSaveInventory = (e) => {
    e.preventDefault()
    if (!expiry || !batchId) {
      alert('Please fill out all fields')
      return
    }

    try {
      const payload = { blood_group: bloodGroup, units_available: units, expiry_date: expiry, batch_id: batchId }
      if (editItemId) {
        mockApi.updateInventoryItem(editItemId, payload)
        setMsg({ text: 'Batch updated successfully', type: 'success' })
      } else {
        mockApi.addInventoryItem(bankInfo.id, payload)
        setMsg({ text: 'Batch added successfully', type: 'success' })
      }
      // Reset form
      setEditItemId(null)
      setShowForm(false)
      setBatchId('')
      setExpiry('')
      reloadData()
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

  const handleDelete = (itemId) => {
    if (window.confirm('Delete this blood batch reference?')) {
      try {
        mockApi.deleteInventoryItem(itemId)
        setMsg({ text: 'Batch deleted successfully', type: 'success' })
        reloadData()
      } catch (e) {
        setMsg({ text: e.message, type: 'error' })
      }
    }
  }

  const handleRespondToRequest = (reqId, status) => {
    try {
      mockApi.respondToRequest(reqId, status)
      setMsg({ text: `Hospital request marked as ${status.toUpperCase()}. Notification sent.`, type: 'success' })
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRequestDonor = (donorId) => {
    try {
      mockApi.requestDonorDonation(donorId, 'blood_bank', bankInfo.id)
      setMsg({ text: 'Donation request dispatched to the donor. They are notified.', type: 'success' })
      reloadData()
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
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleRespondToRequest(r.id, 'accepted')}
                                    className="px-3 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold text-xs rounded-lg transition shadow-sm"
                                  >
                                    Accept Request
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
                            Distance: {donor.distance.toFixed(1)} km away • Available
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

          {activeTab === 'notifications' && (
            <div className="bg-surface-card border border-hairline rounded-2xl shadow-none overflow-hidden text-left font-sans">
              <div className="px-6 py-4 bg-slate-50 border-b border-hairline flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alert Center Log</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.read_flag).length} Unread
                </span>
              </div>

              <div className="divide-y divide-hairline overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-muted text-xs">
                    No notifications received.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className="p-5 flex flex-col space-y-1 hover:bg-slate-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                          {notif.type.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-muted">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
