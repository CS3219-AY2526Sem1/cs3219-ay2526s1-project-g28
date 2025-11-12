import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "python" | "javascript" | "java" | "cpp";

export interface ExecResult {
  args: any[];
  expected: any;
  output: any;
  result: boolean;
  error?: string;
}

interface Example {
  id?: number;
  input: string;
  output: string;
  explanation?: string;
}

interface QuestionDto {
  title: string;
  difficulty: Difficulty;
  problemStatement: string;
  examples?: Example[];
}

interface HistoryDetailDto {
  question: QuestionDto;
  code: string;
  language: Language;
  submitResults?: ExecResult[];
  error?: string | null;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  hasSubmitted?: boolean;
}

const COLLAB_SERVICE_URL =
  "https://qp8he0nic9.execute-api.ap-southeast-1.amazonaws.com";

function StatusBadge({
  status,
}: {
  status: "Accepted" | "Wrong Answer" | "Runtime Error" | "Not Submitted";
}) {
  const map = {
    Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Wrong Answer": "bg-rose-50 text-rose-700 border-rose-200",
    "Runtime Error": "bg-amber-50 text-amber-700 border-amber-200",
    "Not Submitted": "bg-slate-50 text-slate-700 border-slate-200",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
}

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

const difficultyStyles: Record<Difficulty, string> = {
  Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-rose-50 text-rose-700 border-rose-200",
};

function ProblemViewer({
  title,
  difficulty,
  description,
  examples,
}: {
  title: string;
  difficulty: Difficulty;
  description: string;
  examples?: Example[];
}) {
  return (
    <aside className="w-full md:w-2/5 overflow-y-auto bg-white rounded-2xl border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <Tag className={difficultyStyles[difficulty]}>{difficulty}</Tag>
      <p className="mt-2 whitespace-pre-wrap">{description}</p>
      {examples && examples.length > 0 && (
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

// ---- Normalizer from raw API session → UI DTO
function toDetailDto(raw: any): HistoryDetailDto {
  const q = raw?.question ?? {};
  const codeFromSnip = raw?.question?.codeSnippets?.[0]?.code;
  const langFromSnip = raw?.question?.codeSnippets?.[0]?.language;

  return {
    question: {
      title: q?.title ?? raw?.title ?? "Untitled",
      difficulty: (q?.difficulty ?? raw?.difficulty ?? "Easy") as Difficulty,
      problemStatement: q?.problemStatement ?? raw?.problemStatement ?? "",
      examples: q?.examples ?? raw?.examples ?? [],
    },
    code: raw?.code ?? codeFromSnip ?? "",
    language: (raw?.language ?? langFromSnip ?? "javascript") as Language,
    submitResults: raw?.submitResults ?? raw?.results ?? [],
    error: raw?.error ?? null,
    startedAt: raw?.startedAt ?? raw?.createdAt ?? null,
    endedAt: raw?.endedAt ?? null,
    hasSubmitted:
      Boolean(raw?.hasSubmitted) ||
      (Array.isArray(raw?.submitResults) && raw.submitResults.length > 0) ||
      raw?.error != null,
  };
}

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { session?: any } };

  const [loading, setLoading] = useState(false);
  const [dto, setDto] = useState<HistoryDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use router state immediately if present
  useEffect(() => {
    const s = location?.state?.session;
    if (s) setDto(toDetailDto(s));
  }, [location?.state?.session]);

  // Fallback: fetch detail by id (tries /history/:id then /collaboration/:id)
  useEffect(() => {
    if (!id || dto) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let res = await fetch(
          `${COLLAB_SERVICE_URL}/collaboration/history/${id}`
        );
        if (!res.ok) {
          res = await fetch(
            `${COLLAB_SERVICE_URL}/collaboration/collaboration/${id}`
          );
        }
        if (!res.ok) throw new Error(`Failed to load session ${id}`);
        const raw = await res.json();
        if (!cancelled) setDto(toDetailDto(raw));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, dto]);

  const status = useMemo(():
    | "Accepted"
    | "Wrong Answer"
    | "Runtime Error"
    | "Not Submitted" => {
    if (!dto?.hasSubmitted) return "Not Submitted";
    if (dto?.error) return "Runtime Error";
    const results = dto?.submitResults || [];
    if (results.length === 0) return "Not Submitted";
    const allPass = results.every((r) => r?.result === true);
    return allPass ? "Accepted" : "Wrong Answer";
  }, [dto]);

  const passInfo = useMemo(() => {
    const results = dto?.submitResults || [];
    const passed = results.filter((r) => r.result).length;
    return { passed, total: results.length };
  }, [dto]);

  const monacoLanguage = useMemo(() => {
    const map: Record<Language, string> = {
      javascript: "javascript",
      python: "python",
      java: "java",
      cpp: "cpp",
    };
    return map[(dto?.language as Language) || "javascript"];
  }, [dto?.language]);

  if (loading && !dto) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500 text-lg">Loading history...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium">{error}</div>
        <button
          className="mt-4 px-3 py-1 border rounded"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>
    );
  }
  if (!dto) return null;

  return (
    <div className="flex h-screen flex-col bg-gray-50 p-4 gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Submission Detail</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {dto.startedAt && (
            <span>Started: {new Date(dto.startedAt).toLocaleString()}</span>
          )}
          {dto.endedAt && (
            <span>• Ended: {new Date(dto.endedAt).toLocaleString()}</span>
          )}
        </div>
        <Link to="/history" className="px-3 py-1 border rounded hover:bg-white">
          Back to History
        </Link>
      </header>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: Question */}
        <ProblemViewer
          title={dto.question.title}
          difficulty={dto.question.difficulty}
          description={dto.question.problemStatement}
          examples={dto.question.examples}
        />

        {/* Right: Status on top, Code below (LeetCode-like) */}
        <div className="w-full md:w-3/5 flex flex-col gap-3 min-h-0">
          {/* Status Card */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                {dto.submitResults && dto.submitResults.length > 0 && (
                  <span className="text-sm text-slate-600">
                    {passInfo.passed}/{passInfo.total} test cases passed
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                <span className="inline-block px-2 py-0.5 rounded border bg-slate-50">
                  {(dto.language || "javascript").toUpperCase()}
                </span>
              </div>
            </div>

            {/* First failing / error details */}
            {status !== "Accepted" && (
              <div className="mt-3 text-sm">
                {dto.error ? (
                  <div className="text-amber-700">
                    <strong>Runtime Error:</strong> {dto.error}
                  </div>
                ) : (
                  (() => {
                    const results = dto.submitResults || [];
                    const idx = results.findIndex((r) => !r.result);
                    if (idx === -1) return null;
                    const tc = results[idx];
                    return (
                      <div className="bg-rose-50 border border-rose-200 rounded p-3">
                        <div className="font-medium text-rose-700">
                          Failed on Case {idx + 1}
                        </div>
                        <div className="mt-1 text-slate-700">
                          <strong>Input:</strong>{" "}
                          <code>
                            {tc.args?.length === 1
                              ? JSON.stringify(tc.args[0])
                              : JSON.stringify(tc.args)}
                          </code>
                        </div>
                        <div className="text-slate-700">
                          <strong>Expected:</strong>{" "}
                          <code>{JSON.stringify(tc.expected)}</code>
                        </div>
                        <div className="text-slate-700">
                          <strong>Output:</strong>{" "}
                          <code>
                            {tc.output !== undefined
                              ? JSON.stringify(tc.output)
                              : "No output"}
                          </code>
                        </div>
                        {tc.error && (
                          <div className="text-amber-700">
                            <strong>Error:</strong> {tc.error}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>

          {/* Code (read-only) */}
          <div className="flex-1 min-h-0 rounded-2xl border overflow-hidden bg-[#0f172a]">
            <Editor
              height="100%"
              language={monacoLanguage}
              theme="vs-dark"
              value={dto.code || ""}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                automaticLayout: true,
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
