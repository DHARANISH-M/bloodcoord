import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('BloodCoord React ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (_) {}
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-rose-500/30">
              🩸
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Application Notice</h1>
              <p className="text-sm text-slate-400">
                A rendering issue occurred. You can reload the application or reset local cache.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-xl text-left border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto max-h-40">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#f54e00] hover:bg-[#d04200] text-white text-xs font-bold rounded-xl transition"
              >
                Reload Page ↺
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Clear Local Cache & Return Home 🏠
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
