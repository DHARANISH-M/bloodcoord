import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

const LOCATION_PRESETS = [
  { label: 'Sathyamangalam (Erode)', address: 'Mysore Trunk Road, Sathyamangalam, Erode, Tamil Nadu 638401', district: 'Erode', lat: 11.5034, lng: 77.2444 },
  { label: 'Erode (Central)', address: 'EVN Road, Erode, Tamil Nadu 638009', district: 'Erode', lat: 11.3410, lng: 77.7172 },
  { label: 'Coimbatore (Central)', address: 'Trichy Road, Coimbatore, Tamil Nadu 641018', district: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { label: 'Chennai (Central)', address: 'EVR Periyar Salai, Chennai, Tamil Nadu 600003', district: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { label: 'Bengaluru (Central)', address: 'MG Road, Bengaluru, Karnataka 560001', district: 'Bangalore Urban', lat: 12.9716, lng: 77.5946 },
  { label: 'Delhi NCR (Central)', address: 'Connaught Place, New Delhi, Delhi 110001', district: 'New Delhi', lat: 28.6304, lng: 77.2177 },
  { label: 'Mumbai (South)', address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012', district: 'Mumbai', lat: 19.0028, lng: 72.8428 },
  { label: 'Kolkata (Salt Lake)', address: 'Sector V, Salt Lake, Kolkata, West Bengal 700091', district: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { label: 'Hyderabad (Banjara)', address: 'Road No 2, Banjara Hills, Hyderabad, Telangana 500034', district: 'Hyderabad', lat: 17.4156, lng: 78.4357 },
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export default function Register(){
  const { register, login } = useAuth()
  const navigate = useNavigate()
  
  // Form fields
  const [role, setRole] = useState('hospital') // 'hospital' | 'blood_bank' | 'donor'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Location fields
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [gpsStatus, setGpsStatus] = useState(null)

  // Donor-specific fields
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [lastDonationDate, setLastDonationDate] = useState('')

  // UI / Password visibility
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation & message states
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(null)

  // Apply a location preset
  const applyPreset = (preset) => {
    setAddress(preset.address)
    setDistrict(preset.district)
    setLat(preset.lat.toString())
    setLng(preset.lng.toString())
    setGpsStatus({ 
      type: 'success', 
      text: `Preset loaded: ${preset.label} (${preset.district})` 
    })
    if (errors.address || errors.district) {
      setErrors(prev => ({ ...prev, address: null, district: null }))
    }
  }

  // Reverse geocode lat/lng to formatted street address and district
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal
        }
      )
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data && data.address) {
          const a = data.address
          const road = a.road || a.pedestrian || a.street || a.building || ''
          const houseNo = a.house_number ? `${a.house_number} ` : ''
          const suburbOrCity = a.suburb || a.city_district || a.neighbourhood || a.city || a.town || a.county || ''
          const state = a.state || ''
          const postcode = a.postcode || ''

          let autoAddress = data.display_name
          if (road) {
            autoAddress = `${houseNo}${road}, ${suburbOrCity}${state ? ', ' + state : ''}${postcode ? ' ' + postcode : ''}`.trim()
          }

          const autoDistrict = a.city_district || a.suburb || a.city || a.town || suburbOrCity || 'Local Area'

          setAddress(autoAddress)
          setDistrict(autoDistrict)
          return { autoAddress, autoDistrict }
        }
      }
    } catch (e) {
      console.warn('Reverse geocode service timed out or unavailable, using coordinate fallbacks.', e)
    }
    return null
  }

  // Browser GPS auto-detection with automatic address auto-fill
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus({ type: 'error', text: 'Geolocation is not supported by your browser.' })
      return
    }

    setIsDetectingGps(true)
    setGpsStatus({ type: 'info', text: '📡 Acquiring GPS position & resolving address...' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude.toFixed(6)
        const longitude = position.coords.longitude.toFixed(6)
        setLat(latitude)
        setLng(longitude)

        // Auto-fill address via reverse geocoding
        const geocodeResult = await reverseGeocode(latitude, longitude)
        setIsDetectingGps(false)

        if (geocodeResult) {
          setGpsStatus({
            type: 'success',
            text: `📍 GPS & Address Auto-Filled: ${geocodeResult.autoDistrict}`
          })
        } else {
          // Fallback if reverse geocode is slow/blocked
          if (!district) setDistrict('Detected Area')
          if (!address) setAddress(`Lat ${latitude}, Lng ${longitude}`)
          setGpsStatus({
            type: 'success',
            text: `📍 GPS coordinates captured (${latitude}, ${longitude}). You can edit street address.`
          })
        }

        if (errors.address || errors.district) {
          setErrors(prev => ({ ...prev, address: null, district: null }))
        }
      },
      (err) => {
        setIsDetectingGps(false)
        let errorMsg = 'Unable to retrieve location.'
        if (err.code === 1) errorMsg = 'Location access denied. Please allow GPS or select a Quick Preset below.'
        else if (err.code === 2) errorMsg = 'Position unavailable. Please select a Quick Preset below.'
        else if (err.code === 3) errorMsg = 'GPS request timed out. Please try a Quick Preset.'
        setGpsStatus({ type: 'error', text: errorMsg })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  const validate = () => {
    const tempErrors = {}
    if (!name.trim()) {
      tempErrors.name = role === 'donor' ? 'Full name is required' : 'Organization name is required'
    }
    if (!email.trim()) {
      tempErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email address format'
    }
    if (!phone.trim()) {
      tempErrors.phone = 'Contact phone number is required'
    }
    if (!address.trim()) {
      tempErrors.address = 'Street address is required (use GPS or Preset)'
    }
    if (!district.trim()) {
      tempErrors.district = 'City or district is required'
    }
    if (!password) {
      tempErrors.password = 'Password is required'
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters'
    }
    if (password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match'
    }
    if (role === 'donor' && !bloodGroup) {
      tempErrors.bloodGroup = 'Blood group is required'
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

    // Fallback lat/lng if not detected or left empty
    const finalLat = parseFloat(lat) || 40.7588
    const finalLng = parseFloat(lng) || -73.9851

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      address: address.trim(),
      district: district.trim(),
      lat: finalLat,
      lng: finalLng,
    }

    if (role === 'donor') {
      payload.blood_group = bloodGroup
      payload.last_donation_date = lastDonationDate || null
    }

    try {
      const res = await register(role, payload)
      setRegistrationSuccess({
        role,
        name: payload.name,
        email: payload.email,
        password: payload.password,
        status: role === 'donor' ? 'approved' : 'pending',
        message: res.message || (role === 'donor'
          ? 'Your donor profile is active and ready!'
          : 'Registration request submitted! Your account is queued for admin approval.')
      })
      setMsg(res.message || 'Registration successful!')
    } catch(err) { 
      setIsError(true)
      setMsg(err.message || 'Registration failed. Please check inputs and try again.') 
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstantLogin = async () => {
    if (!registrationSuccess) return
    setIsLoading(true)
    try {
      const data = await login(registrationSuccess.email, registrationSuccess.password)
      if (data.role === 'donor') navigate('/donor')
      else if (data.role === 'blood_bank') navigate('/bloodbank')
      else if (data.role === 'hospital') navigate('/hospital')
      else navigate('/')
    } catch (e) {
      navigate(`/login?email=${encodeURIComponent(registrationSuccess.email)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-5 max-h-[85vh] overflow-y-auto pr-1">
        {/* Signup Header */}
        <div className="space-y-1 text-left pb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f54e00] block font-mono">
            JOIN BLOODCOORD NETWORK
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-condensed">
            Register New Account
          </h1>
          <p className="text-xs text-body leading-relaxed">
            Fill in your organization details and location coordinates for emergency dispatch.
          </p>
        </div>

        {/* Success Screen after registration */}
        {registrationSuccess ? (
          <div className="bg-surface-card border border-emerald-300/80 p-6 rounded-2xl text-left space-y-4 shadow-sm animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {registrationSuccess.role === 'donor' ? 'Account Active & Verified!' : 'Registration Submitted!'}
                </h3>
                <p className="text-xs text-body font-medium">
                  {registrationSuccess.message}
                </p>
              </div>
            </div>

            <div className="p-4 bg-canvas rounded-xl text-xs space-y-2 border border-hairline font-mono">
              <div className="flex justify-between">
                <span className="text-body font-sans font-semibold">Account Name:</span>
                <span className="font-bold text-ink">{registrationSuccess.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body font-sans font-semibold">Email:</span>
                <span className="font-semibold text-ink">{registrationSuccess.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body font-sans font-semibold">Role:</span>
                <span className="uppercase font-bold text-[#f54e00]">{registrationSuccess.role.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body font-sans font-semibold">Status:</span>
                <span className={`uppercase font-extrabold ${registrationSuccess.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {registrationSuccess.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {registrationSuccess.role === 'donor' ? (
                <button
                  onClick={handleInstantLogin}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition text-center shadow-sm"
                >
                  {isLoading ? 'Signing In...' : 'Log In to Donor Console →'}
                </button>
              ) : (
                <Link
                  to={`/login?email=${encodeURIComponent(registrationSuccess.email)}`}
                  className="flex-1 py-3 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition text-center shadow-sm"
                >
                  Proceed to Sign In →
                </Link>
              )}
              <button
                onClick={() => {
                  setRegistrationSuccess(null)
                  setName('')
                  setEmail('')
                  setPhone('')
                  setPassword('')
                  setConfirmPassword('')
                  setAddress('')
                  setDistrict('')
                  setLat('')
                  setLng('')
                  setGpsStatus(null)
                }}
                className="py-3 px-4 bg-canvas border border-hairline hover:bg-canvas-soft text-body font-bold rounded-xl text-xs uppercase tracking-wider transition text-center"
              >
                Register Another
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Global Alert / Toast Message */}
            {msg && (
              <div className={`p-3 border rounded-xl text-xs font-semibold text-center ${
                isError ? 'bg-[#f54e00]/10 border-[#f54e00]/30 text-[#d04200]' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {isError ? '⚠️' : '✅'} {msg}
              </div>
            )}

            {/* 1. Account Role Switcher */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-body">
                1. Select Account Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'hospital', label: 'Hospital', icon: '🏥', desc: 'Request blood' },
                  { id: 'blood_bank', label: 'Blood Bank', icon: '🩸', desc: 'Manage stock' },
                  { id: 'donor', label: 'Donor', icon: '👤', desc: 'Volunteer' },
                ].map((r) => {
                  const isSelected = role === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRole(r.id)
                        setErrors({})
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                        isSelected
                          ? 'border-[#f54e00] bg-[#f54e00]/10 text-ink shadow-sm ring-1 ring-[#f54e00]'
                          : 'border-hairline bg-canvas hover:bg-canvas-soft text-body'
                      }`}
                    >
                      <span className="text-xl">{r.icon}</span>
                      <span className="text-xs font-bold block leading-none">{r.label}</span>
                      <span className="text-[9px] text-muted hidden sm:block">{r.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={submit} className="space-y-4">
              
              {/* 2. Contact & Identity Information */}
              <div className="space-y-3 text-left">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-body block">
                  2. Organization / Personal Info
                </label>

                {/* Name & Phone in 2-column row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Organization or Full Name */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-body">
                      {role === 'donor' ? 'Full Name' : 'Organization Name'} <span className="text-[#f54e00]">*</span>
                    </label>
                    <input 
                      type="text"
                      value={name} 
                      onChange={e=>setName(e.target.value)} 
                      placeholder={role === 'donor' ? 'e.g. Alex Rivera' : 'e.g. Bellevue General Hospital'} 
                      className={`w-full bg-canvas border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.name ? 'border-[#f54e00]' : 'border-hairline'}`}
                      disabled={isLoading}
                    />
                    {errors.name && <span className="text-[10px] text-[#d04200] font-bold block">{errors.name}</span>}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-body">
                      Contact Phone <span className="text-[#f54e00]">*</span>
                    </label>
                    <input 
                      type="tel"
                      value={phone} 
                      onChange={e=>setPhone(e.target.value)} 
                      placeholder="+1 555-0199" 
                      className={`w-full bg-canvas border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.phone ? 'border-[#f54e00]' : 'border-hairline'}`}
                      disabled={isLoading}
                    />
                    {errors.phone && <span className="text-[10px] text-[#d04200] font-bold block">{errors.phone}</span>}
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-bold text-body">
                    Email Address (Login ID) <span className="text-[#f54e00]">*</span>
                  </label>
                  <input 
                    type="email"
                    value={email} 
                    onChange={e=>setEmail(e.target.value)} 
                    placeholder="e.g. contact@bellevue.org" 
                    className={`w-full bg-canvas border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.email ? 'border-[#f54e00]' : 'border-hairline'}`}
                    disabled={isLoading}
                  />
                  {errors.email && <span className="text-[10px] text-[#d04200] font-bold block">{errors.email}</span>}
                </div>

                {/* Donor-Specific Fields */}
                {role === 'donor' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#f54e00]/5 border border-[#f54e00]/20 rounded-2xl">
                    <div className="space-y-1 text-left">
                      <label className="text-[11px] font-bold text-body flex items-center space-x-1">
                        <span>Blood Group</span>
                        <span className="text-[#f54e00]">*</span>
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={e=>setBloodGroup(e.target.value)}
                        className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                      >
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[11px] font-bold text-body">Last Donation (Optional)</label>
                      <input 
                        type="date"
                        value={lastDonationDate}
                        onChange={e=>setLastDonationDate(e.target.value)}
                        className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-[#f54e00]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. LOCATION SECTION (Auto-detection & Auto-fill Address) */}
              <div className="p-4 bg-canvas-soft border border-hairline rounded-2xl space-y-3.5 text-left shadow-sm">
                <div className="flex justify-between items-center flex-wrap gap-2 pb-1 border-b border-hairline/60">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base">📍</span>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-ink">
                      3. Location & Operating Area
                    </label>
                  </div>

                  {/* Auto-detect GPS button with Auto-fill */}
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingGps}
                    className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-white bg-[#f54e00] hover:bg-[#d04200] px-3.5 py-1.5 rounded-xl transition shadow-sm disabled:opacity-50"
                  >
                    {isDetectingGps ? (
                      <>
                        <span className="animate-spin text-xs">⏳</span>
                        <span>Auto-Filling Address...</span>
                      </>
                    ) : (
                      <>
                        <span>📍</span>
                        <span>Auto-Detect & Fill Address</span>
                      </>
                    )}
                  </button>
                </div>

                {/* GPS Status feedback */}
                {gpsStatus && (
                  <div className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl flex items-center justify-between transition-all ${
                    gpsStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    gpsStatus.type === 'error' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    <span>{gpsStatus.text}</span>
                    <button type="button" onClick={() => setGpsStatus(null)} className="text-muted hover:text-ink text-xs ml-2 font-bold">×</button>
                  </div>
                )}

                {/* Street Address (Auto-filled on GPS or editable) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-body">
                      Street Address <span className="text-[#f54e00]">*</span>
                    </label>
                    <span className="text-[10px] text-muted">Auto-filled or manual</span>
                  </div>
                  <input 
                    type="text"
                    value={address} 
                    onChange={e=>setAddress(e.target.value)} 
                    placeholder="e.g. 462 1st Ave, New York, NY 10016" 
                    className={`w-full bg-canvas border rounded-xl px-3.5 py-2 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.address ? 'border-[#f54e00]' : 'border-hairline'}`}
                    disabled={isLoading}
                  />
                  {errors.address && <span className="text-[10px] text-[#d04200] font-bold block">{errors.address}</span>}
                </div>

                {/* District & Coordinates in 3-column row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-body">
                      City / District <span className="text-[#f54e00]">*</span>
                    </label>
                    <input 
                      type="text"
                      value={district} 
                      onChange={e=>setDistrict(e.target.value)} 
                      placeholder="e.g. Manhattan" 
                      className={`w-full bg-canvas border rounded-xl px-3 py-2 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] transition ${errors.district ? 'border-[#f54e00]' : 'border-hairline'}`}
                      disabled={isLoading}
                    />
                    {errors.district && <span className="text-[10px] text-[#d04200] font-bold block">{errors.district}</span>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-body">Latitude</label>
                    <input 
                      type="number"
                      step="any"
                      value={lat} 
                      onChange={e=>setLat(e.target.value)} 
                      placeholder="40.7388" 
                      className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2 text-xs font-mono font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] transition"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-body">Longitude</label>
                    <input 
                      type="number"
                      step="any"
                      value={lng} 
                      onChange={e=>setLng(e.target.value)} 
                      placeholder="-73.9765" 
                      className="w-full bg-canvas border border-hairline rounded-xl px-3 py-2 text-xs font-mono font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] transition"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Quick Area Presets */}
                <div className="pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted block mb-1.5">
                    ⚡ Quick Area Presets (Auto-fills Coordinates & Address):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {LOCATION_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-hairline bg-canvas hover:bg-canvas-soft hover:border-[#f54e00] text-body hover:text-ink transition shadow-xs"
                      >
                        📍 {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Security Passwords */}
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-body block">
                  4. Account Password
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-body">
                      Password <span className="text-[#f54e00]">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={password} 
                        onChange={e=>setPassword(e.target.value)} 
                        placeholder="Min 6 characters" 
                        className={`w-full bg-canvas border rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.password ? 'border-[#f54e00]' : 'border-hairline'}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 focus:outline-none text-muted hover:text-ink text-sm"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {errors.password && <span className="text-[10px] text-[#d04200] font-bold block">{errors.password}</span>}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-body">
                      Confirm Password <span className="text-[#f54e00]">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword} 
                        onChange={e=>setConfirmPassword(e.target.value)} 
                        placeholder="Confirm password" 
                        className={`w-full bg-canvas border rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f54e00] focus:bg-surface-card transition ${errors.confirmPassword ? 'border-[#f54e00]' : 'border-hairline'}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 focus:outline-none text-muted hover:text-ink text-sm"
                      >
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {errors.confirmPassword && <span className="text-[10px] text-[#d04200] font-bold block">{errors.confirmPassword}</span>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#f54e00] hover:bg-[#d04200] text-white font-bold rounded-2xl shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-2 text-xs tracking-widest uppercase font-sans mt-3"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <span>Register {role === 'hospital' ? 'Hospital' : role === 'blood_bank' ? 'Blood Bank' : 'Donor'} Account →</span>
                )}
              </button>
            </form>

            {/* Footer Link */}
            <div className="text-center pt-3 border-t border-hairline">
              <p className="text-xs text-body">
                Already have an account?{' '}
                <Link to="/login" className="text-[#f54e00] font-bold hover:underline ml-1">
                  Sign in here
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
