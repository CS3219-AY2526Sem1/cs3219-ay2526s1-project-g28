// src/components/ProfileDropdown.tsx
import React, { useEffect, useRef } from "react";
import { theme } from "../theme";
import { ProfileIcon, SettingsIcon, LogoutIcon } from "./Icons";
import { useNavigate } from "react-router-dom";
type Style = React.CSSProperties;

interface ProfileDropdownProps {
  onClose: () => void;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onClose,userName,
  userEmail,
  avatarUrl,
  onLogout, }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
  // Effect to handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
    const go = (path: string) => {
    navigate(path);
    onClose();
  };
    const menuItems = [
    { name: "Your Profile", icon: <ProfileIcon />, action: () => {/* navigate to /profile if you want */} },
    { name: "Settings", icon: <SettingsIcon />, action:  () => go("/settings") },
    { name: "Logout", icon: <LogoutIcon />, action: onLogout },
  ];

  return (
    <div ref={dropdownRef} style={styles.dropdown} role="menu" aria-label="Profile menu">
      <div style={styles.header}>
        <img
          src={avatarUrl || "https://t3.ftcdn.net/jpg/02/95/26/46/360_F_295264675_clwKZxogAhxLS9sD163Tgkz1WMHsq1RJ.jpg"}
          alt="User Avatar"
          style={styles.avatar}
        />
        <div>
          <p style={styles.userName}>{userName}</p>
          <p style={styles.userEmail}>{userEmail}</p>
        </div>
      </div>
      <hr style={styles.divider} />
      <ul style={styles.menuList}>
        {menuItems.map((item) => (
          <li key={item.name} style={styles.menuItem}>
            <button onClick={item.action} style={styles.menuButton}>
              <span style={styles.menuIcon}>{item.icon}</span>
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const styles: { [key: string]: Style } = {
  dropdown: {
    position: "absolute",
    top: "55px",
    right: "10px",
    width: "300px",
    backgroundColor: theme.backgroundLight,
    borderRadius: "12px",
    border: `1px solid ${theme.border}`,
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
    zIndex: 2000,
    overflow: "hidden",
  },
  header: { display: "flex", alignItems: "center", padding: "1rem" },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    marginRight: "1rem",
  },
  userName: { margin: 0, fontWeight: 600, color: theme.textPrimary },
  userEmail: { margin: 0, fontSize: "0.8rem", color: theme.textSecondary },
  divider: {
    border: "none",
    borderTop: `1px solid ${theme.border}`,
    margin: "0",
  },
  menuList: { listStyle: "none", margin: 0, padding: "0.5rem" },
  menuItem: {},
  menuButton: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    background: "none",
    border: "none",
    color: theme.textPrimary,
    padding: "0.75rem",
    fontSize: "0.9rem",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left",
  },
  menuIcon: { marginRight: "1rem", display: "flex", alignItems: "center" },
};

export default ProfileDropdown;
