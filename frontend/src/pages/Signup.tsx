// src/pages/Signup.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import Header from "@/components/Header";
import OAuthButtons from "@/components/OAuthButtons";
export default function Signup() {
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const pwOk = password.length >= 8;
  const match = password === confirm;
  const canSubmit = username && email && pwOk && match && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      // 1) create user
      await api("/users", { method: "POST", body: { username, fullname, email, password } });

      // 2) login to get token
      const auth = await api("/auth/login", { method: "POST", body: { email, password } });
      const token = auth?.data?.accessToken;
      if (!token) throw new Error("Missing token after signup");

      const user = {
        id: auth.data.id,
        username: auth.data.username,
        fullname: auth.data.fullname,
        email: auth.data.email,
        isAdmin: auth.data.isAdmin,
        createdAt: auth.data.createdAt,
      };

      login(token, user);
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div >
        <Header variant="authing"/>
   
    <div className="min-h-screen flex items-center justify-center px-6 bg-neutral-50 dark:bg-black">
        
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl shadow p-6 space-y-4
                   bg-white border border-neutral-200
                   dark:bg-neutral-900 dark:border-neutral-800"
      >
        <h1 className="text-xl font-semibold text-center text-neutral-900 dark:text-neutral-100">
          Create your account
        </h1>

        {error && (
          <div className="text-sm rounded p-2
                          text-red-700 bg-red-50 border border-red-200
                          dark:text-red-300 dark:bg-red-950/40 dark:border-red-900">
            {error}
          </div>
        )}

        <Input
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
        />
         <Input
          type="text"
          placeholder="Full Name"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
        />
        <Input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {!pwOk && password.length > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-300">Password must be at least 8 characters.</p>
        )}
        {password && confirm && !match && (
          <p className="text-xs text-red-700 dark:text-red-300">Passwords do not match.</p>
        )}

        <button
          disabled={!canSubmit}
          className="w-full rounded-md py-2.5 font-medium
                     bg-black text-white disabled:opacity-60
                     dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
        <OAuthButtons className="pt-2" labelPrefix="Sign up" />
        <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
     </div>
  );
}

/** Reusable input with light/dark styles */
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md px-3 py-2
                  bg-white text-neutral-900 border border-neutral-300
                  placeholder:text-neutral-400
                  focus:outline-none focus:ring-2 focus:ring-neutral-800/20 focus:border-neutral-400
                  dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700
                  dark:placeholder:text-neutral-500 dark:focus:ring-neutral-100/20 dark:focus:border-neutral-600`}
    />
  );
}
