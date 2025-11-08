import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { EyeIcon } from "@heroicons/react/24/outline";
import { theme } from "../theme";
import { fetchHistory } from "../lib/services/collaborationService";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

type Style = React.CSSProperties;

type Difficulty = "Easy" | "Medium" | "Hard";
type Status = "Completed" | "In Progress" | "Cancelled" | "Failed";

export interface HistoryEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  partner: string;
  difficulty: Difficulty;
  topics: string[];
  status: Status;
  roomId?: string;
  questionTitle?: string;
}

const ITEMS_PER_PAGE = 25;

function toStatus(
  error: String,
  isActive?: boolean,
  hasSubmitted?: boolean
): Status {
  console.log(error);
  if (!error && hasSubmitted) return "Completed";
  if (!isActive) return "Failed";
  return "In Progress";
}

function pickId(obj: any) {
  return String(obj?._id ?? obj?.id ?? obj?.correlationId ?? "");
}

const HistoryPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rawIndex, setRawIndex] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const currentPageName = "My History";

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user?.username) throw new Error("User not logged in");

        const res = await fetchHistory(user.username);
        // Your service returns { message, data: [...] }
        const sessions = (res?.data as any[]) || [];

        const localIndex: Record<string, any> = {};
        const items: HistoryEntry[] = sessions.map((s) => {
          const id = pickId(s);
          localIndex[id] = s;

          const usersArr = Array.isArray(s?.users) ? s.users : [];
          const me = user.username;
          const partnerUser =
            usersArr.find((u: any) => u?.username !== me) ?? usersArr[0];
          const partnerName = partnerUser?.username || partnerUser?.id || "—";
          const startedAt = s?.startedAt || new Date().toISOString();
          const endedAt = s?.endedAt || new Date().toISOString();
          const difficulty = (s?.meta?.difficulty ?? "Easy") as Difficulty;
          const topics = Array.isArray(s?.meta?.topics) ? s.meta.topics : [];
          const hasSubmitted = s?.hasSubmitted || false;
          const status = toStatus(s?.error, s?.isActive, hasSubmitted);

          return {
            id,
            startedAt: String(startedAt),
            endedAt: String(endedAt),
            partner: String(partnerName),
            difficulty,
            topics,
            status,
            roomId: s?.matchKey || undefined,
            questionTitle: s?.question?.title || s?.question?.name || undefined,
          };
        });

        const sorted = items.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );

        setRawIndex(localIndex);
        setHistory(sorted);
      } catch (err: any) {
        console.error("Fetch history error:", err);
        setError(err.message || "Failed to fetch history");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.username]);

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRows = useMemo(
    () => history.slice(startIndex, endIndex),
    [history, startIndex, endIndex]
  );

  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));

  function fmtDate(s: string) {
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  }

  function badgeClasses(status: Status) {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-gray-100 text-gray-800";
      case "Failed":
      default:
        return "bg-red-100 text-red-800";
    }
  }

  function diffClasses(diff: Difficulty) {
    switch (diff) {
      case "Easy":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Hard":
      default:
        return "bg-red-100 text-red-800";
    }
  }

  function formatDuration(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours ? hours + "h " : ""}${
      minutes ? minutes + "m " : ""
    }${seconds}s`;
  }

  const handleView = (item: HistoryEntry) => {
    const raw = rawIndex[item.id];
    // Pass the raw session so the details page can render instantly.
    navigate(`/history/${item.id}`, { state: { session: raw } });
  };

  return (
    <div style={styles.appContainer}>
      <Header
        variant="beta"
        isSidebarOpen={isSidebarOpen}
        currentPage={currentPageName as any}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        onNavigate={() => {}}
      />

      <main
        className={`p-8 pt-[calc(60px+2rem)] transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-60" : "ml-[72px]"
        }`}
      >
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Match History
              </h1>
              <p className="text-sm text-gray-500">
                Review your past sessions, details, and outcomes.
              </p>
            </div>
          </div>

          {isLoading && (
            <p className="text-gray-500 text-center py-4">Loading history…</p>
          )}
          {error && (
            <p className="text-red-500 text-center py-4">Error: {error}</p>
          )}

          {!isLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-left">
                  <thead className="border-b border-gray-300 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                        Difficulty
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                        Topics
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentRows.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                          {fmtDate(item.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {item.partner}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${diffClasses(
                              item.difficulty
                            )}`}
                          >
                            {item.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.topics.join(", ")}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClasses(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDuration(item.startedAt, item.endedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleView(item)}
                            className="text-gray-700 hover:text-gray-900 font-medium"
                            title="View details"
                          >
                            <EyeIcon className="h-5 w-5 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-gray-500">
                  Showing {history.length === 0 ? 0 : startIndex + 1} to{" "}
                  {Math.min(endIndex, history.length)} of {history.length}{" "}
                  sessions
                </span>
                <div className="space-x-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

const styles: { [key: string]: Style } = {
  appContainer: {
    backgroundColor: theme.backgroundDark,
    color: theme.textPrimary,
    fontFamily: "'Inter','Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
  },
};

export default HistoryPage;
