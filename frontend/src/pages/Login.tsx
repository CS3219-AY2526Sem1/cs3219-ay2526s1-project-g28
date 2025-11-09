// src/pages/Login.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { API_BASE } from "@/lib/config";
import Header from "@/components/Header";
export default function Login() {
  const [email,setEmail]=useState(""); 
  const [password,setPassword]=useState(""); 
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  function oauth(provider: "google" | "github") {
    // If API_BASE is absolute, use it. If it's blank or relative, fall back to same-origin.
    const path = `/auth/${provider}`;
    const href = API_BASE ? `${API_BASE}${path}` : path;
    window.location.href = href;
  }

  async function onSubmit(e:React.FormEvent){ 
    e.preventDefault(); 
    setLoading(true);
    
    try {
      
      // school template: POST /auth/login -> { token, user }
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
      console.log("Login response user:", user);

      if (!token) throw new Error("Missing token from server");
      login(token, user);
      navigate("/home", { replace: true });

    } catch (err:any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div>
      <Header variant="authing"/>
    
    <div className="min-h-screen flex items-center justify-center px-6 dark:bg-black">
    
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-lg font-semibold text-center dark:text-black">Login to get started</h1>
        <input className="w-full rounded-md px-3 py-2
             border-2 border-black
             focus:outline-none focus:ring-2 focus:ring-black focus:border-black dark:text-black" type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-md px-3 py-2
             border-2 border-black
             focus:outline-none focus:ring-2 focus:ring-black focus:border-black dark:text-black" type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full rounded-md bg-black text-white py-2.5">{loading?"Loading…":"Login"}</button>
        <div className="pt-2 space-y-2">
  <button
    type="button"
    onClick={() => oauth("google")}
    className="w-full rounded-md border-2 border-black py-2.5 dark:text-black"
  >
    Continue with Google
  </button>
  <button
    type="button"
    onClick={() => oauth("github")}
    className="w-full rounded-md border-2 border-black py-2.5 dark:text-black"
  >
    Continue with GitHub
  </button>
</div>

         <p className="text-center text-sm text-neutral-700 pt-2">
          Don’t have an account?{" "}
          <Link to="/signup" className="font-semibold underline">
            Sign up
          </Link>
        </p>

        <p className="text-center text-sm text-neutral-700">
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
