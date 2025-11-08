import React, { useMemo, useState } from "react";
import { api } from "../lib/api";

export type User = {
  id: string;
  username: string;
  fullname: string;
  email: string | null;
  avatarUrl: string;
  isAdmin: boolean;
  provider: string;
};

type Props = {
  initial: User;
  onSaved: (u: User) => void;
  onClose: () => void;
};

const UserEditModal: React.FC<Props> = ({ initial, onSaved, onClose }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean>(!!initial.isAdmin);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocal = initial.provider === "password";

  const passwordChanged = password.trim().length > 0;
  const passwordsMatch = password === confirm;
  const privilegeChanged = isAdmin !== !!initial.isAdmin;

  const canSubmit = isLocal
    ? (passwordChanged ? passwordsMatch : false) || privilegeChanged
    : privilegeChanged;

  const payload = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (isLocal && passwordChanged && passwordsMatch) p.password = password.trim();
    return p;
  }, [isLocal, passwordChanged, passwordsMatch, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isLocal && passwordChanged && !passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let updated: User = initial;

      if (isLocal && Object.keys(payload).length > 0) {
        const resp = await api(`/users/${initial.id}`, {
          method: "PATCH",
          body: payload,
        });
        updated = (resp?.data as User) || updated;
      }

      if (privilegeChanged) {
        const resp2 = await api(`/users/${initial.id}/privilege`, {
          method: "PATCH",
          body: { isAdmin },
        });
        updated = (resp2?.data as User) || { ...updated, isAdmin };
      }

      onSaved(updated);
    } catch (err: any) {
      console.error("Update user error:", err);
      setError(err?.message || "Failed to update user");
    } finally {
      setSaving(false);
      setPassword("");
      setConfirm("");
    }
  };

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
          <p className="text-xs text-gray-500">ID: {initial.id}</p>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLocal && (
            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">New Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Confirm New Password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </label>

              {passwordChanged && !passwordsMatch && (
                <p className="text-xs text-red-600">Passwords do not match.</p>
              )}
            </div>
          )}

          {/* Admin toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="isAdmin"
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-700">
              Grant admin privileges
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving || !canSubmit}
              title={!canSubmit ? "Change password (local only) or toggle admin to enable saving" : undefined}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
