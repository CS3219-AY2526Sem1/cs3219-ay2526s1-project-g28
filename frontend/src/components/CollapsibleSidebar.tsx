// src/components/CollapsibleSidebar.tsx
import React, { useState } from "react";
import { theme } from "../theme";
import {
  HomeIcon,
  HistoryIcon,
  LeaderboardIcon,
  UsersIcon,
  AnalyticsIcon,
} from "./Icons";

type Style = React.CSSProperties;

interface NavItem {
  name: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  isAdmin: boolean; // <-- New prop to determine user role
  currentPage: string;
  onNavigate: (page: string) => void;
}

const CollapsibleSidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentPage,
  onNavigate,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Separate navigation items by role
  const userNavItems: NavItem[] = [
    { name: "Challenges", icon: <HomeIcon /> },
    { name: "My Sessions", icon: <HistoryIcon /> },
    { name: "Leaderboard", icon: <LeaderboardIcon /> },
  ];

  const adminNavItems: NavItem[] = [
    { name: "User Management", icon: <UsersIcon /> },
    { name: "Questions", icon: <AnalyticsIcon /> },
  ];

  // Helper component to avoid repetition
  const NavLink = ({ item }: { item: NavItem }) => (
    <li
      key={item.name}
      style={styles.navItem}
      onMouseEnter={() => setHoveredItem(item.name)}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigate(item.name);
        }}
        style={{
          ...styles.navLink,
          ...(currentPage === item.name ? styles.navLinkActive : {}),
        }}
      >
        <div style={styles.navIcon}>{item.icon}</div>
        <span style={{ ...styles.navText, opacity: isOpen ? 1 : 0 }}>
          {item.name}
        </span>
      </a>
      {!isOpen && hoveredItem === item.name && (
        <span style={styles.tooltip}>{item.name}</span>
      )}
    </li>
  );

  return (
    <aside style={{ ...styles.sidebar, width: isOpen ? "240px" : "72px" }}>
      <nav style={styles.nav}>
        <ul style={styles.navList}>
          {userNavItems.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </ul>

        <hr style={styles.divider} />

        <ul style={styles.navList}>
          {adminNavItems.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};

const styles: { [key: string]: Style } = {
  sidebar: {
    backgroundColor: theme.backgroundMedium,
    height: "calc(100vh - 60px)",
    position: "fixed",
    top: "60px",
    left: 0,
    transition: "width 0.3s ease-in-out",
    borderRight: `1px solid ${theme.border}`,
    zIndex: 1000,
    overflowX: "hidden",
  },
  nav: { paddingTop: "1rem" },
  navList: { listStyle: "none", padding: "0 0.75rem", margin: 0 },
  navItem: { position: "relative" },
  navLink: {
    display: "flex",
    alignItems: "center",
    padding: "0.75rem",
    color: theme.textSecondary,
    textDecoration: "none",
    borderRadius: "8px",
    margin: "0.25rem 0",
    transition: "background-color 0.2s ease",
  },
  navLinkActive: {
    backgroundColor: theme.backgroundLight,
    color: theme.textPrimary,
  },
  navIcon: {
    flexShrink: 0,
    width: "24px",
    height: "24px",
    marginRight: "1.5rem",
  },
  navText: {
    whiteSpace: "nowrap",
    transition: "opacity 0.2s ease-in-out 0.1s",
  },
  tooltip: {
    position: "absolute",
    left: "68px",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: theme.backgroundLight,
    color: theme.textPrimary,
    padding: "0.4rem 0.8rem",
    borderRadius: "6px",
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    zIndex: 1001,
  },
  // --- NEW DIVIDER STYLES ---
  divider: {
    border: "none",
    borderTop: `1px solid ${theme.border}`,
    margin: "1rem 0.75rem",
  },
  dividerContainer: {
    display: "flex",
    alignItems: "center",
    padding: "1rem 0.75rem 0.5rem 0.75rem",
  },
  dividerText: {
    color: theme.textSecondary,
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
};

export default CollapsibleSidebar;
