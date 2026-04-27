"use client";

import React, { createContext, useContext, useState } from "react";

interface User {
  name?: string;
  email: string;
}
 
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lazy initializer to read auth from localStorage on mount
function getInitialAuth(): { isAuthenticated: boolean; user: User | null } {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, user: null };
  }
  const storedAuth = localStorage.getItem("stellarproof_auth");
  if (storedAuth) {
    try {
      const parsed = JSON.parse(storedAuth);
      if (parsed.isAuthenticated && parsed.user) {
        return { isAuthenticated: parsed.isAuthenticated, user: parsed.user };
      }
    } catch (e) {
      console.error("Failed to parse auth from localStorage", e);
    }
    return null;
  });

  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock validation
        if (password) {
          const authState = {
            isAuthenticated: true,
            user: { email },
          };
          setAuthState(authState);
          localStorage.setItem("stellarproof_auth", JSON.stringify(authState));
          resolve();
        } else {
          reject(new Error("Invalid credentials"));
        }
      }, 1000);
    });
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password && name) {
          const authState = {
            isAuthenticated: true,
            user: { name, email },
          };
          setAuthState(authState);
          localStorage.setItem("stellarproof_auth", JSON.stringify(authState));
          resolve();
        } else {
          reject(new Error("Missing required fields"));
        }
      }, 1000);
    });
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, user: null });
    localStorage.removeItem("stellarproof_auth");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
