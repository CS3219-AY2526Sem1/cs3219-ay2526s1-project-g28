import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../theme";
import Header from "../components/Header";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { getPasswordRequirementStatus, isPasswordStrong } from "../lib/password";

type Style = React.CSSProperties;


type CloudinarySig = {
  timestamp: number;
  folder: string;
  signature: string;
  cloudName: string;
  apiKey: string;
};

// If your api() helper already adds auth headers, use it. Otherwise use fetch with Authorization.
async function getCloudinarySignature(): Promise<CloudinarySig> {
  // If your backend route is different, adjust this path:
  const res = await api(`/api/cloudinary/sign?folder=avatars`, { method: "GET" });
  // If your api() returns { ... } directly, just return res; otherwise destructure res.data
  return (res?.data ?? res) as CloudinarySig;
}

async function uploadToCloudinary(file: File) {
  const { timestamp, folder, signature, cloudName, apiKey } = await getCloudinarySignature();

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);

  // use `auto` so images/videos both work; use `image` if you only accept images
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Upload failed");

  // normalize to a 256x256 face-cropped avatar
  const transformed = String(json.secure_url).replace(
    "/upload/",
    "/upload/c_thumb,g_face,w_256,h_256,f_auto,q_auto/"
  );
  return { url: transformed, publicId: json.public_id as string };
}
const HEADER_H = 64;          
const SIDEBAR_W_OPEN = 260;
const SIDEBAR_W_CLOSED = 80;
const SettingsPage: React.FC = () => {
  const { user, token, login, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordStatus = useMemo(
    () => getPasswordRequirementStatus(newPw),
    [newPw]
  );
  const passwordStrong = isPasswordStrong(newPw);
  const passwordsMatch = newPw === confirmPw;
  const canSavePassword = Boolean(
    passwordStrong && passwordsMatch && newPw && confirmPw && !savingPassword
  );

  
  // Treat missing provider as "password" (local) to keep old accounts working
  const provider = user?.provider || "password";
  const isOAuth = provider !== "password";

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || "");
    setEmail(user?.email || "");
  }, [user]);

  if (!user) {
    return (
      <div style={settingsStyles.full}>
        <p>Please log in first.</p>
      </div>
    );
  }

  async function removeAvatar() {
    const ok = window.confirm("Remove your profile picture?");
    if (!ok) return;

  setAvatarBusy(true);
  setMsg(null);
  setErr(null);
  try {
    const res = await api(`/users/${user.id}`, { method: "PATCH", body: { avatarUrl: "" } });
    const updated = res?.data ?? res;
    if (token) login(token, updated);      // keep context/localStorage in sync
    setAvatarUrl("");                      // local state
    setMsg("Profile picture removed");
  } catch (e: any) {
    setErr(e.message || "Failed to remove avatar");
  } finally {
    setAvatarBusy(false);
  }
}


 async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { setErr("Please select an image"); return; }
  if (file.size > 2 * 1024 * 1024) { setErr("Max file size is 2MB"); return; }

  setUploading(true);
  setAvatarBusy(true);
  setErr(null);
  setMsg(null);
  try {
    const { url } = await uploadToCloudinary(file);
    // PATCH backend, then update context with returned user
    const res = await api(`/users/${user.id}`, { method: "PATCH", body: { avatarUrl: url } });
    const updated = res?.data ?? res;
    if (token) login(token, updated);          // <- this refreshes Header/user everywhere
    setAvatarUrl(updated.avatarUrl || url);    // optional: keep local state in sync
    setMsg("Avatar uploaded");
  } catch (e: any) {
    setErr(e.message || "Upload failed");
  } finally {
    setUploading(false);
    setAvatarBusy(false);
    e.target.value = "";
  }
}

  async function saveEmail() {
    if (savingEmail) return;
    setSavingEmail(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api(`/users/${user.id}`, { method: "PATCH", body: { email } });
      const updated = res?.data ?? res;
      if (token) login(token, updated);
      setEmail(updated.email || email);
      setMsg("Email updated");
    } catch (e: any) {
      setErr(e.message || "Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword() {
    if (savingPassword) return;
    if (!passwordStrong) {
      setErr("Password must meet all requirements.");
      return;
    }
    if (!passwordsMatch) {
      setErr("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    setMsg(null);
    setErr(null);
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: { password: newPw } });
      setMsg("Password updated");
      setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      setErr(e.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteAccount() {
    const ok = window.confirm("This will permanently delete your account. Continue?");
    if (!ok) return;
    try {
      await api(`/users/${user.id}`, { method: "DELETE" });
      await logout();
      window.location.href = "/signup";
    } catch (e: any) {
      setErr(e.message || "Failed to delete account");
    }
  }
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentPage, setCurrentPage] = useState<
      "Challenges" | "History" | "Custom Lobby" | "Admin"
    >("Challenges");
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
    position: "fixed",
    top: HEADER_H,
    left: isSidebarOpen ? SIDEBAR_W_OPEN : SIDEBAR_W_CLOSED,
    right: 0,
    bottom: 0,
    overflowY: "auto",
    /* no maxWidth */
    boxSizing: "border-box",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  }}
          >
            
      
        <section style={settingsStyles.card}>
          <h1 style={settingsStyles.h1}>Settings</h1>
          <p style={settingsStyles.muted}>
            Signed in as <strong>{user.username || user.email || "user"}</strong>
            {isOAuth ? ` (via ${provider})` : " (local account)"}
          </p>
          {msg && <p style={{ color: theme.success, marginTop: 8 }}>{msg}</p>}
          {err && <p style={{ color: theme.danger, marginTop: 8 }}>{err}</p>}
        </section>

        {/* Avatar */}
        <section style={settingsStyles.card}>
          <h2 style={{ ...settingsStyles.h2, marginBottom: 10 }}>Profile</h2>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
            <img
              src={avatarUrl || "https://t3.ftcdn.net/jpg/02/95/26/46/360_F_295264675_clwKZxogAhxLS9sD163Tgkz1WMHsq1RJ.jpg"}
              alt="avatar"
              style={{ height: 64, width: 64, borderRadius: 999, objectFit: "cover", border: `1px solid ${theme.border}` }}
            />
           
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
  {isOAuth ? (
    <p style={settingsStyles.mutedSmall}>
      Profile picture is managed by {provider}. Use your provider to change it.
    </p>
  ) : (
    <>
      <label
        style={{
          ...settingsStyles.fileLabel,
          opacity: uploading ? 0.7 : 1,
          cursor: uploading ? "not-allowed" : "pointer",
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onPickFile}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <span>{uploading ? "Uploading…" : "Upload image"}</span>
      </label>

      <button
              onClick={removeAvatar}
              disabled={avatarBusy || uploading || !avatarUrl}
              style={{
                ...settingsStyles.secondaryBtn,
                opacity: avatarUrl && !(avatarBusy || uploading) ? 1 : 0.6,
                cursor:
                  avatarBusy || uploading || !avatarUrl ? "not-allowed" : "pointer",
              }}
              title={avatarUrl ? "Remove current image" : "No image to remove"}
            >
              Remove image
            </button>

      {/* Limit note lives INSIDE the non-OAuth branch */}
      <p style={{ ...settingsStyles.mutedSmall, margin: 0 }}>limit 2MB.</p>
    </>
  )}
</div>
        </section>

        {/* Email */}
        <section style={settingsStyles.card}>
          <h2 style={settingsStyles.h2}>Email</h2>
          <input
            type="email"
            style={{ ...settingsStyles.input, ...(isOAuth ? settingsStyles.inputDisabled : {}) }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isOAuth}
          />
          {isOAuth ? (
            <p style={settingsStyles.mutedSmall}>Email is managed by {provider}. Update it in your {provider} account.</p>
          ) : (
            <button
              onClick={saveEmail}
              disabled={savingEmail || !email}
              style={{
                ...settingsStyles.primaryBtn,
                opacity: savingEmail || !email ? 0.7 : 1,
                cursor: savingEmail || !email ? "not-allowed" : "pointer",
              }}
            >
              {savingEmail ? "Saving…" : "Save email"}
            </button>
          )}
        </section>

        {/* Password */}
        <section style={settingsStyles.card}>
          <h2 style={settingsStyles.h2}>Password</h2>
          {isOAuth ? (
            <p style={settingsStyles.mutedSmall}>Password is managed by {provider}. Use your provider to change it.</p>
          ) : (
            <>
              <input
                type="password"
                placeholder="New password"
                style={settingsStyles.input}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                aria-describedby="settings-password-requirements"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                style={settingsStyles.input}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
              <div
                id="settings-password-requirements"
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.backgroundMedium,
                  padding: "12px 14px",
                  marginTop: 12,
                }}
              >
                <p
                  style={{
                    ...settingsStyles.mutedSmall,
                    margin: 0,
                    color: theme.textSecondary,
                    fontSize: 13,
                  }}
                >
                  Password must include:
                </p>
                <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {passwordStatus.map((requirement) => (
                    <li key={requirement.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        aria-hidden
                        style={{
                          fontSize: 12,
                          color: requirement.met ? theme.success : theme.textSecondary,
                        }}
                      >
                        {requirement.met ? "✓" : "•"}
                      </span>
                      <span
                        style={{
                          color: requirement.met ? theme.success : theme.textSecondary,
                          fontSize: 13,
                        }}
                      >
                        {requirement.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {newPw && confirmPw && !passwordsMatch && (
                <p style={{ ...settingsStyles.mutedSmall, color: theme.danger }}>Passwords do not match.</p>
              )}
              <button
                onClick={savePassword}
                disabled={!canSavePassword}
                style={{
                  ...settingsStyles.primaryBtn,
                  marginTop: 12,
                  opacity: !canSavePassword ? 0.7 : 1,
                  cursor: !canSavePassword ? "not-allowed" : "pointer",
                }}
              >
                {savingPassword ? "Saving…" : "Update password"}
              </button>
            </>
          )}
        </section>

        {/* Danger zone */}
        <section style={settingsStyles.card}>
          <h2 style={{ ...settingsStyles.h2, color: "#ef4444" }}>Danger zone</h2>
          <button onClick={deleteAccount} style={settingsStyles.dangerBtn}>Delete my account</button>
        </section>
      </main>
    </div>
  );
};

const settingsStyles: { [k: string]: Style } = {
    mainContent: {
    height: "100dvh",
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: 960,
  },
  appContainer: {
    backgroundColor: theme.backgroundDark,
    color: theme.textPrimary,
    fontFamily: "'Inter','Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
  },
  full: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.textPrimary,
    background: theme.backgroundDark,
  },
  main: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    background: theme.backgroundLight,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.25rem 1.25rem 1.5rem",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)",
  },
  h1: { fontSize: 24, fontWeight: 600, margin: 0, marginBottom: 6 },
  h2: { fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 6 },
  muted: { color: theme.textSecondary, margin: 0 },
  mutedSmall: { color: theme.textSecondary, marginTop: 8, fontSize: 12 },
  input: {
    background: theme.backgroundMedium,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    width: "100%",
    marginTop: 8,
  },
  inputDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  primaryBtn: {
    background: theme.accent,
    color: theme.accentForeground,
    border: `1px solid ${theme.accent}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
    marginTop: 10,
  },
  dangerBtn: {
    background: "transparent",
     color: theme.danger,
    border: `1px solid ${theme.danger}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
    marginTop: 6,
  },
  secondaryBtn: {
    background: theme.backgroundLight,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
  },
  fileLabel: {
    display: "inline-block",
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "10px 16px",
    background: theme.backgroundLight,
    color: theme.textPrimary,
    cursor: "pointer",
  },
};

export default SettingsPage;
