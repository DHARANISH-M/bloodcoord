import React from 'react'

export default function Sidebar({
  activeTab,
  setActiveTab,
  sidebarCollapsed,
  setSidebarCollapsed,
  unreadNotifCount,
  user,
  handleLogout,
  isDarkMode,
  setIsDarkMode
}) {
    const getNavItems = () => {
    const role = user?.role
    if (role === 'hospital') {
      return [
        { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
        { id: 'request_blood', label: 'Request Blood', emoji: '🩸' },
        { id: 'directory', label: 'Blood Banks', emoji: '🏦' },
        { id: 'history', label: 'Request History', emoji: '📋' },
        { id: 'sos', label: 'Emergency / SOS', emoji: '🚨' },
        { id: 'notifications', label: 'Alerts Center', emoji: '🔔', badge: unreadNotifCount },
        { id: 'profile', label: 'Settings & Profile', emoji: '👤' }
      ]
    }
    if (role === 'blood_bank') {
      return [
        { id: 'dashboard', label: 'Inventory', emoji: '📊' },
        { id: 'requests', label: 'Hospital Requests', emoji: '📥' },
        { id: 'donors', label: 'Donor Invites', emoji: '👥' },
        { id: 'notifications', label: 'Alerts Center', emoji: '🔔', badge: unreadNotifCount }
      ]
    }
    if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', emoji: '📊' }
      ]
    }
    if (role === 'donor') {
      return [
        { id: 'requests', label: 'Incoming Invites', emoji: '✉️' },
        { id: 'raise', label: 'Support Tickets', emoji: '📝' },
        { id: 'profile', label: 'My Availability', emoji: '⚙️' }
      ]
    }
    return []
  }

  const navItems = getNavItems()

  return (
    <aside className={`bg-canvas-soft text-ink border-r border-hairline flex flex-col justify-between transition-all duration-300 shrink-0 ${
      sidebarCollapsed ? 'w-20' : 'w-60'
    }`}>
      {/* Brand Header */}
      <div className="p-5 border-b border-hairline/40 flex justify-between items-center overflow-hidden">
        <div className="flex items-center space-x-3">
          <span className="h-8 w-8 bg-[#f54e00]/10 text-[#f54e00] rounded-xl flex items-center justify-center text-lg font-bold animate-pulse">
            🩸
          </span>
          {!sidebarCollapsed && (
            <span className="text-base font-bold tracking-tight text-ink uppercase">
              Blood<span className="text-[#f54e00]">PBD</span>
            </span>
          )}
        </div>
        
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1 hover:bg-[#f54e00]/10 rounded-xl text-body hover:text-ink transition hidden md:block"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto font-medium tracking-[0.65px] uppercase text-[11px]">
        {navItems.map(item => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition font-bold ${
                isActive 
                  ? 'bg-[#f54e00] text-white shadow-none' 
                  : 'text-body hover:bg-[#f54e00]/10 hover:text-ink'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-5 flex justify-center text-base">{item.emoji}</div>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </div>
              {item.badge !== undefined && item.badge > 0 && !sidebarCollapsed && (
                <span className="bg-[#f54e00] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Profile card */}
      <div className="px-4 py-3 border-t border-hairline/40 space-y-4">
        <div className="flex items-center space-x-3 overflow-hidden text-left">
          <div className="h-9 w-9 bg-[#f54e00] text-white rounded-xl flex items-center justify-center font-bold text-xs uppercase border border-hairline">
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-bold text-ink truncate">{user?.name || 'User'}</span>
              <span className="text-[9px] text-[#f54e00] font-bold uppercase tracking-wider flex items-center">
                <span className="h-1.5 w-1.5 bg-emerald-500 inline-block mr-1"></span>
                Active
              </span>
            </div>
          )}
        </div>

        {/* Light/Dark Toggle widget */}
        <div className="bg-canvas border border-hairline p-1 rounded-xl flex space-x-1 text-[9px] font-bold uppercase">
          <button
            onClick={() => setIsDarkMode(false)}
            className={`flex-1 py-1.5 rounded-xl transition text-center ${!isDarkMode ? 'bg-[#f54e00] text-white' : 'text-body hover:text-ink'}`}
          >
            Light
          </button>
          <button
            onClick={() => setIsDarkMode(true)}
            className={`flex-1 py-1.5 rounded-xl transition text-center ${isDarkMode ? 'bg-[#f54e00] text-white' : 'text-body hover:text-ink'}`}
          >
            Dark
          </button>
        </div>

        {/* Global Log Out Action Button */}
        <button
          onClick={handleLogout}
          className="w-full py-2 bg-surface-card border border-hairline hover:bg-red-50 hover:text-[#f54e00] text-body rounded-xl flex items-center justify-center space-x-2 transition font-bold text-[9.5px] uppercase tracking-wider"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!sidebarCollapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}
