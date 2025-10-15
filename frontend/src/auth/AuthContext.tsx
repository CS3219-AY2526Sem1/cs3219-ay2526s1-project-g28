import { createContext, useContext, useEffect, useState } from "react";

type User = { id?: string; username?: string; email?: string } | null;

type AuthCtx = {
  user: User;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser]   = useState<User>(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const login = (t: string, u: any) => {
  setToken(t);
  setUser(u ?? null);
  localStorage.setItem("token", t);
  u ? localStorage.setItem("user", JSON.stringify(u)) : localStorage.removeItem("user");
};

  const logout = () => {
    setToken(null); 
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // optional: call backend /auth/logout if you add it later
  };

  // keep localStorage in sync if user is updated elsewhere
  useEffect(() => {
    user ? localStorage.setItem("user", JSON.stringify(user)) : localStorage.removeItem("user");
  }, [user]);

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
