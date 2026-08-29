import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles=[] }){
  const { user } = useAuth()
  if(!user) return <Navigate to="/login" replace />
  if(roles.length && !roles.includes(user.role)) return <Navigate to="/" replace />
  
  // Gating status checks for blood_bank and hospital
  if ((user.role === 'blood_bank' || user.role === 'hospital') && user.status !== 'approved') {
    const isSuspended = user.status === 'suspended';
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-surface-card border border-hairline border-hairline rounded-2xl shadow-none text-center">
        <div className="text-5xl mb-4">{isSuspended ? '🔒' : '⏳'}</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          {isSuspended ? 'Account Suspended' : 'Approval Pending'}
        </h3>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          {isSuspended 
            ? 'Your organization account has been suspended by the platform administrator. If you believe this is an error, please file a support query.'
            : 'Your organization account is pending verification by our administrator network. You will gain access as soon as your credentials are approved.'
          }
        </p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition ${
              isSuspended ? 'bg-[#f54e00] hover:bg-[#d04200]' : 'bg-[#f54e00] hover:bg-[#d04200]'
            }`}
          >
            Check Status
          </button>
        </div>
      </div>
    )
  }

  return children
}
