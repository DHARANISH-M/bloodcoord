import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mockApi } from '../utils/mockDb'

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
    try {
      const data = mockApi.getPublicDashboard()
      const totalUnits = Object.values(data.aggregate).reduce((acc, curr) => acc + curr, 0)
      const donors = JSON.parse(localStorage.getItem('blood_donors') || '[]')
      setStats({
        aggregate: data.aggregate,
        totalBanks: data.totalBanks,
        totalHospitals: data.totalHospitals,
        totalUnits: totalUnits,
        totalDonors: donors.length
      })
    } catch (e) {
      console.error(e)
    }
  }, [])

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-rose-200 to-rose-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]"></div>
        </div>

        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-[#f54e00]/10 border border-rose-100 text-[#f54e00] uppercase tracking-wider animate-pulse">
          🩸 Live Coordination Network Active
        </span>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tight leading-none">
          Bridging the Gap in <br />
          <span className="text-[#f54e00] bg-clip-text">Blood Logistics</span>
        </h1>
        
        <p className="text-lg text-body max-w-2xl mx-auto leading-relaxed">
          An automated, role-based resource coordination system connecting blood banks, hospitals, and donors. Backed by location proximity mapping and immediate emergency alerts.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link to="/dashboard" className="px-6 py-3.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-semibold rounded-2xl shadow-none hover:shadow-none transition-all duration-200">
            View Blood Availability
          </Link>
          <Link to="/register" className="px-6 py-3.5 bg-[#26251e] hover:bg-[#252523] text-white font-semibold rounded-2xl shadow-none hover:shadow-none transition-all duration-200">
            Register Organization / Donor
          </Link>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Units Available', value: stats.totalUnits, color: 'text-[#f54e00]', icon: '🩸' },
          { label: 'Blood Center Hubs', value: stats.totalBanks, color: 'text-slate-800', icon: '🏥' },
          { label: 'Partner Hospitals', value: stats.totalHospitals, color: 'text-blue-600', icon: '🏨' },
          { label: 'Registered Donors', value: stats.totalDonors, color: 'text-teal-600', icon: '👥' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface-card border border-hairline border-hairline p-6 rounded-2xl shadow-sm hover:shadow-none transition-shadow flex items-center space-x-4">
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
          <h2 className="text-3xl font-extrabold text-slate-800">Designed for Immediate Action</h2>
          <p className="text-sm text-body max-w-lg mx-auto">Providing critical logistics workflows optimized for speed, clarity, and ease of access.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Proximity Distance Sorting',
              desc: 'Hospitals search blood reserves based on distance, automatically sorted by geographical closest proximity (PostGIS equivalent) with a map layout.',
              color: 'rose',
              emoji: '🗺️'
            },
            {
              title: 'Multi-Channel Alert Triggers',
              desc: 'Urgent requests trigger automated alerts across in-app notifications, Nodemailer simulations, and Twilio SMS notification flows for instant response.',
              color: 'amber',
              emoji: '⚡'
            },
            {
              title: 'Unified Expiry Cron checks',
              desc: 'Automated node-cron checks evaluate blood inventory daily. Warnings trigger when batches fall inside 5-day margins, preventing critical resource loss.',
              color: 'teal',
              emoji: '⏰'
            }
          ].map((feat, idx) => (
            <div key={idx} className="bg-surface-card border border-hairline border-slate-50 p-8 rounded-2xl shadow-sm space-y-4 hover:-translate-y-1 transition duration-200">
              <span className="inline-flex p-3 bg-slate-50 rounded-xl text-3xl">{feat.emoji}</span>
              <h3 className="text-lg font-bold text-slate-800">{feat.title}</h3>
              <p className="text-sm text-body leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Developer Sandbox Panel */}
      <section className="bg-surface-card border border-hairline text-ink rounded-3xl p-8 shadow-none relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#f54e00] rounded-full filter blur-[120px] opacity-20 -z-0"></div>
        <div className="absolute left-0 top-0 w-80 h-80 bg-violet-600 rounded-full filter blur-[120px] opacity-10 -z-0"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-[10px] bg-canvas text-body font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest border border-hairline">
                Developer Sandbox Environment
              </span>
              <h3 className="text-xl font-bold mt-2">Interactive Mockup Controls</h3>
              <p className="text-xs text-body mt-1 max-w-xl">
                This project runs in an offline-first state by storing simulated database records inside your browser's LocalStorage. You can reset records or log in with demo roles below.
              </p>
            </div>
            
            <button
              onClick={() => {
                if (window.confirm('Reset local storage database back to initial seed data? This deletes custom updates.')) {
                  resetMockDb()
                  alert('Database reset successfully! Reloading...')
                  window.location.reload()
                }
              }}
              className="px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl shadow-none transition whitespace-nowrap"
            >
              Reset Mock DB to Seeds
            </button>
          </div>

          <div className="border-t border-t border-hairline pt-6">
            <span className="text-xs font-bold uppercase tracking-wider text-body block mb-3">
              ⚡ Quick Actions: Instant Demo Accounts Login
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Admin ( Sarah Carter )', email: 'admin@blood.org', pass: 'admin123', desc: 'Approve banks, resolve queries', color: 'border-hairline hover:bg-canvas' },
                { label: 'Blood Bank ( Midtown )', email: 'redcross@blood.org', pass: 'bank123', desc: 'Add inventory, trigger cron', color: 'border-[#f54e00]/40 hover:bg-[#f54e00]/10' },
                { label: 'Hospital ( Bellevue )', email: 'bellevue@blood.org', pass: 'hosp123', desc: 'Geo-search, raise requests', color: 'border-hairline hover:bg-canvas' },
                { label: 'Donor ( Jane - O- Group )', email: 'jane@gmail.com', pass: 'donor123', desc: 'Accept requests, toggle online', color: 'border-hairline hover:bg-canvas' },
              ].map((p, idx) => (
                <Link
                  key={idx}
                  to={`/login?email=${encodeURIComponent(p.email)}&password=${encodeURIComponent(p.pass)}`}
                  className={`border ${p.color} p-4 rounded-xl text-left transition flex flex-col justify-between`}
                >
                  <div>
                    <div className="text-xs font-bold text-ink">{p.label}</div>
                    <div className="text-[10px] text-body mt-1">{p.desc}</div>
                  </div>
                  <div className="text-[9px] text-body font-mono mt-3">
                    {p.email} / {p.pass}
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
