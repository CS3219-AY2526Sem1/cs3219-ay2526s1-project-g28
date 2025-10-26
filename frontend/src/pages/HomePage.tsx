import React, { useEffect, useMemo, useState, useRef } from "react"; // Added useRef
import { theme } from "../theme";
import { useAuth } from "../auth/AuthContext";
import Header from "../components/Header";
import { io, Socket } from "socket.io-client";

type Style = React.CSSProperties;

const HomePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<
    "Challenges" | "History" | "Custom Lobby" | "Admin"
  >("Challenges");

  const [pendingMatch, setPendingMatch] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const displayName = user?.username || user?.email || "User";

  const NOTIFICATION_SERVICE_URL = "http://localhost:3005";

  useEffect(() => {
    const socket: Socket = io(NOTIFICATION_SERVICE_URL);

    socket.on("connect", () => {
      console.log("Connected to notification service!");
      if (displayName !== "User") {
        socket.emit("register", { userId: displayName });
      }
    });

    const showFinalMessage = (message: string) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setModalMessage(message);
      setShowButtons(false);
      setTimeout(() => {
        setPendingMatch(null);
        setIsWaiting(false);
        setShowButtons(true);
        setCountdown(10);
      }, 3000);
    };

    socket.on("pending_match_created", (data) => {
      console.log("Pending match created:", data);
      setPendingMatch(data);
      setModalMessage("Ready to collaborate?");
      setIsWaiting(false);
      setShowButtons(true);
      setCountdown(10);
    });

    socket.on("match_confirmed", (data) => {
      console.log("Match confirmed!", data);
      showFinalMessage("Match Confirmed! Moving to room...");
    });

    socket.on("match_requeued", (data) => {
      console.log("Match rejected, you are back in the queue", data);
      showFinalMessage(data.message);
    });

    socket.on("match_rejected", (data) => {
      console.log("Match was rejected.", data);
      showFinalMessage(data.message || "Match was rejected.");
    });

    return () => {
      console.log("Disconnecting socket...");
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket.disconnect();
    };
  }, [displayName]);

  useEffect(() => {
    if (pendingMatch) {
      intervalRef.current = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            clearInterval(intervalRef.current as NodeJS.Timeout);
            handleMatchResponse('reject');
            setPendingMatch(null);
            setIsWaiting(false);
            setShowButtons(true);
            return 10;
          }
          return prevCount - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pendingMatch]);

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

  const handleStartMatch = async () => {
     const matchRequest = {
      userId: displayName,
      difficulty: "Easy",
      topics: ["Arrays", "Strings"],
    };
    try {
      const response = await fetch("http://localhost:3003/matching/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchRequest),
      });
      const data = await response.json();
      if (response.status === 200 && data.data) {
        console.log("Match found immediately!", data);
        setPendingMatch(data.data);
        setModalMessage("Ready to collaborate?");
        setIsWaiting(false);
        setShowButtons(true);
        setCountdown(10);
      } else if (response.status === 202) {
        console.log("In queue, waiting for a match...");
      }
    } catch (err) {
      console.error("Error starting match:", err);
    }
  };

  const handleMatchResponse = async (action: 'accept' | 'reject') => {
    if (!pendingMatch || isWaiting) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsWaiting(true);
    setShowButtons(false);
    setModalMessage("Processing your response...");

    const requestBody = {
      userId: displayName,
      matchId: (pendingMatch as any).matchId,
    };

    try {
      const response = await fetch(`http://localhost:3003/matching/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log(`Match ${action} response:`, data);

      if (data.status === 'pending') {
        setModalMessage("Waiting for the other user to respond...");
      } else {
        setModalMessage(data.message);
        setTimeout(() => {
          setPendingMatch(null);
          setIsWaiting(false);
          setShowButtons(true);
          setCountdown(10);
        }, 3000);
      }
    } catch (err) {
      console.error(`Error ${action}ing match:`, err);
      setModalMessage("An error occurred. Please try again.");
      setIsWaiting(false);
    }
  };

  const content = useMemo(
    () => renderContent(currentPage, isAdmin, handleStartMatch),
    [currentPage, isAdmin, handleStartMatch]
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Match Found!</h2>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{countdown}s</span>
            </div>
            <p style={{ marginTop: '1rem', minHeight: '24px' }}>
              {modalMessage}
            </p>
            {showButtons && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => handleMatchResponse('reject')}
                  style={styles.secondaryBtn}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleMatchResponse('accept')}
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

// ... (renderContent function remains the same) ...
function renderContent(
  page: "Challenges" | "History" | "Custom Lobby" | "Admin",
  isAdmin: boolean,
  handleStartMatch: () => Promise<void>
) {
  switch (page) {
    case "Challenges":
      return (
        <section style={styles.pageCard}>
          <h1 style={styles.h1}>Challenges</h1>
          <p style={styles.muted}>
            Pick difficulty & topic, then find a partner.
          </p>
          <div style={styles.row}>
            <select style={styles.input}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <select style={styles.input}>
              <option>Arrays</option>
              <option>Graphs</option>
              <option>DP</option>
              <option>Strings</option>
            </select>
            <button onClick={handleStartMatch} style={styles.primaryBtn}>
              Find Match
            </button>
          </div>
        </section>
      );
  }
}

const styles: { [key: string]: Style } = {
  appContainer: {
    backgroundColor: theme.backgroundDark,
    color: theme.textPrimary,
    fontFamily: "'Inter','Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
  },
  mainContent: {
    padding: "2rem",
    paddingTop: "calc(60px + 2rem)",
    transition: "margin-left 0.3s ease-in-out",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  pageCard: {
    background: theme.backgroundLight,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.25rem 1.25rem 1.5rem",
  },
  h1: { fontSize: 24, fontWeight: 600, margin: 0, marginBottom: 6 },
  muted: { color: theme.textSecondary, margin: 0 },
  row: { display: "flex", gap: 12, alignItems: "center", marginTop: 12 },
  input: {
    background: theme.backgroundDark,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "10px 12px",
  },
  primaryBtn: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
  },
  secondaryBtn: {
    background: theme.backgroundLight,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: theme.backgroundLight,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
};

export default HomePage;