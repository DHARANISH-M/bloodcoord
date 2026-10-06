import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { mockApi, getDistance } from '../utils/mockDb'
import { dataApi } from '../utils/api'
import MapView from '../components/MapView'
import Sidebar from '../components/Sidebar'
import CrossMatchPanel from '../components/crossmatch/CrossMatchPanel'
import RequestQuickModal from '../components/notifications/RequestQuickModal'

// Reusable custom animated button matching the Ferrari theme colors and shapes
const CustomButton = ({ onClick, children, type = "button", className = "" }) => {
  return (
    <button 
      type={type}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center px-6 py-2.5 overflow-hidden tracking-[1.4px] text-xs font-bold text-white bg-[#f54e00] rounded-xl group uppercase h-11 transition-all ${className}`}
    >
      <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-[#d04200] rounded-full group-hover:w-72 group-hover:h-72" />
      <span className="absolute bottom-0 left-0 h-full -ml-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-auto h-full opacity-10 object-stretch" viewBox="0 0 487 487">
          <path fillOpacity="1" fillRule="nonzero" fill="#FFF" d="M0 .3c67 2.1 134.1 4.3 186.3 37 52.2 32.7 89.6 95.8 112.8 150.6 23.2 54.8 32.3 101.4 61.2 149.9 28.9 48.4 77.7 98.8 126.4 149.2H0V.3z" />
        </svg>
      </span>
      <span className="absolute top-0 right-0 w-12 h-full -mr-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="object-cover w-full h-full opacity-10" viewBox="0 0 487 487">
          <path fillOpacity="1" fillRule="nonzero" fill="#FFF" d="M487 486.7c-66.1-3.6-132.3-7.3-186.3-37s-95.9-85.3-126.2-137.2c-30.4-51.8-49.3-99.9-76.5-151.4C70.9 109.6 35.6 54.8.3 0H487v486.7z" />
        </svg>
      </span>
      <span className="absolute inset-0 w-full h-full -mt-1 opacity-20 bg-gradient-to-b from-transparent via-transparent to-black" />
      <span className="relative font-bold flex items-center justify-center space-x-1.5">{children}</span>
    </button>
  )
}

export default function Hospital() {
  const { user, logout, isDarkMode, setIsDarkMode } = useAuth()
  
  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, request_blood, directory, history, sos, notifications, profile
  const [searchQuery, setSearchQuery] = useState('')

  // Quick Action Modal states for notifications
  const [selectedNotifReqId, setSelectedNotifReqId] = useState(null)
  const [selectedNotifReqObj, setSelectedNotifReqObj] = useState(null)
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  
  
  // Full screen map toggles
  const [isDashboardMapExpanded, setIsDashboardMapExpanded] = useState(false)
  const [selectedBankForStock, setSelectedBankForStock] = useState(null)

  // Blood Bank Detail Modal
  const [detailBank, setDetailBank] = useState(null)
  const [isRequestMapExpanded, setIsRequestMapExpanded] = useState(false)

  // Data states
  const [hospitalInfo, setHospitalInfo] = useState(null)
  const [bloodBanks, setBloodBanks] = useState([])
  const [nearbyDonors, setNearbyDonors] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  
  // Custom states for preferences / actions
  const [preferredBanks, setPreferredBanks] = useState(JSON.parse(localStorage.getItem('hosp_preferred_banks') || '[]'))
  const [successToast, setSuccessToast] = useState(null)
  const [cancelModalItem, setCancelModalItem] = useState(null)

  // SOS specific states
  const [sosSent, setSosSent] = useState(false)
  const [sosBloodGroup, setSosBloodGroup] = useState('O-')
  const [sosUnits, setSosUnits] = useState('10')
  const [sosNote, setSosNote] = useState('')
  const [sosRespondersCount, setSosRespondersCount] = useState(0)
  const [sosRespondersList, setSosRespondersList] = useState([])

  // Request Form states
  const [reqBloodGroup, setReqBloodGroup] = useState('O-')
  const [reqUnits, setReqUnits] = useState('5')
  const [reqUrgency, setReqUrgency] = useState('Routine')
  const [reqCaseId, setReqCaseId] = useState('')
  const [reqRadius, setReqRadius] = useState('50') // '25', '50', '100', 'all'
  const [reqMinStockOnly, setReqMinStockOnly] = useState(true)
  const [matchedBanks, setMatchedBanks] = useState([])

  // Blood Bank Directory filter states
  const [dirStockFilter, setDirStockFilter] = useState('available') // 'available', 'all', or 'A+', 'B+', 'O+', etc.
  const [dirLocationFilter, setDirLocationFilter] = useState('nearby_50') // 'nearby_25', 'nearby_50', 'nearby_100', 'all'
  const [dirState, setDirState] = useState('All')
  const [dirDistrict, setDirDistrict] = useState('All')
  const [dirSearchQuery, setDirSearchQuery] = useState('')
  const [dirSortBy, setDirSortBy] = useState('distance') // 'distance', 'stock', 'name'

  // Profile Edit states
  const [editMode, setEditMode] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileAddress, setProfileAddress] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileLicense, setProfileLicense] = useState('LIC-9908872-H')
  const [staffList, setStaffList] = useState([
    { name: 'Dr. Sandeep Aggarwal', role: 'Chief Medical Officer', email: 's.aggarwal@aiims.edu' },
    { name: 'Dr. Pooja Deshmukh', role: 'Transfusion Specialist', email: 'p.deshmukh@aiims.edu' },
    { name: 'Rajesh Sharma', role: 'Blood Bank Liaison', email: 'r.sharma@aiims.edu' }
  ])

  // Load baseline profile & directory details
  const loadData = () => {
    try {
      const profile = mockApi.getHospitalProfile(user)
      if (profile) {
        setHospitalInfo(profile)
        setProfileName(profile.name)
        setProfileAddress(profile.address)
        setProfilePhone(user.phone || '+91 11-26588500')

        // Set requests log
        const reqList = mockApi.getHospitalRequests(profile.id)
        setRequests(reqList)

        // Load blood banks with stock from in-memory database
        const allBanksWithStock = mockApi.getPublicStockAvailability()
        const mappedBanks = allBanksWithStock.map(b => {
          const distance = getDistance(profile.lat, profile.lng, b.lat, b.lng)
          return {
            ...b,
            distance,
            responseTime: Math.floor(distance * 3) + 12 + ' mins',
            isPreferred: preferredBanks.includes(b.id)
          }
        }).sort((a, b) => a.distance - b.distance)

        setBloodBanks(mappedBanks)

        // Donors
        const donors = mockApi.getNearbyDonors(profile.lat, profile.lng, 15)
        setNearbyDonors(donors)

        // Notifications
        const notifList = mockApi.getNotifications(user.id)
        setNotifications(notifList)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, preferredBanks])

  // Timer for SOS simulated responders count ticking
  useEffect(() => {
    let timer
    if (sosSent) {
      timer = setInterval(() => {
        setSosRespondersCount(c => {
          if (c >= 6) {
            clearInterval(timer)
            return c
          }
          const nextCount = c + 1
          
          // Add a mock responder matching list
          const potentialResponders = [
            { name: 'Red Cross Midtown Center', type: 'Blood Bank', distance: '1.2 km', action: 'Matched reserve' },
            { name: 'John Doe (A+)', type: 'Donor', distance: '0.8 km', action: 'Dispatched volunteer' },
            { name: 'Jane Smith (O-)', type: 'Donor', distance: '1.9 km', action: 'Accepted SOS emergency call' },
            { name: 'Brooklyn Blood Depot', type: 'Blood Bank', distance: '5.1 km', action: 'Route verification active' },
            { name: 'Alice Williams (AB-)', type: 'Donor', distance: '1.5 km', action: 'En route' },
            { name: 'Bob Jones (B+)', type: 'Donor', distance: '6.2 km', action: 'Reserved units' }
          ]

          setSosRespondersList(prev => [...prev, potentialResponders[prev.length]])
          
          const randomResponder = potentialResponders[c]
          mockApi.addNotification(
            user.id,
            'emergency_request',
            `SOS RESPONDED: ${randomResponder.name} is coordinating supply matching for your urgent alert.`,
            ['in_app', 'sms']
          )
          
          return nextCount
        })
      }, 3500)
    } else {
      setSosRespondersCount(0)
      setSosRespondersList([])
    }
    return () => clearInterval(timer)
  }, [sosSent])

  const triggerToast = (msgText) => {
    setSuccessToast(msgText)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleTogglePreferred = (bankId) => {
    let updated
    if (preferredBanks.includes(bankId)) {
      updated = preferredBanks.filter(id => id !== bankId)
    } else {
      updated = [...preferredBanks, bankId]
    }
    setPreferredBanks(updated)
    localStorage.setItem('hosp_preferred_banks', JSON.stringify(updated))
    triggerToast('Bank preferences updated successfully.')
  }

  // Reactive Quick Order Matching: Automatically compute nearby available banks
  useEffect(() => {
    if (bloodBanks.length === 0) return
    const matched = bloodBanks
      .map(b => {
        const unitsAvail = b.stockSummary?.[reqBloodGroup] || 0
        return {
          ...b,
          unitsAvail
        }
      })
      .filter(b => {
        if (reqMinStockOnly && b.unitsAvail <= 0) return false
        if (reqRadius !== 'all' && b.distance > parseFloat(reqRadius)) return false
        return true
      })
      .sort((a, b) => {
        const aHasReq = a.unitsAvail >= parseInt(reqUnits || '1')
        const bHasReq = b.unitsAvail >= parseInt(reqUnits || '1')
        if (aHasReq && !bHasReq) return -1
        if (!aHasReq && bHasReq) return 1
        return a.distance - b.distance || b.unitsAvail - a.unitsAvail
      })
    setMatchedBanks(matched)
  }, [bloodBanks, reqBloodGroup, reqUnits, reqRadius, reqMinStockOnly])

  // Directory filter computations
  const dirStatesList = useMemo(() => {
    const states = new Set(bloodBanks.map(b => b.state).filter(Boolean))
    return ['All', ...Array.from(states).sort()]
  }, [bloodBanks])

  const dirDistrictsList = useMemo(() => {
    const filtered = dirState === 'All' 
      ? bloodBanks 
      : bloodBanks.filter(b => b.state === dirState)
    const districts = new Set(filtered.map(d => d.district).filter(Boolean))
    return ['All', ...Array.from(districts).sort()]
  }, [bloodBanks, dirState])

  const filteredDirectory = useMemo(() => {
    let list = bloodBanks.filter(b => {
      // Stock filter
      const totalStock = Object.values(b.stockSummary || {}).reduce((x, y) => x + y, 0)
      if (dirStockFilter === 'available' && totalStock <= 0) return false
      if (['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(dirStockFilter)) {
        if ((b.stockSummary?.[dirStockFilter] || 0) <= 0) return false
      }

      // Location / Proximity filter
      if (dirLocationFilter.startsWith('nearby_')) {
        const maxKm = parseFloat(dirLocationFilter.replace('nearby_', ''))
        if (b.distance > maxKm) return false
      } else {
        if (dirState !== 'All' && b.state !== dirState) return false
        if (dirDistrict !== 'All' && b.district !== dirDistrict) return false
      }

      // Text search
      if (dirSearchQuery.trim()) {
        const q = dirSearchQuery.toLowerCase().trim()
        const matchesName = b.name?.toLowerCase().includes(q)
        const matchesAddr = b.address?.toLowerCase().includes(q)
        const matchesDist = b.district?.toLowerCase().includes(q)
        if (!matchesName && !matchesAddr && !matchesDist) return false
      }

      return true
    })

    // Sorting
    if (dirSortBy === 'distance') {
      list.sort((a, b) => a.distance - b.distance)
    } else if (dirSortBy === 'stock') {
      list.sort((a, b) => {
        const stockA = dirStockFilter !== 'available' && dirStockFilter !== 'all' 
          ? (a.stockSummary?.[dirStockFilter] || 0) 
          : Object.values(a.stockSummary || {}).reduce((x, y) => x + y, 0)
        const stockB = dirStockFilter !== 'available' && dirStockFilter !== 'all' 
          ? (b.stockSummary?.[dirStockFilter] || 0) 
          : Object.values(b.stockSummary || {}).reduce((x, y) => x + y, 0)
        return stockB - stockA
      })
    } else if (dirSortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }

    return list
  }, [bloodBanks, dirStockFilter, dirLocationFilter, dirState, dirDistrict, dirSearchQuery, dirSortBy])

  const handleSearchBanksForRequest = (e) => {
    e.preventDefault()
    if (!hospitalInfo) return
    const matched = bloodBanks
      .map(b => {
        const unitsAvail = b.stockSummary?.[reqBloodGroup] || 0
        return {
          ...b,
          unitsAvail
        }
      })
      .filter(b => {
        if (reqMinStockOnly && b.unitsAvail <= 0) return false
        if (reqRadius !== 'all' && b.distance > parseFloat(reqRadius)) return false
        return true
      })
      .sort((a, b) => {
        const aHasReq = a.unitsAvail >= parseInt(reqUnits || '1')
        const bHasReq = b.unitsAvail >= parseInt(reqUnits || '1')
        if (aHasReq && !bHasReq) return -1
        if (!aHasReq && bHasReq) return 1
        return a.distance - b.distance || b.unitsAvail - a.unitsAvail
      })
    setMatchedBanks(matched)
  }

  const handleSendRequest = (bank) => {
    if (!hospitalInfo) return
    try {
      mockApi.createBloodRequest(hospitalInfo.id, {
        blood_bank_id: bank.id,
        blood_group: reqBloodGroup,
        units_needed: parseInt(reqUnits),
        urgency: reqUrgency.toLowerCase() === 'emergency' ? 'emergency' : 'normal'
      })

      triggerToast(`Request dispatched to ${bank.name} for ${reqUnits} units of ${reqBloodGroup} [${reqUrgency}].`)
      
      setReqCaseId('')
      loadData()
      setActiveTab('history')
    } catch (e) {
      alert(e.message)
    }
  }

  // Open the request blood tab pre-targeted at a specific bank
  const handleOpenBankDetail = (bank) => {
    try {
      const detail = mockApi.getBloodBankDetail(bank.id)
      setDetailBank(detail ? { ...detail, distance: bank.distance, responseTime: bank.responseTime, isPreferred: bank.isPreferred } : bank)
    } catch (e) {
      setDetailBank(bank)
    }
  }

  const handleOpenRequest = (bank) => {
    setReqBloodGroup('O-')
    setReqUnits('5')
    setReqUrgency('Routine')
    setReqRadius('all')
    setReqMinStockOnly(false)
    setActiveTab('request_blood')
  }

  const handleConfirmCancel = () => {
    if (!cancelModalItem) return
    try {
      mockApi.updateRequestStatus(cancelModalItem.id, 'rejected')
      
      mockApi.addNotification(
        user.id,
        'request_response',
        `Order ${cancelModalItem.id.substring(0, 8)} cancelled successfully.`,
        ['in_app']
      )
      triggerToast('Request cancelled successfully.')
      setCancelModalItem(null)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleSendSos = (e) => {
    e.preventDefault()
    setSosSent(true)
    setSosRespondersCount(0)
    setSosRespondersList([])
    
    mockApi.addNotification(
      user.id,
      'emergency_request',
      `🚨 EMERGENCY SOS BROADCAST Dispatched: Urgent need of ${sosUnits} units of ${sosBloodGroup} transmitted to Twilio SMS gateway.`,
      ['in_app', 'sms', 'email']
    )
    triggerToast('Emergency SOS broadcast successfully transmitted!')
  }

  const handleMarkAllNotificationsRead = () => {
    notifications.forEach(n => {
      mockApi.markNotificationRead(n.id)
    })
    loadData()
    triggerToast('All notifications marked as read.')
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    try {
      // Update via mockApi internal tables
      const hospitals = mockApi.getAdminUsers ? [] : [] // fallback
      // Direct memory update
      if (hospitalInfo) {
        hospitalInfo.name = profileName
        hospitalInfo.address = profileAddress
      }
      setEditMode(false)
      loadData()
      triggerToast('Profile updated successfully.')
    } catch (e) {
      console.error(e)
    }
  }

  const unreadNotifCount = notifications.filter(n => !n.read_flag).length

  // Aggregated Stock Counts
  const stockMap = {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'O+': 0, 'O-': 0, 'AB+': 0, 'AB-': 0
  }
  bloodBanks.forEach(b => {
    Object.keys(b.stockSummary || {}).forEach(bg => {
      stockMap[bg] = (stockMap[bg] || 0) + b.stockSummary[bg]
    })
  })

  // Pending requests breakdown
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const acceptedCount = requests.filter(r => r.status === 'accepted').length
  const fulfilledCount = requests.filter(r => r.status === 'fulfilled').length

  // Total active stock sum for donut chart
  const totalStockSum = Object.values(stockMap).reduce((a, b) => a + b, 0)

  // Map markers helper to plot hospital, banks, and donors
  const getMapMarkers = () => {
    if (!hospitalInfo || !hospitalInfo.lat || !hospitalInfo.lng) return []
    const markers = [{
      lat: hospitalInfo.lat,
      lng: hospitalInfo.lng,
      label: `🏥 ${hospitalInfo.name} (You)`,
      color: 'red'
    }]
    bloodBanks.forEach(b => {
      if (b.lat && b.lng) {
        const dStr = b.distance != null ? Number(b.distance).toFixed(1) : '0.0';
        markers.push({
          lat: b.lat,
          lng: b.lng,
          label: `🏦 ${b.name} (${dStr} km away)`,
          color: 'blue',
          onClick: () => {
            setSelectedBankForStock(b)
          }
        })
      }
    })
    nearbyDonors.forEach(d => {
      if (d.lat && d.lng) {
        const dStr = d.distance != null ? Number(d.distance).toFixed(1) : '0.0';
        markers.push({
          lat: d.lat,
          lng: d.lng,
          label: `👤 Volunteer: ${d.name} (${d.blood_group}, ${dStr} km away)`,
          color: 'orange'
        })
      }
    })
    return markers
  }

  // Theme values mapped from Claude.com design system
  const cCanvas = 'bg-canvas text-ink'
  const cCard = 'bg-surface-card border-hairline text-ink'
  const cHairline = 'border-hairline divide-hairline'
  const cBodyText = 'text-body'

  return (
    <div className="flex h-screen overflow-hidden text-left bg-canvas">
      
      {/* SUCCESS TOAST MESSAGE (Sharp corners, Rosso Corsa theme) */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-[#f54e00] text-white px-5 py-3.5 rounded-xl shadow-none z-50 flex items-center space-x-3 text-xs font-bold tracking-[1.4px] uppercase animate-bounce">
          <span>✨</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* CANCEL MODAL CONFIRMATION (Sharp corners, Rosso Corsa accents) */}
      {cancelModalItem && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${isDarkMode ? 'bg-surface-card border-[#ffffff] text-white' : 'bg-surface-card border border-hairline-[#e6e5e0] text-slate-800'} border rounded-xl p-6 max-w-sm w-full shadow-none space-y-4`}>
            <h4 className="text-sm font-medium tracking-tight">Cancel Request?</h4>
            <p className={`text-xs ${cBodyText} leading-relaxed`}>
              Are you sure you want to cancel your request for <strong className="text-current">{cancelModalItem.units_needed} units</strong> of <strong className="text-current">{cancelModalItem.blood_group}</strong>?
            </p>
            <div className="flex justify-end space-x-2 pt-2 text-[11px] font-bold tracking-[1.1px] uppercase">
              <button
                onClick={() => setCancelModalItem(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition"
              >
                No, Keep It
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-[#f54e00] text-white hover:bg-[#d04200] rounded-xl transition shadow-none"
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOOD BANK DETAIL MODAL */}
      {detailBank && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setDetailBank(null)}>
          <div className="bg-surface-card border border-hairline rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col text-left" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-hairline sticky top-0 bg-surface-card/95 backdrop-blur rounded-t-3xl z-20">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="text-lg font-bold text-ink leading-snug">{detailBank.name}</h3>
                  <p className="text-xs text-muted line-clamp-1">{detailBank.address?.replace(/,\s*,/g, ',')}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#f54e00] bg-[#f54e00]/10 border border-[#f54e00]/20 px-2.5 py-0.5 rounded-full font-mono">
                      {detailBank.category || 'Govt.'}
                    </span>
                    <span className="text-xs text-muted font-medium">{detailBank.district}, {detailBank.state}</span>
                    {detailBank.distance != null && (
                      <span className="text-[10px] font-bold text-ink bg-canvas border border-hairline px-2.5 py-0.5 rounded-full">
                        📍 {Number(detailBank.distance).toFixed(1)} km away
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setDetailBank(null)}
                  className="w-8 h-8 rounded-full bg-canvas border border-hairline hover:bg-slate-100 dark:hover:bg-slate-800 text-muted hover:text-ink flex items-center justify-center transition shrink-0 text-xs font-bold"
                  title="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contact Info Strip */}
            <div className="px-6 py-4 bg-canvas/50 border-b border-hairline">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Phone</span>
                  <p className="font-mono font-bold text-ink mt-0.5 truncate">{detailBank.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Email</span>
                  <p className="font-medium text-ink mt-0.5 truncate" title={detailBank.email}>{detailBank.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Type</span>
                  <p className="font-medium text-ink mt-0.5 truncate">{detailBank.type || 'Blood Bank'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Est. Response</span>
                  <p className="font-medium text-ink mt-0.5 truncate">~{detailBank.responseTime || '15 mins'}</p>
                </div>
              </div>
            </div>

            {/* Stock Breakdown Grid */}
            <div className="p-6 space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f54e00] animate-pulse"></span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Live Blood Stock</h4>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#f54e00]/10 text-[#f54e00] border border-[#f54e00]/20 font-mono">
                  {detailBank.totalUnits || Object.values(detailBank.stockSummary || {}).reduce((a, b) => a + b, 0)} Total Units
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => {
                  const count = detailBank.stockSummary?.[bg] || 0;
                  const pct = Math.min(100, Math.round((count / 30) * 100));
                  const hasStock = count > 0;
                  
                  return (
                    <div
                      key={bg}
                      className={`rounded-2xl p-3 text-center transition-all flex flex-col justify-between ${
                        hasStock
                          ? 'bg-surface-card border border-hairline hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                          : 'bg-canvas/30 border border-hairline/60 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-black font-mono ${hasStock ? 'text-ink' : 'text-muted'}`}>{bg}</span>
                        {hasStock && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        )}
                      </div>
                      <div className="my-1.5">
                        <span className={`text-2xl font-black font-mono leading-none ${hasStock ? 'text-[#f54e00]' : 'text-muted'}`}>
                          {count}
                        </span>
                        <span className="text-[10px] text-muted font-medium ml-1">u</span>
                      </div>
                      <div className="w-full bg-canvas border border-hairline/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${count > 10 ? 'bg-emerald-500' : hasStock ? 'bg-[#f54e00]' : 'bg-transparent'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory Batch Table */}
            {detailBank.inventory && detailBank.inventory.length > 0 && (
              <div className="px-6 pb-6 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <span>📦</span> Verified FEFO Batches
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface-card">
                  <table className="w-full text-xs">
                    <thead className="bg-canvas border-b border-hairline text-muted text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Group</th>
                        <th className="px-4 py-2.5 text-left">Units</th>
                        <th className="px-4 py-2.5 text-left">Batch ID</th>
                        <th className="px-4 py-2.5 text-left">Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-ink">
                      {detailBank.inventory.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center font-black text-xs font-mono px-2 py-0.5 rounded-md bg-[#f54e00]/10 text-[#f54e00] border border-[#f54e00]/20">
                              {item.blood_group}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold font-mono text-ink">{item.units_available} units</td>
                          <td className="px-4 py-2.5 font-mono text-muted text-[11px]">{item.batch_id}</td>
                          <td className="px-4 py-2.5 font-mono text-ink text-[11px]">{item.expiry_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="sticky bottom-0 bg-surface-card/95 backdrop-blur px-6 py-4 border-t border-hairline rounded-b-3xl flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTogglePreferred(detailBank.id)}
                  className="p-1.5 rounded-lg bg-canvas border border-hairline hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition"
                  title={detailBank.isPreferred ? "Remove favorite" : "Mark favorite"}
                >
                  {detailBank.isPreferred ? '⭐' : '☆'}
                </button>
                <span className="text-xs text-muted font-medium hidden sm:inline">
                  {detailBank.isPreferred ? 'Marked as Preferred Center' : 'Add to Preferred Centers'}
                </span>
              </div>
              <button
                onClick={() => {
                  setDetailBank(null);
                  handleOpenRequest(detailBank);
                }}
                className="h-10 px-5 bg-[#f54e00] hover:bg-[#d04200] active:scale-95 text-white font-bold text-xs rounded-xl uppercase tracking-wide transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 leading-none"
              >
                <span className="leading-none">🩸</span>
                <span className="leading-none">Request Blood</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC SIDEBAR WITH BLOOD RED COLOR THEME */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        unreadNotifCount={unreadNotifCount}
        user={user}
        handleLogout={logout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      {/* RIGHT MAIN CONTAINER WITH CURVED CORNER BLEND */}
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-colors ${cCanvas}`}>
        
        {/* HEADER BAR (Custom dropdown actions) */}
        <header className={`border-b px-6 py-4 flex justify-between items-center shadow-sm z-30 transition-colors ${
          isDarkMode ? 'bg-surface-card border-hairline text-ink' : 'bg-surface-card border-b border-hairline text-ink'
        }`}>
          <div className="flex items-center space-x-4">
            <h2 className="text-base font-medium tracking-[0.65px] uppercase">
              {activeTab === 'directory' ? 'BLOOD BANKS' : activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`border rounded-xl px-4 py-2 text-xs font-medium focus:outline-none transition w-56 ${
                  isDarkMode 
                    ? 'bg-surface-card border-[#ffffff] text-slate-100 focus:bg-slate-950 focus:ring-[#f54e00]' 
                    : 'bg-surface-card border-hairline text-ink focus:bg-surface-card focus:ring-[#f54e00]'
                }`}
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-muted">🔍</span>
            </div>

            <div className="relative">
              <button 
                onClick={() => setActiveTab('notifications')}
                className="p-1.5 text-muted hover:text-[#f54e00] transition rounded-xl relative"
              >
                <span>🔔</span>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full ring-2 ring-white bg-[#f54e00] text-[8px] font-extrabold text-white text-center leading-4 animate-bounce">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            <div className="h-px bg-slate-200 w-4 hidden sm:block"></div>
            
            <div className="flex items-center space-x-2.5 relative">
              <div 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <div className="h-8.5 w-8.5 bg-[#f54e00] text-white font-black text-xs rounded-xl flex items-center justify-center">
                  🏨
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold truncate max-w-[120px]">{profileName}</span>
                  <span className="text-[9px] font-semibold text-muted">Supervisor ID</span>
                </div>
              </div>

              {/* Profile Avatar Dropdown */}
              {showProfileDropdown && (
                <div className={`absolute right-0 mt-36 w-44 rounded-xl shadow-none z-50 overflow-hidden divide-y ${
                  isDarkMode ? 'bg-surface-card text-[#ffffff] border-[#ffffff] divide-slate-700' : 'bg-surface-card text-slate-800 border-hairline divide-hairline'
                }`}>
                  <div className="px-4 py-3 text-left">
                    <span className="text-[10px] text-muted font-bold uppercase block">Role Claim</span>
                    <span className="text-xs font-semibold">Hospital Staff</span>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50/50 font-bold"
                  >
                    View Settings
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50/50 font-bold"
                  >
                    Force Sync DB
                  </button>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-xs text-[#f54e00] hover:bg-[#f54e00]/10/50 font-bold"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* CONTAINER SWITCH - DUAL COLUMN LAYOUT RENDER */}
        <main className={`flex-1 overflow-hidden flex flex-col md:flex-row transition-colors ${isDarkMode ? 'bg-canvas' : 'bg-surface-card'}`}>
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 overflow-y-auto p-6 bg-canvas flex flex-col lg:flex-row gap-6 text-ink">
              
              {/* LEFT COLUMN - MAIN operational widgets (65% width) */}
              <div className="flex-1 space-y-6 flex flex-col">
                
                {/* Header Welcome text (Hello, Hospital) */}
                <div className="text-left">
                  <h2 className="text-3xl font-condensed font-normal text-ink tracking-tight">
                    Hello, {hospitalInfo?.name || profileName}
                  </h2>
                  <p className="text-xs text-body font-medium mt-1">
                    Monitor real-time blood inventory and network logistics.
                  </p>
                </div>

                {/* Top Row: Three colored card metrics side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Combined Stock (Teal/Green theme) */}
                  <div className="bg-surface-card border border-hairline p-5 rounded-xl relative flex flex-col justify-between min-h-[140px] text-left">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5db8a6] font-mono bg-[#5db8a6]/10 border border-[#5db8a6]/20 px-2 py-0.5 rounded">
                        Available Stock
                      </span>
                      <h4 className="text-sm font-semibold text-ink mt-3">Total Combined Stock</h4>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <span className="text-3xl font-black font-mono text-ink">{totalStockSum} U</span>
                      <button 
                        onClick={() => setActiveTab('directory')}
                        className="w-8 h-8 rounded-full bg-[#f54e00] hover:bg-[#d04200] text-white flex items-center justify-center transition"
                      >
                        <span className="text-sm">→</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Pending Requests (Red theme) */}
                  <div className="bg-surface-card border border-hairline p-5 rounded-xl relative flex flex-col justify-between min-h-[140px] text-left">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f54e00] font-mono bg-[#f54e00]/10 border border-[#f54e00]/20 px-2 py-0.5 rounded">
                        Logistics
                      </span>
                      <h4 className="text-sm font-semibold text-ink mt-3">Pending Requests</h4>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <span className="text-3xl font-black font-mono text-ink">{pendingCount} Req</span>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className="w-8 h-8 rounded-full bg-[#f54e00] hover:bg-[#d04200] text-white flex items-center justify-center transition"
                      >
                        <span className="text-sm">→</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Connected Centers (Amber/Brown theme) */}
                  <div className="bg-surface-card border border-hairline p-5 rounded-xl relative flex flex-col justify-between min-h-[140px] text-left">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#e8a55a] font-mono bg-[#e8a55a]/10 border border-[#e8a55a]/20 px-2 py-0.5 rounded">
                        Network
                      </span>
                      <h4 className="text-sm font-semibold text-ink mt-3">Active Blood Banks</h4>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <span className="text-3xl font-black font-mono text-ink">{bloodBanks.length} Hubs</span>
                      <button 
                        onClick={() => setActiveTab('directory')}
                        className="w-8 h-8 rounded-full bg-[#f54e00] hover:bg-[#d04200] text-white flex items-center justify-center transition"
                      >
                        <span className="text-sm">→</span>
                      </button>
                    </div>
                  </div>
                </div>

{/* Middle Row: Chart Widget - Light Cream Surface */}
                <div className="bg-surface-card border border-hairline p-6 rounded-xl text-left flex flex-col justify-between shadow-none relative text-ink">
                  <div className="flex justify-between items-center pb-2 border-b border-hairline mb-4">
                    <div>
                      <h4 className="text-base font-normal text-ink uppercase tracking-wide font-condensed">Blood Supply & Demand Trends</h4>
                      <p className="text-[10px] text-body">Monthly breakdown of units requested vs. units received (Jan - Jun 2026)</p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-semibold">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f54e00]"></span>
                        <span>Requested</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#5db8a6]"></span>
                        <span>Received</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-[200px] w-full mt-4 flex items-end relative">
                    <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="40" x2="600" y2="40" stroke="#e6e5e0" strokeWidth="1" />
                      <line x1="0" y1="90" x2="600" y2="90" stroke="#e6e5e0" strokeWidth="1" />
                      <line x1="0" y1="140" x2="600" y2="140" stroke="#e6e5e0" strokeWidth="1" />
                      
                      {/* Demand Line (Requested - Coral #f54e00) */}
                      <path 
                        d="M 50,150 L 150,110 L 250,50 L 350,120 L 450,80 L 550,140" 
                        fill="none" 
                        stroke="#f54e00" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      
                      {/* Supply Line (Received - Teal #5db8a6) */}
                      <path 
                        d="M 50,160 L 150,120 L 250,60 L 350,130 L 450,85 L 550,145" 
                        fill="none" 
                        stroke="#5db8a6" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeDasharray="2"
                      />

                      {/* Dots and Labels */}
                      {[
                        { x: 50, y1: 150, y2: 160, m: 'Jan' },
                        { x: 150, y1: 110, y2: 120, m: 'Feb' },
                        { x: 250, y1: 50, y2: 60, m: 'Mar', val: '300 units' },
                        { x: 350, y1: 120, y2: 130, m: 'Apr' },
                        { x: 450, y1: 80, y2: 85, m: 'May' },
                        { x: 550, y1: 140, y2: 145, m: 'Jun', val: '70 units' }
                      ].map((pt, idx) => (
                        <g key={idx}>
                          {/* Requested Dot */}
                          <circle cx={pt.x} cy={pt.y1} r="4.5" fill="#f54e00" stroke="#ffffff" strokeWidth="1.5" />
                          {/* Received Dot */}
                          <circle cx={pt.x} cy={pt.y2} r="4.5" fill="#5db8a6" stroke="#ffffff" strokeWidth="1.5" />
                          {/* Value callout */}
                          {pt.val && (
                            <g>
                              <rect x={pt.x - 30} y={pt.y1 - 28} width="60" height="18" rx="5" fill="#f7f7f4" stroke="#e6e5e0" strokeWidth="1" />
                              <text x={pt.x} y={pt.y1 - 16} fill="#26251e" fontSize="9" textAnchor="middle" fontWeight="bold" className="font-mono">{pt.val}</text>
                            </g>
                          )}
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Monthly Labels Row */}
                  <div className="flex justify-between px-6 mt-2 text-[10px] text-body font-bold uppercase tracking-wider font-mono">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                  </div>
                </div>

                {/* Bottom Row: Two cards side-by-side (45% / 55% space) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left card: Blood availability / Vials grid */}
                  <div className="bg-surface-card border border-hairline p-5 rounded-xl flex flex-col justify-between shadow-none relative text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-hairline pb-2">
                      <div>
                        <h4 className="text-sm font-normal text-ink uppercase tracking-wider font-condensed">Hospital Reserve Inventory</h4>
                        <p className="text-[9px] text-body">Live group-by-group stock level</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('request_blood')}
                        className="px-3 py-1 bg-[#f54e00] text-white font-medium text-[10px] rounded-md uppercase tracking-wider hover:bg-[#d04200] transition font-sans shadow-none"
                      >
                        Quick Order
                      </button>
                    </div>

                    {/* Vials grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => {
                        const count = stockMap[bg] || 0;
                        const pct = Math.min(100, Math.round((count / 200) * 100));
                        
                        let fillClass = 'bg-[#5db8a6]';
                        if (pct < 20) {
                          fillClass = 'bg-[#c64545]';
                        } else if (pct < 50) {
                          fillClass = 'bg-[#e8a55a]';
                        }
                        
                        return (
                          <div key={bg} className="border border-hairline p-2.5 rounded-lg flex flex-col items-center justify-between bg-canvas">
                            {/* Small vial */}
                            <div className="w-3.5 h-10 bg-surface-card rounded-full border border-hairline relative overflow-hidden flex flex-col justify-end">
                              <div className={`${fillClass} w-full rounded-b-full transition-all`} style={{ height: `${pct}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold text-ink mt-1.5">{bg}</span>
                            <span className="text-[10px] font-mono font-bold text-body">{count} u</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right card: Active Dispatch / Nearest Hub */}
                  <div className="bg-surface-card border border-hairline p-5 rounded-xl flex flex-col justify-between shadow-none relative text-left">
                    <div className="flex justify-between items-center border-b border-hairline pb-2 mb-4">
                      <div>
                        <h4 className="text-sm font-normal text-ink uppercase tracking-wider font-condensed">Nearest Supply Hub</h4>
                        <p className="text-[9px] text-body">Closest verified distribution center</p>
                      </div>
                      <span className="inline-flex text-[9px] font-bold bg-[#5db8a6]/10 text-[#5db8a6] px-2 py-0.5 rounded border border-[#5db8a6]/20 uppercase font-mono">
                        Online
                      </span>
                    </div>

                    {bloodBanks[0] ? (
                      <div className="space-y-3.5 text-[#3d3d3a]">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-body font-medium uppercase tracking-wider">Hub Name</span>
                          <span className="text-xs font-semibold text-ink">{bloodBanks[0].name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-body font-medium uppercase tracking-wider">Distance</span>
                          <span className="text-xs font-semibold font-mono text-ink">{bloodBanks[0]?.distance != null ? Number(bloodBanks[0].distance).toFixed(1) : '0.0'} km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-body font-medium uppercase tracking-wider">Estimated Delivery</span>
                          <span className="text-xs font-semibold font-mono text-ink">{bloodBanks[0].responseTime}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-body font-medium uppercase tracking-wider">Hub Combined Stock</span>
                          <span className="text-xs font-semibold font-mono text-ink">
                            {Object.values(bloodBanks[0].stockSummary || {}).reduce((x, y) => x + y, 0)} Units
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-body py-6 text-center">No blood banks synced in network.</div>
                    )}

                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={() => setActiveTab('directory')}
                        className="px-3.5 py-1.5 bg-[#26251e] text-[#f7f7f4] border border-transparent font-medium text-xs rounded-md uppercase tracking-wider hover:bg-[#252523] transition font-sans shadow-none"
                      >
                        View Hub Directory
                      </button>
                    </div>
                  </div>
                </div>

              </div>

{/* RIGHT COLUMN - SIDEBAR ACTIVITY TRACKER (35% width) */}
              <div className="w-full lg:w-96 bg-surface-card p-6 space-y-6 overflow-y-auto flex flex-col shadow-none text-left rounded-xl text-ink border border-hairline">
                <div className="flex justify-between items-center pb-2 border-b border-hairline">
                  <h4 className="text-sm font-normal uppercase tracking-wider text-ink font-condensed">Logistics & Orders Tracker</h4>
                  <span 
                    onClick={() => setActiveTab('history')} 
                    className="text-[10px] text-[#f54e00] font-bold hover:underline cursor-pointer font-condensed"
                  >
                    View All
                  </span>
                </div>

                {/* List of active requests */}
                <div className="space-y-4 flex-1">
                  {requests.slice(0, 4).map((r, idx) => {
                    let statusColor = 'text-[#e8a55a] bg-[#e8a55a]/10 border-[#e8a55a]/20';
                    let actionBtn = null;
                    
                    if (r.status === 'fulfilled') {
                      statusColor = 'text-[#5db872] bg-[#5db872]/10 border-[#5db872]/20';
                      actionBtn = (
                        <button disabled className="px-2.5 py-1 bg-surface-card text-body text-[10px] font-medium rounded-md cursor-not-allowed uppercase font-sans border border-hairline">
                          Received
                        </button>
                      );
                    } else if (r.status === 'pending' || r.status === 'accepted') {
                      actionBtn = (
                        <button 
                          onClick={() => setCancelModalItem(r)}
                          className="px-2.5 py-1 bg-[#f54e00] text-white hover:bg-[#d04200] text-[10px] font-medium rounded-md transition uppercase font-sans shadow-none"
                        >
                          Cancel
                        </button>
                      );
                    } else {
                      statusColor = 'text-[#c64545] bg-[#c64545]/10 border-[#c64545]/20';
                      actionBtn = (
                        <button disabled className="px-2.5 py-1 bg-surface-card text-body text-[10px] font-medium rounded-md cursor-not-allowed uppercase font-sans border border-hairline">
                          Cancelled
                        </button>
                      );
                    }

                    return (
                      <div key={r.id || idx} className="bg-canvas border border-hairline p-4 rounded-lg text-left flex justify-between items-center gap-4 hover:border-slate-300 transition shadow-none">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="font-bold text-xs text-ink truncate">Order from {r.blood_bank_name}</div>
                          <span className={`inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${statusColor} font-mono`}>
                            {r.status}
                          </span>
                          <div className="text-[10px] text-body font-mono mt-1">
                            Group: <span className="font-bold text-ink font-condensed">{r.blood_group}</span> | Units: <span className="font-bold text-ink">{r.units_needed}</span>
                          </div>
                        </div>
                        <div>
                          {actionBtn}
                        </div>
                      </div>
                    );
                  })}

                  {requests.length === 0 && (
                    <div className="p-8 border border-dashed border-hairline rounded-lg text-center text-xs text-body font-condensed">
                      No active orders or logistics logs.
                    </div>
                  )}
                </div>

                {/* Notifications summary block */}
                <div className="border-t border-hairline pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-body font-bold uppercase tracking-wider font-condensed">Live Broadcast Alerts</span>
                    {sosSent && (
                      <span className="inline-flex text-[9px] bg-[#f54e00]/10 text-[#f54e00] px-1.5 rounded font-bold animate-pulse">SOS LIVE</span>
                    )}
                  </div>
                  
                  {notifications.slice(0, 2).map((n, idx) => (
                    <div key={idx} className="bg-canvas border border-hairline p-3 rounded-lg text-left flex flex-col space-y-1 shadow-none">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#f54e00] text-white font-mono">
                          {n.type.replace('_', ' ')}
                        </span>
                        <span className="text-[8px] text-body font-mono">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-body leading-tight truncate">{n.message}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}{/* DYNAMIC MIDDLE COLUMN CONTENT FOR TABS OTHER THAN DASHBOARD */}
          {activeTab !== 'dashboard' && (
            <div className={`flex-1 ${
              activeTab === 'cross_match'
                ? 'h-full min-h-0 p-6 flex flex-col overflow-y-auto lg:overflow-hidden'
                : 'overflow-y-auto p-6 space-y-6'
            }`}>
              
              {/* TAB: FIND COMPATIBLE BLOOD / CROSS-MATCH ENGINE */}
              {activeTab === 'cross_match' && (
                <CrossMatchPanel
                  onOrderDispatched={() => {
                    loadData();
                    setActiveTab('history');
                  }}
                />
              )}

              {/* TAB 2: REQUEST BLOOD FORM / QUICK ORDER */}
              {activeTab === 'request_blood' && (
                isRequestMapExpanded ? (
                  <div className="h-full w-full p-6 flex flex-col space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-hairline">
                      <div className="text-left">
                        <h4 className="text-sm font-medium uppercase tracking-[0.65px]">Nearby Available Stock Map - Expanded View</h4>
                        <p className={`text-[10px] ${cBodyText}`}>
                          Displaying {matchedBanks.length} nearby supply centers with {reqBloodGroup} reserve relative to {hospitalInfo?.name}.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsRequestMapExpanded(false)}
                        className="px-4 py-2 bg-[#f54e00] text-white font-bold text-xs rounded-xl hover:bg-[#d04200] tracking-[1.4px] uppercase h-11 transition"
                      >
                        ✕ Close Map View
                      </button>
                    </div>
                    <div className="flex-1 rounded-xl overflow-hidden border border-hairline relative">
                      {hospitalInfo && (
                        <MapView 
                          center={[hospitalInfo.lat, hospitalInfo.lng]} 
                          zoom={11} 
                          markers={[
                            { lat: hospitalInfo.lat, lng: hospitalInfo.lng, label: `🏨 ${hospitalInfo.name} (You)` },
                            ...matchedBanks.map(b => ({
                              lat: b.lat,
                              lng: b.lng,
                              label: `🏥 ${b.name} (${b.unitsAvail || 0} units of ${reqBloodGroup}, ${b.distance != null ? Number(b.distance).toFixed(1) : '0.0'} km away)`
                            }))
                          ]}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className={`${cCard} border p-6 rounded-2xl shadow-sm space-y-6 lg:col-span-5 self-start sticky top-4`}>
                      <div className="text-left border-b border-hairline pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🩸</span>
                          <h3 className="text-lg font-bold text-ink">Quick Order Dispatch</h3>
                        </div>
                        <p className="text-xs text-body mt-1">
                          Find nearby blood banks with stock and dispatch instant logistics requests.
                        </p>
                      </div>

                      <form onSubmit={handleSearchBanksForRequest} className="space-y-4 text-left">
                        {/* Blood Group */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted">Required Blood Group</label>
                          <select
                            value={reqBloodGroup}
                            onChange={e => setReqBloodGroup(e.target.value)}
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#f54e00] ${
                              isDarkMode ? 'bg-canvas-soft border-hairline text-ink' : 'bg-surface-card border-hairline text-ink'
                            }`}
                          >
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>

                        {/* Units */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted">Volume Required (Units)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={reqUnits}
                            onChange={e => setReqUnits(e.target.value)}
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#f54e00] ${
                              isDarkMode ? 'bg-canvas-soft border-hairline text-ink' : 'bg-surface-card border-hairline text-ink'
                            }`}
                            required
                          />
                        </div>

                        {/* Urgency */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted">Urgency Level Priority</label>
                          <div className="flex gap-2">
                            {['Routine', 'Urgent', 'Emergency'].map(lvl => {
                              const isSel = reqUrgency === lvl
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setReqUrgency(lvl)}
                                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                                    isSel 
                                      ? 'bg-[#f54e00] border-[#f54e00] text-white shadow-none'
                                      : isDarkMode ? 'bg-canvas border-hairline text-muted hover:bg-surface-card' : 'bg-surface-card border-hairline text-body hover:bg-slate-100'
                                  }`}
                                >
                                  {lvl === 'Emergency' ? '🚨 Emergency' : lvl === 'Urgent' ? '⚡ Urgent' : '📋 Routine'}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Proximity Radius Filter */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted">Nearby Proximity Radius</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: '25 km', val: '25' },
                              { label: '50 km', val: '50' },
                              { label: '100 km', val: '100' },
                              { label: 'All Dist', val: 'all' },
                            ].map(r => (
                              <button
                                key={r.val}
                                type="button"
                                onClick={() => setReqRadius(r.val)}
                                className={`py-1.5 text-[11px] font-bold rounded-lg border transition ${
                                  reqRadius === r.val
                                    ? 'bg-[#f54e00] border-[#f54e00] text-white'
                                    : 'bg-canvas border-hairline text-body hover:text-ink'
                                }`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Minimum stock toggle */}
                        <div className="flex items-center justify-between p-3 bg-canvas border border-hairline rounded-xl text-xs">
                          <span className="font-semibold text-ink">Only available blood stock</span>
                          <input 
                            type="checkbox"
                            checked={reqMinStockOnly}
                            onChange={e => setReqMinStockOnly(e.target.checked)}
                            className="w-4 h-4 text-[#f54e00] rounded focus:ring-[#f54e00] accent-[#f54e00]"
                          />
                        </div>

                        <CustomButton type="submit" className="w-full">
                          🔍 Find Nearby Available Stock
                        </CustomButton>
                      </form>
                    </div>

                    <div className="lg:col-span-7 space-y-6">
                      {/* Matching list card */}
                      <div className={`${cCard} border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between`}>
                        <div>
                          <div className={`px-6 py-4 border-b ${isDarkMode ? 'bg-surface-card border-hairline' : 'bg-slate-50/80 border-hairline'} flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#f54e00] animate-pulse"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                                  Nearby Available Centres • <strong className="text-[#f54e00] font-black">{reqBloodGroup}</strong>
                                </span>
                              </div>
                              <p className={`text-[11px] ${cBodyText} mt-0.5`}>
                                Found {matchedBanks.length} supply centres {reqRadius !== 'all' ? `within ${reqRadius} km` : ''} sorted by distance.
                              </p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#f54e00]/10 text-[#f54e00] border border-[#f54e00]/20 font-mono shrink-0">
                              {matchedBanks.length} Centres
                            </span>
                          </div>

                          <div className="p-3.5 space-y-2.5 max-h-[440px] overflow-y-auto custom-scrollbar">
                            {matchedBanks.length === 0 ? (
                              <div className={`p-12 text-center ${cBodyText} text-xs space-y-2 bg-canvas/40 rounded-xl border border-dashed border-hairline`}>
                                <div className="text-3xl">🔍</div>
                                <div className="font-bold text-ink text-sm">No nearby blood banks found with {reqBloodGroup} stock.</div>
                                <div className="text-xs text-muted max-w-sm mx-auto">
                                  Try expanding the proximity radius to 100 km or select "All Dist" to search wider supply centers.
                                </div>
                              </div>
                            ) : (
                              matchedBanks.map(bank => {
                                const hasEnough = bank.unitsAvail >= parseInt(reqUnits || '1');
                                return (
                                  <div
                                    key={bank.id}
                                    className="p-4 rounded-xl border border-hairline bg-surface-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3.5"
                                  >
                                    <div className="text-left space-y-1.5 min-w-0 flex-1">
                                      <div className="font-bold text-sm text-ink flex items-center gap-1.5 truncate">
                                        <span className="truncate">{bank.name}</span>
                                        {bank.isPreferred && (
                                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded shrink-0">
                                            ★ Preferred
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted truncate">{bank.address}</p>
                                      
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f54e00]/10 text-[#f54e00] border border-[#f54e00]/20">
                                          📍 {bank.distance != null ? Number(bank.distance).toFixed(1) : '0.0'} km away
                                        </span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-canvas border border-hairline text-slate-700 dark:text-slate-300">
                                          ⏱️ ETA ~{bank.responseTime}
                                        </span>
                                        <span className="text-[10px] font-medium text-muted px-1.5 py-0.5">
                                          {bank.district}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-hairline/60">
                                      <div className="text-left sm:text-right">
                                        <div className="text-base font-black font-mono text-ink leading-tight">
                                          {bank.unitsAvail} <span className="text-[10px] font-normal text-muted">units</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                                          hasEnough
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                                        }`}>
                                          {hasEnough ? '✓ Sufficient' : `⚠️ Partial (${bank.unitsAvail}/${reqUnits})`}
                                        </span>
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleSendRequest(bank)}
                                        className="h-9 px-4 bg-[#f54e00] hover:bg-[#d04200] active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition uppercase tracking-wide flex items-center justify-center gap-1.5 shrink-0 leading-none"
                                      >
                                        <span className="text-xs leading-none select-none flex items-center">🩸</span>
                                        <span className="leading-none flex items-center">Send Order</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Proximity Map view */}
                      <div className={`${cCard} border p-6 rounded-xl shadow-sm space-y-4`}>
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium uppercase tracking-[0.65px]">Nearby Geographic Proximity Map</h4>
                          <button
                            onClick={() => setIsRequestMapExpanded(true)}
                            className="px-3 py-1.5 bg-slate-900/10 text-slate-700 rounded-xl hover:bg-slate-900/20 transition text-[10px] font-bold"
                          >
                            🖥️ Full Screen
                          </button>
                        </div>
                        <div className="h-[250px] w-full rounded-xl overflow-hidden border border-hairline relative">
                          {hospitalInfo && (
                            <MapView 
                              center={[hospitalInfo.lat, hospitalInfo.lng]} 
                              zoom={11} 
                              markers={[
                                { lat: hospitalInfo.lat, lng: hospitalInfo.lng, label: `🏨 ${hospitalInfo.name} (You)` },
                                ...matchedBanks.map(b => ({
                                  lat: b.lat,
                                  lng: b.lng,
                                  label: `🏥 ${b.name} (${b.unitsAvail || 0} units of ${reqBloodGroup}, ${b.distance != null ? Number(b.distance).toFixed(1) : '0.0'} km away)`
                                }))
                              ]}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* TAB 3: BLOOD BANK DIRECTORY */}
              {activeTab === 'directory' && (
                <div className="space-y-6">
                  {/* Comprehensive Filters Strip */}
                  <div className="bg-surface-card border border-hairline p-5 rounded-xl shadow-none space-y-4 text-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-hairline pb-4">
                      {/* Location Filter: Nearby vs All */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body font-bold uppercase tracking-wider font-sans text-[11px]">📍 Location:</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: 'nearby_25', label: 'Nearby (<25 km)' },
                            { id: 'nearby_50', label: 'Nearby (<50 km)' },
                            { id: 'nearby_100', label: 'Nearby (<100 km)' },
                            { id: 'all', label: 'All Pan-India' },
                          ].map(loc => (
                            <button
                              key={loc.id}
                              onClick={() => setDirLocationFilter(loc.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                dirLocationFilter === loc.id
                                  ? 'bg-[#f54e00] text-white shadow-none'
                                  : 'bg-canvas border border-hairline text-body hover:text-ink'
                              }`}
                            >
                              {loc.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stock Filter: Blood Available vs All */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body font-bold uppercase tracking-wider font-sans text-[11px]">🩸 Stock:</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: 'available', label: 'In-Stock Only' },
                            { id: 'all', label: 'All Centres' },
                          ].map(stk => (
                            <button
                              key={stk.id}
                              onClick={() => setDirStockFilter(stk.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                dirStockFilter === stk.id
                                  ? 'bg-[#26251e] text-white shadow-none'
                                  : 'bg-canvas border border-hairline text-body hover:text-ink'
                              }`}
                            >
                              {stk.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Filters: Specific Blood Group, State/District (if All Pan-India), Search & Sort */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {/* Blood Group Filter Pill */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Group Available</label>
                        <select
                          value={dirStockFilter}
                          onChange={e => setDirStockFilter(e.target.value)}
                          className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                        >
                          <option value="available">Any Blood Available</option>
                          <option value="all">All (Include 0 Stock)</option>
                          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                            <option key={bg} value={bg}>{bg} Available</option>
                          ))}
                        </select>
                      </div>

                      {/* State filter (if pan-india or specific) */}
                      {dirLocationFilter === 'all' ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">State / UT</label>
                            <select
                              value={dirState}
                              onChange={e => {
                                setDirState(e.target.value)
                                setDirDistrict('All')
                              }}
                              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                            >
                              {dirStatesList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">District</label>
                            <select
                              value={dirDistrict}
                              onChange={e => setDirDistrict(e.target.value)}
                              className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                            >
                              {dirDistrictsList.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Sort By</label>
                          <select
                            value={dirSortBy}
                            onChange={e => setDirSortBy(e.target.value)}
                            className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                          >
                            <option value="distance">Distance Proximity</option>
                            <option value="stock">Highest Stock Units</option>
                            <option value="name">Alphabetical Name</option>
                          </select>
                        </div>
                      )}

                      {/* Text Search */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Search Blood Centre</label>
                        <input
                          type="text"
                          placeholder="Search name, district, address..."
                          value={dirSearchQuery}
                          onChange={e => setDirSearchQuery(e.target.value)}
                          className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
                        />
                      </div>
                    </div>

                    {/* Results Counter Banner */}
                    <div className="flex justify-between items-center pt-2 text-[11px] text-body border-t border-hairline">
                      <span>
                        Showing <strong className="text-ink">{filteredDirectory.length}</strong> blood centres
                        {dirLocationFilter.startsWith('nearby_') ? ` within ${dirLocationFilter.replace('nearby_', '')} km of hospital` : ''}
                        {dirStockFilter === 'available' ? ' with available stock' : dirStockFilter !== 'all' ? ` with ${dirStockFilter} stock` : ''}.
                      </span>
                      {(dirSearchQuery || dirState !== 'All' || dirDistrict !== 'All' || dirStockFilter !== 'available' || dirLocationFilter !== 'nearby_50') && (
                        <button
                          onClick={() => {
                            setDirLocationFilter('nearby_50')
                            setDirStockFilter('available')
                            setDirState('All')
                            setDirDistrict('All')
                            setDirSearchQuery('')
                            setDirSortBy('distance')
                          }}
                          className="text-[#f54e00] font-bold hover:underline"
                        >
                          Reset Filters ↺
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Blood Bank Grid Layout */}
                  {filteredDirectory.length === 0 ? (
                    <div className="p-16 text-center text-muted bg-surface-card border border-hairline rounded-xl space-y-3">
                      <span className="text-4xl block">🔍</span>
                      <div className="text-base font-bold text-ink">No blood centres match your filters.</div>
                      <div className="text-xs text-body max-w-md mx-auto">
                        Try expanding your location radius or switching the stock filter to "All Centres".
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                      {filteredDirectory.map(bank => {
                        const isOnline = bank.id % 4 !== 0; // Simulated online status
                        const totalUnits = Object.values(bank.stockSummary || {}).reduce((x, y) => x + y, 0);
                        
                        return (
                          <div 
                            key={bank.id} 
                            className="bg-surface-card border border-hairline hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[260px] text-left cursor-pointer group" 
                            onClick={() => handleOpenBankDetail(bank)}
                          >
                            <div className="space-y-3">
                              {/* Header: Tags & Online Status / Star */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#f54e00] bg-[#f54e00]/10 border border-[#f54e00]/20 px-2 py-0.5 rounded-md font-mono">
                                    {bank.district}
                                  </span>
                                  <span className="text-[10px] font-semibold text-muted bg-canvas border border-hairline px-2 py-0.5 rounded-md">
                                    {bank.category || 'Govt.'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                    isOnline 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                    {isOnline ? 'Online' : 'Offline'}
                                  </span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleTogglePreferred(bank.id); }}
                                    className="p-1 rounded-lg text-xs bg-canvas border border-hairline hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title={bank.isPreferred ? "Remove favorite" : "Mark favorite"}
                                  >
                                    {bank.isPreferred ? '⭐' : '☆'}
                                  </button>
                                </div>
                              </div>

                              {/* Title & Address */}
                              <div>
                                <h4 className="text-sm font-bold text-ink truncate group-hover:text-[#f54e00] transition" title={bank.name}>
                                  {bank.name}
                                </h4>
                                <p className="text-[11px] text-muted truncate mt-0.5" title={bank.address}>
                                  {bank.address}
                                </p>
                              </div>

                              {/* Distance & ETA */}
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span className="font-bold text-[#f54e00]">📍 {bank.distance != null ? Number(bank.distance).toFixed(1) : '0.0'} km</span>
                                <span>•</span>
                                <span>⏱️ ~{bank.responseTime}</span>
                              </div>

                              {/* Stock Badges Rail */}
                              <div className="pt-2.5 border-t border-hairline">
                                <div className="flex justify-between items-center text-xs mb-1.5">
                                  <span className="text-[11px] text-muted font-medium">Available Stock</span>
                                  <span className="text-xs font-black font-mono text-ink">{totalUnits} Units</span>
                                </div>
                                <div className="flex flex-wrap gap-1 max-h-[52px] overflow-hidden">
                                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => {
                                    const cnt = bank.stockSummary?.[bg] || 0;
                                    if (cnt <= 0) return null;
                                    const isFiltered = dirStockFilter === bg;
                                    return (
                                      <span
                                        key={bg}
                                        className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md border transition ${
                                          isFiltered
                                            ? 'bg-[#f54e00] text-white border-[#f54e00]'
                                            : 'bg-canvas border-hairline text-ink'
                                        }`}
                                      >
                                        <span className="font-bold">{bg}</span>
                                        <span className={isFiltered ? 'text-white/80' : 'text-muted'}>({cnt})</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenBankDetail(bank); }}
                                className="flex-1 h-9 flex items-center justify-center bg-canvas hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-hairline font-bold text-xs rounded-xl uppercase tracking-wide transition leading-none text-center"
                              >
                                <span>View Details</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRequest(bank);
                                }}
                                className="flex-1 h-9 flex items-center justify-center bg-[#f54e00] hover:bg-[#d04200] active:scale-95 text-white font-bold text-xs rounded-xl uppercase tracking-wide transition shadow-sm hover:shadow leading-none text-center"
                              >
                                <span>Quick Order</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REQUEST HISTORY & TRACKING */}
              {activeTab === 'history' && (
                <div className={`${cCard} border rounded-xl shadow-sm p-6 space-y-6`}>
                  <div className={`flex justify-between items-center border-b ${cHairline} pb-4`}>
                    <span className="text-xs font-bold uppercase tracking-wider">Logistics Dispatch Log</span>
                  </div>

                  <div className={`divide-y ${cHairline}`}>
                    {requests.map(r => {
                      const isPending = r.status === 'pending'
                      const isRejected = r.status === 'rejected'
                      let statusStep = 1
                      if (r.status === 'accepted') statusStep = 2
                      if (r.status === 'fulfilled') statusStep = 4

                      return (
                        <div key={r.id} className="py-6 flex flex-col space-y-4 hover:bg-slate-50/10 transition px-3 rounded-xl text-left">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <div className="font-extrabold text-sm flex items-center space-x-2">
                                <span>Order from {r.blood_bank_name}</span>
                              </div>
                              <div className={`text-[10px] ${cBodyText} font-semibold mt-0.5`}>
                                Required: {r.units_needed} units of {r.blood_group} • Ordered: {new Date(r.created_at).toLocaleString()}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 text-[10px] font-bold tracking-[1.4px] uppercase">
                              <span className="inline-flex text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-xl border border-[#f54e00] text-[#f54e00]">
                                {r.status}
                              </span>
                              {isPending && (
                                <button
                                  onClick={() => setCancelModalItem(r)}
                                  className="px-2.5 py-1.5 border border-red-200 text-[#f54e00] rounded-xl transition hover:bg-[#f54e00]/10/50"
                                >
                                  Cancel Order
                                </button>
                              )}
                            </div>
                          </div>

                          {!isRejected && (
                            <div className="pt-2">
                              <div className={`flex items-center text-center text-[10px] font-bold ${cBodyText} uppercase tracking-wider relative`}>
                                <div className="absolute left-[12%] right-[12%] top-3 h-0.5 bg-slate-200 -z-0"></div>
                                <div 
                                  className="absolute left-[12%] top-3 h-0.5 bg-[#f54e00] -z-0 transition-all duration-500"
                                  style={{ width: statusStep === 1 ? '0%' : statusStep === 2 ? '38%' : '76%' }}
                                ></div>

                                <div className="flex-1 flex flex-col items-center z-10">
                                  <div className="h-6 w-6 rounded-xl flex items-center justify-center bg-[#f54e00] border border-[#f54e00] text-white font-bold text-xs">✓</div>
                                  <span className="mt-1 font-extrabold">Requested</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center z-10">
                                  <div className={`h-6 w-6 rounded-xl flex items-center justify-center border font-bold text-xs ${
                                    statusStep >= 2 ? 'bg-[#f54e00] border-[#f54e00] text-white' : 'bg-surface-card border border-hairline-[#e6e5e0] text-muted'
                                  }`}>{statusStep >= 2 ? '✓' : '2'}</div>
                                  <span className="mt-1 font-extrabold">Accepted</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center z-10">
                                  <div className={`h-6 w-6 rounded-xl flex items-center justify-center border font-bold text-xs ${
                                    statusStep >= 3 ? 'bg-[#f54e00] border-[#f54e00] text-white' : 'bg-surface-card border border-hairline-[#e6e5e0] text-muted'
                                  }`}>{statusStep >= 3 ? '✓' : '3'}</div>
                                  <span className="mt-1 font-extrabold">Dispatched</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center z-10">
                                  <div className={`h-6 w-6 rounded-xl flex items-center justify-center border font-bold text-xs ${
                                    statusStep >= 4 ? 'bg-[#f54e00] border-[#f54e00] text-white' : 'bg-surface-card border border-hairline-[#e6e5e0] text-muted'
                                  }`}>{statusStep >= 4 ? '✓' : '4'}</div>
                                  <span className="mt-1 font-extrabold">Delivered</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: EMERGENCY / SOS REQUEST */}
              {activeTab === 'sos' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className={`${cCard} border p-6 rounded-xl shadow-sm space-y-6 lg:col-span-5 text-left`}>
                    <h3 className="text-xl font-medium tracking-tight">Transmit Emergency SOS Broadcast</h3>
                    {!sosSent ? (
                      <form onSubmit={handleSendSos} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted">Emergency Blood Group</label>
                          <select
                            value={sosBloodGroup}
                            onChange={e => setSosBloodGroup(e.target.value)}
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-canvas-soft border-hairline text-ink' : 'bg-surface-card border-hairline text-ink'
                            }`}
                          >
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted">Emergency Units Needed</label>
                          <input
                            type="number"
                            min="1"
                            value={sosUnits}
                            onChange={e => setSosUnits(e.target.value)}
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-canvas-soft border-hairline text-ink' : 'bg-surface-card border-hairline text-ink'
                            }`}
                            required
                          />
                        </div>

                        <CustomButton type="submit" className="w-full py-4 animate-pulse">
                          🚨 Send SOS Alert
                        </CustomButton>
                      </form>
                    ) : (
                      <div className="space-y-6 text-center py-6">
                        <div className="inline-flex h-16 w-16 items-center justify-center bg-[#f54e00]/10 text-[#f54e00] text-3xl rounded-xl animate-ping">🚨</div>
                        <h4 className="text-base font-extrabold">SOS Transmission Active</h4>
                        <CustomButton
                          onClick={() => setSosSent(false)}
                          className="px-4 py-2"
                        >
                          Revoke SOS
                        </CustomButton>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: NOTIFICATIONS / ALERTS CENTER */}
              {activeTab === 'notifications' && (
                <div className={`${cCard} border rounded-2xl shadow-none overflow-hidden space-y-0 text-left font-sans`}>
                  <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Clinical Alerts Center</span>
                      <span className="text-[10px] bg-[#f54e00] text-white font-black px-2 py-0.5 rounded-full">
                        {unreadNotifCount} Unread
                      </span>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] font-bold text-slate-300 hover:text-white underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className={`divide-y ${cHairline} overflow-y-auto max-h-[600px]`}>
                    {notifications.length === 0 ? (
                      <div className="p-16 text-center text-muted space-y-2">
                        <span className="text-3xl block">🔔</span>
                        <div className="text-sm font-bold text-slate-700">All alerts clear</div>
                        <div className="text-xs text-muted">No pending blood orders or delivery notices.</div>
                      </div>
                    ) : (
                      notifications.map(notif => {
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
                              const reqId = notif.metadata?.requestId || (notif.type?.includes('request') || notif.type?.includes('response') ? 'br-1' : null)
                              if (reqId) {
                                setSelectedNotifReqId(reqId)
                                setSelectedNotifReqObj(notif.metadata || null)
                                setIsNotifModalOpen(true)
                              }
                            }}
                            className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/10 cursor-pointer transition group ${
                              !notif.read_flag ? 'bg-rose-50/20 border-l-4 border-[#f54e00]' : ''
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
                                  {notif.type?.replace('_', ' ')}
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
                                <span>👉</span> Open Requisition Details
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: SETTINGS / PROFILE VIEW */}
              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  <div className={`${cCard} border p-6 rounded-xl shadow-sm space-y-6 lg:col-span-7`}>
                    <div className={`flex justify-between items-center border-b ${cHairline} pb-4`}>
                      <h3 className="text-lg font-bold">Hospital Profile Information</h3>
                      <button
                        onClick={() => setEditMode(!editMode)}
                        className="px-4 py-2 bg-[#f54e00] text-white text-xs font-bold rounded-xl"
                      >
                        {editMode ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <input
                        type="text"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        disabled={!editMode}
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-75 focus:outline-none ${
                          isDarkMode ? 'bg-canvas-soft border-hairline text-ink' : 'bg-surface-card border-hairline text-ink'
                        }`}
                        required
                      />
                      <input
                        type="text"
                        value={profileAddress}
                        onChange={e => setProfileAddress(e.target.value)}
                        disabled={!editMode}
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-75 focus:outline-none ${
                          isDarkMode ? 'bg-canvas-soft border-hairline text-ink' : 'bg-surface-card border-hairline text-ink'
                        }`}
                        required
                      />
                      {editMode && (
                        <CustomButton type="submit" className="px-5 py-2.5">Save</CustomButton>
                      )}
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* Global Quick Action Modal from Notification */}
      <RequestQuickModal
        requestId={selectedNotifReqId}
        initialRequest={selectedNotifReqObj}
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onStatusUpdated={() => loadHospitalData()}
        currentUserRole="hospital"
      />
    </div>
  )
}
