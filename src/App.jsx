import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import BloodBank from './pages/BloodBank'
import Hospital from './pages/Hospital'
import Donor from './pages/Donor'
import Login from './pages/Login'
import Register from './pages/Register'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import NotificationToastOverlay from './components/notifications/NotificationToastOverlay'

export default function App(){
  const location = useLocation()
  const fullScreenDashboards = ['/hospital', '/bloodbank', '/admin', '/donor', '/login', '/register']
  const isFullScreen = fullScreenDashboards.includes(location.pathname)

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors">
      <NotificationToastOverlay />
      {!isFullScreen && <Navbar />}
      <main className={isFullScreen ? '' : 'p-4 sm:p-6'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hospital" element={<ProtectedRoute roles={["hospital"]}><Hospital /></ProtectedRoute>} />
          <Route path="/bloodbank" element={<ProtectedRoute roles={["blood_bank"]}><BloodBank /></ProtectedRoute>} />
          <Route path="/donor" element={<ProtectedRoute roles={["donor"]}><Donor /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminPanel /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<div className="p-16 text-center text-sm text-muted">Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  )
}
