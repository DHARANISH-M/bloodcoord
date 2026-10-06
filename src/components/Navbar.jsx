import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dataApi } from '../utils/api'
import RequestQuickModal from './notifications/RequestQuickModal'

export default function Navbar(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [selectedReqId, setSelectedReqId] = useState(null)
  const [selectedReqObj, setSelectedReqObj] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Load and subscribe to notifications
  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      try {
        const list = await dataApi.getNotifications(user.id)
        setNotifications(list || [])
      } catch (e) {
        console.error(e)
      }
    }
    fetchNotifs()

    const handleNewNotif = () => {
      fetchNotifs()
    }
    window.addEventListener('new_notification', handleNewNotif)
    
    // Close dropdown on click outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('new_notification', handleNewNotif)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user])

  const unreadCount = notifications.filter(n => !n.read_flag).length

  const handleMarkRead = async (id) => {
    await dataApi.markNotificationRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_flag: true } : n))
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await dataApi.markAllNotificationsRead(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, read_flag: true })))
  }

  const handleNotificationClick = (notif) => {
    handleMarkRead(notif.id)
    const reqId = notif.metadata?.requestId || null
    if (reqId) {
      setSelectedReqId(reqId)
      setSelectedReqObj(notif.metadata || null)
      setIsModalOpen(true)
      setShowNotifDropdown(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Get matching path for user dashboard
  const getDashboardPath = () => {
    if (!user) return '/dashboard'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'blood_bank') return '/bloodbank'
    if (user.role === 'hospital') return '/hospital'
    if (user.role === 'donor') return '/donor'
    return '/dashboard'
  }

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-surface-card/80 border-b border-hairline shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-2 text-[#f54e00] hover:text-[#d04200] transition">
            <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="text-xl font-extrabold tracking-tight text-slate-800">
              Blood<span className="text-[#f54e00]">Coord</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link to="/dashboard" className="text-sm font-semibold text-body hover:text-[#f54e00] transition">
              Availability
            </Link>
            
            {user && (
              <Link to={getDashboardPath()} className="text-sm font-semibold text-body hover:text-[#f54e00] transition">
                My Panel
              </Link>
            )}

            {!user ? (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-medium text-body hover:text-[#f54e00] transition px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  Log In
                </Link>
                <Link to="/register" className="text-sm font-semibold text-white bg-[#f54e00] hover:bg-[#d04200] transition px-4 py-2 rounded-xl shadow-sm hover:shadow">
                  Join Network
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="p-2 text-muted hover:text-[#f54e00] hover:bg-slate-50 rounded-xl transition relative"
                    aria-label="Notifications"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 block h-5 w-5 rounded-full ring-2 ring-white bg-[#f54e00] text-[10px] font-bold text-white text-center leading-5 animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Professional Notifications Dropdown */}
                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-3 w-96 bg-surface-card border border-hairline rounded-2xl shadow-2xl z-50 overflow-hidden text-left font-sans animate-scaleUp">
                      <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider">Clinical Alerts Center</span>
                          <span className="text-[10px] bg-[#f54e00] text-white font-black px-2 py-0.5 rounded-full">
                            {unreadCount} New
                          </span>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-bold text-slate-300 hover:text-white underline transition"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto divide-y divide-hairline">
                        {notifications.length === 0 ? (
                          <div className="px-6 py-10 text-center text-muted space-y-2">
                            <span className="text-3xl block">🔔</span>
                            <div className="text-xs font-bold text-slate-700">All alerts clear</div>
                            <div className="text-[10px] text-muted">No pending requisitions or emergency notices.</div>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isEmergency = notif.type === 'emergency_request' || notif.metadata?.urgency === 'emergency'
                            const isUpdate = notif.type === 'request_response'
                            const bg = notif.metadata?.bloodGroup

                            return (
                              <div 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 hover:bg-slate-50 cursor-pointer transition flex flex-col space-y-2 text-left group ${
                                  !notif.read_flag ? 'bg-rose-50/40 border-l-4 border-[#f54e00]' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                      isEmergency 
                                        ? 'bg-rose-100 text-rose-800 font-bold' 
                                        : isUpdate 
                                        ? 'bg-emerald-100 text-emerald-800 font-bold' 
                                        : notif.type === 'expiry_alert'
                                        ? 'bg-amber-100 text-amber-800 font-bold'
                                        : 'bg-blue-100 text-blue-800 font-bold'
                                    }`}>
                                      {notif.type?.replace('_', ' ')}
                                    </span>
                                    {bg && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono">
                                        {bg} • {notif.metadata?.unitsNeeded || 1}U
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted font-mono shrink-0">
                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="text-xs font-bold text-slate-900 group-hover:text-[#d04200] transition">
                                  {notif.title || notif.message}
                                </div>

                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${!notif.read_flag ? 'text-slate-700 font-medium' : 'text-muted'}`}>
                                  {notif.message}
                                </p>

                                <div className="pt-1 flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-[#f54e00] flex items-center gap-1 group-hover:underline">
                                    <span>👉</span> Click to review & manage order
                                  </span>
                                  {!notif.read_flag && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleMarkRead(notif.id)
                                      }}
                                      className="text-muted hover:text-slate-900 text-[10px]"
                                      title="Mark read"
                                    >
                                      ✓
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Bio and Role Badge */}
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">{user.name || user.role}</span>
                  <span className={`text-[10px] uppercase font-semibold tracking-wider ${
                    user.role === 'admin' ? 'text-violet-600' :
                    user.role === 'blood_bank' ? 'text-[#f54e00]' :
                    user.role === 'hospital' ? 'text-blue-600' : 'text-teal-600'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-body hover:text-slate-800 hover:bg-slate-100 border border-hairline transition px-3.5 py-1.5 rounded-xl"
                >
                  Log Out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Global Quick Action Modal */}
      <RequestQuickModal
        requestId={selectedReqId}
        initialRequest={selectedReqObj}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserRole={user?.role || 'hospital'}
      />
    </>
  )
}
