// src/pages/HomePage.tsx
import React, { useState } from "react";
import { theme } from "../theme";
import TopBar from "../components/TopBar";
import CollapsibleSidebar from "../components/CollapsibleSidebar";

type Style = React.CSSProperties;

const HomePage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("Challenges");

  // --- MOCK ADMIN STATE ---
  // In a real app, this would come from your authentication context/logic.
  const [isAdmin, setIsAdmin] = useState(true);

  const renderContent = () => {
    // ... (renderContent function remains the same)
    // ...
  };

  return (
    <div style={styles.appContainer}>
      <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <CollapsibleSidebar
        isOpen={isSidebarOpen}
        isAdmin={isAdmin} // <-- Pass the admin state down
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <main
        style={{
          ...styles.mainContent,
          marginLeft: isSidebarOpen ? "240px" : "72px",
        }}
      ></main>
    </div>
  );
};

const styles: { [key: string]: Style } = {
  appContainer: {
    backgroundColor: theme.backgroundDark,
    color: theme.textPrimary,
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
  },
  mainContent: {
    padding: "2rem",
    paddingTop: "calc(60px + 2rem)",
    transition: "margin-left 0.3s ease-in-out",
    display: "flex",
    flexDirection: "column",
    gap: "1rem", // Reduced gap to make space for toggle button
  },
  // --- NEW STYLES for the toggle button ---
  adminToggleContainer: {
    alignSelf: "flex-start", // Position button to the left
  },
  adminToggleButton: {
    background: theme.backgroundLight,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
  },
  // ... (other styles like dashboardGrid, pageCard remain the same)
};

export default HomePage;
