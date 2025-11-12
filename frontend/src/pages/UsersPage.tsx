// src/pages/UsersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { api } from "../lib/api";
import { PencilIcon, TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { theme } from "../theme";
import UserEditModal, { User } from "../components/UserEditModal";

type Style = React.CSSProperties;

const ITEMS_PER_PAGE = 25;

const UsersPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const currentPageName = "User Management";

  const currentUserId = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const userObj = JSON.parse(storedUser);
      return userObj?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api("/users/");
        const all = (response?.data as User[]) || [];
        const list = currentUserId
          ? all.filter((u) => String(u.id) !== String(currentUserId))
          : all;
        setUsers(list);
      } catch (err: any) {
        console.error("Fetch users error:", err);
        setError(err?.message || "Failed to fetch users");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const pool = [u.username ?? "", u.fullname ?? "", u.email ?? ""]
        .join(" ")
        .toLowerCase();
      return pool.includes(q);
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const currentUsers = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  const handleEdit = (id: string) => {
    const target = users.find((u) => u.id === id) || null;
    setEditingUser(target);
    setShowEdit(true);
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setShowDeleteConfirm(false);
    setError(null);
    try {
      await api(`/users/${userToDelete}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete));
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Delete user error:", err);
      setError(err?.message || "Failed to delete user");
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const upsertUser = (saved: User) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  return (
    <div style={styles.appContainer}>
      <Header
        variant="beta"
        isSidebarOpen={isSidebarOpen}
        currentPage={currentPageName}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        onNavigate={(p) => console.log("Navigate to:", p)}
      />

      <main
        className={`p-8 pt-[calc(60px+2rem)] transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-60" : "ml-[72px]"
        }`}
      >
        <section className="rounded-xl p-5 shadow-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Users</h1>
            <div className="relative w-full md:w-96">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, full name, or email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100"
              />
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-500 dark:text-slate-400" />
            </div>
          </div>

          {isLoading && <p className="text-gray-500 dark:text-slate-400 text-center py-4">Loading users...</p>}
          {error && <p className="text-red-500 dark:text-red-400 text-center py-4">Error: {error}</p>}

          {!isLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-left">
                  <thead className="border-b border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {currentUsers.map((u) => (
                      <tr key={u.id} className="transition hover:bg-gray-50 dark:hover:bg-slate-800/80">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-100">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.username}
                                className="h-8 w-8 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 text-xs">
                                {u.username?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span>{u.username}</span>
                               <span className="text-gray-500 dark:text-slate-400 text-xs">{u.fullname}</span>
                            </div>
                          </div>
                        </td>
                         <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{u.email ?? "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                             u.isAdmin
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                              : "bg-gray-100 text-gray-800 dark:bg-slate-800/60 dark:text-slate-200"
                          }`}>
                            {u.isAdmin ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{u.provider || "local"}</td>
                        <td className="px-4 py-3 text-sm text-right space-x-3">
                          <button
                            onClick={() => handleEdit(u.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5 inline-block" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Showing {filtered.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filtered.length} users
                </span>
                <div className="space-x-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                     className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                     className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100">Delete User</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3 space-x-4">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-700 text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-base font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editingUser && (
        <UserEditModal
          initial={editingUser}
          onClose={() => setShowEdit(false)}
          onSaved={(saved) => {
            upsertUser(saved);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
};

const styles: { [key: string]: Style } = {
  appContainer: {
    backgroundColor: theme.backgroundDark,
    color: theme.textPrimary,
    fontFamily: "'Inter','Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
  },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
};

export default UsersPage;
