import React, { useState, useEffect } from 'react'
import { dataApi } from '../../utils/api'
import Loader from '../Loader'

export default function RequestQuickModal({
  requestId,
  initialRequest = null,
  isOpen,
  onClose,
  onStatusUpdated,
  currentUserRole = 'blood_bank'
}) {
  const [request, setRequest] = useState(initialRequest)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)
  const [dispatchReceipt, setDispatchReceipt] = useState(null)

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
      let updated
      if (newStatus === 'reserved' && dataApi.reserveBloodRequest) {
        updated = await dataApi.reserveBloodRequest(request.id)
      } else if (newStatus === 'dispatched' && dataApi.issueAndDispatchBloodRequest) {
        updated = await dataApi.issueAndDispatchBloodRequest(request.id)
        if (updated?.receipt) {
          setDispatchReceipt(updated.receipt)
        }
      } else {
        updated = await dataApi.updateRequestStatus(request.id, newStatus, currentUserRole)
      }

      setRequest(prev => ({ ...prev, status: newStatus }))
      setActionMsg({ text: `✓ Request marked as ${newStatus.toUpperCase()} successfully!`, type: 'success' })
      if (onStatusUpdated) {
        onStatusUpdated(updated || { ...request, status: newStatus })
      }
    } catch (e) {
      setActionMsg({ text: `Action error: ${e.message}`, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const isEmergency = request?.urgency?.toLowerCase() === 'emergency'
  const isUrgent = request?.urgency?.toLowerCase() === 'urgent'
  const isPending = request?.status === 'pending'
  const isAccepted = request?.status === 'accepted'
  const isReserved = request?.status === 'reserved'
  const isDispatched = request?.status === 'dispatched'
  const isFulfilled = request?.status === 'fulfilled'
  const isRejected = request?.status === 'rejected'

  let currentStep = 1
  if (isAccepted) currentStep = 2
  if (isReserved) currentStep = 2.5
  if (isDispatched) currentStep = 3
  if (isFulfilled) currentStep = 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-surface-card border border-hairline w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-left animate-scaleUp font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          isEmergency 
            ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white border-rose-800' 
            : isAccepted || isReserved
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-teal-800'
            : isUrgent 
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-700' 
            : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-lg">
              {isEmergency ? '🚨' : isAccepted ? '✓' : isReserved ? '🔒' : isDispatched ? '🚑' : '📋'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {isEmergency 
                    ? 'Critical Emergency Blood Order' 
                    : isAccepted
                    ? 'Order Accepted & Supply Allocated'
                    : isReserved
                    ? 'Units Reserved (FEFO Locked)'
                    : isDispatched
                    ? 'Order In Transit (Dispatched)'
                    : 'Standard Clinical Blood Order'}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/25 font-mono font-bold">
                  {request?.id ? `#${request.id.toUpperCase()}` : '#REQ-LIVE'}
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-medium mt-0.5">
                Real-time clinical order lifecycle & direct dispatch manager
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {loading ? (
            <div className="p-14 text-center text-muted space-y-3 flex flex-col items-center justify-center">
              <Loader size={50} />
              <p className="text-xs font-bold text-ink mt-2">Connecting to live requisition telemetry...</p>
            </div>
          ) : !request ? (
            <div className="p-14 text-center text-muted space-y-2">
              <span className="text-3xl block">📋</span>
              <p className="text-sm font-bold text-ink">Requisition record not found.</p>
              <p className="text-xs">It may have been completed, fulfilled, or archived.</p>
            </div>
          ) : (
            <>
              {/* Action feedback message */}
              {actionMsg && (
                <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
                  actionMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}>
                  <span>{actionMsg.text}</span>
                  <button onClick={() => setActionMsg(null)} className="text-sm font-black ml-2 opacity-60 hover:opacity-100">✕</button>
                </div>
              )}

              {/* Main Order Card with Blood Group & Status */}
              <div className={`p-5 rounded-3xl border transition-all ${
                isAccepted 
                  ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-emerald-200' 
                  : isReserved
                  ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-blue-200'
                  : isDispatched
                  ? 'bg-gradient-to-r from-purple-50/80 to-fuchsia-50/50 border-purple-200'
                  : 'bg-slate-50 border-hairline'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl text-white flex flex-col items-center justify-center font-black shadow-md shrink-0 ${
                      isEmergency ? 'bg-rose-600' : isAccepted || isReserved ? 'bg-emerald-600' : 'bg-[#f54e00]'
                    }`}>
                      <span className="text-2xl leading-none">{request.blood_group}</span>
                      <span className="text-[9px] uppercase tracking-wider mt-0.5 opacity-90">Group</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>{request.units_needed || 1} Units Needed</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isEmergency ? 'bg-rose-100 text-rose-800' : isUrgent ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {request.urgency || 'Normal'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <span>👤 <strong>Patient:</strong> {request.patient_name || 'Emergency Casualty'}</span>
                      </div>
                      
                      <div className="text-[10px] text-muted font-mono">
                        Logged: {new Date(request.created_at || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-col sm:items-end justify-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-3.5 py-1.5 rounded-xl border shadow-xs ${
                      isFulfilled 
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : isDispatched 
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : isReserved
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : isAccepted 
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/20'
                        : isRejected
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {request.status || 'Pending'}
                    </span>
                    <span className="text-[10px] text-muted mt-1 font-mono font-bold">
                      {isFulfilled ? '✓ Order Fulfilled' : isDispatched ? '🚚 In Transit' : isReserved ? '🔒 FEFO Locked' : isAccepted ? '✓ Allocated / Ready' : '⏳ Action Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Step Progress Tracker */}
              {!isRejected && (
                <div className="p-4 bg-surface-card border border-hairline rounded-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Requisition Lifecycle</span>
                    <span className="text-[10px] font-mono font-bold text-[#f54e00]">
                      Stage {currentStep === 2.5 ? '2 (Reserved)' : currentStep} of 4
                    </span>
                  </div>

                  <div className="flex items-center text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider relative">
                    <div className="absolute left-[12%] right-[12%] top-3.5 h-0.5 bg-slate-200 -z-0"></div>
                    <div 
                      className="absolute left-[12%] top-3.5 h-0.5 bg-emerald-500 -z-0 transition-all duration-500"
                      style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '33%' : currentStep === 2.5 ? '48%' : currentStep === 3 ? '66%' : '100%' }}
                    ></div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        ✓
                      </div>
                      <span className="mt-1 font-extrabold text-slate-800">Placed</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        currentStep >= 2 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-surface-card border border-hairline text-muted'
                      }`}>
                        {currentStep >= 2 ? '✓' : '2'}
                      </div>
                      <span className={`mt-1 font-extrabold ${currentStep >= 2 ? 'text-emerald-800' : 'text-muted'}`}>
                        {isReserved ? 'Reserved' : 'Accepted'}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        currentStep >= 3 ? 'bg-purple-600 text-white shadow-xs' : 'bg-surface-card border border-hairline text-muted'
                      }`}>
                        {currentStep >= 3 ? '✓' : '3'}
                      </div>
                      <span className={`mt-1 font-extrabold ${currentStep >= 3 ? 'text-purple-800' : 'text-muted'}`}>
                        Dispatched
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center z-10">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        currentStep >= 4 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-surface-card border border-hairline text-muted'
                      }`}>
                        {currentStep >= 4 ? '✓' : '4'}
                      </div>
                      <span className={`mt-1 font-extrabold ${currentStep >= 4 ? 'text-emerald-800' : 'text-muted'}`}>
                        Delivered
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispatch Receipt Popover if just dispatched */}
              {dispatchReceipt && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between text-purple-900 font-extrabold">
                    <span className="flex items-center gap-1.5"><span>🧾</span> FEFO Dispatch Receipt Generated</span>
                    <span className="font-mono text-[10px]">{dispatchReceipt.receiptNumber}</span>
                  </div>
                  <div className="text-purple-800 text-[11px]">
                    <strong>{dispatchReceipt.unitsDispatched} units</strong> of {dispatchReceipt.bloodGroup} deducted from earliest expiring batches.
                  </div>
                  {dispatchReceipt.deductions?.length > 0 && (
                    <div className="bg-surface-card/80 rounded-xl p-2.5 border border-purple-200/60 font-mono text-[10px] text-slate-700 space-y-1">
                      {dispatchReceipt.deductions.map((d, i) => (
                        <div key={i} className="flex justify-between">
                          <span>Batch #{d.batchId} (Exp: {d.expiryDate})</span>
                          <strong>-{d.unitsDeducted} units</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Requester & Facility Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Requester / Hospital Box */}
                <div className="p-4 rounded-2xl border border-hairline bg-slate-50 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <span>🏨</span> Requesting Hospital
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {request.hospital_name || 'Government Hospital Sathyamangalam (GH Sathy)'}
                  </div>
                  {request.patient_name && (
                    <div className="text-slate-600 text-[11px]">
                      <strong>Patient:</strong> {request.patient_name}
                    </div>
                  )}
                  <div className="text-slate-500 text-[11px] leading-relaxed">
                    {request.hospital_address || 'Mysore Trunk Road, Sathyamangalam, Erode, Tamil Nadu'}
                  </div>
                  <div className="pt-1">
                    <a 
                      href={`tel:${request.hospital_phone || request.contact_phone || '+914295220250'}`}
                      className="inline-flex items-center gap-1 font-bold text-[#f54e00] hover:underline text-[11px]"
                    >
                      <span>📞</span> {request.hospital_phone || request.contact_phone || '+91 4295-220250'}
                    </a>
                  </div>
                </div>

                {/* Target Blood Bank Box */}
                <div className="p-4 rounded-2xl border border-hairline bg-slate-50 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <span>🏦</span> Fulfilling Blood Bank
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {request.blood_bank_name || 'Dhanvantri Charitable Trust Blood Bank'}
                  </div>
                  <div className="text-slate-500 text-[11px] leading-relaxed">
                    {request.blood_bank_address || 'Shenbagapudur, Sathyamangalam, Erode, Tamil Nadu'}
                  </div>
                  <div className="pt-1">
                    <a 
                      href={`tel:${request.blood_bank_phone || '+919443048948'}`}
                      className="inline-flex items-center gap-1 font-bold text-slate-800 hover:underline text-[11px]"
                    >
                      <span>📞</span> {request.blood_bank_phone || '+91 94430-48948'}
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
              {/* Pending Actions */}
              {isPending && (
                <>
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    ✕ Decline
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

              {/* Accepted Actions */}
              {isAccepted && (
                <>
                  <button
                    onClick={() => handleUpdateStatus('reserved')}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>🔒</span> Reserve FEFO Units
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('dispatched')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>🚑</span> Issue & Dispatch
                  </button>
                </>
              )}

              {/* Reserved Actions */}
              {isReserved && (
                <button
                  onClick={() => handleUpdateStatus('dispatched')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🚑</span> Issue & Dispatch Units
                </button>
              )}

              {/* Dispatched Actions */}
              {isDispatched && (
                <button
                  onClick={() => handleUpdateStatus('fulfilled')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>📦</span> Mark Delivered & Complete
                </button>
              )}

              {/* Closed */}
              {(isFulfilled || isRejected) && (
                <span className="text-xs font-bold text-muted bg-slate-100 px-3 py-1.5 rounded-xl">
                  ✓ Requisition Completed & Logged
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
