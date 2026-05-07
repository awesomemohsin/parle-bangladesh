"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin" | "moderator" | "super_admin" | "owner";
  customerType?: "retailer" | "dealer";
  status?: "active" | "disabled";
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  updateAuth: (user: User | null, token: string | null) => void;
  hasRole: (roles: string | string[]) => boolean;
}

const AUTH_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const updateAuth = useCallback((user: User | null, token: string | null) => {
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    setAuthState({
      user,
      token,
      isAuthenticated: !!token,
      isLoading: false,
      error: null,
    });
  }, []);

  const logout = useCallback(async () => {
    updateAuth(null, null);
    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch (e) {}

    router.push("/auth/login");
    router.refresh();
  }, [router, updateAuth]);

  // Sync from localStorage on mount and when storage changes in other tabs
  useEffect(() => {
    const sync = async () => {
      const token = localStorage.getItem(AUTH_STORAGE_KEY);
      const userStr = localStorage.getItem(USER_STORAGE_KEY);

      if (!token || !userStr) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const localUser = JSON.parse(userStr);
        
        // 1. Instant local restore
        setAuthState({
          user: localUser,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // 2. Background deep sync
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          console.log("[Auth] Session invalidated by server. Logging out...");
          logout();
        } else if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            // If any important field changed, update local state
            const serverUser = data.user;
            if (
              serverUser.customerType !== localUser.customerType || 
              serverUser.role !== localUser.role || 
              serverUser.status !== localUser.status ||
              serverUser.email !== localUser.email
            ) {
              console.log("[Auth] User profile updated, syncing local state...");
              updateAuth(serverUser, token);
            }
          } else {
            const text = await response.text();
            console.error("[Auth Sync] Expected JSON but received:", contentType, text.substring(0, 100));
          }
        }
      } catch (error) {
        console.error("Auth sync failed:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    sync();

    // Listen for storage events from other instances/tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY || e.key === USER_STORAGE_KEY) {
        const token = localStorage.getItem(AUTH_STORAGE_KEY);
        const userStr = localStorage.getItem(USER_STORAGE_KEY);
        if (!token || !userStr) {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } else {
          try {
            const user = JSON.parse(userStr);
            setAuthState({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (e) {}
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [logout, updateAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      updateAuth(data.user, data.token);
      return { success: true, user: data.user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      setAuthState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [updateAuth]);

  const hasRole = useCallback(
    (roles: string | string[]) => {
      if (!authState.user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(authState.user.role);
    },
    [authState.user]
  );

  const value = {
    ...authState,
    login,
    logout,
    updateAuth,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
