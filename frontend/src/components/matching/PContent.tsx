// PContent.tsx
import React, { useMemo, useState } from "react";

interface PContentProps {
  isAdmin: boolean;
  handleStartMatch: (difficulty: string, topics: string[]) => Promise<void>;
  handleCancelMatch: () => Promise<void>;
  isQueueing: boolean;
}

const ALL_TOPICS = [
  "Strings",
  "Linked Lists",
  "Dynamic Programming",
  "Heaps",
  "Hashmap",
  "Arrays",
  "Graphs",
  "Trees",
];

// Accent used when a topic is selected (change this if you want a different color)
const SELECTED_ACCENT = "#3b82f6"; // Tailwind-ish blue-500

const DIFF_COLORS: Record<string, { bg: string; fg: string; ring: string }> = {
  Easy: { bg: "#22c55e", fg: "#ffffff", ring: "#15803d" }, // green-500
  Medium: { bg: "#f59e0b", fg: "#111111", ring: "#b45309" }, // amber-500
  Hard: { bg: "#ef4444", fg: "#ffffff", ring: "#b91c1c" }, // red-500
};

const PContent: React.FC<PContentProps> = ({
  handleStartMatch,
  handleCancelMatch,
  isQueueing,
}) => {
  const [difficulty, setDifficulty] =
    useState<keyof typeof DIFF_COLORS>("Easy");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Strings"]);

  const isFindMatchDisabled = isQueueing || selectedTopics.length === 0;

  const topicStyle = useMemo<React.CSSProperties>(
    () => ({
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      padding: 18,
      background: "#f9fafb",
      color: "#111827",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      transition:
        "transform 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease",
      cursor: "pointer",
      height: 150, // visually similar to difficulty cards
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }),
    []
  );

  const topicSelectedStyle: React.CSSProperties = {
    background: SELECTED_ACCENT,
    color: "#ffffff",
    borderColor: SELECTED_ACCENT,
    boxShadow: "0 16px 35px rgba(59,130,246,0.35)",
    transform: "translateY(-3px)",
  };

  const toggleTopic = (t: string) => {
    if (isQueueing) return;
    setSelectedTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <section style={styles.shell}>
      {/* Local styles */}
      <style>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          10% { transform: scale(1.12); }
          20% { transform: scale(1); }
          30% { transform: scale(1.12); }
          40% { transform: scale(1); }
        }
        .shadow-soft { box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .backdrop-blur { backdrop-filter: blur(6px); }
        /* Floaty hovers */
        [data-topic-card]:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 18px 40px rgba(0,0,0,0.22); }
        .diff-btn:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 22px 46px rgba(0,0,0,0.28); }
      `}</style>

      {/* Header / Hero */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Challenges</h1>
          <p style={styles.subtitle}>
            Pick a difficulty, choose topics, and find a partner.
          </p>
        </div>
        <div style={styles.summaryCard} className="shadow-soft">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <span
              style={{ ...styles.dot, background: DIFF_COLORS[difficulty].bg }}
            />
            <strong>Selected:</strong>
          </div>
          <div style={{ fontSize: 14 }}>
            <div>
              <b>Difficulty:</b> {difficulty}
            </div>
            <div>
              <b>Topics:</b>{" "}
              {selectedTopics.length ? selectedTopics.join(", ") : "—"}
            </div>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main style={styles.main}>
        {/* Difficulty wide cards */}
        <div style={styles.diffRow}>
          {(Object.keys(DIFF_COLORS) as Array<keyof typeof DIFF_COLORS>).map(
            (d) => {
              const active = d === difficulty;
              const c = DIFF_COLORS[d];
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={isQueueing}
                  aria-pressed={active}
                  className="diff-btn"
                  style={{
                    ...styles.diffBtn,
                    background: active ? c.bg : "#0b1020",
                    color: active ? c.fg : "#e5e7eb",
                    outline: `2px solid ${active ? c.ring : "transparent"}`,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{d}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {d === "Easy"
                      ? "Warm-up"
                      : d === "Medium"
                      ? "Intermediate"
                      : "Expert"}
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* Topics header + Clear button */}
        <div style={styles.topicsHeader}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={styles.h2}>Topics</h2>
            <span style={{ color: "#9ca3af", fontSize: 14 }}>
              (select one or more)
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setSelectedTopics([])}
              disabled={selectedTopics.length === 0 || isQueueing}
              style={{
                ...styles.secondary,
                opacity: selectedTopics.length === 0 || isQueueing ? 0.6 : 1,
              }}
            >
              Clear topics
            </button>
          </div>
        </div>

        {/* Topics grid (no scroll) */}
        <div style={styles.topicGrid}>
          {ALL_TOPICS.map((t) => {
            const active = selectedTopics.includes(t);
            return (
              <div
                key={t}
                data-topic-card
                onClick={() => toggleTopic(t)}
                role="button"
                aria-pressed={active}
                style={{
                  ...topicStyle,
                  ...(active ? topicSelectedStyle : {}),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <strong>{t}</strong>
                  <span
                    aria-hidden
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      border: "2px solid currentColor",
                      background: active ? "currentColor" : "transparent",
                    }}
                  />
                </div>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
                  Practice problems and patterns related to {t.toLowerCase()}.
                </p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom action bar */}
      <footer style={styles.footer}>
        <button
          onClick={() => handleStartMatch(difficulty, selectedTopics)}
          disabled={isFindMatchDisabled}
          style={{
            ...styles.cta,
            opacity: isFindMatchDisabled ? 0.6 : 1,
            cursor: isFindMatchDisabled ? "not-allowed" : "pointer",
          }}
          title={
            selectedTopics.length === 0
              ? "Please select at least one topic"
              : "Find a match"
          }
        >
          Find Match
        </button>
      </footer>

      {/* Full-screen queue overlay with heartbeat loader */}
      {isQueueing && (
        <div style={styles.overlay} className="backdrop-blur">
          <div style={styles.loaderCard} className="shadow-soft">
            <div style={styles.heart} aria-hidden />
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "14px 0 6px 0" }}>Finding your match…</h3>
              <p style={{ margin: 0, color: "#cbd5e1" }}>
                Hang tight while we pair you up
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={handleCancelMatch} style={styles.secondary}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Helper text if button disabled */}
      {selectedTopics.length === 0 && !isQueueing && (
        <p
          style={{
            color: "#ef4444",
            fontSize: 14,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Please select at least one topic to find a match.
        </p>
      )}
    </section>
  );
};

// Inline style system — compact, responsive, and self-contained
const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)", // slate to gray
    color: "#e5e7eb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "32px 24px 12px 24px",
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#9ca3af",
    fontSize: 14,
  },
  summaryCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
    minWidth: 240,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
  },
  main: {
    padding: "12px 24px 0 24px",
    display: "grid",
    gap: 16,
    gridTemplateRows: "auto auto 1fr",
  },
  diffRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
  diffBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
    height: 96, // similar to topic card height
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    fontWeight: 700,
    letterSpacing: 0.3,
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    padding: "0 16px",
    transition: "transform 180ms ease, box-shadow 180ms ease",
  },
  topicsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  h2: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
  },
  topicGrid: {
    display: "grid",
    gap: 12,
    // Responsive: ~3 per row on medium, auto-fit on larger screens
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  footer: {
    position: "sticky",
    bottom: 0,
    width: "100%",
    padding: 16,
    background:
      "linear-gradient(180deg, rgba(17,24,39,0) 0%, rgba(17,24,39,0.55) 35%, rgba(17,24,39,0.85) 100%)",
    display: "flex",
    justifyContent: "center",
  },
  cta: {
    minWidth: 260,
    height: 56,
    borderRadius: 16,
    background: "#60a5fa",
    color: "#0b1020",
    fontWeight: 800,
    border: "none",
    boxShadow: "0 10px 30px rgba(59,130,246,0.45)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.55)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
  },
  loaderCard: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 18,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    width: 320,
  },
  heart: {
    width: 64,
    height: 64,
    background: "#ef4444",
    transform: "rotate(45deg)",
    animation: "heartbeat 1.2s ease-in-out infinite",
    position: "relative",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(239,68,68,0.4)",
    marginBottom: 8,
  } as React.CSSProperties,
  secondary: {
    background: "transparent",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
  },
};

export default PContent;
