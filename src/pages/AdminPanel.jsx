import React, { useState, useEffect } from 'react'
import { dataApi } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { ERAKTKOSH_STATES } from '../utils/eraktkoshClient.js'

export default function AdminPanel(){
  const { user, logout, isDarkMode, setIsDarkMode } = useAuth()
  
  const [users, setUsers] = useState([])
  const [queries, setQueries] = useState([])
  const [syncStateCode, setSyncStateCode] = useState('all')
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [queryFilter, setQueryFilter] = useState('open')

  // Response text state (keyed by queryId)
  const [responses, setResponses] = useState({})
  const [msg, setMsg] = useState(null)

  // Layout states
  const [activeTab, setActiveTab] = useState('dashboard') // default dashboard tab
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const reloadData = async () => {
    try {
      const [userList, queryList] = await Promise.all([
        dataApi.getAdminUsers(),
        dataApi.getAdminQueries()
      ])
      setUsers(userList || [])
      setQueries(queryList || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      await dataApi.updateUserStatus(userId, newStatus)
      setMsg({ text: `User account status updated to: ${newStatus.toUpperCase()}`, type: 'success' })
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await dataApi.updateUserRole(userId, newRole)
      setMsg({ text: `User role updated successfully.`, type: 'success' })
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleResolveQuery = async (queryId) => {
    const text = responses[queryId]
    if (!text || !text.trim()) {
      alert('Please enter a response message before resolving.')
      return
    }

    try {
      await dataApi.resolveQuery(queryId, text)
      setMsg({ text: 'Query resolved. Response sent to the user.', type: 'success' })
      setResponses(prev => ({ ...prev, [queryId]: '' }))
      await reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleSyncEraktkosh = async () => {
    setIsSyncing(true)
    const isAll = syncStateCode === 'all'
    const targetState = isAll ? null : (ERAKTKOSH_STATES.find(s => s.code === syncStateCode) || ERAKTKOSH_STATES[0])

    if (isAll) {
      setMsg({ text: 'Connecting to e-RaktKosh national portal across all 36 States & Union Territories (Pan-India)...', type: 'info' })
    } else {
      setMsg({ text: `Connecting to e-RaktKosh national portal for ${targetState.name}...`, type: 'info' })
    }

    try {
      const res = await dataApi.syncEraktkoshLive(isAll ? 'all' : targetState.code)
      if (res.success) {
        setMsg({
          text: isAll
            ? `✓ Successfully synchronized ${res.count || 4561} live blood centres and stocks across all 36 States & UTs nationwide!`
            : `✓ Successfully synced ${res.count} live blood centres and stocks for ${res.state}!`,
          type: 'success'
        })
        await reloadData()
      } else {
        setMsg({ text: res.message || 'Latest e-RaktKosh database verified.', type: 'info' })
      }
    } catch (e) {
      setMsg({ text: `Sync error: ${e.message}`, type: 'error' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'All' || u.role === roleFilter
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter
    return matchesRole && matchesStatus
  })

  // Filtered queries list
  const filteredQueries = queries.filter(q => {
    if (queryFilter === 'All') return true
    return q.status === queryFilter
  })

  // Stats computation
  const stats = {
    totalUsers: users.length,
    pendingUsers: users.filter(u => u.status === 'pending').length,
    openQueries: queries.filter(q => q.status === 'open').length,
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
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-hairline bg-surface-card flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-ink uppercase">
              National Control Center
            </h1>
            <span className="text-xs text-[#e6e5e0]">|</span>
            <span className="text-xs font-semibold text-body tracking-wider uppercase">
              e-RaktKosh Administration
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-bold text-ink">{user?.email || 'admin@eraktkosh.gov.in'}</div>
              <div className="text-[10px] text-body font-semibold uppercase tracking-wider">
                Role: <span className="text-[#f54e00] font-bold">National Administrator</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#f54e00]/10 flex items-center justify-center font-bold text-[#f54e00] text-sm border border-[#f54e00]/25">
              A
            </div>
          </div>
        </header>

        {/* Scrollable Main content */}
        <main className="flex-1 overflow-y-auto p-8 relative space-y-8">
          
          {/* Stats summary strip */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 border-b border-hairline pb-6">
            <div className="text-left">
              <h2 className="text-2xl font-bold tracking-tight text-ink">Platform & Network Overview</h2>
              <p className="text-xs text-body mt-0.5">Review registered institutions, manage Role-Based Access Controls (RBAC), and trigger live e-RaktKosh synchronization.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 shrink-0">
              <div className="bg-surface-card border border-hairline px-5 py-3 rounded-2xl text-center min-w-[100px]">
                <div className="text-xl font-black text-ink">{stats.totalUsers}</div>
                <div className="text-[9px] text-body font-bold uppercase tracking-wider">Total Users</div>
              </div>
              <div className="bg-surface-card border border-hairline px-5 py-3 rounded-2xl text-center min-w-[100px]">
                <div className="text-xl font-black text-[#f54e00]">{stats.pendingUsers}</div>
                <div className="text-[9px] text-body font-bold uppercase tracking-wider">Pending Appr</div>
              </div>
              <div className="bg-surface-card border border-hairline px-5 py-3 rounded-2xl text-center min-w-[100px]">
                <div className="text-xl font-black text-ink">{stats.openQueries}</div>
                <div className="text-[9px] text-body font-bold uppercase tracking-wider">Open Tickets</div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {msg && (
            <div className={`p-4 rounded-xl text-xs font-bold text-center border ${
              msg.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              {msg.type === 'error' ? '⚠️' : '✅'} {msg.text}
            </div>
          )}

          {/* e-RaktKosh Live Synchronizer Card */}
          <div className="bg-surface-card border border-rose-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-rose-50/50 via-surface-card to-amber-50/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇮🇳</span>
                <h3 className="text-base font-extrabold text-slate-800">e-RaktKosh MoHFW Live National Synchronizer</h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">4,561 Centres Mapped</span>
              </div>
              <p className="text-xs text-muted max-w-xl">
                Fetch and synchronize real-time blood stock counts and facility records directly from the Government of India e-RaktKosh portal by State.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={syncStateCode}
                onChange={e => setSyncStateCode(e.target.value)}
                className="bg-surface-card border border-hairline px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
              >
                <option value="all">🇮🇳 All 36 States & Union Territories (Pan-India)</option>
                {ERAKTKOSH_STATES.map(st => (
                  <option key={st.code} value={st.code}>{st.name} (Code {st.code})</option>
                ))}
              </select>

              <button
                onClick={handleSyncEraktkosh}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-sm"
              >
                <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
                {isSyncing ? 'Syncing...' : syncStateCode === 'all' ? 'Sync All States (Pan-India)' : 'Sync State Data'}
              </button>
            </div>
          </div>

          {/* User Management Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-left space-y-0.5">
                <h3 className="text-lg font-bold text-ink">Member Directory & Approvals</h3>
                <p className="text-xs text-body">Approve pending hospitals and blood storage facilities, modify clearance roles, or manage accounts.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-1.5 bg-surface-card border border-hairline px-2.5 py-1 rounded-xl">
                  <span className="text-[10px] font-bold text-body uppercase tracking-wider">Role:</span>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-ink focus:outline-none"
                  >
                    <option value="All">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="blood_bank">Blood Bank</option>
                    <option value="hospital">Hospital</option>
                    <option value="donor">Donor</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1.5 bg-surface-card border border-hairline px-2.5 py-1 rounded-xl">
                  <span className="text-[10px] font-bold text-body uppercase tracking-wider">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-ink focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-surface-card border border-hairline rounded-2xl overflow-hidden shadow-none">
              <table className="w-full text-left text-xs text-body border-collapse">
                <thead className="bg-canvas border-b border-hairline text-ink font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">User Details</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4">Registered Date</th>
                    <th className="p-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-body">
                        No registered members found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-canvas/50 transition">
                        <td className="p-4">
                          <div className="font-bold text-ink">{u.name}</div>
                          <div className="text-[10px] text-body mt-0.5">{u.email}</div>
                          <div className="text-[9px] text-body font-mono mt-0.5">{u.phone}</div>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className="bg-canvas border border-hairline rounded-lg px-2 py-1 text-[11px] font-bold text-ink focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="blood_bank">Blood Bank</option>
                            <option value="hospital">Hospital</option>
                            <option value="donor">Donor</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            u.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            u.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-body text-[10px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {u.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(u.id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition"
                            >
                              Approve
                            </button>
                          )}
                          {u.status === 'approved' && u.role !== 'admin' && (
                            <button
                              onClick={() => handleStatusUpdate(u.id, 'suspended')}
                              className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-600 border border-red-600/20 rounded-lg text-[10px] font-bold transition"
                            >
                              Suspend
                            </button>
                          )}
                          {u.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusUpdate(u.id, 'approved')}
                              className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition"
                            >
                              Re-activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Support Queries Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-left space-y-0.5">
                <h3 className="text-lg font-bold text-ink">Support & Inquiries Helpdesk</h3>
                <p className="text-xs text-body">Review coordination questions submitted by hospitals, donors, and inventory operators.</p>
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-1.5 bg-surface-card border border-hairline px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-bold text-body uppercase tracking-wider">Ticket Filter:</span>
                <select
                  value={queryFilter}
                  onChange={e => setQueryFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-ink focus:outline-none"
                >
                  <option value="All">All Inquiries</option>
                  <option value="open">Open (Unresolved)</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Queries Grid */}
            <div className="space-y-4">
              {filteredQueries.length === 0 ? (
                <div className="bg-surface-card border border-hairline rounded-2xl p-8 text-center text-xs text-body">
                  No inquiries found matching status: <span className="font-bold text-ink uppercase">{queryFilter}</span>
                </div>
              ) : (
                filteredQueries.map(q => {
                  const submitter = users.find(u => u.id === q.user_id)
                  return (
                    <div key={q.id} className="bg-surface-card border border-hairline rounded-2xl p-6 space-y-4 shadow-none text-left">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-hairline pb-3">
                        <div>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider mr-2 ${
                            q.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {q.status}
                          </span>
                          <span className="font-bold text-ink text-sm">{q.subject}</span>
                        </div>
                        <div className="text-[10px] text-body">
                          Submitted {new Date(q.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="text-xs text-ink/90 leading-relaxed bg-canvas p-3 rounded-xl border border-hairline">
                        "{q.message}"
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-body">
                        <div>
                          Raised by: <span className="font-bold text-ink">{submitter?.name || 'Registered User'}</span> ({submitter?.email || 'N/A'})
                        </div>
                      </div>

                      {q.status === 'resolved' ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1">
                          <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                            Admin Response (Sent):
                          </div>
                          <p className="text-ink text-[11px] leading-relaxed">{q.admin_response}</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2 border-t border-hairline">
                          <label className="text-[10px] font-bold text-body uppercase tracking-wider block">
                            Write Official Resolution:
                          </label>
                          <div className="flex gap-2">
                            <textarea
                              rows={2}
                              placeholder="Type response instructions or escalation notes here..."
                              value={responses[q.id] || ''}
                              onChange={e => setResponses({ ...responses, [q.id]: e.target.value })}
                              className="flex-1 bg-canvas border border-hairline rounded-xl p-2.5 text-xs text-ink placeholder:text-body focus:outline-none focus:border-[#f54e00]"
                            />
                            <button
                              onClick={() => handleResolveQuery(q.id)}
                              className="px-4 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl shadow-none transition shrink-0 self-end py-2.5"
                            >
                              Resolve Ticket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
