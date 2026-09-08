import React, { useState, useEffect } from 'react'
import { dataApi } from '../../utils/api'

export default function RequestQuickModal({
  requestId,
  initialRequest = null,
  isOpen,
  onClose,
  onStatusUpdated,
  currentUserRole = 'hospital'
}) {
  const [request, setRequest] = useState(initialRequest)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    const loadDetail = async () => {
      if (requestId) {
        setLoading(true)
        try {
          const data = await dataApi.getRequestDetail(requestId)
          if (data) {
            setRequest(data)
          } else if (initialRequest) {
            setRequest(initialRequest)
          }
        } catch (e) {
          console.error('Could not fetch request details:', e)
          if (initialRequest) setRequest(initialRequest)
        } finally {
          setLoading(false)
        }
      } else if (initialRequest) {
        setRequest(initialRequest)
      }
    }

    loadDetail()
  }, [isOpen, requestId, initialRequest])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleUpdateStatus = async (newStatus) => {
    if (!request?.id) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const updated = await dataApi.updateRequestStatus(request.id, newStatus)
      setRequest(prev => ({ ...prev, status: newStatus }))
      setActionMsg({ text: `✓ Request status updated to ${newStatus.toUpperCase()} successfully!`, type: 'success' })
      if (onStatusUpdated) {
        onStatusUpdated(updated || { ...request, status: newStatus })
      }
    } catch (e) {
      setActionMsg({ text: `Failed to update status: ${e.message}`, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const isEmergency = request?.urgency?.toLowerCase() === 'emergency'
  const isUrgent = request?.urgency?.toLowerCase() === 'urgent'
  const isPending = request?.status === 'pending'
  const isAccepted = request?.status === 'accepted'
  const isDispatched = request?.status === 'dispatched'
  const isFulfilled = request?.status === 'fulfilled'
  const isRejected = request?.status === 'rejected'

  let currentStep = 1
  if (isAccepted) currentStep = 2
  if (isDispatched) currentStep = 3
  if (isFulfilled) currentStep = 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-surface-card border border-hairline w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Urgent Header Banner */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          isEmergency 
            ? 'bg-rose-600 text-white border-rose-700' 
            : isUrgent 
            ? 'bg-amber-500 text-white border-amber-600' 
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              {isEmergency ? '🚨' : isUrgent ? '⚡' : '📋'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {isEmergency ? 'Critical Emergency Requisition' : isUrgent ? 'Urgent Clinical Supply Order' : 'Standard Blood Requisition'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono font-bold">
                  {request?.id ? `#${request.id.toUpperCase()}` : '#REQ-LIVE'}
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">
                Direct clinical action modal • No page navigation required
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 font-sans">
          {loading ? (
            <div className="p-12 text-center text-muted space-y-3">
              <div className="w-8 h-8 border-3 border-[#f54e00] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold">Loading live requisition telemetry...</p>
            </div>
          ) : !request ? (
            <div className="p-12 text-center text-muted space-y-2">
              <p className="text-sm font-bold">Requisition record not found.</p>
              <p className="text-xs">It may have been fulfilled or archived.</p>
            </div>
          ) : (
            <>
              {/* Action feedback message */}
              {actionMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                  actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <span>{actionMsg.text}</span>
                  <button onClick={() => setActionMsg(null)} className="text-sm font-black ml-2">✕</button>
                </div>
              )}

              {/* Main Order Card with prominent Blood Group */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 border border-hairline rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#f54e00] text-white flex flex-col items-center justify-center font-black shadow-md shrink-0">
                    <span className="text-2xl leading-none">{request.blood_group}</span>
                    <span className="text-[9px] uppercase tracking-wider mt-0.5 opacity-90">Group</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-900">
                      {request.units_needed || 1} <span className="text-sm font-bold text-slate-500">Units Requested</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="font-semibold">Priority:</span>
                      <span className={`inline-flex font-bold uppercase text-[10px] px-2 py-0.2 rounded-full ${
                        isEmergency ? 'bg-rose-100 text-rose-800 font-bold' : isUrgent ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {request.urgency || 'Normal'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted">
                      Created: {new Date(request.created_at || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col sm:items-end justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-xl border ${
                    isFulfilled 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isDispatched 
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : isAccepted 
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : isRejected
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {request.status || 'Pending'}
                  </span>
                  <span className="text-[10px] text-muted mt-1 font-mono">
                    {isFulfilled ? 'Order Complete' : isDispatched ? 'Logistics in Transit' : isAccepted ? 'Awaiting Dispatch' : 'Requires Review'}
                  </span>
                </div>
              </div>

              {/* 4-Step Progress Tracker */}
              {!isRejected && (
                <div className="p-4 bg-surface-card border border-hairline rounded-2xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Live Dispatch Telemetry</div>
                  <div className="flex items-center text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider relative">
                    <div className="absolute left-[12%] right-[12%] top-3.5 h-0.5 bg-slate-200 -z-0"></div>
                    <div 
                      className="absolute left-[12%] top-3.5 h-0.5 bg-[#f54e00] -z-0 transition-all duration-500"
                      style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '38%' : currentStep === 3 ? '75%' : '100%' }}
                    ></div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-[#f54e00] text-white font-bold text-xs shadow-sm">
                        ✓
                      </div>
                      <span className="mt-1 font-extrabold text-slate-800">Requisitioned</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        currentStep >= 2 ? 'bg-[#f54e00] text-white shadow-sm' : 'bg-surface-card border border-hairline text-muted'
                      }`}>
                        {currentStep >= 2 ? '✓' : '2'}
                      </div>
                      <span className={`mt-1 font-extrabold ${currentStep >= 2 ? 'text-slate-800' : 'text-muted'}`}>
                        Accepted
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        currentStep >= 3 ? 'bg-[#f54e00] text-white shadow-sm' : 'bg-surface-card border border-hairline text-muted'
                      }`}>
                        {currentStep >= 3 ? '✓' : '3'}
                      </div>
                      <span className={`mt-1 font-extrabold ${currentStep >= 3 ? 'text-slate-800' : 'text-muted'}`}>
                        Dispatched
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        currentStep >= 4 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-surface-card border border-hairline text-muted'
                      }`}>
                        {currentStep >= 4 ? '✓' : '4'}
                      </div>
                      <span className={`mt-1 font-extrabold ${currentStep >= 4 ? 'text-emerald-700' : 'text-muted'}`}>
                        Delivered
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Requester & Facility Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Requester / Hospital Box */}
                <div className="p-4 rounded-xl border border-hairline bg-slate-50 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <span>🏨</span> Requesting Facility / Patient
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {request.hospital_name || request.patient_name || 'AIIMS Emergency Wing'}
                  </div>
                  {request.patient_name && request.hospital_name && (
                    <div className="text-slate-600">
                      <strong className="text-slate-700">Patient:</strong> {request.patient_name}
                    </div>
                  )}
                  <div className="text-slate-500 text-[11px] leading-relaxed">
                    {request.hospital_address || 'Ansari Nagar, New Delhi'}
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <a 
                      href={`tel:${request.hospital_phone || request.contact_phone || '+911126588500'}`}
                      className="inline-flex items-center gap-1 font-bold text-[#f54e00] hover:underline text-[11px]"
                    >
                      <span>📞</span> {request.hospital_phone || request.contact_phone || '+91 11-26588500'}
                    </a>
                  </div>
                </div>

                {/* Target Blood Bank Box */}
                <div className="p-4 rounded-xl border border-hairline bg-slate-50 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <span>🏦</span> Fulfilling Blood Bank
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {request.blood_bank_name || 'Indian Red Cross Society'}
                  </div>
                  <div className="text-slate-500 text-[11px] leading-relaxed">
                    {request.blood_bank_address || '1 Red Cross Road, New Delhi'}
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <a 
                      href={`tel:${request.blood_bank_phone || '+911123716441'}`}
                      className="inline-flex items-center gap-1 font-bold text-slate-700 hover:underline text-[11px]"
                    >
                      <span>📞</span> {request.blood_bank_phone || '+91 11-23716441'}
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-surface-card border border-hairline hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition font-sans"
          >
            Close Window
          </button>

          {request && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Blood Bank actions */}
              {isPending && (
                <>
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    ✕ Decline Order
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('accepted')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-[#f54e00] hover:bg-[#d04200] text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>✓</span> Accept & Allocate Supply
                  </button>
                </>
              )}

              {isAccepted && (
                <button
                  onClick={() => handleUpdateStatus('dispatched')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🚚</span> Dispatch Logistics Delivery
                </button>
              )}

              {isDispatched && (
                <button
                  onClick={() => handleUpdateStatus('fulfilled')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>📦</span> Mark Delivered & Complete
                </button>
              )}

              {/* General action button */}
              {(isFulfilled || isRejected) && (
                <span className="text-xs font-bold text-muted">
                  Requisition is closed.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
