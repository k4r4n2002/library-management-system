import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi, adminTokenStore } from "../lib/api";

interface AdminAuthState {
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminTokenStore.get()) {
      setLoading(false);
      return;
    }
    adminApi
      .get<{ email: string }>("/api/auth/me")
      .then((res) => setEmail(res.email))
      .catch(() => adminTokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await adminApi.post<{ email: string; token: string }>("/api/auth/login", { email, password });
    adminTokenStore.set(res.token);
    setEmail(res.email);
  }

  function logout() {
    adminTokenStore.clear();
    setEmail(null);
  }

  return (
    <AdminAuthContext.Provider value={{ email, loading, login, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
