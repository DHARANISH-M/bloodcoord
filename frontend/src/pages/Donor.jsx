import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { mockApi } from '../utils/mockDb'
import Sidebar from '../components/Sidebar'

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

  const reloadData = () => {
    try {
      const donors = JSON.parse(localStorage.getItem('blood_donors') || '[]')
      const profile = donors.find(d => d.id === user.profileId || d.user_id === user.id)
      if (profile) {
        setDonorInfo(profile)
        
        // Fetch separate lists
        const lists = mockApi.getDonorRequests(profile.id)
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

  const handleToggleAvailability = (e) => {
    const checked = e.target.checked
    try {
      mockApi.toggleDonorAvailability(donorInfo.id, checked)
      setMsg({ text: `Volunteer availability flag updated: ${checked ? 'ONLINE' : 'OFFLINE'}`, type: 'success' })
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRespond = (offerId, status) => {
    try {
      mockApi.respondToOffer(offerId, status)
      setMsg({ text: `Request successfully marked as ${status.toUpperCase()}. Requester notified.`, type: 'success' })
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleCreateQuery = (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      alert('Please fill out all fields.')
      return
    }

    try {
      mockApi.createQuery(user.id, subject, message)
      setMsg({ text: 'Inquiry ticket created. Admin notified.', type: 'success' })
      setSubject('')
      setMessage('')
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden font-sans">
      
      {/* Standarized Left Navigation Sidebar */}
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
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-hairline bg-surface-card flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-ink uppercase">
              {activeTab === 'requests' ? 'Incoming Invites' :
               activeTab === 'raise' ? 'Support Inquiry' :
               'My Availability'}
            </h1>
            <span className="text-xs text-[#e6e5e0]">|</span>
            <span className="text-xs font-semibold text-body tracking-wider uppercase">
              Volunteer Donor Console
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-bold text-ink">{donorInfo ? donorInfo.name : 'Volunteer Donor'}</div>
              <div className="text-[10px] text-body font-semibold uppercase tracking-wider">
                Blood Group: <span className="text-[#f54e00] font-bold">{donorInfo?.blood_group || 'O-'}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#f54e00]/10 flex items-center justify-center font-bold text-[#f54e00] text-sm border border-[#f54e00]/25">
              {(donorInfo?.name || 'V').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          
          {/* Global message banner */}
          {msg && (
            <div className={`mb-6 p-4 border rounded-xl text-xs font-semibold text-left max-w-2xl flex items-center space-x-2 ${
              msg.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              <span>{msg.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{msg.text}</span>
            </div>
          )}

          {/* TAB 1: INCOMING REQUESTS WITH TOGGLE BAR */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center max-w-3xl">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-ink">Donation Invites</h2>
                  <p className="text-xs text-body mt-0.5">Filter and respond to incoming requests from local coordinate facilities.</p>
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
                <div className="px-6 py-4 border-b border-hairline/60 bg-canvas-soft text-left">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    {requestType === 'blood_bank' ? 'Invites from Blood Storage Banks' : 'Invites from Hospital Clinics'}
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
                        <InviteRow key={offer.id} offer={offer} handleRespond={handleRespond} />
                      ))
                    )
                  ) : (
                    hospReqs.length === 0 ? (
                      <div className="p-12 text-center text-body text-xs font-medium">
                        No clinic invitations found from hospitals.
                      </div>
                    ) : (
                      hospReqs.map(offer => (
                        <InviteRow key={offer.id} offer={offer} handleRespond={handleRespond} />
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPORT TICKETS (SEPARATE OPTION) */}
          {activeTab === 'raise' && (
            <div className="space-y-6 max-w-2xl">
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
                      className="w-full bg-canvas-soft border border-hairline rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-body">Detailed Message</label>
                    <textarea 
                      placeholder="Provide all context regarding logistics feedback or coordinates mapping concerns..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      className="w-full bg-canvas-soft border border-hairline rounded-lg p-4 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition h-32"
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

          {/* TAB 3: AVAILABILITY & SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink">My Status & Settings</h2>
                <p className="text-xs text-body mt-0.5">Manage your active volunteer flag and examine geographical coordinates details.</p>
              </div>

              <div className="bg-surface-card border border-hairline rounded-2xl p-6 space-y-6">
                
                {/* Custom Heart Availability Switch */}
                <div className="flex justify-between items-center p-4 bg-canvas-soft border border-hairline rounded-xl">
                  <div className="text-left space-y-0.5">
                    <div className="text-sm font-bold text-ink">Volunteer Availability Flag</div>
                    <div className="text-[11px] text-body">When active, hospitals and blood banks can see you in proximity list invites.</div>
                  </div>
                  
                  {/* Scoped Heart Switch Toggle */}
                  <div className="love-heart-switch-wrapper shrink-0 mr-2">
                    <div className="love">
                      <input 
                        id="switch-heart" 
                        type="checkbox" 
                        checked={donorInfo?.available_flag || false} 
                        onChange={handleToggleAvailability}
                      />
                      <label className="love-heart" htmlFor="switch-heart">
                        <i className="left" />
                        <i className="right" />
                        <i className="bottom" />
                        <div className="round" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 border border-hairline rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body block">Blood Group</span>
                    <strong className="text-xl font-bold text-[#f54e00] block mt-1">{donorInfo?.blood_group || 'O-'}</strong>
                  </div>

                  <div className="p-4 border border-hairline rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body block">Last Donation Date</span>
                    <strong className="text-sm font-bold text-ink block mt-2">
                      {donorInfo?.last_donation_date ? new Date(donorInfo.last_donation_date).toLocaleDateString() : 'None Recorded'}
                    </strong>
                  </div>

                  <div className="p-4 border border-hairline rounded-xl col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body block">Geographic Proximity GPS</span>
                    <strong className="text-xs font-mono font-bold text-ink block mt-1">
                      Lat: {donorInfo?.lat || '40.7588'}, Lng: {donorInfo?.lng || '-73.9851'}
                    </strong>
                    <span className="text-[10px] text-body mt-1 block">Used to calculate nearness metrics to dispatch centers.</span>
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

function InviteRow({ offer, handleRespond }) {
  const isPending = offer.status === 'pending'
  return (
    <div className="p-5 flex justify-between items-center hover:bg-canvas-soft transition text-left">
      <div className="space-y-1">
        <div className="font-bold text-ink text-base">{offer.target_name}</div>
        <div className="text-xs text-body font-semibold">{offer.address || 'Broadway Center, New York, NY'}</div>
        <div className="text-[9px] text-body font-mono">
          Dispatched: {new Date(offer.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="text-right flex flex-col items-end space-y-2">
        <span className={`inline-flex text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
          offer.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-800' :
          offer.status === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
          'bg-red-50 border-red-100 text-red-800'
        }`}>
          {offer.status}
        </span>

        {isPending && (
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => handleRespond(offer.id, 'accepted')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded uppercase transition"
            >
              Accept
            </button>
            <button
              onClick={() => handleRespond(offer.id, 'declined')}
              className="px-2.5 py-1 bg-canvas-soft border border-hairline hover:bg-slate-100 text-body font-extrabold text-[9px] rounded uppercase transition"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
