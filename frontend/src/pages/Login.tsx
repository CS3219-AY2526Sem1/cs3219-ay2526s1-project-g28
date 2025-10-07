// src/pages/Login.tsx
import { useState } from "react";
export default function Login() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false);
  async function onSubmit(e:React.FormEvent){ e.preventDefault(); setLoading(true); /* TODO: call /auth/login */ setLoading(false); }
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-lg font-semibold text-center">Login</h1>
        <input className="w-full border rounded-md px-3 py-2" type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full border rounded-md px-3 py-2" type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full rounded-md bg-black text-white py-2.5">{loading?"Loading…":"Login"}</button>
      </form>
    </div>
  );
}
