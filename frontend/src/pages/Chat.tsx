import React, { useEffect, useRef, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("javascript", javascript);

type Msg = { role: "user" | "assistant"; content: string };

type Example = { id: number; input: string; output: string; explanation?: string };
type ChatQuestion = {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  problemStatement: string;
  examples?: Example[];
  testCases?: any[];
  codeSnippets?: { language: "python" | "javascript"; code: string }[];
};

const API_BASE = import.meta.env.VITE_API_URL || "";

function renderMarkdown(text: string) {
  const out: React.ReactNode[] = [];
  const fence = /```([a-zA-Z0-9+\-_]*)?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const renderInline = (t: string) => {
    // first split out inline code spans so we don't format inside them
    const codeSplit = t.split(/(`[^`]+`)/g);
    return codeSplit.map((chunk, i) => {
      if (chunk.startsWith("`") && chunk.endsWith("`")) {
        return (
          <code
            key={`code-${i}`}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              padding: "0 4px",
              borderRadius: 6,
            }}
          >
            {chunk.slice(1, -1)}
          </code>
        );
      }
      // handle **bold** and *italic* in the non-code parts
      const parts = chunk.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return parts.map((p, j) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) {
          return <strong key={`b-${i}-${j}`}>{p.slice(2, -2)}</strong>;
        }
        if (/^\*[^*]+\*$/.test(p)) {
          return <em key={`i-${i}-${j}`}>{p.slice(1, -1)}</em>;
        }
        return <span key={`t-${i}-${j}`}>{p}</span>;
      });
    });
  };

  while ((m = fence.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before.trim().length) {
      before.split(/\n{2,}/).forEach((para, i) => {
        out.push(
          <p key={`p-${last}-${i}`} style={{ margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}>
            {renderInline(para)}
          </p>
        );
      });
    }

    const lang = m[1] || "";
    const code = m[2].replace(/\n+$/, "");
    out.push(
      <SyntaxHighlighter
    key={`code-${m.index}`}
    language={(lang as any) || undefined}
    style={oneDark}
    customStyle={{
      borderRadius: 10,
      margin: 0,
      border: "1px solid #111827",
      fontSize: 13,
    }}
    showLineNumbers={false}
    wrapLongLines
  >
    {code}
  </SyntaxHighlighter>
    );

    last = fence.lastIndex;
  }

  const tail = text.slice(last);
  if (tail.trim().length) {
    tail.split(/\n{2,}/).forEach((para, i) => {
      out.push(
        <p key={`tail-${last}-${i}`} style={{ margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}>
          {renderInline(para)}
        </p>
      );
    });
  }
  return out;
}

export default function Chat({
  question,
  language,
  code,
  sessionId,
}: {
  question: ChatQuestion;
  language?: "python" | "javascript";
  code?: string;
  sessionId: string;
}) {
  const STORAGE_KEY = `peerprep:${sessionId}:chat`;

  const [messages, setMessages] = useState<Msg[]>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : [
          {
            role: "assistant",
            content:
              "Hi! I know your current PeerPrep problem. Ask me to explain it, discuss approaches, or request hints.",
          },
        ];
  });
  const [input, setInput] = useState(
    () => sessionStorage.getItem(`${STORAGE_KEY}:input`) || ""
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, STORAGE_KEY]);
  useEffect(() => {
    sessionStorage.setItem(`${STORAGE_KEY}:input`, input);
  }, [input, STORAGE_KEY]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, loading]);

  function buildContext() {
    const ctx = {
      title: question?.title,
      difficulty: question?.difficulty,
      statement: question?.problemStatement,
      examples: (question?.examples || []).map((e) => ({
        input: e.input,
        output: e.output,
        explanation: e.explanation,
      })),
      languagePreference: language,
      currentCode: code || "",
      hasCode: Boolean(code && code.trim()),
    };
    return JSON.stringify(ctx);
  }

  async function send(e?: React.FormEvent, forcedContent?: string) {
    e?.preventDefault();
    const content = (forcedContent ?? input).trim();
    if (!content || loading) return;

    setErr(null);
    if (!forcedContent) setInput("");

    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setLoading(true);

    const contextJson = buildContext();

    const payload = {
      messages: [
        {
          role: "system",
          content:
            "You are a concise coding interview tutor. You receive CURRENT_QUESTION_CONTEXT_JSON. " +
            "If hasCode=false or the user asks to explain code without code present, explain the question, outline an approach, pseudocode, and pitfalls. " +
            "If hasCode=true and the user asks about code, review the provided currentCode.",
        },
        { role: "system", content: `CURRENT_QUESTION_CONTEXT_JSON=${contextJson}` },
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user", content },
      ],
    };

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`API ${resp.status} ${resp.statusText} — ${txt.slice(0, 200)}`);
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
                  copy[copy.length - 1] = { ...last, content: (last.content || "") + delta };
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
      if (e?.name !== "AbortError") setErr(e?.message || "Network/stream error");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  function quickExplain() {
    return send(
      undefined,
      "Explain the current question in simple terms, then outline a plan, pseudocode, and common pitfalls."
    );
  }
  function quickHint() {
    return send(undefined, "Give me a gentle hint for this question. Don't reveal the full solution yet.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%" }}>
      <header style={{ padding: 12, borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>Chat</header>

      {/* Quick actions */}
      <div style={{ padding: 12, display: "flex", gap: 8, borderBottom: "1px solid #f1f5f9" }}>
        <button
          type="button"
          onClick={quickExplain}
          style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
        >
          Explain this question
        </button>
        <button
          type="button"
          onClick={quickHint}
          style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
        >
          Give me a hint
        </button>
      </div>

      {/* Messages */}
      <div
    style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end", // anchor to bottom
      gap: 12,
    }}
  >
        {messages.map((m, i) => {
      const isUser = m.role === "user";
      return (
        <div
          key={i}
          style={{
            maxWidth: "75%",
            alignSelf: isUser ? "flex-end" : "flex-start", // also aligns left/right
            borderRadius: 16,
            padding: "10px 14px",
            whiteSpace: "pre-wrap",
            background: isUser ? "#3b82f6" : "#fff",
            color: isUser ? "#fff" : "#111",
            border: !isUser ? "1px solid #e5e7eb" : "none",
            boxShadow: !isUser ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            textAlign: isUser ? "right" : "left",
          }}
        >
          {isUser ? m.content : renderMarkdown(m.content)}
        </div>
      );
    })}
        {/* Spacer so the last bubble never kisses the composer */}
    <div style={{ height: 8 }} />
      </div>

      {/* Composer (separate bar so it never overlaps the last message) */}
      <form
        onSubmit={send}
        style={{
          position: "sticky",
          bottom: 0,
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          padding: 12,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "12px 14px",
            background: "#fff",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#111827",
            color: "#fff",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Sending…" : "Send"}
        </button>
        <button type="button" onClick={cancel} disabled={!loading} style={{ padding: "12px 12px", borderRadius: 10 }}>
          Cancel
        </button>
      </form>
    </div>
  );
}
