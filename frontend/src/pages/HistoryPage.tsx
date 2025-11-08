// src/pages/HistoryPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { EyeIcon } from "@heroicons/react/24/outline";
import { theme } from "../theme";
import { fetchHistory } from "../lib/services/collobarationService";
import { useAuth } from "../auth/AuthContext";

type Style = React.CSSProperties;

type Difficulty = "Easy" | "Medium" | "Hard";
type Status = "Completed" | "In Progress" | "Cancelled" | "Failed";

export interface HistoryEntry {
  id: string;
  startedAt: string; // ISO string
  endedAt?: string; // ISO string (optional if in-progress/cancelled)
  partner: string; // partner username
  difficulty: Difficulty;
  topics: string[];
  status: Status;
  roomId?: string;
  questionTitle?: string;
  durationSec?: number; // fallback: computed from start/end
  notes?: string;
}

const ITEMS_PER_PAGE = 25;

/** ===== MOCK DATA TOGGLE ===== */
const USE_MOCK = true;

/** ===== MOCK HISTORY ===== */
const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "h1",
    startedAt: "2025-11-07T14:10:00Z",
    endedAt: "2025-11-07T14:45:40Z",
    partner: "Alice",
    difficulty: "Medium",
    topics: ["Graphs", "Dynamic Programming"],
    status: "Completed",
    roomId: "RM-7F9A",
    questionTitle: "Shortest Path in Weighted Graph",
    durationSec: 213, // 3m 33s (example)
    notes: "Great discussion on Dijkstra vs. BFS.",
  },
];

const HistoryPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const currentPageName = "My History";

  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsItem, setDetailsItem] = useState<HistoryEntry | null>(null);
  const { user } = useAuth();
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      // If mocking, simulate latency and set mock data.
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500));
        const items = [...MOCK_HISTORY].sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setHistory(items);
        setIsLoading(false);
        return;
      }

      // Otherwise, call API with graceful fallback to mock on error.
      try {
        if (!user?.username) {
          throw new Error("User not logged in");
        }
        const res = await fetchHistory(user.username);
        const items = ((res?.data as HistoryEntry[]) || []).sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setHistory(items);
      } catch (err: any) {
        console.error("Fetch history error:", err);
        setError(err.message || "Failed to fetch history");
        // Optional: fallback to mock if API fails
        const items = [...MOCK_HISTORY].sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setHistory(items);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

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

  function fmtDurationSec(d?: number, startedAt?: string, endedAt?: string) {
    let sec = d;
    if (sec == null && startedAt && endedAt) {
      sec =
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
    }
    if (sec == null || !isFinite(sec)) return "—";
    const mm = Math.floor(sec / 60);
    const ss = Math.floor(sec % 60);
    return `${mm}m ${ss}s`;
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

  // Actions
  const handleView = (item: HistoryEntry) => {
    setDetailsItem(item);
    setShowDetails(true);
  };

  const requestDelete = (id: string) => {
    setToDeleteId(id);
    setShowDeleteConfirm(true);
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
                          {fmtDurationSec(
                            item.durationSec,
                            item.startedAt,
                            item.endedAt
                          )}
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

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Delete History Item
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this session? This action
                  cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {showDetails && detailsItem && (
        <div style={styles.modalOverlay}>
          <div className="relative p-5 border w-[34rem] max-w-[95vw] shadow-lg rounded-md bg-white">
            <div className="flex items-start justify-between">
              <h3 className="text-lg leading-6 font-semibold text-gray-900">
                Session Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-800">
              <div>
                <span className="text-gray-500">Date:</span>{" "}
                {fmtDate(detailsItem.startedAt)}
              </div>
              <div>
                <span className="text-gray-500">Partner:</span>{" "}
                {detailsItem.partner}
              </div>
              <div>
                <span className="text-gray-500">Difficulty:</span>{" "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${diffClasses(
                    detailsItem.difficulty
                  )}`}
                >
                  {detailsItem.difficulty}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Topics:</span>{" "}
                {detailsItem.topics.join(", ")}
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClasses(
                    detailsItem.status as Status
                  )}`}
                >
                  {detailsItem.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>{" "}
                {fmtDurationSec(
                  detailsItem.durationSec,
                  detailsItem.startedAt,
                  detailsItem.endedAt
                )}
              </div>
              {detailsItem.questionTitle && (
                <div>
                  <span className="text-gray-500">Question:</span>{" "}
                  {detailsItem.questionTitle}
                </div>
              )}
              {detailsItem.roomId && (
                <div>
                  <span className="text-gray-500">Room ID:</span>{" "}
                  {detailsItem.roomId}
                </div>
              )}
              {detailsItem.notes && (
                <div className="text-gray-700">
                  <span className="text-gray-500">Notes:</span>{" "}
                  {detailsItem.notes}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDetails(false)}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-md text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
};

export default HistoryPage;
