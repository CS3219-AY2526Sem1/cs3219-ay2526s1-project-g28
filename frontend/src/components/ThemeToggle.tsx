import { useTheme } from "../theme/ThemeProvider";

export default function ThemeToggle() {
  const { theme, resolved, setTheme, toggle } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600"
        title={`Currently ${resolved}. Click to toggle.`}
      >
        {resolved === "dark" ? "🌙 Dark" : "☀️ Light"}
      </button>

      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
        title="Theme mode"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
