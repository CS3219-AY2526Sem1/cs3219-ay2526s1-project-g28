import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type Ctx = {
  theme: Theme;
  resolved: Resolved;          // actual in-use theme
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function getSystem(): Resolved {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const resolved: Resolved = useMemo(
    () => (theme === "system" ? getSystem() : theme),
    [theme]
  );

  // Apply to <html> for both CSS vars and Tailwind dark mode
  useEffect(() => {
    const el = document.documentElement;
    // Tailwind: toggle .dark class
    if (resolved === "dark") el.classList.add("dark");
    else el.classList.remove("dark");

    // Optional: also expose as data attribute if you like
    el.dataset.theme = resolved;

    localStorage.setItem("theme", theme);

    // If following system, keep in sync when OS changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") {
        const next = mq.matches ? "dark" : "light";
        if (next === "dark") el.classList.add("dark");
        else el.classList.remove("dark");
        el.dataset.theme = next;
      }
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme, resolved]);

  const toggle = () => setTheme(resolved === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
