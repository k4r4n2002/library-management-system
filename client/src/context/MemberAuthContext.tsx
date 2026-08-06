import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { memberApi, memberTokenStore } from "../lib/api";

interface MemberAuthState {
  memberId: string | null;
  name: string | null;
  loading: boolean;
  login: (name: string, passcode: string) => Promise<void>;
  logout: () => void;
}

const MemberAuthContext = createContext<MemberAuthState | null>(null);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberTokenStore.get()) {
      setLoading(false);
      return;
    }
    memberApi
      .get<{ memberId: string; name: string }>("/api/member-auth/me")
      .then((res) => {
        setMemberId(res.memberId);
        setName(res.name);
      })
      .catch(() => memberTokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function login(name: string, passcode: string) {
    const res = await memberApi.post<{ memberId: string; name: string; token: string }>(
      "/api/member-auth/login",
      { name, passcode }
    );
    memberTokenStore.set(res.token);
    setMemberId(res.memberId);
    setName(res.name);
  }

  function logout() {
    memberTokenStore.clear();
    setMemberId(null);
    setName(null);
  }

  return (
    <MemberAuthContext.Provider value={{ memberId, name, loading, login, logout }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error("useMemberAuth must be used within MemberAuthProvider");
  return ctx;
}
