import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Editor, { OnChange } from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

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
function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
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
  examples: { id: number; input: string; output: string; explanation?: string }[];
}) {
  return (
    <aside className="w-full md:w-2/5 overflow-y-auto bg-white rounded-2xl border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <Tag className={difficultyStyles[difficulty]}>{difficulty}</Tag>
      <p className="mt-2 whitespace-pre-wrap">{description}</p>
      {examples.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Examples</h3>
          {examples.map((ex) => (
            <div key={ex.id} className="border rounded p-2 my-1 bg-gray-50">
              <div>
                <strong>Input:</strong> {ex.input}
              </div>
              <div>
                <strong>Output:</strong> {ex.output}
              </div>
              {ex.explanation && <div><strong>Explanation:</strong> {ex.explanation}</div>}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function MonacoEditor({ language, value, onChange }: { language: string; value: string; onChange: OnChange }) {
  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={onChange}
      options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true }}
    />
  );
}

function CodeEditorTab({
  language,
  setLanguage,
  code,
  setCode,
  testCases,
}: {
  language: Language;
  setLanguage: (lang: Language) => void;
  code: string;
  setCode: (c: string) => void;
  testCases: { input: string; expected: string }[];
}) {
  const [showTests, setShowTests] = useState(true);
  const handleCodeChange: OnChange = (val) => setCode(val || "");

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex justify-between mb-2">
        <select
          value={language}
          onChange={(e) => {
            const lang = e.target.value as Language;
            setLanguage(lang);
            setCode(defaultSnippets[lang]);
          }}
          className="border rounded px-2 py-1"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <button
          onClick={() => setCode(defaultSnippets[language])}
          className="border rounded px-2 py-1"
        >
          Reset Code
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 rounded-xl border overflow-hidden min-h-0">
        <MonacoEditor language={language} value={code} onChange={handleCodeChange} />
      </div>

      {/* Collapsible Test Cases */}
      <div className="mt-3 rounded-xl border bg-white">
        <button
          onClick={() => setShowTests((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <span>Test Cases</span>
          <span>{showTests ? "Hide" : "Show"}</span>
        </button>
        {showTests && (
          <div className="border-t p-3 grid gap-2 text-xs text-slate-700 max-h-40 overflow-auto">
            {testCases.map((tc, idx) => (
              <div key={idx} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-800">Case {idx + 1}</div>
                <div>
                  Input: <code>{tc.input}</code>
                </div>
                <div>
                  Expected: <code>{tc.expected}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="sticky bottom-0 mt-3 flex items-center justify-between rounded-xl border bg-white px-3 py-2">
        <div className="flex gap-2">
          <button className="rounded-lg border bg-slate-900 text-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-800 active:scale-[0.99]">
            Run
          </button>
          <button className="rounded-lg border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 active:scale-[0.99]">
            Submit
          </button>
        </div>
        <div className="text-xs text-slate-500">ETA: 00:42</div>
      </div>
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
        const res = await fetch(`${COLLAB_SERVICE_URL}/collaboration/${sessionId}`);
        const data = await res.json();
        if (data.question) {
          setQuestion(data.question);
          setStartedAt(data.startedAt);
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

    const socket = io(COLLAB_SERVICE_URL, { transports: ["polling", "websocket"] });
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
        sessionId
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
              className={`px-3 py-1 border rounded ${activeTab === "editor" ? "bg-white" : "bg-gray-200"}`}
              onClick={() => setActiveTab("editor")}
            >
              Editor
            </button>
            <button
              className={`px-3 py-1 border rounded ${activeTab === "chat" ? "bg-white" : "bg-gray-200"}`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
            <button
              className={`px-3 py-1 border rounded ${activeTab === "call" ? "bg-white" : "bg-gray-200"}`}
              onClick={() => setActiveTab("call")}
            >
              Call
            </button>
          </div>

          <div className="flex-1 flex flex-col border rounded p-2 min-h-0">
            {activeTab === "editor" && 
                <CodeEditorTab 
                    language={language} 
                    setLanguage = {setLanguage} 
                    code={code} 
                    setCode={handleCodeChange}
                    testCases={question.testCases}
                />
            }
            {activeTab === "chat" && <div className="text-center text-gray-500">AI Chat placeholder</div>}
            {activeTab === "call" && <div className="text-center text-gray-500">Voice/Video placeholder</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
