import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { api } from "../lib/api";
import CenteredSpinner from "../components/CenteredSpinner";
export default function ProtectedRoute() {
  const { token, logout } = useAuth();
  const [ok, setOk] = useState<null | boolean>(null); // null = checking

  useEffect(() => {
    let isMounted = true;

    async function check() {
      if (!token) { setOk(false); return; }
      try {
        // backend returns 200 if token valid; api() adds Authorization header from localStorage
        await api("/auth/verify-token", { method: "GET" });
        if (isMounted) setOk(true);
      } catch {
        logout();
        if (isMounted) setOk(false);
      }
    }

    check();
    return () => { isMounted = false; };
  }, [token, logout]);

  if (ok === null) return <CenteredSpinner />;

  return ok ? <Outlet /> : <Navigate to="/login" replace />;
}
