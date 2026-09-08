import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { dataApi } from '../utils/api'
import Sidebar from '../components/Sidebar'
import CompatibilityBadge from '../components/crossmatch/CompatibilityBadge'

export default function Donor(){
  const { user, logout, isDarkMode, setIsDarkMode } = useAuth()
  const [donorInfo, setDonorInfo] = useState(null)
  
  // Split lists
  const [bankReqs, setBankReqs] = useState([])
  const [hospReqs, setHospReqs] = useState([])
  
  // Query form states
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  
  const [msg, setMsg] = useState(null)

  // Layout and sub-tab states
  const [activeTab, setActiveTab] = useState('requests') // 'requests', 'raise', 'profile'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [requestType, setRequestType] = useState('blood_bank') // 'blood_bank' or 'hospital'

  const reloadData = async () => {
    try {
      if (!user) return
      const profile = await dataApi.getDonorProfile(user)
      if (profile) {
        setDonorInfo(profile)
        
        // Fetch separate lists
        const lists = await dataApi.getDonorRequests(profile.id)
        setBankReqs(lists.bankRequests || [])
        setHospReqs(lists.hospitalRequests || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    reloadData()
  }, [user])

  const handleToggleAvailability = async (e) => {
    const checked = e.target.checked
    try {
      await dataApi.toggleDonorAvailability(donorInfo.id, checked)
      setMsg({ text: `Volunteer availability flag updated: ${checked ? 'ONLINE' : 'OFFLINE'}`, type: 'success' })
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRespond = async (offerId, status) => {
    try {
      await dataApi.respondToOffer(offerId, status)
      setMsg({ text: `Request successfully marked as ${status.toUpperCase()}. Requester notified.`, type: 'success' })
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleCreateQuery = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      alert('Please fill out all fields.')
    }
    try {
      await dataApi.createQuery(user.id, subject, message)
      setMsg({ text: 'Inquiry ticket created. Admin notified.', type: 'success' })
      setSubject('')
      setMessage('')
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden font-sans">
      
      {/* Standardized Left Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        unreadNotifCount={0}
        user={user}
        handleLogout={logout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative transition-colors bg-canvas">
        
        {/* Header Bar */}
        <header className="border-b px-8 py-5 flex justify-between items-center bg-surface-card border-hairline shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-bold uppercase tracking-wider">
              {activeTab === 'requests' ? 'Compatible Donation Requests' : activeTab === 'raise' ? 'Inquiry Desk' : 'Profile Settings'}
            </h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="h-8.5 w-8.5 bg-[#f54e00] text-white font-bold text-xs rounded-xl flex items-center justify-center">
                {donorInfo?.blood_group || 'O+'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-ink">{donorInfo?.name || 'Active Volunteer'}</span>
                <span className="text-[10px] text-body">{donorInfo?.district || 'New Delhi'}, {donorInfo?.state || 'Delhi'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative text-left">
          
          {/* Global message banner */}
          {msg && (
            <div className={`mb-6 p-4 border rounded-xl text-xs font-semibold text-left max-w-2xl flex items-center space-x-2 ${
              msg.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{msg.text}</span>
            </div>
          )}

          {/* TAB 1: INCOMING COMPATIBLE REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-3xl gap-4">
                <div className="text-left space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                    <span>Compatible Donation Requests</span>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      Matched for {donorInfo?.blood_group || 'O+'}
                    </span>
                  </h2>
                  <p className="text-xs text-body">
                    Hospital clinics and blood banks that matched your <strong>{donorInfo?.blood_group || 'O+'}</strong> blood group using the clinical cross-match system.
                  </p>
                </div>

                {/* Switcher/Toggle Button for Blood Bank and Hospital requests */}
                <div className="bg-surface-card border border-hairline p-1 rounded-xl flex space-x-1 shrink-0">
                  <button 
                    onClick={() => setRequestType('blood_bank')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      requestType === 'blood_bank' 
                        ? 'bg-[#f54e00] text-white' 
                        : 'text-body hover:text-ink'
                    }`}
                  >
                    Blood Banks ({bankReqs.length})
                  </button>
                  <button 
                    onClick={() => setRequestType('hospital')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      requestType === 'hospital' 
                        ? 'bg-[#f54e00] text-white' 
                        : 'text-body hover:text-ink'
                    }`}
                  >
                    Hospitals ({hospReqs.length})
                  </button>
                </div>
              </div>

              {/* Dynamic Invites Registry */}
              <div className="bg-surface-card border border-hairline rounded-xl overflow-hidden max-w-3xl">
                <div className="px-6 py-4 border-b border-hairline/60 bg-canvas text-left flex justify-between items-center">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    {requestType === 'blood_bank' ? 'Invites from Blood Storage Banks' : 'Direct Clinic Appeals from Hospitals'}
                  </span>
                  <span className="text-[10px] text-muted">
                    Clinical Cross-Match Verified
                  </span>
                </div>

                <div className="divide-y divide-hairline/60">
                  {requestType === 'blood_bank' ? (
                    bankReqs.length === 0 ? (
                      <div className="p-12 text-center text-body text-xs font-medium">
                        No invitations found from blood banks.
                      </div>
                    ) : (
                      bankReqs.map(offer => (
                        <InviteRow key={offer.id} offer={offer} donorBloodGroup={donorInfo?.blood_group} handleRespond={handleRespond} />
                      ))
                    )
                  ) : (
                    hospReqs.length === 0 ? (
                      <div className="p-12 text-center text-body text-xs font-medium">
                        No clinic invitations found from hospitals.
                      </div>
                    ) : (
                      hospReqs.map(offer => (
                        <InviteRow key={offer.id} offer={offer} donorBloodGroup={donorInfo?.blood_group} handleRespond={handleRespond} />
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPORT TICKETS */}
          {activeTab === 'raise' && (
            <div className="space-y-6 max-w-2xl text-left">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink">Support Coordination Ticket</h2>
                <p className="text-xs text-body mt-0.5">Submit questions regarding schedules, center routing, or report issues directly to network admins.</p>
              </div>

              <div className="bg-surface-card border border-hairline rounded-2xl p-8">
                <form onSubmit={handleCreateQuery} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-body">Inquiry Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Schedule delay, update blood details" 
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full bg-canvas border border-hairline rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-body">Detailed Message</label>
                    <textarea 
                      placeholder="Provide all context regarding logistics feedback or coordinates mapping concerns..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      className="w-full bg-canvas border border-hairline rounded-lg p-4 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition h-32"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold text-xs rounded-lg uppercase tracking-wider transition"
                  >
                    Submit Support inquiry
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: DONOR PROFILE & AVAILABILITY */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl text-left">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink">Donor Profile & Volunteer Status</h2>
                <p className="text-xs text-body mt-0.5">Control your availability to be matched in emergency and routine hospital cross-match searches.</p>
              </div>

              <div className="bg-surface-card border border-hairline rounded-2xl p-8 space-y-6">
                <div className="flex justify-between items-center border-b border-hairline pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Volunteer Availability Broadcast</h3>
                    <p className="text-xs text-body">When active, verified clinics within your radius can match and send emergency appeals.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={donorInfo?.available_flag || false}
                      onChange={handleToggleAvailability}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 border border-hairline rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body block">Blood Group</span>
                    <strong className="text-base font-black text-[#f54e00] block mt-1">
                      {donorInfo?.blood_group || 'O+'}
                    </strong>
                  </div>

                  <div className="p-4 border border-hairline rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body block">Last Donation Date</span>
                    <strong className="text-sm font-bold text-ink block mt-2">
                      {donorInfo?.last_donation_date ? new Date(donorInfo.last_donation_date).toLocaleDateString() : 'Eligible to Donate'}
                    </strong>
                  </div>

                  <div className="p-4 border border-hairline rounded-xl col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body block">Geographic Proximity & Region</span>
                    <strong className="text-xs font-bold text-ink block mt-1">
                      {donorInfo?.district || 'New Delhi'}, {donorInfo?.state || 'Delhi'} ({donorInfo?.address || 'City Center'})
                    </strong>
                    <span className="text-[10px] text-body mt-1 block">Used by PostGIS cross-match service to compute distance to recipient hospitals.</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

function InviteRow({ offer, donorBloodGroup, handleRespond }) {
  const isPending = offer.status === 'pending'
  const isExact = donorBloodGroup === offer.blood_group || !offer.blood_group;

  return (
    <div className="p-5 flex justify-between items-center hover:bg-canvas transition text-left">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink text-sm">{offer.target_name || offer.from || 'Regional Facility'}</span>
          <CompatibilityBadge matchType={isExact ? 'exact_match' : 'compatible_alternative'} />
        </div>
        <div className="text-xs text-body font-semibold">{offer.address || 'Medical Health Hub'}</div>
        <div className="text-[10px] text-muted flex items-center gap-3">
          <span>📅 {new Date(offer.created_at || Date.now()).toLocaleDateString()}</span>
          <span>•</span>
          <span className="font-bold text-emerald-700">🔬 Matched with your {donorBloodGroup || 'O+'} donor profile</span>
        </div>
      </div>

      <div className="text-right flex flex-col items-end space-y-2 shrink-0">
        <span className={`inline-flex text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
          offer.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          offer.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {offer.status}
        </span>

        {isPending && (
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => handleRespond(offer.id, 'accepted')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg uppercase transition"
            >
              Accept
            </button>
            <button
              onClick={() => handleRespond(offer.id, 'declined')}
              className="px-3 py-1.5 bg-canvas border border-hairline hover:bg-slate-100 text-body font-extrabold text-[10px] rounded-lg uppercase transition"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
