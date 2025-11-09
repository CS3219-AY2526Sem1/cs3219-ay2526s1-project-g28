// src/pages/Login.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { API_BASE } from "@/lib/config";
import Header from "@/components/Header";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  function oauth(provider: "google" | "github") {
    const path = `/auth/${provider}`;
    const href = API_BASE ? `${API_BASE}${path}` : path;
    window.location.href = href;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api("/auth/login", { method: "POST", body: { email, password } });
      const token = res?.data?.accessToken;

      const user = {
        id: res.data.id,
        username: res.data.username,
        fullname: res.data.fullname,
        avatarUrl: res.data.avatarUrl,
        email: res.data.email,
        isAdmin: res.data.isAdmin,
        createdAt: res.data.createdAt,
      };

      if (!token) throw new Error("Missing token from server");
      login(token, user);
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header variant="authing" />

      {/* softer dark background + subtle gradient */}
      <div className="min-h-screen flex items-center justify-center px-6
                      bg-white
                      dark:bg-neutral-950 dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),rgba(0,0,0,0)_60%)]">

        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm
                     bg-white text-neutral-900
                     dark:bg-neutral-900 dark:text-neutral-100
                     rounded-2xl shadow
                     border border-neutral-200 dark:border-neutral-800
                     p-6 space-y-3"
        >
          <h1 className="text-lg font-semibold text-center">Login to get started</h1>

          {/* Email */}
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md px-3 py-2
           border-2 border-neutral-300
           focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500
           text-neutral-900 placeholder-neutral-500 caret-neutral-700
           dark:bg-neutral-900 dark:border-neutral-700
           dark:text-neutral-100 dark:placeholder-neutral-400 dark:caret-neutral-200"

          />

          {/* Password */}
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md px-3 py-2
           border-2 border-neutral-300
           focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500
           text-neutral-900 placeholder-neutral-500 caret-neutral-700
           dark:bg-neutral-900 dark:border-neutral-700
           dark:text-neutral-100 dark:placeholder-neutral-400 dark:caret-neutral-200"

          />

          {/* Primary button */}
          <button
            disabled={loading}
            className="w-full rounded-md py-2.5 font-medium
                       bg-black text-white hover:opacity-90 active:opacity-80
                       disabled:opacity-60
                       dark:bg-white dark:text-black dark:hover:opacity-90"
          >
            {loading ? "Loading…" : "Login"}
          </button>

          {/* OAuth buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => oauth("google")}
              className="w-full rounded-md py-2.5 font-medium
                         border-2 border-neutral-900
                         hover:bg-neutral-50
                         dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            >
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => oauth("github")}
              className="w-full rounded-md py-2.5 font-medium
                         border-2 border-neutral-900
                         hover:bg-neutral-50
                         dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            >
              Continue with GitHub
            </button>
          </div>

          {/* Error message (if any) */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center pt-1">
              {error}
            </p>
          )}

          {/* Links */}
          <p className="text-center text-sm text-neutral-700 dark:text-neutral-300 pt-2">
            Don’t have an account?{" "}
            <Link to="/signup" className="font-semibold underline">
              Sign up
            </Link>
          </p>

          <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
            Forgot password? Click{" "}
            <Link to="/reset-password" className="font-semibold underline">
              here
            </Link>{" "}
            to reset
          </p>
        </form>
      </div>
    </div>
  );
}
