import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

const DEMO_ACCOUNTS = [
  { role: 'Blood Bank', name: 'Dhanvantri Blood Bank (Sathyamangalam)', email: 'dctsathy11@gmail.com', pass: 'bank123', icon: '📍' },
  { role: 'Hospital', name: 'GH Sathyamangalam Hospital', email: 'gh.sathy@blood.org', pass: 'hosp123', icon: '🏥' },
  { role: 'Blood Bank', name: 'GH Gobichettipalayam Centre', email: 'bbghgobi@gmail.com', pass: 'bank123', icon: '🩸' },
  { role: 'Hospital', name: 'Bannari Amman Health Centre (Sathy)', email: 'healthcentre.bitsathy@blood.org', pass: 'hosp123', icon: '🏥' },
  { role: 'Donor', name: 'Karthik Selvan (O+ Sathyamangalam)', email: 'karthik.sathy@gmail.com', pass: 'donor123', icon: '👤' },
  { role: 'Admin', name: 'National eRaktKosh Admin', email: 'admin@eraktkosh.gov.in', pass: 'admin123', icon: '⚡' },
  { role: 'Blood Bank', name: 'Indian Red Cross HQ', email: 'redcross@blood.org', pass: 'bank123', icon: '🩸' },
  { role: 'Hospital', name: 'AIIMS New Delhi', email: 'aiims.delhi@blood.org', pass: 'hosp123', icon: '🏥' },
]

export default function Login(){
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const qEmail = searchParams.get('email')
    const qPass = searchParams.get('password')
    if (qEmail) {
      setEmail(qEmail)
      if (qPass) {
        setPassword(qPass)
        // Auto login after a short delay for visual confirmation
        const timer = setTimeout(() => {
          autoSubmit(qEmail, qPass)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [searchParams])

  const redirectUser = (role) => {
    if (role === 'admin') navigate('/admin')
    else if (role === 'blood_bank') navigate('/bloodbank')
    else if (role === 'hospital') navigate('/hospital')
    else if (role === 'donor') navigate('/donor')
    else navigate('/dashboard')
  }

  const autoSubmit = async (m, p) => {
    setIsLoading(true)
    setErr(null)
    try {
      const data = await login(m, p)
      redirectUser(data.role)
    } catch (e) {
      setErr(e.message || 'Login failed. Please verify your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const submit = async (e)=>{
    e.preventDefault()
    if (!email.trim() || !password) {
      setErr('Please provide both email and password.')
      return
    }

    setIsLoading(true)
    setErr(null)
    try {
      const data = await login(email.trim(), password)
      redirectUser(data.role)
    } catch(err) { 
      setErr(err.message || 'Invalid email or password. Please verify credentials.') 
    } finally {
      setIsLoading(false)
    }
  }

  const selectDemoAccount = (acc) => {
    setEmail(acc.email)
    setPassword(acc.pass)
    setErr(null)
  }

  return (
    <AuthLayout>
      <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-1">
        {/* Welcome Eyebrow & Branding */}
        <div className="space-y-2 text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f54e00] block">
            WELCOME BACK
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🩸</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink font-condensed">
              BLOODCOORD
            </h1>
          </div>
          <p className="text-xs text-body leading-relaxed max-w-sm">
            Sign in to coordinate blood logistics, manage inventory, and respond to emergencies.
          </p>
        </div>

        {/* Error message */}
        {err && (
          <div className="p-3.5 bg-[#f54e00]/10 border border-hairline text-[#d04200] text-xs font-semibold rounded-xl text-left flex items-start space-x-2">
            <span className="text-sm">⚠️</span>
            <span className="flex-1">{err}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-muted">
                <svg className="w-4 h-4 text-body/60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </span>
              <input 
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                placeholder="e.g. contact@domain.org" 
                className="w-full bg-canvas border border-hairline rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-body">Password</label>
              <Link to="/register" className="text-[11px] text-[#f54e00] font-bold hover:underline">
                New user? Register
              </Link>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-muted">
                <svg className="w-4 h-4 text-body/60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </span>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                placeholder="••••••••••••" 
                className="w-full bg-canvas border border-hairline rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 focus:outline-none text-muted hover:text-ink text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2 text-xs tracking-widest uppercase font-sans mt-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Quick Demo Login Fast Switcher */}
        <div className="pt-3 border-t border-hairline text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-body">
              ⚡ Quick Demo Logins:
            </span>
            <span className="text-[9px] text-muted">Click to fill</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => selectDemoAccount(acc)}
                className="p-2 rounded-xl border border-hairline bg-canvas hover:bg-canvas-soft transition text-left flex items-center space-x-2"
              >
                <span className="text-base">{acc.icon}</span>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-ink truncate">{acc.role}</div>
                  <div className="text-[9px] text-muted truncate">{acc.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-hairline">
          <p className="text-xs text-body">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#f54e00] font-bold hover:underline ml-1">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
