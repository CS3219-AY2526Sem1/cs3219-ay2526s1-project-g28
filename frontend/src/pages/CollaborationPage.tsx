import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import * as monaco from "monaco-editor";
import Editor, { OnChange } from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { runCodeApi } from "../lib/services/executionService";
import Chat from "./Chat";
import FloatingCallPopup from "../components/FloatingCallPopup";

const COLLAB_SERVICE_URL = "http://localhost:3004";

type Difficulty = "Easy" | "Medium" | "Hard";
type TabKey = "editor" | "chat" | "call";
type Language = "python" | "javascript" | "java";

export interface ExecResult {
  args: any[];
  expected: any;
  output: any;
  result: boolean;
  error?: string;
}

const defaultSnippets: Record<Language, string> = {
  python: "def solution():\n  # Write your code here\n  pass",
  javascript: "function solution() {\n  // Write your code here\n}",
  java: "public static void main()",
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
  onMount,
}: {
  language: string;
  value: string;
  onChange: OnChange;
  onMount?: (editor: any, monaco: any) => void;
}) {
  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={onChange}
      onMount={onMount}
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
  socketRef,
  sessionId,
  currentUsername,
  timeout,
  onResultsChange,
  onErrorChange,
  sethasSubmitted,
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
  socketRef: React.MutableRefObject<any>;
  sessionId: string | undefined;
  currentUsername: string;
  timeout: number;
  onResultsChange?: (results: ExecResult[]) => void;
  onErrorChange?: (err: string | null) => void;
  sethasSubmitted: (v: boolean) => void;
}) {
  const [showTests, setShowTests] = useState(true);
  const [runResults, setRunResults] = useState<any[]>([]);
  const [submitResults, setSubmitResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "console">("editor");
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const cursorWidgetRef = useRef<monaco.editor.IContentWidget | null>(null);
  const [hasRunSubmitted, setHasRunSubmitted] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState<{
    lineNumber: number;
    column: number;
    username: string;
  } | null>(null);
  const [decorationIds, setDecorationIds] = useState<string[]>([]);

  const handleCodeChange: OnChange = (val) => setCode(val || "");

  // Mount editor and listen for local cursor movement
  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      const pos = e.position;
      socketRef.current?.emit("cursor-change", {
        sessionId,
        position: { lineNumber: pos.lineNumber, column: pos.column },
        username: currentUsername,
      });
    });
  };

  // Listen for remote cursor updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleRemoteCursor = ({
      position,
      username,
    }: {
      position: { lineNumber: number; column: number };
      username: string;
    }) => {
      if (username !== currentUsername) {
        setRemoteCursor({ ...position, username });
      }
    };

    socket.on("remote-cursor-change", handleRemoteCursor);

    return () => {
      if (socket && socket.off) {
        socket.off("remote-cursor-change", handleRemoteCursor);
      }
    };
  }, [socketRef, currentUsername]);

  // Update Monaco Content Widget for remote cursor
  useEffect(() => {
    if (!editorRef.current || !remoteCursor) return;

    const editor = editorRef.current;

    // Remove previous widget
    if (cursorWidgetRef.current) {
      try {
        editor.removeContentWidget(cursorWidgetRef.current);
      } catch {}
      cursorWidgetRef.current = null;
    }

    // Create DOM node for username
    const domNode = document.createElement("div");
    domNode.className = "remote-cursor-label";
    domNode.textContent = remoteCursor.username;

    // Define content widget
    const widget: monaco.editor.IContentWidget = {
      getId: () => "remoteCursorWidget",
      getDomNode: () => domNode,
      getPosition: () => ({
        position: {
          lineNumber: remoteCursor.lineNumber,
          column: remoteCursor.column,
        },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW,
        ],
      }),
    };

    editor.addContentWidget(widget);
    cursorWidgetRef.current = widget;

    // Remove previous cursor decorations
    const newDecorations = [
      {
        range: new monaco.Range(
          remoteCursor.lineNumber,
          remoteCursor.column,
          remoteCursor.lineNumber,
          remoteCursor.column
        ),
        options: {
          className: "remote-cursor", // CSS for vertical line
          isWholeLine: false,
        },
      },
    ];

    const newIds = editor.deltaDecorations(decorationIds, newDecorations);
    setDecorationIds(newIds);
  }, [remoteCursor]);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setHasRunSubmitted(true);
    const toRun = testCases
      .filter((tc) => !tc.hidden)
      .map((tc) => ({
        ...tc,
        // Replace tc.input with just its first element if it's an array
        input: Array.isArray(tc.input) ? tc.input[0] : tc.input,
      }));
    try {
      const res = await runCodeApi(language, code, toRun, timeout);
      console.log(res.data.output);
      if (res.data.success) {
        const firstFail = res.data.output.findIndex(
          (r: { result: boolean }) => !r.result
        );
        if (firstFail !== -1) {
          const tc = res.data.output[firstFail];
          if (tc.error) {
            setError(tc.error);
            setActiveTab("console");
          }
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
    sethasSubmitted(true);
    try {
      const res = await runCodeApi(language, code, testCases, timeout);

      if (res.data.success) {
        setSubmitResults(res.data.output);
        onResultsChange?.(res.data.output);
        setActiveTab("console");
      } else {
        setError(res.data.error);
        onErrorChange?.(res.data.error);
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
                // setCode(defaultSnippets[lang]);
              }}
              className="border rounded px-3 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="c++">C++</option>
              <option value="java">Java</option>
            </select>
            <button
              onClick={() => setCode(defaultSnippets[language])}
              className="border rounded px-3 py-1 shadow-sm hover:bg-slate-50 transition"
            >
              Reset Code
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 rounded-xl border overflow-hidden min-h-0">
            <MonacoEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
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
                              {Array.isArray(tc.args[0])
                                ? JSON.stringify(tc.args[0])
                                : tc.args[0]}
                            </code>
                          </div>
                          <div className="text-sm text-slate-600 mb-1">
                            Expected: <code>{JSON.stringify(tc.expected)}</code>
                          </div>
                          {runResults && hasRunSubmitted && (
                            <div className="text-sm text-slate-700 mb-1">
                              Output:{" "}
                              <code>
                                {runResults[idx]?.output
                                  ? JSON.stringify(runResults[idx].output)
                                  : "No output"}
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

          {/* If there’s no error but also no results → show message */}
          {!error && (!submitResults || submitResults.length === 0) && (
            <div className="text-center text-slate-600 italic py-4">
              You must submit your code first
            </div>
          )}

          {/* If there are results, render success/failure */}
          {!error &&
            submitResults.length > 0 &&
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
                        {Array.isArray(tc.args?.[0])
                          ? JSON.stringify(tc.args[0])
                          : JSON.stringify(tc.args)}
                      </code>
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Expected:</strong>{" "}
                      <code>{JSON.stringify(tc.expected)}</code>
                    </div>
                    <div className="text-sm text-slate-700">
                      <strong>Output:</strong>{" "}
                      <code>
                        {tc.output ? JSON.stringify(tc.output) : "No output"}
                      </code>
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
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [showCallPopup, setShowCallPopup] = useState(false);
  const socketRef = useRef<any>(null);
  const knownUsersRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  const [latestResults, setLatestResults] = useState<ExecResult[]>([]);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [hasSubmitted, sethasSubmitted] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userObj = JSON.parse(storedUser);
      setCurrentUsername(userObj.username);
      console.log("Current username:", userObj.username);
    }
  }, []);

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
    if (!sessionId || socketRef.current || !currentUsername) return;

    const socket = io(COLLAB_SERVICE_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      socket.emit("join-session", { sessionId, username: currentUsername });
      localStorage.setItem("activeSessionId", sessionId);
    });

    // Auto rejoin if reconnected
    socket.on("reconnect", () => {
      console.log("Reconnected to socket");
      socket.emit("join-session", { sessionId, username: currentUsername });
      localStorage.setItem("activeSessionId", sessionId);
    });

    // Listen for peer events
    socket.on("user-joined", ({ username }) => {
      if (username === currentUsername) return;

      if (knownUsersRef.current.has(username)) {
        alert(`${username} has rejoined the session.`);
      } else {
        knownUsersRef.current.add(username);
        console.log(`${username} joined the session`);
      }
    });

    socket.on("user-left", ({ username }) => {
      if (username !== currentUsername) {
        alert(`${username} has left the session`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("user-disconnected", ({ username }) => {
      if (username !== currentUsername) {
        alert(`${username} has been disconnected from the session.`);
      }
    });

    // Existing code-change / language-change handlers
    socket.on("code-change", ({ code: newCode }: { code: string }) => {
      setCode(newCode);
    });

    socket.on(
      "language-change",
      ({ language: newLang }: { language: Language }) => {
        console.log("Language changed to:", newLang);
        setLanguage(newLang);
        setCode(defaultSnippets[newLang]);
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, currentUsername]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    socketRef.current?.emit("code-change", { sessionId, code: newCode });
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(defaultSnippets[newLang]);
    socketRef.current?.emit("language-change", {
      sessionId,
      language: newLang,
    });
  };

  const handleLeaveSession = async () => {
    if (!sessionId || !currentUsername) return;

    if (!window.confirm("Are you sure you want to leave this session?")) return;

    try {
      // Notify backend (voluntary leave)
      socketRef.current?.emit("leave-session", {
        sessionId,
        username: currentUsername,
        code,
        submitResults: latestResults,
        error: latestError,
        language,
        hasSubmitted,
      });

      // Optionally mark session inactive locally
      localStorage.removeItem("activeSessionId");

      // Disconnect socket
      // socketRef.current?.disconnect();
      // socketRef.current = null;

      // Navigate back to home
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
              AI Chat
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
                setLanguage={handleLanguageChange}
                code={code}
                setCode={handleCodeChange}
                testCases={question.testCases}
                socketRef={socketRef}
                sessionId={sessionId}
                currentUsername={currentUsername}
                timeout={timeout}
                onResultsChange={setLatestResults}
                onErrorChange={setLatestError}
                sethasSubmitted={sethasSubmitted}
              />
            )}
            {activeTab === "chat" && (
  <Chat question={question} language={language} code={code} sessionId={sessionId as string}/>
)}
            {activeTab === "call" && (
              <div className="flex flex-col h-full w-full items-center justify-center gap-4">
                <button
                  disabled={isCallActive}
                  onClick={() => {
                    setIsCallActive(true);
                    setShowCallPopup(true);
                  }}
                  className={`px-4 py-2 rounded text-white font-medium transition ${
                    isCallActive
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isCallActive ? "Call Started" : "Start Video Call"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCallPopup && (
        <FloatingCallPopup
          sessionId={sessionId}
          socketRef={socketRef}
          onCallEnd={() => {
            setIsCallActive(false);
            setShowCallPopup(false);
          }}
          collabServiceUrl={COLLAB_SERVICE_URL}
        />
      )}
    </div>
  );
}
