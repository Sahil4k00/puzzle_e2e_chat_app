import { createContext, useContext, useEffect, useState } from "react";

import { AUTH_STORAGE_KEY, readJson, removeItem, writeJson } from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedSession = readJson(AUTH_STORAGE_KEY);

    if (storedSession?.token && storedSession?.user) {
      setSession(storedSession);
    }

    setReady(true);
  }, []);

  function saveSession(nextSession) {
    setSession(nextSession);
    writeJson(AUTH_STORAGE_KEY, nextSession);
  }

  function logout() {
    setSession(null);
    removeItem(AUTH_STORAGE_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        session,
        token: session?.token || null,
        user: session?.user || null,
        isAuthenticated: Boolean(session?.token),
        saveSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}