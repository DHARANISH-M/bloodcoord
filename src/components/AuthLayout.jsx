import React from 'react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Subtle brand red decorative background circles */}
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-[#f54e00]/10 rounded-full filter blur-[90px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-[#f54e00]/10 rounded-full filter blur-[90px] pointer-events-none"></div>

      {/* Spacious center split card: Left Visual, Right Form */}
      <div className="w-full max-w-4xl lg:max-w-5xl bg-surface-card border border-hairline rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[580px] relative z-10 my-auto">
        
        {/* LEFT HALF: Visual artwork (full-bleed, same split height) */}
        <div className="w-full md:w-5/12 bg-surface-card relative overflow-hidden min-h-[220px] md:min-h-full flex flex-col justify-between p-6 md:p-8 border-b md:border-b-0 md:border-r border-hairline bg-gradient-to-br from-surface-card to-canvas-soft">
          <div className="relative z-10 space-y-2 text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f54e00]/10 border border-[#f54e00]/20 text-[#f54e00] text-[11px] font-bold uppercase tracking-wider">
              <span>🩸</span>
              <span>Blood Coordination Network</span>
            </div>
            <h2 className="text-2xl font-black text-ink tracking-tight font-condensed">
              Saving Lives Across Cities & Hospitals
            </h2>
            <p className="text-xs text-body leading-relaxed">
              Real-time inventory mapping, instant emergency requests, and nearest donor matching.
            </p>
          </div>

          <div className="relative my-4 flex items-center justify-center">
            <img 
              src="/donate_blood.png" 
              alt="Donate blood, save a life illustration" 
              className="w-full max-w-[280px] h-auto object-contain rounded-2xl drop-shadow-md"
            />
          </div>

          <div className="relative z-10 text-left pt-2 border-t border-hairline/60 text-[11px] text-muted">
            📍 Connected with PostGIS-equivalent proximity math
          </div>
        </div>

        {/* RIGHT HALF: Form content with comfortable padding */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-surface-card text-left">
          {children}
        </div>

      </div>
    </div>
  )
}
