import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles=[] }){
  const { user, logout, refreshUserStatus } = useAuth()
  const [checking, setChecking] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  if(!user) return <Navigate to="/login" replace />
  if(roles.length && !roles.includes(user.role)) return <Navigate to="/" replace />
  
  // Gating status checks for blood_bank and hospital
  if ((user.role === 'blood_bank' || user.role === 'hospital') && user.status !== 'approved') {
    const isSuspended = user.status === 'suspended';

    const handleCheckStatus = async () => {
      setChecking(true)
      setStatusMsg(null)
      try {
        const updated = await refreshUserStatus()
        if (updated && updated.status === 'approved') {
          setStatusMsg({ type: 'success', text: '🎉 Account approved! Reloading console...' })
          setTimeout(() => {
            window.location.reload()
          }, 600)
        } else {
          setStatusMsg({ type: 'info', text: `Status: ${updated?.status?.toUpperCase() || 'PENDING'}. Verification is still in progress.` })
        }
      } catch (e) {
        setStatusMsg({ type: 'error', text: 'Failed to verify status. Please try again.' })
      } finally {
        setChecking(false)
      }
    }

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-surface-card border border-hairline rounded-3xl shadow-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl">
            {isSuspended ? '🔒' : '⏳'}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 block">
              {isSuspended ? 'ACCESS SUSPENDED' : 'VERIFICATION IN PROGRESS'}
            </span>
            <h3 className="text-2xl font-black text-ink font-condensed tracking-tight">
              {isSuspended ? 'Account Suspended' : 'Approval Pending'}
            </h3>
            <p className="text-xs text-body leading-relaxed max-w-sm mx-auto">
              {isSuspended 
                ? 'Your organization account has been suspended by the platform administrator. If you believe this is an error, please file a support inquiry.'
                : `Your account for "${user.name || user.email}" is pending administrator review. Once verified, your full logistics console will be unlocked.`
              }
            </p>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold text-center ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              statusMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {statusMsg.text}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button 
              onClick={handleCheckStatus} 
              disabled={checking}
              className="w-full py-3 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm disabled:opacity-50"
            >
              {checking ? 'Checking Latest Status...' : 'Check Verification Status ↻'}
            </button>

            <div className="flex gap-2">
              <Link
                to="/dashboard"
                className="flex-1 py-2.5 bg-canvas hover:bg-canvas-soft border border-hairline text-body hover:text-ink font-bold rounded-xl text-xs uppercase tracking-wider transition text-center"
              >
                Stock Directory
              </Link>
              <button
                onClick={logout}
                className="flex-1 py-2.5 bg-canvas hover:bg-canvas-soft border border-hairline text-[#f54e00] font-bold rounded-xl text-xs uppercase tracking-wider transition text-center"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return children
}
