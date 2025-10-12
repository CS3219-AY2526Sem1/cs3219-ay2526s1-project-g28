// src/components/Icons.tsx
import React from "react";

const iconStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  stroke: "currentColor",
  strokeWidth: 1.5,
  fill: "none",
};

export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955a.75.75 0 011.06 0l8.955 8.955M3 11.25V21h6V15h6v6h6V11.25M8.25 21V15"
    />
  </svg>
);

export const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const LeaderboardIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

export const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

export const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-1.007 1.11-.95.55.057 1.008.523 1.033 1.07.024.54-.356 1.013-.896 1.076-.54.062-1.026-.356-1.11-.95zM12 21c3.52 0 6.64-.81 9.11-2.186a1 1 0 00.44-1.422l-1.15-2.003a1 1 0 00-1.422-.44A13.43 13.43 0 0112 16.5c-2.92 0-5.63.88-7.98 2.45a1 1 0 00-.44 1.422l1.15 2.003a1 1 0 001.422.44A15.34 15.34 0 0112 21zM12 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
    />
  </svg>
);

export const MenuIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

export const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3.007-6.225l4.25-4.25m0 0l4.25 4.25m-4.25-4.25v12"
    />
  </svg>
);

export const UsersIcon = () => (
  <svg
    style={{
      width: "24px",
      height: "24px",
      stroke: "currentColor",
      strokeWidth: 1.5,
      fill: "none",
    }}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.513-.96 1.487-1.591 2.571-1.591s2.058.63 2.571 1.591m-4.814 4.814c-.318.613.314 1.29 1.011 1.29h3.802c.697 0 1.329-.677 1.011-1.29m-6.824-8.124a2.25 2.25 0 012.25-2.25h3.348a2.25 2.25 0 012.25 2.25v3.348a2.25 2.25 0 01-2.25 2.25h-3.348a2.25 2.25 0 01-2.25-2.25V6.75z"
    />
  </svg>
);

export const AnalyticsIcon = () => (
  <svg
    style={{
      width: "24px",
      height: "24px",
      stroke: "currentColor",
      strokeWidth: 1.5,
      fill: "none",
    }}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);
