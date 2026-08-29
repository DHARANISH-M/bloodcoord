import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mockApi } from '../utils/mockDb'

export default function Navbar(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Load and subscribe to notifications
  useEffect(() => {
    if (!user) return
    const fetchNotifs = () => {
      const list = mockApi.getNotifications(user.id)
      setNotifications(list)
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

  const handleMarkRead = (id) => {
    mockApi.markNotificationRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_flag: true } : n))
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

                {/* Notifications Dropdown */}
                {showNotifDropdown && (
                  <div className="absolute right-0 mt-3 w-80 bg-surface-card border border-hairline border-hairline rounded-2xl shadow-none z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-hairline flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alert Center</span>
                      <span className="text-[10px] bg-[#f54e00]/10 text-[#d04200] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} Unread
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-hairline">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-muted text-xs">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleMarkRead(notif.id)}
                            className={`p-3.5 hover:bg-slate-50 cursor-pointer transition flex flex-col space-y-1 text-left ${!notif.read_flag ? 'bg-[#f54e00]/15' : ''}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                notif.type === 'expiry_alert' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : notif.type === 'emergency_request' 
                                  ? 'bg-[#f54e00]/10 text-[#d04200]' 
                                  : 'bg-teal-100 text-teal-800'
                              }`}>
                                {notif.type.replace('_', ' ')}
                              </span>
                              <span className="text-[9px] text-muted">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className={`text-xs leading-relaxed ${!notif.read_flag ? 'font-semibold text-slate-800' : 'text-muted'}`}>
                              {notif.message}
                            </p>
                            {notif.sent_via && (
                              <div className="flex space-x-1 items-center mt-1">
                                <span className="text-[9px] text-muted">Channels:</span>
                                {notif.sent_via.map((via) => (
                                  <span key={via} className="text-[8px] bg-slate-100 text-body px-1 rounded">
                                    {via}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
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
  )
}
