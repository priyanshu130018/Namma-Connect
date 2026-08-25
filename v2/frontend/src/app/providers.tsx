import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types";
import { GoogleOAuthProvider } from "@react-oauth/google";

import {
  loginUser,
  registerUser,
  googleLoginUser,
  getCurrentUser,
  logoutUser,
  LoginPayload,
  RegisterPayload,
  TokenResponse,
} from "@/services/authService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginPayload) => Promise<TokenResponse>;
  register: (payload: RegisterPayload) => Promise<TokenResponse>;
  googleLogin: (credential: string) => Promise<TokenResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  register: async () => { throw new Error("AuthProvider not mounted"); },
  googleLogin: async () => { throw new Error("AuthProvider not mounted"); },
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("nc_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const syncTokensAndUser = (tokens: TokenResponse) => {
    localStorage.setItem("nc_access_token", tokens.access_token);
    localStorage.setItem("nc_refresh_token", tokens.refresh_token);
    localStorage.setItem("nc_user", JSON.stringify(tokens.user));
    setUser(tokens.user);
  };

  const clearSession = () => {
    localStorage.removeItem("nc_access_token");
    localStorage.removeItem("nc_refresh_token");
    localStorage.removeItem("nc_user");
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("nc_access_token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const liveUser = await getCurrentUser();
      setUser(liveUser);
      localStorage.setItem("nc_user", JSON.stringify(liveUser));
    } catch {
      // Preserve cached user during offline mode or unit testing
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginPayload): Promise<TokenResponse> => {
    setIsLoading(true);
    try {
      const data = await loginUser(credentials);
      syncTokensAndUser(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<TokenResponse> => {
    setIsLoading(true);
    try {
      const data = await registerUser(payload);
      syncTokensAndUser(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (credential: string): Promise<TokenResponse> => {
    setIsLoading(true);
    try {
      const data = await googleLoginUser(credential);
      syncTokensAndUser(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      clearSession();
    }
  };

  const isAuthenticated = Boolean(user && localStorage.getItem("nc_access_token"));

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { ThemeProvider, useTheme } from "./theme";
import { I18nProvider, useTranslation, useLanguage } from "@/i18n";

export { useTheme, useTranslation, useLanguage };

export function AppProviders({ children }: { children: React.ReactNode }) {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
