import React, { useEffect, useRef, useState, useCallback } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import pythonLang from "react-syntax-highlighter/dist/esm/languages/prism/python";
import javascriptLang from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import javaLang from "react-syntax-highlighter/dist/esm/languages/prism/java";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";

// Register languages exactly once
SyntaxHighlighter.registerLanguage("python", pythonLang);
SyntaxHighlighter.registerLanguage("javascript", javascriptLang);
SyntaxHighlighter.registerLanguage("java", javaLang);

const STICKY_THRESHOLD = 120;

// Types
export type Msg = { role: "user" | "assistant"; content: string };
export type Example = { id: number; input: string; output: string; explanation?: string };
export type ChatQuestion = {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  problemStatement: string;
  examples?: Example[];
  testCases?: any[];
  codeSnippets?: { language: "python" | "javascript" | "java"; code: string }[];
};

const API_BASE = import.meta.env.VITE_API_URL || "";

/** Simple hook to reflect presence of `dark` class on <html> */
function useIsDark() {
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function renderMarkdown(text: string, isDark: boolean) {
  const out: React.ReactNode[] = [];
  const fence = /```([a-zA-Z0-9+\-_]*)?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const renderInline = (t: string) => {
    const codeSplit = t.split(/(`[^`]+`)/g);
    return codeSplit.map((chunk, i) => {
      if (chunk.startsWith("`") && chunk.endsWith("`")) {
        return (
          <code
            key={`code-${i}`}
            className="font-mono rounded-md px-1.5 border"
            style={{
              background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
            }}
          >
            {chunk.slice(1, -1)}
          </code>
        );
      }
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
          <p key={`p-${last}-${i}`} className="mb-2 whitespace-pre-wrap">
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
        style={isDark ? oneDark : oneLight}
        customStyle={{
          borderRadius: 10,
          margin: 0,
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
        <p key={`tail-${last}-${i}`} className="mb-2 whitespace-pre-wrap">
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
  language?: "python" | "javascript" | "java";
  code?: string;
  sessionId: string;
}) {
  const isDark = useIsDark();
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

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, STORAGE_KEY]);

  useEffect(() => {
    sessionStorage.setItem(`${STORAGE_KEY}:input`, input);
  }, [input, STORAGE_KEY]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const isNearBottom = distanceFromBottom < STICKY_THRESHOLD;
    // smooth when user just sent; instant while streaming to avoid jitter
    scrollToBottom(!loading && isNearBottom);
  }, [messages, loading, scrollToBottom]);

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

    setMessages((m) => [
      ...m,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
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
        {
          role: "system",
          content: `CURRENT_QUESTION_CONTEXT_JSON=${contextJson}`,
        },
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

  function quickExplain() {
    return send(
      undefined,
      "Explain the current question in simple terms, then outline a plan, pseudocode, and common pitfalls."
    );
  }
  function quickHint() {
    return send(
      undefined,
      "Give me a gentle hint for this question. Don't reveal the full solution yet."
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      <header className="px-3 py-2 border-b font-semibold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 dark:text-zinc-100">
        Chat
      </header>

      {/* Quick actions */}
      <div className="px-3 py-2 flex gap-2 border-b bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={quickExplain}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100"
        >
          Explain this question
        </button>
        <button
          type="button"
          onClick={quickHint}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100"
        >
          Give me a hint
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-auto p-3 bg-slate-50 dark:bg-zinc-900">
        <div className="min-h-full flex flex-col justify-end gap-3">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={[
                  "max-w-[75%] rounded-2xl px-3 py-2 leading-relaxed",
                  isUser
                    ? "self-end bg-blue-600 text-white text-right"
                    : "self-start bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 shadow-sm",
                ].join(" ")}
              >
                {isUser ? m.content : renderMarkdown(m.content, isDark)}
              </div>
            );
          })}
          <div className="h-2" />
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex gap-2 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border rounded-xl px-3 py-3 bg-white dark:bg-zinc-800 placeholder-slate-400 dark:placeholder-zinc-400 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={!loading}
          className="px-3 py-3 rounded-xl border bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 disabled:opacity-60"
        >
          Cancel
        </button>
      </form>

      {/* Error banner */}
      {err && (
        <div className="px-3 py-2 text-sm bg-red-50 text-red-700 border-t border-red-200">
          {err}
        </div>
      )}
    </div>
  );
}
