import React, { useState, useEffect, useMemo } from 'react'
import { dataApi } from '../utils/api'
import { ERAKTKOSH_STATES } from '../utils/eraktkoshClient.js'
import { getDistance } from '../utils/mockDb.js'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ aggregate: {}, details: [], totalBanks: 0, totalHospitals: 0, totalDonors: 0 })
  const [selectedState, setSelectedState] = useState('All')
  const [selectedDistrict, setSelectedDistrict] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedGroup, setSelectedGroup] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [page, setPage] = useState(1)
  const itemsPerPage = 25

  // Proximity & Stock Filters
  const [stockFilter, setStockFilter] = useState('available') // 'available' (default), 'all', or 'O+', etc.
  const [locationMode, setLocationMode] = useState('pan_india') // 'pan_india' | 'near_me'
  const [nearRadius, setNearRadius] = useState('50') // '25', '50', '100', '250'
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090, label: 'Delhi NCR (Default)' })
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  // Detail Modal State
  const [detailBank, setDetailBank] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Blood Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestTargetBank, setRequestTargetBank] = useState(null)
  const [reqBloodGroup, setReqBloodGroup] = useState('O+')
  const [reqUnits, setReqUnits] = useState('2')
  const [reqUrgency, setReqUrgency] = useState('normal')
  const [reqPatientName, setReqPatientName] = useState('')
  const [reqContactPhone, setReqContactPhone] = useState('')
  const [reqSubmitting, setReqSubmitting] = useState(false)
  const [reqResult, setReqResult] = useState(null)

  // Toast
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const loadDashboard = async () => {
    try {
      const res = await dataApi.getPublicDashboard()
      setData(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // Live e-RaktKosh Sync Trigger
  const handleSyncState = async () => {
    const targetState = ERAKTKOSH_STATES.find(s => s.name === selectedState) || ERAKTKOSH_STATES[0]
    setIsSyncing(true)
    setSyncStatus(`Connecting to e-RaktKosh portal for ${targetState.name}...`)
    try {
      const res = await dataApi.syncEraktkoshLive(targetState.code)
      if (res.success) {
        setSyncStatus(`✓ Synced ${res.count} blood centres from e-RaktKosh for ${res.state}!`)
        await loadDashboard()
      } else {
        setSyncStatus(`Sync attempted: ${res.message || 'Latest database verified'}`)
      }
    } catch (e) {
      setSyncStatus(`Sync error: ${e.message}`)
    } finally {
      setIsSyncing(false)
      setTimeout(() => setSyncStatus(null), 5000)
    }
  }

  // Open blood bank detail modal
  const handleOpenDetail = async (bankId) => {
    setDetailLoading(true)
    try {
      const detail = await dataApi.getBloodBankDetail(bankId)
      setDetailBank(detail)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  // Open request modal targeted at a specific bank
  const handleOpenRequestForBank = (bank) => {
    setRequestTargetBank(bank)
    setReqBloodGroup('O+')
    setReqUnits('2')
    setReqUrgency('normal')
    setReqPatientName('')
    setReqContactPhone('')
    setReqResult(null)
    setShowRequestModal(true)
  }

  // Open request modal without a target (auto-find nearest)
  const handleOpenPublicRequest = () => {
    setRequestTargetBank(null)
    setReqBloodGroup(selectedGroup !== 'All' ? selectedGroup : 'O+')
    setReqUnits('2')
    setReqUrgency('normal')
    setReqPatientName('')
    setReqContactPhone('')
    setReqResult(null)
    setShowRequestModal(true)
  }

  // Submit blood request
  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    if (!reqPatientName.trim() || !reqContactPhone.trim()) {
      showToast('Please fill in patient name and contact phone.', 'error')
      return
    }
    setReqSubmitting(true)
    try {
      const payload = {
        blood_group: reqBloodGroup,
        units_needed: parseInt(reqUnits) || 1,
        urgency: reqUrgency,
        patient_name: reqPatientName.trim(),
        contact_phone: reqContactPhone.trim(),
        blood_bank_id: requestTargetBank?.id || null,
        lat: 28.6139,
        lng: 77.2090,
      }

      // If user is logged in as hospital, attach hospital info
      if (user && user.role === 'hospital' && user.profileId) {
        payload.hospital_id = user.profileId
      }

      const result = await dataApi.createPublicBloodRequest(payload)
      setReqResult(result)
      if (result.success) {
        showToast(`Request sent to ${result.blood_bank_name}!`)
        await loadDashboard()
      } else {
        showToast(result.message || 'Could not find a blood bank with stock', 'error')
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setReqSubmitting(false)
    }
  }

  // GPS Geolocation Detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error')
      return
    }
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Detected GPS Location'
        })
        setLocationMode('near_me')
        setIsDetectingLocation(false)
        showToast('📍 Live GPS Location Applied!')
      },
      (err) => {
        setIsDetectingLocation(false)
        showToast('Could not access GPS. Please check browser permissions.', 'error')
      },
      { timeout: 8000 }
    )
  }

  // Cascading States & Authentic Districts
  const statesList = useMemo(() => {
    const states = new Set(data.details.map(d => d.state).filter(Boolean))
    return ['All', ...Array.from(states).sort()]
  }, [data.details])

  const districtsList = useMemo(() => {
    const filtered = selectedState === 'All' 
      ? data.details 
      : data.details.filter(d => d.state === selectedState)
    const districts = new Set(filtered.map(d => d.district).filter(Boolean))
    return ['All', ...Array.from(districts).sort()]
  }, [data.details, selectedState])

  const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

  // Group by blood bank with distance and filters
  const groupedByBank = useMemo(() => {
    const map = new Map()
    data.details.forEach(item => {
      const bankId = item.blood_bank_id
      if (!map.has(bankId)) {
        const dist = (locationMode === 'near_me' && item.lat && item.lng)
          ? getDistance(userLocation.lat, userLocation.lng, item.lat, item.lng)
          : null

        map.set(bankId, {
          bankId,
          name: item.blood_bank_name,
          address: item.address,
          state: item.state,
          district: item.district,
          category: item.category,
          lat: item.lat,
          lng: item.lng,
          distance: dist,
          stocks: {},
          totalUnits: 0,
        })
      }
      const entry = map.get(bankId)
      entry.stocks[item.blood_group] = (entry.stocks[item.blood_group] || 0) + (item.units_available || 0)
      entry.totalUnits += (item.units_available || 0)
    })

    let list = Array.from(map.values()).filter(bank => {
      // Stock Filter: Available blood only
      if (stockFilter === 'available' && bank.totalUnits <= 0) return false
      if (['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(stockFilter)) {
        if ((bank.stocks[stockFilter] || 0) <= 0) return false
      }
      if (selectedGroup !== 'All' && (bank.stocks[selectedGroup] || 0) <= 0) return false

      // Category filter
      if (selectedCategory !== 'All' && bank.category !== selectedCategory) return false

      // Location Filter Mode
      if (locationMode === 'near_me') {
        if (bank.distance === null || bank.distance > parseFloat(nearRadius)) return false
      } else {
        if (selectedState !== 'All' && bank.state !== selectedState) return false
        if (selectedDistrict !== 'All' && bank.district !== selectedDistrict) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = bank.name?.toLowerCase().includes(q)
        const matchesAddr = bank.address?.toLowerCase().includes(q)
        const matchesDist = bank.district?.toLowerCase().includes(q)
        if (!matchesName && !matchesAddr && !matchesDist) return false
      }

      return true
    })

    // Sort: If near_me sort by proximity, else by highest stock
    if (locationMode === 'near_me') {
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    } else {
      list.sort((a, b) => b.totalUnits - a.totalUnits)
    }

    return list
  }, [data.details, selectedState, selectedDistrict, selectedCategory, selectedGroup, searchQuery, stockFilter, locationMode, nearRadius, userLocation])

  // Paginated records (now by bank)
  const paginatedBanks = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return groupedByBank.slice(start, start + itemsPerPage)
  }, [groupedByBank, page])

  const totalPages = Math.ceil(groupedByBank.length / itemsPerPage) || 1

  // Dynamic aggregates based on active filters
  const getFilteredAggregate = (group) => {
    return data.details
      .filter(item => {
        if (locationMode === 'near_me') {
          const dist = (item.lat && item.lng) ? getDistance(userLocation.lat, userLocation.lng, item.lat, item.lng) : 99999
          if (dist > parseFloat(nearRadius)) return false
        } else {
          if (selectedState !== 'All' && item.state !== selectedState) return false
          if (selectedDistrict !== 'All' && item.district !== selectedDistrict) return false
        }
        if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
        const q = searchQuery.toLowerCase().trim()
        if (q && !item.blood_bank_name?.toLowerCase().includes(q) && !item.address?.toLowerCase().includes(q) && !item.district?.toLowerCase().includes(q)) return false
        return item.blood_group === group
      })
      .reduce((acc, curr) => acc + (curr.units_available || 0), 0)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-lg text-xs font-bold tracking-wider flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* DETAIL MODAL - Blood Bank Full Detail */}
      {detailBank && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailBank(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-slate-900 leading-snug">{detailBank.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{detailBank.address}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      detailBank.category?.toLowerCase().includes('govt')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : detailBank.category?.toLowerCase().includes('charit')
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {detailBank.category || 'Govt.'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">{detailBank.district}, {detailBank.state}</span>
                  </div>
                </div>
                <button onClick={() => setDetailBank(null)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition text-sm">✕</button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{detailBank.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Email</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{detailBank.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Type</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{detailBank.type || 'Blood Bank'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Last Updated</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{detailBank.lastUpdated || 'Today'}</p>
                </div>
              </div>
            </div>

            {/* Stock Breakdown Grid */}
            <div className="px-6 py-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Live Blood Stock</h4>
                <span className="text-sm font-black text-[#d04200]">{detailBank.totalUnits} Total Units</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => {
                  const count = detailBank.stockSummary?.[bg] || 0
                  const pct = Math.min(100, Math.round((count / 30) * 100))
                  return (
                    <div key={bg} className="border border-slate-200 rounded-xl p-3 text-center bg-white hover:shadow-md transition">
                      <div className="text-lg font-black text-[#d04200]">{bg}</div>
                      <div className="text-xl font-black text-slate-900 mt-1">{count}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">units</div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${count > 10 ? 'bg-emerald-500' : count > 0 ? 'bg-amber-500' : 'bg-slate-200'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Inventory Batch Details Table */}
            <div className="px-6 pb-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Inventory Batches</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Blood Group</th>
                      <th className="px-4 py-2.5 text-left">Units</th>
                      <th className="px-4 py-2.5 text-left">Batch ID</th>
                      <th className="px-4 py-2.5 text-left">Expiry</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detailBank.inventory || []).map(item => {
                      const daysLeft = item.expiry_date ? Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : 30
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center font-black text-xs w-8 h-8 rounded-full bg-[#f54e00]/10 text-[#d04200]">{item.blood_group}</span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{item.units_available}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">{item.batch_id}</td>
                          <td className="px-4 py-2.5 text-slate-600">{item.expiry_date}</td>
                          <td className="px-4 py-2.5">
                            {item.units_available > 0 ? (
                              daysLeft <= 5 ? (
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⚠️ Expiring ({daysLeft}d)</span>
                              ) : (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">● In Stock</span>
                              )
                            ) : (
                              <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">○ Empty</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-between items-center">
              <div className="text-[10px] text-slate-400 font-semibold">
                {detailBank.pendingRequestCount > 0 ? `${detailBank.pendingRequestCount} pending request(s)` : 'No pending requests'}
              </div>
              {user ? (
                <button
                  onClick={() => {
                    setDetailBank(null)
                    handleOpenRequestForBank(detailBank)
                  }}
                  className="px-5 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                >
                  🩸 Request Blood from This Bank
                </button>
              ) : (
                <a
                  href="/login"
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition uppercase tracking-wider inline-block"
                >
                  Login to Request Blood
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BLOOD REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowRequestModal(false); setReqResult(null) }}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {requestTargetBank ? `Request from ${requestTargetBank.name}` : '🩸 Request Blood'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {requestTargetBank 
                      ? `${requestTargetBank.district}, ${requestTargetBank.state}`
                      : 'Your request will be auto-routed to the nearest blood bank with available stock.'
                    }
                  </p>
                </div>
                <button onClick={() => { setShowRequestModal(false); setReqResult(null) }} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm">✕</button>
              </div>
            </div>

            {reqResult?.success ? (
              // Success View
              <div className="p-6 space-y-5 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">✓</div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Request Sent Successfully!</h4>
                  <p className="text-xs text-slate-500 mt-2">Your request has been dispatched to:</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Blood Bank</span>
                    <span className="font-bold text-slate-900">{reqResult.blood_bank_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Location</span>
                    <span className="font-bold text-slate-900">{reqResult.blood_bank_district}, {reqResult.blood_bank_state}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Contact</span>
                    <span className="font-bold text-slate-900">{reqResult.blood_bank_phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Request ID</span>
                    <span className="font-mono font-bold text-[#d04200]">{reqResult.request?.id}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Blood Group</span>
                    <span className="font-bold text-slate-900">{reqResult.request?.blood_group} × {reqResult.request?.units_needed} units</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Status</span>
                    <span className="font-black text-amber-600 text-[10px] bg-amber-50 px-2 py-0.5 rounded-full">⏳ PENDING</span>
                  </div>
                </div>
                <button
                  onClick={() => { setShowRequestModal(false); setReqResult(null) }}
                  className="w-full px-5 py-3 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider"
                >
                  Done
                </button>
              </div>
            ) : (
              // Form View
              <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Blood Group Required</label>
                    <select
                      value={reqBloodGroup}
                      onChange={e => setReqBloodGroup(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Units Needed</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={reqUnits}
                      onChange={e => setReqUnits(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Patient Name</label>
                  <input
                    type="text"
                    placeholder="Full name of the patient"
                    value={reqPatientName}
                    onChange={e => setReqPatientName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98xxx-xxxxx"
                    value={reqContactPhone}
                    onChange={e => setReqContactPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Urgency</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'normal', label: 'Routine', icon: '📋' },
                      { value: 'urgent', label: 'Urgent', icon: '⚡' },
                      { value: 'emergency', label: 'Emergency', icon: '🚨' },
                    ].map(u => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => setReqUrgency(u.value)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition ${
                          reqUrgency === u.value
                            ? 'bg-[#f54e00] border-[#f54e00] text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {u.icon} {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {reqResult && !reqResult.success && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl">
                    {reqResult.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="w-full px-5 py-3 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-black rounded-xl transition uppercase tracking-wider disabled:opacity-50"
                >
                  {reqSubmitting ? 'Sending Request...' : requestTargetBank ? `Send Request to ${requestTargetBank.name?.substring(0, 30)}...` : '🩸 Find Nearest Bank & Send Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center border-b border-hairline pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              National Blood Stock Registry
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              e-RaktKosh Live
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Real-time pan-India blood availability inventory from 4,500+ MoHFW verified blood centres across all States & Districts.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {user && (
            <button
              onClick={handleOpenPublicRequest}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white rounded-xl text-xs font-black transition shadow-sm"
            >
              🩸 Request Blood
            </button>
          )}
          <button
            onClick={handleSyncState}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-[#d04200] border border-rose-200 rounded-xl text-xs font-black transition disabled:opacity-50"
            title="Fetch live stock from eraktkosh.mohfw.gov.in"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
            {isSyncing ? 'Syncing...' : 'Sync e-RaktKosh'}
          </button>
          <div className="bg-slate-100 px-3.5 py-2 rounded-xl border border-hairline/60 text-xs font-bold text-muted">
            🏥 Centers: <span className="text-slate-900 font-black">{data.totalBanks.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Sync Status Alert Banner */}
      {syncStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm font-bold px-5 py-3 rounded-2xl flex items-center justify-between animate-fadeIn">
          <span>ℹ️ {syncStatus}</span>
          <button onClick={() => setSyncStatus(null)} className="text-blue-500 hover:text-blue-800 font-black ml-4">✕</button>
        </div>
      )}

      {/* Aggregate Group Cards */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Supply Levels by Blood Group {
              locationMode === 'near_me' 
                ? `• Within ${nearRadius} km of ${userLocation.label}`
                : `${selectedState !== 'All' ? `• ${selectedState}` : '• Pan-India'} ${selectedDistrict !== 'All' ? `(${selectedDistrict})` : ''}`
            }
          </span>
          {selectedGroup !== 'All' && (
            <button 
              onClick={() => setSelectedGroup('All')}
              className="text-xs font-bold text-[#d04200] hover:underline"
            >
              Clear Group Filter (Selected: {selectedGroup})
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {bloodGroups.filter(g => g !== 'All').map((g) => {
            const count = getFilteredAggregate(g)
            return (
              <div 
                key={g} 
                onClick={() => setSelectedGroup(selectedGroup === g ? 'All' : g)}
                className={`p-4 rounded-2xl border text-center transition cursor-pointer hover:shadow-md ${
                  selectedGroup === g 
                    ? 'bg-[#f54e00]/10 border-rose-300 text-[#d04200] ring-2 ring-rose-400/30' 
                    : count > 0 
                    ? 'bg-surface-card border-hairline hover:border-rose-200' 
                    : 'bg-slate-50 border-hairline opacity-60'
                }`}
              >
                <div className="text-2xl font-black">{g}</div>
                <div className="text-xs font-extrabold text-slate-700 mt-1">{count.toLocaleString()} <span className="text-[10px] text-muted font-normal">Units</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-[#f54e00] h-full transition-all rounded-full" 
                    style={{ width: `${Math.min(100, (count / 200) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comprehensive Cascading Search & Filters Panel */}
      <div className="bg-surface-card border border-hairline p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>🔎</span> Blood Bank Directory & Stock Filters
          </span>
          <button
            onClick={() => {
              setSelectedState('All')
              setSelectedDistrict('All')
              setSelectedCategory('All')
              setSelectedGroup('All')
              setSearchQuery('')
              setStockFilter('available')
              setLocationMode('pan_india')
              setNearRadius('50')
              setPage(1)
            }}
            className="text-xs font-bold text-[#f54e00] hover:underline transition self-start sm:self-auto"
          >
            Reset All Filters ↺
          </button>
        </div>

        {/* Primary Filter Mode Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3.5 bg-slate-50 border border-hairline rounded-xl">
          {/* Location Mode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">📍 Location Mode:</span>
            <div className="flex rounded-lg border border-hairline p-0.5 bg-surface-card">
              <button
                type="button"
                onClick={() => {
                  setLocationMode('pan_india')
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  locationMode === 'pan_india'
                    ? 'bg-[#f54e00] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇮🇳 State & District
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationMode('near_me')
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                  locationMode === 'near_me'
                    ? 'bg-[#f54e00] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📍</span> Nearby / Proximity
              </button>
            </div>
          </div>

          {/* Stock Filter Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">🩸 Stock Availability:</span>
            <div className="flex rounded-lg border border-hairline p-0.5 bg-surface-card">
              <button
                type="button"
                onClick={() => {
                  setStockFilter('available')
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  stockFilter === 'available'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In-Stock Only
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockFilter('all')
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  stockFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Centres
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Controls based on Location Mode */}
        {locationMode === 'pan_india' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cascading State Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Select State / UT</label>
              <select 
                value={selectedState} 
                onChange={(e) => {
                  setSelectedState(e.target.value)
                  setSelectedDistrict('All')
                  setPage(1)
                }}
                className="w-full bg-slate-50 border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
              >
                {statesList.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All States & UTs (Pan-India)' : s}</option>
                ))}
              </select>
            </div>

            {/* Cascading District Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Select District ({districtsList.length - 1} found)</label>
              <select 
                value={selectedDistrict} 
                onChange={(e) => {
                  setSelectedDistrict(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-50 border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
              >
                {districtsList.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-50 border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
              >
                <option value="All">All Categories (Govt / Private)</option>
                <option value="Govt.">Government Blood Centres</option>
                <option value="Private">Private Blood Banks</option>
                <option value="Charitable/Vol">Charitable / Voluntary</option>
              </select>
            </div>

            {/* Text Search */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Search Center or Address</label>
              <input 
                type="text" 
                placeholder="e.g. AIIMS, Fortis, Red Cross..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-50 border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Proximity Location / GPS Detector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Your Location Anchor</label>
              <div className="flex gap-2">
                <select
                  value={`${userLocation.lat},${userLocation.lng}`}
                  onChange={(e) => {
                    const [lat, lng] = e.target.value.split(',').map(Number)
                    const names = {
                      '28.6139,77.209': 'Delhi NCR',
                      '19.076,72.8777': 'Mumbai',
                      '12.9716,77.5946': 'Bengaluru',
                      '13.0827,80.2707': 'Chennai',
                      '22.5726,88.3639': 'Kolkata',
                      '17.385,78.4867': 'Hyderabad',
                      '18.5204,73.8567': 'Pune',
                      '23.0225,72.5714': 'Ahmedabad',
                    }
                    setUserLocation({ lat, lng, label: names[e.target.value] || 'Selected City' })
                    setPage(1)
                  }}
                  className="flex-1 bg-slate-50 border border-hairline rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                >
                  <option value="28.6139,77.209">Delhi NCR</option>
                  <option value="19.076,72.8777">Mumbai</option>
                  <option value="12.9716,77.5946">Bengaluru</option>
                  <option value="13.0827,80.2707">Chennai</option>
                  <option value="22.5726,88.3639">Kolkata</option>
                  <option value="17.385,78.4867">Hyderabad</option>
                  <option value="18.5204,73.8567">Pune</option>
                  <option value="23.0225,72.5714">Ahmedabad</option>
                </select>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="px-3 py-2 bg-rose-50 text-[#d04200] border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition shrink-0"
                  title="Detect GPS from device"
                >
                  {isDetectingLocation ? '📡 ...' : '📍 GPS'}
                </button>
              </div>
            </div>

            {/* Radius selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Proximity Radius</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '25 km', val: '25' },
                  { label: '50 km', val: '50' },
                  { label: '100 km', val: '100' },
                  { label: '250 km', val: '250' },
                ].map(r => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => {
                      setNearRadius(r.val)
                      setPage(1)
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      nearRadius === r.val
                        ? 'bg-[#f54e00] border-[#f54e00] text-white'
                        : 'bg-slate-50 border-hairline text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-50 border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
              >
                <option value="All">All Categories</option>
                <option value="Govt.">Government</option>
                <option value="Private">Private</option>
                <option value="Charitable/Vol">Charitable</option>
              </select>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Search Center or Address</label>
              <input 
                type="text" 
                placeholder="e.g. AIIMS, Red Cross..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-50 border border-hairline rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
              />
            </div>
          </div>
        )}

        {/* Results summary bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted border-t border-hairline pt-3 gap-2">
          <span>
            Showing <strong className="text-slate-800">{groupedByBank.length.toLocaleString()}</strong> blood centres {
              locationMode === 'near_me'
                ? `within ${nearRadius} km of ${userLocation.label}`
                : `${selectedState !== 'All' ? `in ${selectedState}` : 'across India'}${selectedDistrict !== 'All' ? ` (${selectedDistrict} District)` : ''}`
            } {stockFilter === 'available' ? 'with stock available' : ''}.
          </span>
          {selectedGroup !== 'All' && (
            <span className="text-[#d04200] font-bold">
              Filtering by {selectedGroup} reserve
            </span>
          )}
        </div>
      </div>

      {/* Blood Bank Stock Listings (grouped by bank) */}
      <div className="bg-surface-card border border-hairline rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-hairline flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Blood Bank Directory</span>
            <span className="text-[10px] bg-rose-100 text-[#d04200] font-black px-2.5 py-0.5 rounded-full">
              {groupedByBank.length.toLocaleString()} Centres
            </span>
          </div>

          {/* Pagination Controls Top */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40"
                >
                  ◀
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>

        {groupedByBank.length === 0 ? (
          <div className="p-16 text-center text-muted space-y-3">
            <span className="text-5xl block">🔍</span>
            <div className="text-base font-bold text-slate-800">No blood centres match your filter criteria.</div>
            <div className="text-xs text-muted max-w-md mx-auto">
              Try switching your state, district, or proximity radius, or set stock filter to "All Centres".
            </div>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {paginatedBanks.map(bank => (
              <div
                key={bank.bankId}
                className="px-6 py-4 hover:bg-slate-50/80 transition cursor-pointer group"
                onClick={() => handleOpenDetail(bank.bankId)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Bank info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-800 truncate group-hover:text-[#d04200] transition">{bank.name}</h4>
                      <span className={`inline-flex text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        bank.category?.toLowerCase().includes('govt')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : bank.category?.toLowerCase().includes('charit')
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {bank.category || 'Govt.'}
                      </span>
                      {bank.distance != null && (
                        <span className="inline-flex text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider shrink-0 font-mono">
                          📍 {Number(bank.distance).toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{bank.address}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span className="font-bold text-slate-600">{bank.district}</span>
                      <span>•</span>
                      <span>{bank.state}</span>
                    </div>
                  </div>

                  {/* Right: Stock summary + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Mini stock badges */}
                    <div className="flex flex-wrap gap-1">
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => {
                        const count = bank.stocks[bg] || 0
                        if (count <= 0) return null
                        return (
                          <span key={bg} className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            selectedGroup === bg ? 'bg-rose-100 text-[#d04200] ring-1 ring-rose-400' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <span className="font-black text-[#d04200]">{bg}</span>
                            <span>:{count}</span>
                          </span>
                        )
                      })}
                    </div>

                    {/* Total units badge */}
                    <div className="text-right">
                      <div className="text-sm font-black text-[#d04200]">{bank.totalUnits}</div>
                      <div className="text-[9px] text-slate-400 font-semibold">units</div>
                    </div>

                    {/* Request Blood Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenRequestForBank(bank)
                      }}
                      className="px-3 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl transition shadow-none"
                    >
                      Request
                    </button>

                    {/* View detail arrow */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#f54e00] text-slate-400 group-hover:text-white flex items-center justify-center transition text-sm">
                      →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-hairline flex justify-between items-center">
            <span className="text-xs font-semibold text-muted">
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(groupedByBank.length, page * itemsPerPage)} of {groupedByBank.length.toLocaleString()} blood centres
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-card border border-hairline hover:bg-slate-100 disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
