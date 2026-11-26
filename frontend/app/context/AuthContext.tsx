"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService, AuthApiError, type AuthUser } from "@/services/auth";
import {
  clearSession,
  getTokenExpiryMs,
  loadSession,
  saveSession,
} from "@/services/session";

type User = AuthUser;

interface AuthContextType {
  isAuthenticated: boolean;
  /** False until the stored session has been read on the client. */
  isInitialized: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Links a Stellar public key to the signed-in account. */
  linkWallet: (stellarPublicKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Read the stored session after mount so server and client markup match.
  useEffect(() => {
    const session = loadSession();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from browser storage after mount */
    if (session) {
      setToken(session.token);
      setUser(session.user);
    }
    setIsInitialized(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearSession();
  }, []);

  // End the session when the JWT expires.
  useEffect(() => {
    if (!token) return;
    const expiry = getTokenExpiryMs(token);
    if (expiry === null) return;
    const delay = Math.min(Math.max(expiry - Date.now(), 0), 2 ** 31 - 1);
    const timer = setTimeout(logout, delay);
    return () => clearTimeout(timer);
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    saveSession(result.token, result.user);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await authService.register(email, password);
      const result = await authService.login(email, password);
      const nextUser = { ...result.user, name };
      saveSession(result.token, nextUser);
      setToken(result.token);
      setUser(nextUser);
    },
    [],
  );

  const linkWallet = useCallback(
    async (stellarPublicKey: string) => {
      if (!token || !user) throw new AuthApiError("You are not signed in.", 401);
      try {
        const updated = await authService.connectWallet(token, stellarPublicKey);
        const nextUser = {
          ...user,
          stellarPublicKey: updated.stellarPublicKey ?? stellarPublicKey,
        };
        saveSession(token, nextUser);
        setUser(nextUser);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) logout();
        throw err;
      }
    },
    [token, user, logout],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: !!token,
      isInitialized,
      user,
      token,
      login,
      register,
      linkWallet,
      logout,
    }),
    [token, user, isInitialized, login, register, linkWallet, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
