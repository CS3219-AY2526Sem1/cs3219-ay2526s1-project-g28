// src/pages/Dashboard.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

export default function Dashboard() {
  const [code, setCode] = useState("X123X456");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);

  const codeOk = /^[A-Za-z0-9]{6,12}$/.test(code);

  async function handleCreate() {
    setLoading("create");
    try {
      // TODO: call your matching service -> POST /lobbies
      await new Promise((r) => setTimeout(r, 800));
      alert("(placeholder) Lobby created! Code: ABC123");
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin() {
    if (!codeOk) return;
    setLoading("join");
    try {
      // TODO: call your matching service -> POST /lobbies/join { code }
      await new Promise((r) => setTimeout(r, 800));
      alert(`(placeholder) Joining lobby ${code}…`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top bar */}
        <Header variant="authed" level={10}/>

      {/* Body */}
      <main className="mx-auto max-w-6xl px-4">
        <div className="py-16 grid md:grid-cols-2 gap-12 items-start">
          {/* Left: Create Lobby */}
          <div className="w-full grid place-items-center">
            <button
              onClick={handleCreate}
              disabled={loading !== null}
              className="w-[360px] rounded-md bg-black text-white py-3.5 font-medium disabled:opacity-60 mt-16"
            >
                
              {loading === "create" ? "Creating…" : "Create Lobby"}
            </button>
          </div>

          {/* Right: Join Lobby */}
          <div className="w-full">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6">Enter Lobby Code</h2>
            <div className="mx-auto max-w-md space-y-4">
              <input
                className="w-full bg-white border border-neutral-300 rounded-md px-4 py-3 text-center tracking-wider uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={12}
              />
              
        {/* Center “OR” between columns on large screens */}
      
              <button
                onClick={handleJoin}
                disabled={!codeOk || loading !== null}
                className="w-full rounded-md bg-black text-white py-3.5 font-medium disabled:opacity-60"
              >
                {loading === "join" ? "Joining…" : "Join Lobby"}
              </button>
              {!codeOk && (
                <p className="text-center text-sm text-red-600">
                  Code must be 6–12 letters/numbers.
                </p>
              )}
            </div>
          </div>
        </div>

      </main>

      <div className="h-6" />
    </div>
  );
}
