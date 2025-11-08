import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const ran = useRef(false); // guard for StrictMode double-invoke

  useEffect(() => {
    if (ran.current) return;                // guard re-runs (StrictMode)
        ran.current = true;
 

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const displayName = params.get("displayName") || "";
    const avatarUrl = params.get("profilePic") || "";
    // optional extras if you include them in the URL:
    const id = params.get("id") || "oauth";
    const username = params.get("username") || displayName || "user";
    const email = params.get("email") || "";
    const provider = params.get("providers") || "oauth";

    console.log("OAuth login success, received params:", { token, displayName, avatarUrl, id, username, email,provider });
    
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
     // mark processed BEFORE we scrub or navigate
    sessionStorage.setItem("oauth_processed", "1");

    // Scrub token from URL bar to avoid it lingering in history
    window.history.replaceState({}, "", window.location.pathname);

    // Build a user object compatible with your AuthContext
    const user = { id, username, fullname: displayName, email, displayName, avatarUrl };

    // Reuse your existing localStorage-based login
    login(token, user);
    navigate("/home", { replace: true });
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Finishing login…</p>
    </div>
  );
}
