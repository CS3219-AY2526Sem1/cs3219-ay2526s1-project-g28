import React, { useMemo, useState, useEffect } from "react";
import { styles } from "../styles/HomePage.styles";
import { useAuth } from "../auth/AuthContext";
import Header from "../components/Header";
import { useSocket } from "../hooks/useSocket";
import PContent from "../components/matching/PContent";
import { cancelMatchApi } from "../lib/services/matchingService";
import { useNavigate } from "react-router-dom";
import { theme } from "../theme";
import { api } from "@/lib/api";

const HomePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<
    "Challenges" | "History" | "Custom Lobby" | "Admin"
  >("Challenges");
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = !!user?.isAdmin;
  const GATEWAY_URL = import.meta.env.VITE_API_URL;
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
      console.log(sessionId)
      if (!sessionId || !user?.username) return;

      try {
        const res = await fetch(
          `${GATEWAY_URL}/collaboration/collaboration/${sessionId}`
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
          <div
            className="rounded-2xl shadow-2xl p-6 w-[32rem] max-w-[95vw]"
            style={{
              background: theme.backgroundLight,
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary,
            }}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold m-0">Match Found!</h2>
              <span
                className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg text-sm font-semibold"
                style={{
                  background: theme.backgroundMedium,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {countdown}s
              </span>
            </div>

            <p
              className="mt-4 min-h-[24px]"
              style={{ color: theme.textSecondary }}
            >
              {modalMessage}
            </p>

            {showButtons && (
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => handleMatchResponse("reject")}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: theme.backgroundLight,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleMatchResponse("accept")}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: theme.accent,
                    color: theme.accentForeground,
                    border: `1px solid ${theme.accent}`,
                  }}
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
