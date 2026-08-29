import React, { useState, useEffect } from 'react'
import { mockApi } from '../utils/mockDb'

export default function Dashboard(){
  const [data, setData] = useState({ aggregate: {}, details: [], totalBanks: 0, totalHospitals: 0 })
  const [selectedDistrict, setSelectedDistrict] = useState('All')
  const [selectedGroup, setSelectedGroup] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    try {
      const res = mockApi.getPublicDashboard()
      setData(res)
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Extract unique districts
  const districts = ['All', ...new Set(data.details.map(d => d.district).filter(Boolean))]
  const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

  // Filtered detailed list
  const filteredDetails = data.details.filter(item => {
    const matchesDistrict = selectedDistrict === 'All' || item.district === selectedDistrict
    const matchesGroup = selectedGroup === 'All' || item.blood_group === selectedGroup
    const matchesSearch = searchQuery === '' || 
      item.blood_bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batch_id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDistrict && matchesGroup && matchesSearch
  })

  // Dynamic aggregates based on district/search filters (but keeping group counts visible)
  const getFilteredAggregate = (group) => {
    return data.details
      .filter(item => {
        const matchesDistrict = selectedDistrict === 'All' || item.district === selectedDistrict
        const matchesSearch = searchQuery === '' || 
          item.blood_bank_name.toLowerCase().includes(searchQuery.toLowerCase())
        return item.blood_group === group && matchesDistrict && matchesSearch
      })
      .reduce((acc, curr) => acc + curr.units_available, 0)
  }

  // Days remaining helper
  const getDaysLeft = (expiryStr) => {
    const diff = new Date(expiryStr) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-hairline pb-5 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Blood Stock Registry</h2>
          <p className="text-sm text-muted mt-1">Real-time aggregate availability of blood supplies across verified blood banks.</p>
        </div>
        
        <div className="flex space-x-3 text-xs font-bold text-muted uppercase tracking-wider">
          <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-hairline/50">
            🏥 Centers: <span className="text-slate-800 font-extrabold">{data.totalBanks}</span>
          </div>
          <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-hairline/50">
            🏨 Hospital Partners: <span className="text-slate-800 font-extrabold">{data.totalHospitals}</span>
          </div>
        </div>
      </div>

      {/* Aggregate Group Cards */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-3">
          Supply Level by Blood Type {selectedDistrict !== 'All' ? `(${selectedDistrict})` : ''}
        </span>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {bloodGroups.filter(g => g !== 'All').map((g) => {
            const count = getFilteredAggregate(g)
            return (
              <div 
                key={g} 
                onClick={() => setSelectedGroup(selectedGroup === g ? 'All' : g)}
                className={`p-4 rounded-2xl border text-center transition cursor-pointer hover:shadow-sm ${
                  selectedGroup === g 
                    ? 'bg-[#f54e00]/10 border-rose-200 text-[#d04200] shadow-sm' 
                    : count > 0 
                    ? 'bg-surface-card border border-hairline-[#e6e5e0] hover:border-hairline' 
                    : 'bg-slate-50 border-hairline opacity-60'
                }`}
              >
                <div className="text-xl font-black">{g}</div>
                <div className="text-xs font-bold text-muted mt-1">{count} Units</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-[#f54e00]/100 h-full transition-all" 
                    style={{ width: `${Math.min(100, (count / 50) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="bg-surface-card border border-hairline border-hairline p-6 rounded-2xl shadow-sm grid md:grid-cols-3 gap-6 items-end">
        {/* District Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">Filter by District</label>
          <select 
            value={selectedDistrict} 
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full bg-slate-50 border border-hairline/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
          >
            {districts.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>
            ))}
          </select>
        </div>

        {/* Text Search */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">Search Center or Batch</label>
          <input 
            type="text" 
            placeholder="e.g. Red Cross, BAT-A1..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-hairline/60 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
          />
        </div>

        {/* Quick Reset */}
        <button
          onClick={() => {
            setSelectedDistrict('All')
            setSelectedGroup('All')
            setSearchQuery('')
          }}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-body text-sm font-bold rounded-xl transition border border-hairline/30"
        >
          Reset Filters
        </button>
      </div>

      {/* Detailed Stock Results */}
      <div className="bg-surface-card border border-hairline border-hairline rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-hairline flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Matching Stock Listings</span>
          <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold px-2.5 py-1 rounded-full">
            {filteredDetails.length} Batches Found
          </span>
        </div>

        {filteredDetails.length === 0 ? (
          <div className="p-12 text-center text-muted space-y-2">
            <span className="text-4xl block">🔍</span>
            <div className="text-sm font-semibold">No stock results matching your filters.</div>
            <div className="text-xs">Try adjusting your district, blood group, or keyword query.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted">
              <thead className="text-xs font-bold text-muted uppercase tracking-wider border-b border-hairline">
                <tr>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">Quantity (Units)</th>
                  <th className="px-6 py-4">Blood Bank Center</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">Batch Reference</th>
                  <th className="px-6 py-4">Expiry Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredDetails.map((item) => {
                  const daysLeft = getDaysLeft(item.expiry_date)
                  const isExpiring = daysLeft >= 0 && daysLeft <= 5
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center font-extrabold text-sm w-9 h-9 rounded-full bg-[#f54e00]/10 text-[#d04200] border border-rose-100">
                          {item.blood_group}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-800 text-base">{item.units_available}</span>
                        <span className="text-xs text-muted ml-1">units</span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="font-bold text-slate-700">{item.blood_bank_name}</div>
                        <div className="text-xs text-muted">{item.address}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex text-[10px] font-bold bg-slate-100 text-body px-2.5 py-1 rounded-full uppercase">
                          {item.district}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted">
                        {item.batch_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-semibold">{item.expiry_date}</span>
                          {isExpiring ? (
                            <span className="inline-flex items-center text-[9px] font-extrabold uppercase text-amber-600 mt-1 animate-pulse">
                              ⚠️ Expiring in {daysLeft} days!
                            </span>
                          ) : daysLeft < 0 ? (
                            <span className="inline-flex items-center text-[9px] font-extrabold uppercase text-[#f54e00] mt-1">
                              ⛔ EXPIRED ({Math.abs(daysLeft)} days ago)
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted mt-1">
                              ({daysLeft} days left)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
