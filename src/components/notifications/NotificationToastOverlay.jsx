import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import RequestQuickModal from './RequestQuickModal'

export default function NotificationToastOverlay({ currentUserRole = 'hospital' }) {
  const { user } = useAuth()
  const [activeToast, setActiveToast] = useState(null)
  const [selectedReqId, setSelectedReqId] = useState(null)
  const [selectedReqObj, setSelectedReqObj] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const handleNewNotif = (e) => {
      const notif = e.detail
      if (!notif) return

      // Prevent notifications meant for others or sender's own request from showing as incoming alert
      if (user && notif.user_id && notif.user_id !== user.id) return

      setActiveToast(notif)

      // Auto dismiss toast after 8 seconds
      const timer = setTimeout(() => {
        setActiveToast(prev => (prev?.id === notif.id ? null : prev))
      }, 8000)

      return () => clearTimeout(timer)
    }

    window.addEventListener('new_notification', handleNewNotif)
    return () => window.removeEventListener('new_notification', handleNewNotif)
  }, [user])

  const handleOpenFromToast = (notif) => {
    const reqId = notif.metadata?.requestId || null
    if (!reqId) return
    setSelectedReqId(reqId)
    setSelectedReqObj(notif.metadata || null)
    setIsModalOpen(true)
    setActiveToast(null)
  }

  return (
    <>
      {/* Floating Live Notification Toast Banner */}
      {activeToast && (
        <div 
          onClick={() => handleOpenFromToast(activeToast)}
          className="fixed top-5 right-5 z-50 max-w-md w-full bg-slate-900 text-white border border-slate-700 p-4 rounded-2xl shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform flex items-start gap-3.5 animate-slideDown"
        >
          {/* Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-[#f54e00] flex items-center justify-center text-lg font-black shrink-0 shadow-sm animate-pulse">
            {activeToast.type === 'emergency_request' ? '🚨' : activeToast.type === 'request_response' ? '✓' : '🩸'}
          </div>

          <div className="flex-1 min-w-0 space-y-1 text-left font-sans">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#f54e00] bg-white/10 px-2 py-0.5 rounded-full">
                {activeToast.type === 'emergency_request' ? 'Emergency Request' : 'Blood Order Alert'}
              </span>
              <span className="text-[10px] text-slate-400">Just now</span>
            </div>

            <div className="text-xs font-bold text-white truncate">
              {activeToast.title || activeToast.message}
            </div>

            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {activeToast.message}
            </p>

            <div className="pt-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#f54e00] hover:underline flex items-center gap-1">
                Click to open & review request →
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveToast(null)
                }}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
                aria-label="Dismiss toast"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Quick Action Modal */}
      <RequestQuickModal
        requestId={selectedReqId}
        initialRequest={selectedReqObj}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserRole={currentUserRole}
      />
    </>
  )
}
