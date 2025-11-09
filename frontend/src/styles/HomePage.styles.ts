import { theme } from "../theme";

type Style = React.CSSProperties;
export const styles: { [key: string]: Style } = {
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
    background: theme.backgroundMedium,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "10px 12px",
  },
  primaryBtn: {
    background: theme.accent,
    color: theme.accentForeground,
    border: `1px solid ${theme.accent}`,
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
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: theme.backgroundLight,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.5rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
  },
};
export default styles;
