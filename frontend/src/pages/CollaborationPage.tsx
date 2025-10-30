import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Editor, { OnChange } from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { runCodeApi } from "../lib/services/executionService";
import Chat from "./Chat";

const COLLAB_SERVICE_URL = "http://localhost:3004";

type Difficulty = "Easy" | "Medium" | "Hard";
type TabKey = "editor" | "chat" | "call";
type Language = "python" | "javascript";

const defaultSnippets: Record<Language, string> = {
  python: "def solution():\n  # Write your code here\n  pass",
  javascript: "function solution() {\n  // Write your code here\n}",
};

const difficultyStyles: Record<Difficulty, string> = {
  Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-rose-50 text-rose-700 border-rose-200",
};

// ----- Subcomponents -----
function Tag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function ProblemViewer({
  title,
  difficulty,
  description,
  examples,
}: {
  title: string;
  difficulty: Difficulty;
  description: string;
  examples: {
    id: number;
    input: string;
    output: string;
    explanation?: string;
  }[];
}) {
  return (
    <aside className="w-full md:w-2/5 overflow-y-auto bg-white rounded-2xl border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <Tag className={difficultyStyles[difficulty]}>{difficulty}</Tag>
      <p className="mt-2 whitespace-pre-wrap">{description}</p>
      {examples.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Examples</h3>
          {examples.map((ex, idx) => (
            <div key={idx} className="border rounded p-2 my-1 bg-gray-50">
              <div>
                <strong>Input:</strong> {ex.input}
              </div>
              <div>
                <strong>Output:</strong> {ex.output}
              </div>
              {ex.explanation && (
                <div>
                  <strong>Explanation:</strong> {ex.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function MonacoEditor({
  language,
  value,
  onChange,
}: {
  language: string;
  value: string;
  onChange: OnChange;
}) {
  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}

function CodeEditorTab({
  language,
  setLanguage,
  code,
  setCode,
  testCases,
  timeout,
}: {
  language: Language;
  setLanguage: (lang: Language) => void;
  code: string;
  setCode: (c: string) => void;
  testCases: {
    hidden: boolean;
    input: any;
    expected: string;
  }[];
  timeout: number;
}) {
  const [showTests, setShowTests] = useState(true);
  const [runResults, setRunResults] = useState<any[]>([]);
  const [submitResults, setSubmitResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "console">("editor");
  const [error, setError] = useState<string | null>(null);
  const handleCodeChange: OnChange = (val) => setCode(val || "");

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    const toRun = testCases.filter((tc) => !tc.hidden);
    try {
      const res = await runCodeApi(code, toRun, timeout);
      if (res.data.success) {
        const firstFail = res.data.output.findIndex(
          (r: { result: boolean }) => !r.result
        );
        if (firstFail !== -1) {
          const tc = res.data.output[firstFail];
          setError(tc.error);
          setActiveTab("console");
        }
        setRunResults(res.data.output);
      } else {
        setError(res.data.error);
        setSubmitResults([]);
        setRunResults([]);
        setActiveTab("console");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error");
      setActiveTab("console");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runCodeApi(code, testCases, timeout);
      if (res.data.success) {
        setSubmitResults(res.data.output);
        setActiveTab("console");
      } else {
        setError(res.data.error);
        setSubmitResults([]);
        setRunResults([]);
        setActiveTab("console");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error");
      setActiveTab("console");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 font-sans">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {["editor", "console"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "editor" | "console")}
            className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
              activeTab === tab
                ? "bg-white shadow text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Editor Tab */}
      {activeTab === "editor" && (
        <>
          {/* Toolbar */}
          <div className="flex justify-between mb-2 items-center gap-2">
            <select
              value={language}
              onChange={(e) => {
                const lang = e.target.value as Language;
                setLanguage(lang);
                setCode(defaultSnippets[lang]);
              }}
              className="border rounded px-3 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
            <button
              onClick={() => setCode(defaultSnippets[language])}
              className="border rounded px-3 py-1 shadow-sm hover:bg-slate-50 transition"
            >
              Reset Code
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 rounded-xl border overflow-hidden shadow-sm min-h-[300px]">
            <MonacoEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
            />
          </div>

          {/* Test Cases */}
          <div className="mt-3 rounded-xl border bg-white overflow-hidden transition-all duration-300">
            <div
              className="flex justify-between items-center px-4 py-2 cursor-pointer"
              onClick={() => setShowTests(!showTests)}
            >
              <h3 className="text-sm font-medium text-slate-800">Test Cases</h3>
              <span className="text-indigo-600 text-sm hover:underline">
                {showTests ? "Hide" : "Show"}
              </span>
            </div>

            <div
              className={`overflow-x-auto transition-all duration-300 ${
                showTests ? "max-h-64 opacity-100 p-3" : "max-h-0 opacity-0 p-0"
              }`}
            >
              <div className="flex gap-4">
                {testCases
                  .filter((tcItem) => !tcItem.hidden)
                  .map((tcItem, idx) => {
                    const tcs = Array.isArray(tcItem) ? tcItem : [tcItem];
                    return tcs.map((tc, subIdx) => {
                      const result = runResults[idx]?.result;
                      let bgColor = "bg-white";
                      if (result !== undefined) {
                        bgColor = result
                          ? "bg-green-50 border border-green-400"
                          : "bg-red-50 border border-red-400";
                      }
                      return (
                        <div
                          key={`${idx}-${subIdx}`}
                          className={`min-w-[220px] flex-shrink-0 rounded-xl border p-3 shadow-sm ${bgColor}`}
                        >
                          <div className="font-semibold text-slate-800 mb-1">
                            Case {idx + 1}
                          </div>
                          <div className="text-sm text-slate-600 mb-1">
                            Input:{" "}
                            <code>
                              {Array.isArray(tc.args)
                                ? JSON.stringify(tc.args)
                                : tc.args}
                            </code>
                          </div>
                          <div className="text-sm text-slate-600 mb-1">
                            Expected: <code>{JSON.stringify(tc.expected)}</code>
                          </div>
                          {runResults[idx]?.output && (
                            <div className="text-sm text-slate-700 mb-1">
                              Output:{" "}
                              <code>
                                {JSON.stringify(runResults[idx].output)}
                              </code>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 mt-3 flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
            <button
              onClick={handleRun}
              disabled={loading}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium shadow hover:bg-indigo-700 disabled:opacity-70 transition"
            >
              Run
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium shadow hover:bg-green-700 disabled:opacity-70 transition"
            >
              Submit
            </button>
            {loading && (
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Running...
              </span>
            )}
          </div>
        </>
      )}

      {/* Console Tab */}
      {activeTab === "console" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-4 max-h-[400px] overflow-auto">
          {error && (
            <div className="text-red-600 font-medium text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!error &&
            (submitResults.length || runResults.length) &&
            (() => {
              const results = submitResults.length ? submitResults : runResults;
              const firstFail = results.findIndex((r) => !r.result);

              if (firstFail === -1) {
                return (
                  <div className="text-green-600 font-semibold text-center">
                    Good job! ✅ All test cases passed.
                  </div>
                );
              } else {
                const tc = results[firstFail];
                const item = Array.isArray(tc) ? tc : [tc];
                const total = results.length;

                return (
                  <div
                    key={firstFail}
                    className="min-w-[220px] rounded-xl border p-3 shadow-sm flex flex-col gap-1 bg-red-50 border-red-400"
                  >
                    <div className="font-semibold text-slate-800 mb-1">
                      Case {firstFail + 1} / {total}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Input:</strong>{" "}
                      <code>
                        {Array.isArray(item[0].args)
                          ? JSON.stringify(item[0].args)
                          : [item[0].args]}
                      </code>
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Expected:</strong>{" "}
                      <code>{JSON.stringify(tc.expected)}</code>
                    </div>
                    <div className="text-sm text-slate-700">
                      <strong>Output:</strong>{" "}
                      <code>{JSON.stringify(tc.output)}</code>
                    </div>
                    {tc.error && (
                      <div className="text-red-600 font-medium text-sm">
                        <strong>Error:</strong> {tc.error}
                      </div>
                    )}
                  </div>
                );
              }
            })()}
        </div>
      )}
    </div>
  );
}

function SessionTimer({ startedAt }: { startedAt: string | Date | null }) {
  const [elapsed, setElapsed] = useState(0); // seconds

  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return <div className="text-sm text-gray-500">{formatTime(elapsed)}</div>;
}

// ----- Main Page -----
export default function CollaborationPage() {
  const { sessionId } = useParams();
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeout, setTimeout] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<TabKey>("editor");
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(defaultSnippets["python"]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const socketRef = useRef<any>(null);
  const navigate = useNavigate();

  // Fetch session/question
  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const res = await fetch(
          `${COLLAB_SERVICE_URL}/collaboration/${sessionId}`
        );
        const data = await res.json();
        if (data.question) {
          setQuestion(data.question);
          setStartedAt(data.startedAt);
          setTimeout(data.question.timeout);
          if (data.question?.codeSnippets?.[0]) {
            setLanguage(data.question.codeSnippets[0].language);
            setCode(data.question.codeSnippets[0].code);
          }
          window.clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      }
    };

    // Start polling every 1s
    const interval = window.setInterval(fetchSession, 1000);
    fetchSession();
    return () => {
      window.clearInterval(interval);
    };
  }, [sessionId]);

  // Setup socket
  useEffect(() => {
    if (!sessionId || socketRef.current) return;

    const socket = io(COLLAB_SERVICE_URL, {
      transports: ["polling", "websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      socket.emit("join-session", { sessionId });
    });

    // Listen for code changes from others
    socket.on("code-change", ({ code: newCode }: { code: string }) => {
      setCode(newCode);
    });

    socket.on("user-left", () => {
      alert("The other user has left the session");
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    socketRef.current?.emit("code-change", { sessionId, code: newCode });
  };

  const handleLeaveSession = async () => {
    if (!sessionId) return;

    if (!window.confirm("Are you sure you want to leave this session?")) return;

    try {
      // Notify other users via socket
      socketRef.current?.emit("leave-session", {
        sessionId,
      });

      // End session on backend
      await fetch(`${COLLAB_SERVICE_URL}/collaboration/${sessionId}`, {
        method: "DELETE",
      });

      // Disconnect socket
      socketRef.current?.disconnect();
      socketRef.current = null;

      // Navigate back to home page
      navigate("/home");
    } catch (err) {
      console.error("Failed to leave session:", err);
      alert("Could not leave session. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }
  if (!question) return <div>Question not found</div>;
  return (
    <div className="flex h-screen flex-col bg-gray-50 p-4 gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">PeerPrep</h1>
        <SessionTimer startedAt={startedAt} />
        <button
          onClick={handleLeaveSession}
          className="px-3 py-1 border rounded bg-red-500 text-white hover:bg-red-600"
        >
          Leave
        </button>
      </header>
      <div className="flex flex-1 gap-4 min-h-0">
        <ProblemViewer
          title={question.title}
          difficulty={question.difficulty}
          description={question.problemStatement}
          examples={question.examples || []}
        />
        <div className="w-full md:w-3/5 flex flex-col">
          <div className="flex gap-2 mb-2">
            <button
              className={`px-3 py-1 border rounded ${
                activeTab === "editor" ? "bg-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("editor")}
            >
              Editor
            </button>
            <button
              className={`px-3 py-1 border rounded ${
                activeTab === "chat" ? "bg-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
            <button
              className={`px-3 py-1 border rounded ${
                activeTab === "call" ? "bg-white" : "bg-gray-200"
              }`}
              onClick={() => setActiveTab("call")}
            >
              Call
            </button>
          </div>

          <div className="flex-1 flex flex-col border rounded p-2 min-h-0">
            {activeTab === "editor" && (
              <CodeEditorTab
                language={language}
                setLanguage={setLanguage}
                code={code}
                setCode={handleCodeChange}
                testCases={question.testCases}
                timeout={timeout}
              />
            )}
            {activeTab === "chat" && <Chat />}
            {activeTab === "call" && (
              <div className="text-center text-gray-500">
                Voice/Video placeholder
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
