import React, { useState, useEffect } from 'react'
import { mockApi } from '../utils/mockDb'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'

export default function AdminPanel(){
  const { user, logout, isDarkMode, setIsDarkMode } = useAuth()
  
  const [users, setUsers] = useState([])
  const [queries, setQueries] = useState([])
  
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

  const reloadData = () => {
    try {
      setUsers(mockApi.getAdminUsers())
      setQueries(mockApi.getAdminQueries())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  const handleStatusUpdate = (userId, newStatus) => {
    try {
      mockApi.updateUserStatus(userId, newStatus)
      setMsg({ text: `User account status updated to: ${newStatus.toUpperCase()}`, type: 'success' })
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleRoleChange = (userId, newRole) => {
    try {
      mockApi.updateUserRole(userId, newRole)
      setMsg({ text: `User role updated successfully.`, type: 'success' })
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    }
  }

  const handleResolveQuery = (queryId) => {
    const text = responses[queryId]
    if (!text || !text.trim()) {
      alert('Please enter a response message before resolving.')
      return
    }

    try {
      mockApi.resolveQuery(queryId, text)
      setMsg({ text: 'Query resolved. Response sent to the user.', type: 'success' })
      setResponses(prev => ({ ...prev, [queryId]: '' }))
      reloadData()
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
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
              Platform Control Center
            </h1>
            <span className="text-xs text-[#e6e5e0]">|</span>
            <span className="text-xs font-semibold text-body tracking-wider uppercase">
              System Administration
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-bold text-ink">{user?.email || 'Platform Admin'}</div>
              <div className="text-[10px] text-body font-semibold uppercase tracking-wider">
                Role: <span className="text-[#f54e00] font-bold">Administrator</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#f54e00]/10 flex items-center justify-center font-bold text-[#f54e00] text-sm border border-[#f54e00]/25">
              A
            </div>
          </div>
        </header>

        {/* Scrollable Main content */}
        <main className="flex-1 overflow-y-auto p-8 relative space-y-10">
          
          {/* Stats summary strip */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 border-b border-hairline pb-6">
            <div className="text-left">
              <h2 className="text-2xl font-bold tracking-tight text-ink">Dashboard Overview</h2>
              <p className="text-xs text-body mt-0.5">Review registrations, manage Role-Based Access Controls (RBAC), and reply to support inquiries.</p>
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

          {/* User Management Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-left space-y-0.5">
                <h3 className="text-lg font-bold text-ink">Member Directory</h3>
                <p className="text-xs text-body">Approve pending storage facilities, modify user clearance roles, or suspend profiles.</p>
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
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved / Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Registry Table */}
            <div className="bg-surface-card border border-hairline rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-ink">
                  <thead className="bg-canvas-soft text-[10px] font-bold uppercase text-body border-b border-hairline">
                    <tr>
                      <th className="px-6 py-3.5">Name / Email</th>
                      <th className="px-6 py-3.5">Assigned Role</th>
                      <th className="px-6 py-3.5">Status Flag</th>
                      <th className="px-6 py-3.5">Joined Date</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-body text-xs font-medium bg-surface-card">
                          No registered users found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-canvas-soft transition bg-surface-card">
                          <td className="px-6 py-4">
                            <div className="font-bold text-ink">{u.name}</div>
                            <div className="text-xs text-body">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                              className="bg-canvas-soft border border-hairline rounded-lg px-2 py-1 text-xs font-bold text-ink focus:outline-none"
                            >
                              <option value="admin">Admin</option>
                              <option value="blood_bank">Blood Bank</option>
                              <option value="hospital">Hospital</option>
                              <option value="donor">Donor</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              u.status === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                              u.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                              'bg-red-50 border-red-100 text-red-800'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono font-medium text-body">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {u.status === 'pending' && (
                              <button
                                onClick={() => handleStatusUpdate(u.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                              >
                                Approve Account
                              </button>
                            )}
                            {u.status === 'approved' && u.role !== 'admin' && (
                              <button
                                onClick={() => handleStatusUpdate(u.id, 'suspended')}
                                className="px-3 py-1.5 bg-[#f54e00]/10 hover:bg-red-50 text-[#f54e00] border border-red-200/50 font-bold text-xs rounded-lg transition"
                              >
                                Suspend
                              </button>
                            )}
                            {u.status === 'suspended' && (
                              <button
                                onClick={() => handleStatusUpdate(u.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/50 font-bold text-xs rounded-lg transition"
                              >
                                Reactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Query Inbox Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-left space-y-0.5">
                <h3 className="text-lg font-bold text-ink">Support Inquiries & Feedback</h3>
                <p className="text-xs text-body">Resolving queries sends an in-app notification alert containing your reply text.</p>
              </div>

              <div className="flex space-x-2 bg-surface-card border border-hairline p-1 rounded-xl shrink-0">
                {['open', 'resolved', 'All'].map(status => (
                  <button
                    key={status}
                    onClick={() => setQueryFilter(status)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
                      queryFilter === status ? 'bg-[#f54e00] text-white shadow-sm' : 'text-body hover:text-ink'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {filteredQueries.length === 0 ? (
                <div className="md:col-span-2 bg-surface-card border border-hairline p-12 text-center text-body rounded-2xl shadow-none">
                  <div className="text-sm font-semibold">Inbox Empty</div>
                  <div className="text-xs">No queries match this filter category.</div>
                </div>
              ) : (
                filteredQueries.map((q) => (
                  <div key={q.id} className="bg-surface-card border border-hairline rounded-2xl p-6 shadow-none space-y-4 flex flex-col justify-between text-left">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            q.status === 'open' ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-slate-50 text-body border border-hairline'
                          }`}>
                            {q.status}
                          </span>
                          <h4 className="text-sm font-bold text-ink mt-2">{q.subject}</h4>
                        </div>
                        <span className="text-[10px] text-body font-semibold">
                          {new Date(q.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-body leading-relaxed bg-canvas-soft p-3 rounded-xl border border-hairline">
                        "{q.message}"
                      </p>

                      <div className="text-[10px] text-body flex flex-wrap gap-x-2">
                        <span>From: <strong className="text-ink">{q.user_name}</strong></span>
                        <span>•</span>
                        <span className="uppercase font-semibold text-[#f54e00]">{q.user_role}</span>
                        <span>•</span>
                        <span>{q.user_email}</span>
                      </div>
                    </div>

                    {q.status === 'open' ? (
                      <div className="space-y-2 border-t border-hairline pt-4 mt-2">
                        <textarea
                          placeholder="Write administrator response..."
                          value={responses[q.id] || ''}
                          onChange={e => setResponses({ ...responses, [q.id]: e.target.value })}
                          className="w-full bg-canvas-soft border border-hairline rounded-xl p-3 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#f54e00] focus:bg-surface-card transition h-20"
                        />
                        <button
                          onClick={() => handleResolveQuery(q.id)}
                          className="px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl shadow-none transition float-right"
                        >
                          Resolve & Send Response
                        </button>
                      </div>
                    ) : (
                      <div className="border-t border-hairline pt-4 mt-2 bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/50">
                        <div className="text-[10px] font-bold uppercase text-body mb-1">Response Logged:</div>
                        <p className="text-xs text-body italic">"{q.admin_response}"</p>
                        <div className="text-[9px] text-body mt-2 text-right">
                          Resolved: {new Date(q.resolved_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
          
        </main>
      </div>
    </div>
  )
}
