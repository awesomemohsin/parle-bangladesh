'use client'

import { useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  email: string
  name: string
  role: 'customer' | 'admin' | 'moderator' | 'super_admin'
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const AUTH_STORAGE_KEY = 'parle-auth-token'
const USER_STORAGE_KEY = 'parle-user'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Load auth from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY)
    const userStr = localStorage.getItem(USER_STORAGE_KEY)

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error('Failed to restore auth:', error)
        setAuthState((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)

    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  }, [])

  // Proactive Session Refresh Logic
  useEffect(() => {
    if (!authState.token || !authState.isAuthenticated) return;

    const checkAndRefresh = async () => {
      try {
        const payload = JSON.parse(atob(authState.token!.split('.')[1]));
        const timeUntilExp = payload.exp * 1000 - Date.now();

        // Refresh if less than 5 minutes remaining
        if (timeUntilExp < 5 * 60 * 1000) {
          const res = await fetch('/api/auth/refresh', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(AUTH_STORAGE_KEY, data.token);
            setAuthState(prev => ({ ...prev, token: data.token }));
          } else if (res.status === 401) {
            // Revoked or expired refresh token
            logout();
          }
        }
      } catch (e) {
        console.error("Session refresh check failed:", e);
      }
    };

    const interval = setInterval(checkAndRefresh, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [authState.token, authState.isAuthenticated, logout]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const data = await response.json()
      const { token, user } = data

      localStorage.setItem(AUTH_STORAGE_KEY, token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))

      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      return { success: true, user }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Registration failed')
      }

      const data = await response.json()
      const { token, user } = data

      localStorage.setItem(AUTH_STORAGE_KEY, token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))

      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      return { success: true, user }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [])



  const hasRole = useCallback(
    (roles: string | string[]) => {
      if (!authState.user) return false
      const roleArray = Array.isArray(roles) ? roles : [roles]
      return roleArray.includes(authState.user.role)
    },
    [authState.user]
  )

  return {
    ...authState,
    login,
    register,
    logout,
    hasRole,
  }
}
