"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem("stellarproof_auth");
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.isAuthenticated && parsed.user) {
          setIsAuthenticated(parsed.isAuthenticated);
          setUser(parsed.user);
        }
      } catch (e) {
        console.error("Failed to parse auth from localStorage", e);
      }
    }
    setIsHydrated(true);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock validation
        if (password) {
          const authState = {
            isAuthenticated: true,
            user: { email },
          };
          setIsAuthenticated(authState.isAuthenticated);
          setUser(authState.user);
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
          setIsAuthenticated(authState.isAuthenticated);
          setUser(authState.user);
          localStorage.setItem("stellarproof_auth", JSON.stringify(authState));
          resolve();
        } else {
          reject(new Error("Missing required fields"));
        }
      }, 1000);
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("stellarproof_auth");
  };

  // Prevent rendering children until hydrated to avoid hydration mismatch
  if (!isHydrated) return null;

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
