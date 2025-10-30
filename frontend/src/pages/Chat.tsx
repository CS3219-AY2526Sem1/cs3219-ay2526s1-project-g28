import React, { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

// Only Vite env; fallback to same-origin (use a dev proxy)
// const API_BASE = import.meta.env.VITE_API_URL || "";
const API_BASE = 3000;

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I’m your test bot. Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, loading]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    setErr(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);

    const payload = {
      messages: [
        { role: "system", content: "You are a concise, helpful assistant." },
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user", content },
      ],
    };

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch(`http://localhost:${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(
          `API ${resp.status} ${resp.statusText} — ${txt.slice(0, 200)}`
        );
      }

      const reader = resp.body?.getReader?.();
      if (!reader) {
        const full = await resp.text();
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
        setLoading(false);
        return;
      }

      const dec = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          if (!frame.startsWith("event:")) continue;

          if (frame.startsWith("event: chunk")) {
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            try {
              const data = JSON.parse(line.slice(5));
              const delta: string = data?.text ?? "";
              if (delta) {
                setMessages((m) => {
                  const copy = m.slice();
                  const last = copy[copy.length - 1];
                  copy[copy.length - 1] = {
                    ...last,
                    content: (last.content || "") + delta,
                  };
                  return copy;
                });
              }
            } catch {}
          }

          if (frame.startsWith("event: error")) {
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            try {
              const data = line && JSON.parse(line.slice(5));
              setErr(data?.message || "Stream error");
            } catch {
              setErr("Stream error");
            }
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setErr(e?.message || "Network/stream error");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxHeight: "100vh",
      }}
    >
      <header
        style={{
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          fontWeight: 600,
        }}
      >
        Chat
      </header>

      <div
        ref={scrollerRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
          gap: 12,
          display: "flex",
          flexDirection: "column",
          background: "#f9fafb",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "75%",
              borderRadius: 16,
              padding: "8px 12px",
              whiteSpace: "pre-wrap",
              marginLeft: m.role === "user" ? "auto" : undefined,
              marginRight: m.role === "assistant" ? "auto" : undefined,
              background: m.role === "user" ? "#3b82f6" : "#fff",
              color: m.role === "user" ? "#fff" : "#111",
              border: m.role === "assistant" ? "1px solid #e5e7eb" : "none",
            }}
          >
            {m.content}
          </div>
        ))}
        {err && <div style={{ color: "#ef4444", fontSize: 12 }}>{err}</div>}
      </div>

      <form
        onSubmit={send}
        style={{
          padding: 12,
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#111827",
            color: "#fff",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={!loading}
          style={{ padding: "10px 12px", borderRadius: 10 }}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
