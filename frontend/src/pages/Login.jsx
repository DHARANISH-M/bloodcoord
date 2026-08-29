import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

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
    if (qEmail && qPass) {
      setEmail(qEmail)
      setPassword(qPass)
      
      // Auto login after a tiny delay for visual feedback
      const timer = setTimeout(() => {
        autoSubmit(qEmail, qPass)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const autoSubmit = async (m, p) => {
    setIsLoading(true)
    setErr(null)
    try {
      const data = await login(m, p)
      redirectUser(data.role)
    } catch (e) {
      setErr(e.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const submit = async (e)=>{
    e.preventDefault()
    setIsLoading(true)
    setErr(null)
    try{
      const data = await login(email, password)
      redirectUser(data.role)
    }catch(err){ 
      setErr(err.message || 'Login failed. Please verify credentials.') 
    } finally {
      setIsLoading(false)
    }
  }

  const redirectUser = (role) => {
    if (role === 'admin') navigate('/admin')
    else if (role === 'blood_bank') navigate('/bloodbank')
    else if (role === 'hospital') navigate('/hospital')
    else if (role === 'donor') navigate('/donor')
    else navigate('/')
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Welcome Eyebrow & Branding */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-body block">
            WELCOME BACK
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🩸</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink font-condensed">
              BLOODCOORD
            </h1>
          </div>
          <p className="text-xs text-body leading-relaxed max-w-sm">
            Log in to manage blood requests, track stock, and coordinate with your network.
          </p>
        </div>

        {/* Error message */}
        {err && (
          <div className="p-3.5 bg-[#f54e00]/10 border border-hairline text-[#d04200] text-xs font-semibold rounded-xl text-center">
            ⚠️ {err}
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-body">Email or Hospital ID</label>
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
                className="w-full bg-canvas border border-hairline rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-body">Password</label>
              <a href="#" className="text-[11px] text-[#f54e00] font-bold hover:underline">
                Forgot password?
              </a>
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
                className="w-full bg-canvas border border-hairline rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition"
                required
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
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-xl shadow-none transition disabled:opacity-50 flex items-center justify-center space-x-2 text-xs tracking-widest uppercase font-sans mt-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-4 border-t border-hairline">
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
