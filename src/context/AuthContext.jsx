import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { initMockDb } from '../utils/mockDb'
import { dataApi } from '../utils/api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const AuthContext = createContext()

export function AuthProvider({ children }){
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')||'null'))
  const [isMockMode, setIsMockMode] = useState(dataApi.isMock)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    if (isDarkMode) {
      localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    } else {
      localStorage.setItem('theme', 'light')
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(()=>{
    if (isMockMode) initMockDb(); // Seed browser mock database only when explicitly enabled
  },[isMockMode])

  useEffect(()=>{
    if(token) localStorage.setItem('token', token); else localStorage.removeItem('token')
  },[token])

  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user')
  },[user])

  const login = async (email, password)=>{
    if (isMockMode) {
      const data = await dataApi.login(email, password)
      setToken(data.token)
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: data.status,
        profileId: data.profileId
      })
      return data
    } else {
      const res = await axios.post(`${API}/api/auth/login`, {email, password})
      const data = res.data
      setToken(data.token)
      setUser({role: data.role, status: data.status, name: data.name, email: data.email, phone: data.phone, id: data.id, profileId: data.profileId})
      return data
    }
  }

  const register = async (role, payload)=>{
    if (isMockMode) {
      return dataApi.register(role, payload)
    } else {
      const res = await axios.post(`${API}/api/auth/register/${role}`, payload)
      return res.data
    }
  }

  const logout = ()=>{ 
    setToken(null)
    setUser(null) 
  }

  const authFetch = (opts)=>{
    const headers = opts.headers||{}
    if(token) headers['Authorization'] = `Bearer ${token}`
    return axios({ baseURL: API, ...opts, headers })
  }

  const refreshUserStatus = async () => {
    if (!user) return null
    try {
      if (isMockMode) {
        const users = JSON.parse(localStorage.getItem('blood_users') || '[]')
        const updated = users.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())
        if (updated) {
          const newUser = { ...user, status: updated.status, role: updated.role, name: updated.name }
          setUser(newUser)
          return newUser
        }
      } else {
        const res = await axios.get(`${API}/api/admin/users`)
        const users = res.data || []
        const updated = users.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())
        if (updated) {
          const newUser = { ...user, status: updated.status, role: updated.role, name: updated.name }
          setUser(newUser)
          return newUser
        }
      }
    } catch (e) {
      console.error('Error refreshing user status:', e)
    }
    return user
  }

  // Helper to force reset mock DB to initial seed values
  const resetMockDb = async () => {
    if (isMockMode) {
      initMockDb(true);
    } else {
      await dataApi.resetSeedData();
    }

    if (user) {
      logout();
    } else {
      window.location.reload();
    }
  }

  return (
    <AuthContext.Provider value={{token, user, login, logout, register, authFetch, isMockMode, setIsMockMode, resetMockDb, refreshUserStatus, isDarkMode, setIsDarkMode}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = ()=> useContext(AuthContext)
