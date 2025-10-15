import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

const difficulties = ["Easy", "Medium", "Hard"] as const;
const topics = ["Arrays", "Strings", "Graphs", "Trees", "DP", "Greedy"] as const;

export default function MatchingPage() {
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("Medium");
  const [topic, setTopic] = useState<(typeof topics)[number]>("Graphs");
  const [loading, setLoading] = useState(false);

  async function handleFindMatch() {
    setLoading(true);
    // —— Placeholder for your teammate’s matching service ——
    // pretend to call: POST /match/find { difficulty, topic }
    await new Promise((r) => setTimeout(r, 800));
    console.log("Find match →", { difficulty, topic });
    alert(`(placeholder) Finding a ${difficulty} ${topic} match…`);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top bar */}
      <Header variant="authed" level={10}/>

      {/* Body */}
      <main className="mx-auto max-w-6xl px-4">
        <div className="py-16 grid place-items-center">
          <div className="w-full max-w-xl">
            <h1 className="text-3xl font-semibold text-center mb-10">Match with another user</h1>

            {/* Controls */}
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-2">Difficulty:</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-neutral-300 bg-neutral-200 px-4 py-3 pr-10 focus:outline-none"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                  >
                    {difficulties.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">▾</span>
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2">Topic:</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-neutral-300 bg-neutral-200 px-4 py-3 pr-10 focus:outline-none"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as any)}
                  >
                    {topics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">▾</span>
                </div>
              </div>

              <div className="pt-4 grid place-items-center">
                <button
                  onClick={handleFindMatch}
                  disabled={loading}
                  className="w-[360px] rounded-md bg-black text-white py-3.5 font-medium disabled:opacity-60"
                >
                  {loading ? "Finding match…" : "Find Match"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* footer spacer like the mock */}
      <div className="h-6" />
    </div>
  );
}
