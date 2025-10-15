// src/pages/HomePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../theme";
import TopBar from "../components/TopBar";
import CollapsibleSidebar from "../components/CollapsibleSidebar";
import { useAuth } from "../auth/AuthContext";
import Header from "../components/Header";
type Style = React.CSSProperties;

const HomePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState<"Challenges"|"History"|"Custom Lobby"|"Admin">("Challenges");

  // pull real auth state
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const displayName = user?.username || user?.email || "User";

  // keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const content = useMemo(() => renderContent(currentPage, isAdmin), [currentPage, isAdmin]);

  return (
            

    <div style={styles.appContainer}>
        
      <Header
      variant="beta"
      isSidebarOpen={isSidebarOpen}
      currentPage={currentPage}
      onToggleSidebar={() => setIsSidebarOpen(v => !v)}
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
    </div>
  );
};

function renderContent(page: "Challenges"|"History"|"Custom Lobby"|"Admin", isAdmin: boolean) {
  switch (page) {
    case "Challenges":
      return (
        <section style={styles.pageCard}>
          <h1 style={styles.h1}>Challenges</h1>
          <p style={styles.muted}>Pick difficulty & topic, then find a partner.</p>
          <div style={styles.row}>
            <select style={styles.input}><option>Easy</option><option>Medium</option><option>Hard</option></select>
            <select style={styles.input}>
              <option>Arrays</option><option>Graphs</option><option>DP</option><option>Strings</option>
            </select>
            <button style={styles.primaryBtn}>Find Match</button>
          </div>
        </section>
      );
    case "History":
      return (
        <section style={styles.pageCard}>
          <h1 style={styles.h1}>History</h1>
          <p style={styles.muted}>Your recent sessions will appear here.</p>
          <ul style={{marginTop:12, lineHeight:1.8}}>
            <li>2025-10-12 · Two Sum · Partner: @alice</li>
            <li>2025-10-08 · Binary Tree Paths · Partner: @ben</li>
          </ul>
        </section>
      );
    case "Custom Lobby":
      return (
        <section style={styles.pageCard}>
          <h1 style={styles.h1}>Custom Lobby</h1>
          <div style={styles.row}>
            <button style={styles.primaryBtn}>Create Lobby</button>
            <input placeholder="Enter code" style={styles.input}/>
            <button style={styles.secondaryBtn}>Join</button>
          </div>
        </section>
      );
    case "Admin":
      if (!isAdmin) {
        return (
          <section style={styles.pageCard}>
            <h1 style={styles.h1}>Admin</h1>
            <p style={{color:"#f87171"}}>You don’t have permission to view this page.</p>
          </section>
        );
      }
      return (
        <section style={styles.pageCard}>
          <h1 style={styles.h1}>Admin Panel</h1>
          <p style={styles.muted}>Manage users and review sessions.</p>
          <div style={{marginTop:12}}>
            <button style={styles.secondaryBtn}>View Users</button>{" "}
            <button style={styles.secondaryBtn}>Export Reports</button>
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
};

export default HomePage;
