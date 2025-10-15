// src/components/TopBar.tsx
import React, { useState } from "react";
import { theme } from "../theme";
import { MenuIcon } from "./Icons";
import ProfileDropdown from "./ProfileDropdown";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

type Style = React.CSSProperties;

interface TopBarProps {
  onMenuClick: () => void;
  rightExtra?: React.ReactNode; 
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, rightExtra}) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.username || user?.email || "User";
  const displayEmail = user?.email || "";
  const avatarUrl =
    user && (user as any).avatarUrl
      ? (user as any).avatarUrl
      : "https://t3.ftcdn.net/jpg/02/95/26/46/360_F_295264675_clwKZxogAhxLS9sD163Tgkz1WMHsq1RJ.jpg";

    async function handleLogout() {
    try {
      // optional: backend endpoint; safe to ignore failure in dev
      await api("/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      logout();                      // clear token/user from AuthContext + localStorage
      setDropdownOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <header style={styles.topBar}>
      <div style={styles.leftSection}>
        <button onClick={onMenuClick} style={styles.menuButton}>
          <MenuIcon />
        </button>
        <span style={styles.logoText}>PeerPrep</span>
      </div>

      <div style={styles.rightSection}>
        {rightExtra}
        <div style={{ position: "relative", marginLeft: "0.75rem" }}>
          <button
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            style={styles.profileButton}
          >
             <img src={avatarUrl} alt="User Avatar" style={styles.avatar} />
          </button>
          {isDropdownOpen && (
            <ProfileDropdown
              onClose={() => setDropdownOpen(false)}
              userName={displayName}
              userEmail={displayEmail}
              avatarUrl={avatarUrl}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </header>
  );
};

const styles: { [key: string]: Style } = {
  topBar: {
    height: "60px",
    width: "100%",
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: theme.backgroundMedium,
    borderBottom: `1px solid ${theme.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    zIndex: 1500,
  },
  leftSection: { display: "flex", alignItems: "center", gap: "1rem" },
  menuButton: {
    background: "none",
    border: "none",
    color: theme.textPrimary,
    cursor: "pointer",
    padding: "0.5rem",
  },
  logoText: { fontSize: "1.5rem", fontWeight: 700, color: theme.textPrimary },
  centerSection: {
    flexGrow: 1,
    display: "flex",
    justifyContent: "center",
    padding: "0 2rem",
  },
  hBar: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    maxWidth: "600px",
    backgroundColor: theme.backgroundDark,
    border: `1px solid ${theme.border}`,
    borderRadius: "20px",
    overflow: "hidden",
  },
  rightSection: { display: "flex", alignItems: "center" },
  profileButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    borderRadius: "50%",
  },
  avatar: { width: "36px", height: "36px", borderRadius: "50%" },
};

export default TopBar;
