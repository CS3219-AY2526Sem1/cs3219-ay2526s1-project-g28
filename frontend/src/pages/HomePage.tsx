import React, { useMemo, useState, useEffect } from "react";
import { styles } from "../styles/HomePage.styles";
import { useAuth } from "../auth/AuthContext";
import Header from "../components/Header";
import { useSocket } from "../hooks/useSocket";
import PContent from "../components/matching/PContent";
import { cancelMatchApi } from "../lib/services/matchingService";

const HomePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<
    "Challenges" | "History" | "Custom Lobby" | "Admin"
  >("Challenges");
  const { user } = useAuth();
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
    <div style={styles.appContainer}>
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

      {pendingMatch && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0 }}>Match Found!</h2>
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                {countdown}s
              </span>
            </div>
            <p style={{ marginTop: "1rem", minHeight: "24px" }}>
              {modalMessage}
            </p>
            {showButtons && (
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={() => handleMatchResponse("reject")}
                  style={styles.secondaryBtn}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleMatchResponse("accept")}
                  style={styles.primaryBtn}
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
