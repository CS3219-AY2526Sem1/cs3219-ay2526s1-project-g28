// src/components/Header.tsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import TopBar from "../components/TopBar";
import CollapsibleSidebar from "../components/CollapsibleSidebar";
import { useTheme } from "../theme/ThemeProvider";



export type HeaderProps =
  | { variant: "public" }
  | {
      variant: "authed";
      level?: number;
      avatarUrl?: string;

    }
  | { variant: "beta";
      isSidebarOpen: boolean;
      currentPage: Page;
      onToggleSidebar: () => void;
      onNavigate: (p: Page) => void;
  }
  | {variant: "authing";};

const AUThed_NAV = [
  { to: "/history", label: "History" },
  { to: "/dashboard", label: "Play", exact: true },
  { to: "/custom-lobby", label: "Custom Lobby" },
];

export default function Header(props: HeaderProps) {
 function ThemeButton() {
  const { theme, resolved, setTheme, toggle } = useTheme();

  // cycle through: light -> dark -> system -> light
  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const label =
    theme === "system" ? `System (${resolved})` : resolved === "dark" ? "Dark" : "Light";
  const icon = theme === "system" ? "🖥️" : resolved === "dark" ? "🌙" : "☀️";

  return (
    <button
      onClick={cycle}
      title={`Theme: ${label} (click to change)`}
      className="px-2 py-1 rounded-md border border-neutral-300 bg-white text-black
                 hover:bg-neutral-100 transition
                 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
    >
      <span className="mr-1">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
  const { user } = useAuth();

  if (props.variant === "public") {
    return (
      <header className="w-full bg-white dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between py-4 px-4">
          <Link to="/" className="text-xl font-semibold dark:bg-black">PeerPrep</Link>
          <nav className="flex items-center gap-6">
            <ThemeButton />
            <Link to="/login" className="text-sm rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 ">Log in</Link>
            <Link to="/signup" className="text-sm rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 ">
              Sign up
            </Link>
          </nav>
        </div>
      </header>
    );
  } else   if (props.variant === "beta") {
    const { isSidebarOpen, currentPage, onToggleSidebar, onNavigate } = props;
    return (
      <div>
        <TopBar
          onMenuClick={onToggleSidebar}
          username={user?.username || user?.email || "User"}
          badge={user?.isAdmin ? "Admin" : undefined}
          rightExtra={<ThemeButton />}
        />
        <CollapsibleSidebar
          isOpen={isSidebarOpen}
          isAdmin={!!user?.isAdmin}
          currentPage={currentPage}
          onNavigate={onNavigate}
        />
      </div>
    );
  } else if (props.variant === "authing") {
    return (
      <header className="w-full bg-white dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between py-4 px-4">
          <Link to="/" className="text-xl font-semibold dark:bg-black">PeerPrep</Link>
          <nav className="flex items-center gap-6">
            <ThemeButton />
          </nav>
        </div>
      </header>
    );
  }
  

  const { level = 1, avatarUrl } = props;

  return (
    <header className="w-full bg-neutral-800 text-white">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-3">
          <Link to="/" className="px-4 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 transition" aria-label="Home">
            Logo
          </Link>
          {AUThed_NAV.map((n) => (
            <NavItem key={n.to} to={n.to} label={n.label} exact={Boolean(n.exact)} />
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <ThemeButton />
          <span className="text-sm">Level <span className="font-semibold">{level}</span></span>
          {user?.username && <span className="text-sm"><span className="font-semibold">{user?.username}</span></span>}
          {/* Avatar menu owns logout */}
          <AvatarMenu avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label, exact = false }: { to: string; label: string; exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `px-4 py-2 rounded-md transition ${
          isActive ? "ring-2 ring-white/70 bg-neutral-700" : "bg-white text-black hover:bg-neutral-200"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

/** Avatar menu with built-in logout */
function AvatarMenu({ avatarUrl }: { avatarUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { logout } = useAuth();          // ← uses global auth store
  const navigate = useNavigate();        // ← redirect after logout

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      // Best effort: inform backend (ok if your backend doesn’t have this route)
      await api("/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      logout();                          // clear token/user globally
      setOpen(false);
      setBusy(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 w-9 rounded-full bg-neutral-600 overflow-hidden grid place-items-center focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        {avatarUrl ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-xl">🙂</span>}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-44 rounded-lg bg-white text-black shadow-md border border-neutral-200">
          <Link to="/profile" role="menuitem" className="block px-4 py-2 hover:bg-neutral-100">Profile</Link>
          <Link to="/settings" role="menuitem" className="block px-4 py-2 hover:bg-neutral-100">Settings</Link>
          <button
            role="menuitem"
            onClick={handleLogout}
            disabled={busy}
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 disabled:opacity-60"
          >
            {busy ? "Logging out…" : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
