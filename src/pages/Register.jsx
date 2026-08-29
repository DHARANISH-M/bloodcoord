import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function Register(){
  const { register } = useAuth()
  const navigate = useNavigate()
  
  const [name, setName] = useState('')
  const [role, setRole] = useState('hospital') // 'hospital' or 'blood_bank'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation & message states
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const tempErrors = {}
    if (!name.trim()) tempErrors.name = 'Organization name is required'
    if (!email.trim()) {
      tempErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email format'
    }
    if (!password) {
      tempErrors.password = 'Password is required'
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters'
    }
    if (password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match'
    }
    setErrors(tempErrors)
    return Object.keys(tempErrors).length === 0
  }

  const submit = async (e)=>{
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setMsg(null)
    setIsError(false)

    // Under-the-hood defaults to keep the proximity mapping calculations intact
    const payload = {
      name,
      email,
      phone: '+1 555-0100', // Auto default phone
      password,
      address: role === 'hospital' ? '100 Bellevue Ave, New York, NY' : '200 Red Cross St, New York, NY',
      district: 'Manhattan',
      lat: 40.7588,
      lng: -73.9851
    }

    try{
      const res = await register(role, payload)
      setMsg(res.message || 'Registration request sent successfully! Waiting for admin approval.')
      // Clear inputs
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    }catch(err){ 
      setIsError(true)
      setMsg(err.message || 'Registration failed. Please check inputs.') 
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Signup Eyebrow & Branding */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-body block">
            CREATE YOUR ACCOUNT
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🩸</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink font-condensed">
              BLOODCOORD
            </h1>
          </div>
          <p className="text-xs text-body leading-relaxed max-w-sm">
            Register your hospital or blood bank to join the network.
          </p>
        </div>

        {/* Global Alert / Toast Message */}
        {msg && (
          <div className={`p-3.5 border rounded-xl text-xs font-semibold text-center ${
            isError ? 'bg-[#f54e00]/10 border-hairline text-[#d04200]' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            {isError ? '⚠️' : '✅'} {msg}
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={submit} className="space-y-4">
          
          {/* Organization Name */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">Organization Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-muted">
                <svg className="w-4 h-4 text-body/60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </span>
              <input 
                type="text"
                value={name} 
                onChange={e=>setName(e.target.value)} 
                placeholder="e.g. Memorial General Hospital" 
                className={`w-full bg-canvas border rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.name ? 'border-[#f54e00]' : 'border-hairline'}`}
                disabled={isLoading}
              />
            </div>
            {errors.name && <span className="text-[10px] text-[#d04200] font-bold mt-1 block">{errors.name}</span>}
          </div>

          {/* Organization Type Select */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">Organization Type</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-muted">
                <svg className="w-4 h-4 text-body/60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </span>
              <select 
                value={role} 
                onChange={e=>setRole(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition appearance-none"
                disabled={isLoading}
              >
                <option value="hospital">Hospital / Medical Center</option>
                <option value="blood_bank">Blood Bank Hub</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-body">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-muted">
                <svg className="w-4 h-4 text-body/60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              <input 
                type="email"
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                placeholder="e.g. contact@domain.org" 
                className={`w-full bg-canvas border rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.email ? 'border-[#f54e00]' : 'border-hairline'}`}
                disabled={isLoading}
              />
            </div>
            {errors.email && <span className="text-[10px] text-[#d04200] font-bold mt-1 block">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">Security Password</label>
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
                placeholder="Min 6 characters" 
                className={`w-full bg-canvas border rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.password ? 'border-[#f54e00]' : 'border-hairline'}`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-4 h-4 text-body/70 hover:text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-body/70 hover:text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="text-[10px] text-[#d04200] font-bold mt-1 block">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-muted">
                <svg className="w-4 h-4 text-body/60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </span>
              <input 
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword} 
                onChange={e=>setConfirmPassword(e.target.value)} 
                placeholder="Confirm password" 
                className={`w-full bg-canvas border rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.confirmPassword ? 'border-[#f54e00]' : 'border-hairline'}`}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg className="w-4 h-4 text-body/70 hover:text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-body/70 hover:text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-[10px] text-[#d04200] font-bold mt-1 block">{errors.confirmPassword}</span>}
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-xl shadow-none transition disabled:opacity-50 flex items-center justify-center space-x-2 text-xs tracking-widest uppercase font-sans mt-2"
          >
            {isLoading ? (
              <span>Creating account...</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-4 border-t border-hairline">
          <p className="text-xs text-body">
            Already have an account?{' '}
            <Link to="/login" className="text-[#f54e00] font-bold hover:underline ml-1">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
