import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import * as monaco from "monaco-editor";
import Editor, { OnChange } from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { runCodeApi, submitCodeApi } from "../lib/services/executionService";
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
          {examples.map((ex) => (
            <div key={ex.id} className="border rounded p-2 my-1 bg-gray-50">
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

function RunButton({
  code,
  testCases,
}: {
  code: string;
  testCases: { input: any; expected: string }[];
}) {
  const [status, setStatus] = useState<boolean | null>(null); // null = default, true = success, false = fail

  const handleClick = async (): Promise<void> => {
    const result = await runCodeApi(code, testCases);
    const { data } = result;
    setStatus(data.output === true ? true : false);
  };

  // Determine button classes based on status
  let bgClass = "bg-slate-900 text-white hover:bg-slate-800"; // default
  if (status === true) bgClass = "bg-green-500 text-white hover:bg-green-600"; // success
  if (status === false) bgClass = "bg-red-500 text-white hover:bg-red-600"; // failure

  return (
    <button
      className={`rounded-lg border px-3 py-2 text-sm font-medium shadow-sm active:scale-[0.99] ${bgClass}`}
      onClick={handleClick}
    >
      Run
    </button>
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
}: {
  language: Language;
  setLanguage: (lang: Language) => void;
  code: string;
  setCode: (c: string) => void;
  testCases: { input: any; expected: string }[];
  socketRef: React.MutableRefObject<any>;
  sessionId: string | undefined;  
  currentUsername: string;
}) {
    const [showTests, setShowTests] = useState(true);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const cursorWidgetRef = useRef<monaco.editor.IContentWidget | null>(null);
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
      if (!socketRef.current) return;

      socketRef.current.on(
        "remote-cursor-change",
        ({ position, username }: { position: { lineNumber: number; column: number }; username: string }) => {
          if (username !== currentUsername) {
            setRemoteCursor({ ...position, username });
          }
        }
      );

      return () => {
        socketRef.current.off("remote-cursor-change");
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


  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex justify-between mb-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
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
        <MonacoEditor
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
        />
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
            {testCases.map((tcItem, idx) => {
              const tcs = Array.isArray(tcItem) ? tcItem : [tcItem];

              return tcs.map((tc) => {
                return (
                  <div
                    key={`${idx}`}
                    className="rounded-lg bg-slate-50 px-3 py-2 my-2"
                  >
                    <div className="font-semibold text-slate-800">
                      Case {idx + 1}
                    </div>
                    <div>
                      Input:{" "}
                      <code>
                        {Array.isArray(tc.args)
                          ? JSON.stringify(tc.args)
                          : tc.args}
                      </code>
                    </div>
                    <div>
                      Expected:{" "}
                      <code>
                        {Array.isArray(tc.expected)
                          ? JSON.stringify(tc.expected)
                          : tc.expected}
                      </code>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="sticky bottom-0 mt-3 flex items-center justify-between rounded-xl border bg-white px-3 py-2">
        <div className="flex gap-2">
          <RunButton code={code} testCases={testCases} />{" "}
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
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const socketRef = useRef<any>(null);
  const navigate = useNavigate();

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

    // Listen for language changes from others
    socket.on("language-change", ({ language: newLang }: { language: Language }) => {
      console.log("Language changed to:", newLang);
      setLanguage(newLang);
      setCode(defaultSnippets[newLang]); // optional: reset snippet to match
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

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(defaultSnippets[newLang]);
    socketRef.current?.emit("language-change", { sessionId, language: newLang });
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
                setLanguage={handleLanguageChange}
                code={code}
                setCode={handleCodeChange}
                testCases={question.testCases}
                socketRef={socketRef}
                sessionId={sessionId}
                currentUsername={currentUsername}
              />
            )}
            {activeTab === "chat" && (
              <div className="text-center text-gray-500">
                <Chat />
              </div>
            )}
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
