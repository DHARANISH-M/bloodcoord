import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { mockApi, initMockDb } from '../utils/mockDb'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const AuthContext = createContext()

export function AuthProvider({ children }){
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')||'null'))
  const [isMockMode, setIsMockMode] = useState(true) // Always default to mock since there's no backend in workspace
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
    initMockDb(); // Seed database on mount
  },[])

  useEffect(()=>{
    if(token) localStorage.setItem('token', token); else localStorage.removeItem('token')
  },[token])

  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user')
  },[user])

  const login = async (email, password)=>{
    if (isMockMode) {
      const data = mockApi.login(email, password)
      setToken(data.token)
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        profileId: data.profileId
      })
      return data
    } else {
      const res = await axios.post(`${API}/api/auth/login`, {email, password})
      const data = res.data
      setToken(data.token)
      setUser({role: data.role, status: data.status, name: data.name, id: data.id, profileId: data.profileId})
      return data
    }
  }

  const register = async (role, payload)=>{
    if (isMockMode) {
      return mockApi.register(role, payload)
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

  // Helper to force reset mock DB to initial seed values
  const resetMockDb = () => {
    initMockDb(true);
    // Refresh user state if they are logged in to avoid inconsistency
    if (user) {
      logout();
    } else {
      // Trigger a window reload to refresh the state of all components
      window.location.reload();
    }
  }

  return (
    <AuthContext.Provider value={{token, user, login, logout, register, authFetch, isMockMode, setIsMockMode, resetMockDb, isDarkMode, setIsDarkMode}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = ()=> useContext(AuthContext)
