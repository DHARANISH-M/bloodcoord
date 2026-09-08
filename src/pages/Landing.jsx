import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dataApi } from '../utils/api'

export default function Landing(){
  const { resetMockDb } = useAuth()
  const [stats, setStats] = useState({
    aggregate: {},
    totalBanks: 0,
    totalHospitals: 0,
    totalUnits: 0,
    totalDonors: 0
  })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await dataApi.getPublicDashboard()
        const totalUnits = Object.values(data.aggregate || {}).reduce((acc, curr) => acc + curr, 0)
        setStats({
          aggregate: data.aggregate,
          totalBanks: data.totalBanks || 4561,
          totalHospitals: data.totalHospitals || 6,
          totalUnits: totalUnits,
          totalDonors: data.totalDonors || 7
        })
      } catch (e) {
        console.error(e)
      }
    }

    loadStats()
  }, [])

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-rose-200 to-rose-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]"></div>
        </div>

        <span className="inline-flex items-center space-x-1 px-3.5 py-1 rounded-full text-xs font-black bg-rose-50 border border-rose-200 text-[#d04200] uppercase tracking-wider animate-pulse">
          🩸 e-RaktKosh Live Coordination Network
        </span>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tight leading-none">
          National Blood Logistics & <br />
          <span className="text-[#f54e00] bg-clip-text">Emergency Coordination</span>
        </h1>
        
        <p className="text-lg text-body max-w-2xl mx-auto leading-relaxed">
          Integrated with Government of India <strong>e-RaktKosh</strong> portal across all 36 States and Union Territories. Connecting 4,500+ blood banks, hospitals, and voluntary donors with real-time stock levels and emergency alerts.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link to="/dashboard" className="px-6 py-3.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
            🔍 Search Pan-India Blood Stock
          </Link>
          <Link to="/register" className="px-6 py-3.5 bg-[#26251e] hover:bg-[#252523] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
            Register Hospital / Donor
          </Link>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Units Available', value: stats.totalUnits.toLocaleString(), color: 'text-[#f54e00]', icon: '🩸' },
          { label: 'Verified Blood Centres', value: stats.totalBanks.toLocaleString(), color: 'text-slate-800', icon: '🏥' },
          { label: 'Premier Hospital Partners', value: stats.totalHospitals, color: 'text-blue-600', icon: '🏨' },
          { label: 'Registered Donors', value: stats.totalDonors, color: 'text-teal-600', icon: '👥' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface-card border border-hairline p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center space-x-4">
            <span className="text-4xl">{stat.icon}</span>
            <div>
              <div className={`text-2xl sm:text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-semibold text-body uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Feature Pillars Grid */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-800">Designed for National Emergency Response</h2>
          <p className="text-sm text-body max-w-lg mx-auto">Providing critical logistics workflows optimized for speed, clarity, and instant access across India.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Pan-India e-RaktKosh Sync',
              desc: 'Direct synchronization with official e-RaktKosh database covering 36 States/UTs, tracking Government, Private, and Red Cross blood reserves.',
              emoji: '🇮🇳'
            },
            {
              title: 'GPS Proximity & Haversine Math',
              desc: 'Hospitals identify nearest available blood stock in real-time with calculated distance (km) and estimated transit response times.',
              emoji: '🗺️'
            },
            {
              title: 'Automated Expiry & Low Stock Alerts',
              desc: 'Daily evaluation of inventory batches triggers multi-channel warnings when supplies fall within 5 days of expiry.',
              emoji: '⏰'
            }
          ].map((feat, idx) => (
            <div key={idx} className="bg-surface-card border border-hairline p-8 rounded-2xl shadow-sm space-y-4 hover:-translate-y-1 transition duration-200">
              <span className="inline-flex p-3 bg-slate-50 rounded-xl text-3xl">{feat.emoji}</span>
              <h3 className="text-lg font-bold text-slate-800">{feat.title}</h3>
              <p className="text-sm text-body leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Demo Logins Panel */}
      <section className="bg-surface-card border border-hairline text-ink rounded-3xl p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-[10px] bg-rose-100 text-[#d04200] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-rose-200">
                1-Click Role Exploration
              </span>
              <h3 className="text-xl font-bold mt-2">Instant Demo Accounts</h3>
              <p className="text-xs text-body mt-1 max-w-xl">
                Explore the platform instantly with pre-seeded role credentials across national administration, blood banks, hospitals, and voluntary donors.
              </p>
            </div>
            
            <button
              onClick={async () => {
                if (window.confirm('Reset database back to pan-India e-RaktKosh seeds?')) {
                  await resetMockDb()
                  alert('Database reset successfully! Reloading...')
                  window.location.reload()
                }
              }}
              className="px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl shadow-none transition whitespace-nowrap"
            >
              Reset e-RaktKosh DB Seeds ↺
            </button>
          </div>

          <div className="border-t border-hairline pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Admin ( National Portal )', email: 'admin@eraktkosh.gov.in', pass: 'admin123', desc: 'Approve centres, audit inventory', color: 'hover:border-rose-300' },
                { label: 'Blood Bank ( Indian Red Cross )', email: 'redcross@blood.org', pass: 'bank123', desc: 'Manage stock, dispatch units', color: 'hover:border-rose-300' },
                { label: 'Hospital ( AIIMS New Delhi )', email: 'aiims.delhi@blood.org', pass: 'hosp123', desc: 'Geo-search stock, emergency SOS', color: 'hover:border-rose-300' },
                { label: 'Donor ( Rahul Sharma • O- )', email: 'rahul.sharma@gmail.com', pass: 'donor123', desc: 'Accept SOS invites, toggle status', color: 'hover:border-rose-300' },
              ].map((p, idx) => (
                <Link
                  key={idx}
                  to={`/login?email=${encodeURIComponent(p.email)}&password=${encodeURIComponent(p.pass)}`}
                  className={`border border-hairline ${p.color} p-4 rounded-xl text-left transition flex flex-col justify-between bg-slate-50/50 hover:bg-surface-card hover:shadow-sm`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{p.label}</div>
                    <div className="text-[11px] text-muted mt-1">{p.desc}</div>
                  </div>
                  <div className="text-[10px] text-body font-mono mt-3 bg-slate-100 px-2 py-1 rounded border border-hairline/60">
                    {p.email} • {p.pass}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
