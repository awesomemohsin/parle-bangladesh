'use client'

import { useAuthContext } from '@/lib/contexts/AuthContext'

/**
 * useAuth Hook
 * Now a wrapper around AuthContext to provide a unified state across the app.
 */
export function useAuth() {
  return useAuthContext();
}

export type { User, AuthState } from '@/lib/contexts/AuthContext'
