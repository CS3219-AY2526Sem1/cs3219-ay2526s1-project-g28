import React, { useMemo, useState, useEffect } from "react";
import { styles } from "../styles/HomePage.styles";
import { useAuth } from "../auth/AuthContext";
import Header from "../components/Header";
import { useSocket } from "../hooks/useSocket";
import PContent from "../components/matching/PContent";
import { cancelMatchApi } from "../lib/services/matchingService";
import { useNavigate } from "react-router-dom";
import { theme } from "../theme";

const HomePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<
    "Challenges" | "History" | "Custom Lobby" | "Admin"
  >("Challenges");
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = !!user?.isAdmin;

  const {
    pendingMatch,
    countdown,
    modalMessage,
    showButtons,
    isQueueing,
    setIsQueueing,
    handleStartMatch,
    handleMatchResponse,
  } = useSocket(user || undefined);

  // handle CMD/CTRL + B
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const checkActiveSession = async () => {
      const sessionId = localStorage.getItem("activeSessionId");
      if (!sessionId || !user?.username) return;

      try {
        const res = await fetch(
          `http://localhost:3004/collaboration/${sessionId}`
        );
        if (!res.ok) {
          console.warn("Session fetch failed:", res.status);
          return;
        }
        const data = await res.json();

        if (
          !data.isActive ||
          !data.users?.some(
            (u: { username?: string; id?: string }) =>
              u.username === user.username || u.id === user.username
          )
        ) {
          console.log(
            "Session inactive or user not participant → clearing key"
          );
          localStorage.removeItem("activeSessionId");
          return;
        }

        setTimeout(() => {
          const shouldRejoin = window.confirm(
            "You were in an active session. Would you like to rejoin?"
          );
          if (shouldRejoin) {
            navigate(`/collab/${sessionId}`);
          } else {
            localStorage.removeItem("activeSessionId");
          }
        }, 500); // half a second is enough for smooth UX
      } catch (err) {
        console.error("Error checking active session:", err);
      }
    };

    // Delay initial call slightly too, so page fully renders
    const timer = setTimeout(checkActiveSession, 300);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleCancelMatch = async () => {
    if (!user || !user.username) return;
    try {
      const response = await cancelMatchApi(user.username);
      setIsQueueing(false);
      if (response.ok) {
        console.log("Match cancellation successful.");
      } else {
        console.error("Failed to cancel match:", await response.json());
      }
    } catch (err) {
      console.error("Error cancelling match:", err);
      setIsQueueing(false);
    }
  };

  const content = useMemo(
    () => (
      <PContent
        isAdmin={isAdmin}
        handleStartMatch={handleStartMatch}
        handleCancelMatch={handleCancelMatch}
        isQueueing={isQueueing}
      />
    ),
    [currentPage, isAdmin, handleStartMatch, handleCancelMatch, isQueueing]
  );

  return (
    <div
      style={{
        backgroundColor: theme.backgroundDark,
        color: theme.textPrimary,
        fontFamily: "'Inter','Segoe UI', Roboto, sans-serif",
        minHeight: "100vh",
      }}
    >
      <Header
        variant="beta"
        isSidebarOpen={isSidebarOpen}
        currentPage={currentPage}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        onNavigate={(p) => setCurrentPage(p)}
      />
      <main
        style={{
          ...styles.mainContent,
          marginLeft: isSidebarOpen ? "240px" : "72px",
        }}
      >
        {content}
      </main>

      {/* Match Found Modal — styled like other modals */}
      {pendingMatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-[32rem] max-w-[95vw]">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Match Found!
              </h2>
              <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold">
                {countdown}s
              </span>
            </div>

            <p className="text-gray-700 mt-4 min-h-[24px]">{modalMessage}</p>

            {showButtons && (
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => handleMatchResponse("reject")}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleMatchResponse("accept")}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Accept
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
