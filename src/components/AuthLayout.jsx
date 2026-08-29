import React from 'react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle brand red decorative background circles */}
      <div className="absolute -top-32 -left-32 w-[350px] h-[350px] bg-[#f54e00]/10 rounded-full filter blur-[80px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-[350px] h-[350px] bg-[#f54e00]/10 rounded-full filter blur-[80px] pointer-events-none"></div>

      {/* Compact center split card: Left Visual, Right Form */}
      <div className="w-full max-w-3xl bg-surface-card border border-hairline rounded-2xl shadow-none overflow-hidden flex flex-col md:flex-row min-h-[460px] relative z-10">
        
        {/* LEFT HALF: Visual artwork (full-bleed, same split height, automatically cropped to fit) */}
        <div className="w-full md:w-1/2 bg-surface-card relative overflow-hidden min-h-[200px] md:min-h-auto flex">
          <img 
            src="/donate_blood.png" 
            alt="Donate blood, save a life illustration" 
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* RIGHT HALF: Form content */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center bg-surface-card border-t md:border-t-0 md:border-l border-hairline text-left">
          {children}
        </div>

      </div>
    </div>
  )
}
