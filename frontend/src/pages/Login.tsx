// src/pages/Login.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
export default function Login() {
  const [email,setEmail]=useState(""); 
  const [password,setPassword]=useState(""); 
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  
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
      email: res.data.email,
      isAdmin: res.data.isAdmin,
      createdAt: res.data.createdAt,
      };

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
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-lg font-semibold text-center">Login to get started</h1>
        <input className="w-full border rounded-md px-3 py-2" type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full border rounded-md px-3 py-2" type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full rounded-md bg-black text-white py-2.5">{loading?"Loading…":"Login"}</button>
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
  );
}
