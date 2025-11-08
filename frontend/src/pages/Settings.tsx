import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../theme";
import Header from "../components/Header";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";

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

const SettingsPage: React.FC = () => {
  const { user, token, login, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  
  // Treat missing provider as "password" (local) to keep old accounts working
  const provider = user?.provider || "password";
  const isOAuth = provider !== "password";

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || "");
    setEmail(user?.email || "");
  }, [user]);

  if (!user) {
    return (
      <div style={styles.full}>
        <p>Please log in first.</p>
      </div>
    );
  }

  async function saveAvatar() {
  setBusy(true); setMsg(null); setErr(null);
  try {
    const res = await api(`/users/${user.id}`, { method: "PATCH", body: { avatarUrl } });
    const updated = res?.data ?? res;          // depends on your api() shape
    // persist into context + localStorage
    if (token) login(token, updated);
    setMsg("Avatar updated");
  } catch (e: any) {
    setErr(e.message || "Failed to update avatar");
  } finally { setBusy(false); }
}

async function removeAvatar() {
  const ok = window.confirm("Remove your profile picture?");
  if (!ok) return;

  setBusy(true); setMsg(null); setErr(null);
  try {
    const res = await api(`/users/${user.id}`, { method: "PATCH", body: { avatarUrl: "" } });
    const updated = res?.data ?? res;
    if (token) login(token, updated);      // keep context/localStorage in sync
    setAvatarUrl("");                      // local state
    setMsg("Profile picture removed");
  } catch (e: any) {
    setErr(e.message || "Failed to remove avatar");
  } finally {
    setBusy(false);
  }
}


 async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { setErr("Please select an image"); return; }
  if (file.size > 2 * 1024 * 1024) { setErr("Max file size is 2MB"); return; }

  setUploading(true); setErr(null); setMsg(null);
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
    e.target.value = "";
  }
}

  async function saveEmail() {
    setBusy(true); setMsg(null); setErr(null);
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: { email } });
      setMsg("Email updated");
    } catch (e: any) {
      setErr(e.message || "Failed to update email");
    } finally { setBusy(false); }
  }

  async function savePassword() {
    if (newPw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setErr("Passwords do not match."); return; }
    setBusy(true); setMsg(null); setErr(null);
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: { password: newPw } });
      setMsg("Password updated");
      setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      setErr(e.message || "Failed to update password");
    } finally { setBusy(false); }
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

  return (
    <div style={styles.appContainer}>
      <Header variant="settings" showBack backTo="/home" title="Settings" />
      <main style={{ ...styles.main, paddingTop: "calc(60px + 2rem)" }}>
        <section style={styles.card}>
          <h1 style={styles.h1}>Settings</h1>
          <p style={styles.muted}>
            Signed in as <strong>{user.username || user.email || "user"}</strong>
            {isOAuth ? ` (via ${provider})` : " (local account)"}
          </p>
          {msg && <p style={{ color: "#16a34a", marginTop: 8 }}>{msg}</p>}
          {err && <p style={{ color: "#ef4444", marginTop: 8 }}>{err}</p>}
        </section>

        {/* Avatar */}
        <section style={styles.card}>
          <h2 style={{ ...styles.h2, marginBottom: 10 }}>Profile</h2>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
            <img
              src={avatarUrl || "https://t3.ftcdn.net/jpg/02/95/26/46/360_F_295264675_clwKZxogAhxLS9sD163Tgkz1WMHsq1RJ.jpg"}
              alt="avatar"
              style={{ height: 64, width: 64, borderRadius: 999, objectFit: "cover", border: `1px solid ${theme.border}` }}
            />
           
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
  {isOAuth ? (
    <p style={styles.mutedSmall}>
      Profile picture is managed by {provider}. Use your provider to change it.
    </p>
  ) : (
    <>
      <label style={styles.fileLabel}>
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
        disabled={busy || !avatarUrl}
        style={{ ...styles.secondaryBtn, opacity: avatarUrl ? 1 : 0.6 }}
        title={avatarUrl ? "Remove current image" : "No image to remove"}
      >
        Remove image
      </button>

      {/* Limit note lives INSIDE the non-OAuth branch */}
      <p style={{ ...styles.mutedSmall, margin: 0 }}>limit 2MB.</p>
    </>
  )}
</div>
        </section>

        {/* Email */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Email</h2>
          <input
            type="email"
            style={{ ...styles.input, ...(isOAuth ? styles.inputDisabled : {}) }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isOAuth}
          />
          {isOAuth ? (
            <p style={styles.mutedSmall}>Email is managed by {provider}. Update it in your {provider} account.</p>
          ) : (
            <button onClick={saveEmail} disabled={busy || !email} style={styles.primaryBtn}>
              {busy ? "Saving…" : "Save email"}
            </button>
          )}
        </section>

        {/* Password */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Password</h2>
          {isOAuth ? (
            <p style={styles.mutedSmall}>Password is managed by {provider}. Use your provider to change it.</p>
          ) : (
            <>
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                style={styles.input}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                style={styles.input}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
              <button onClick={savePassword} disabled={busy} style={styles.primaryBtn}>
                {busy ? "Saving…" : "Update password"}
              </button>
            </>
          )}
        </section>

        {/* Danger zone */}
        <section style={styles.card}>
          <h2 style={{ ...styles.h2, color: "#ef4444" }}>Danger zone</h2>
          <button onClick={deleteAccount} style={styles.dangerBtn}>Delete my account</button>
        </section>
      </main>
    </div>
  );
};

const styles: { [k: string]: Style } = {
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
  },
  h1: { fontSize: 24, fontWeight: 600, margin: 0, marginBottom: 6 },
  h2: { fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 6 },
  muted: { color: theme.textSecondary, margin: 0 },
  mutedSmall: { color: theme.textSecondary, marginTop: 8, fontSize: 12 },
  input: {
    background: theme.backgroundDark,
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
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
    marginTop: 10,
  },
  dangerBtn: {
    background: "transparent",
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
    marginTop: 6,
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
