// src/components/PContent.tsx
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
] as const;

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

const DIFF_BADGES: Record<(typeof DIFFICULTIES)[number], string> = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Hard: "bg-red-100 text-red-800",
};

const SEGMENT_ACTIVE: Record<(typeof DIFFICULTIES)[number], string> = {
  Easy: "bg-green-600 text-white",
  Medium: "bg-yellow-500 text-black",
  Hard: "bg-red-600 text-white",
};

const PContent: React.FC<PContentProps> = ({
  handleStartMatch,
  handleCancelMatch,
  isQueueing,
}) => {
  const [difficulty, setDifficulty] =
    useState<(typeof DIFFICULTIES)[number]>("Easy");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Strings"]);

  const isFindMatchDisabled = isQueueing || selectedTopics.length === 0;

  const toggleTopic = (t: string) => {
    if (isQueueing) return;
    setSelectedTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const selectedTopicsText = useMemo(
    () => (selectedTopics.length ? selectedTopics.join(", ") : "—"),
    [selectedTopics]
  );

  return (
    <section className="px-6 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* BIG card container */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-xl">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900">
                Challenges
              </h1>
              <p className="text-base text-gray-600 mt-1">
                Pick a difficulty, choose topics, and find a partner.
              </p>
            </div>

            {/* Summary bigger */}
            <div className="mt-2 md:mt-0 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-700">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${DIFF_BADGES[difficulty]}`}
                >
                  {difficulty}
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  <span className="text-gray-500">Topics:</span>{" "}
                  <span className="font-medium">{selectedTopicsText}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-8">
            {/* Difficulty segmented control — larger */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Difficulty
              </label>
              <div className="inline-flex rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden">
                {DIFFICULTIES.map((d, idx) => {
                  const active = d === difficulty;
                  const radius =
                    idx === 0
                      ? "rounded-l-xl"
                      : idx === DIFFICULTIES.length - 1
                      ? "rounded-r-xl"
                      : "";
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={isQueueing}
                      onClick={() => setDifficulty(d)}
                      className={[
                        "px-6 py-3 text-base font-semibold transition outline-none",
                        "border-r last:border-r-0 border-gray-300 dark:border-gray-700",
                        radius,
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                        !active
                          ? "bg-white text-gray-800 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                          : "",
                        active ? SEGMENT_ACTIVE[d] : "",
                      ].join(" ")}
                      aria-pressed={active}
                      title={d}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topics — bigger chips in a responsive grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-base font-semibold text-gray-800">
                  Topics{" "}
                  <span className="text-gray-400 text-sm">
                    (select one or more)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedTopics([])}
                  disabled={selectedTopics.length === 0 || isQueueing}
                  className="text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALL_TOPICS.map((t) => {
                  const active = selectedTopics.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTopic(t)}
                      aria-pressed={active}
                      disabled={isQueueing}
                      className={[
                        "w-full text-left px-5 py-4 rounded-xl border transition",
                        "text-base font-medium",
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50",
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                      ].join(" ")}
                      title={t}
                    >
                      {t}
                      <div
                        className={[
                          "mt-1 text-sm",
                          active ? "text-blue-50/90" : "text-gray-500",
                        ].join(" ")}
                      >
                        Practice problems and patterns related to{" "}
                        {t.toLowerCase()}.
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Call to action — larger */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleStartMatch(difficulty, selectedTopics)}
                disabled={isFindMatchDisabled}
                className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                title={
                  selectedTopics.length === 0
                    ? "Please select at least one topic"
                    : "Find a match"
                }
              >
                Find Match
              </button>
            </div>

            {/* Helper text if disabled */}
            {selectedTopics.length === 0 && !isQueueing && (
              <p className="text-red-600 text-base -mt-4">
                Please select at least one topic to find a match.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Queue overlay — bigger modal */}
      {isQueueing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 w-[28rem] max-w-[95vw] text-center">
            <div className="animate-pulse text-5xl mb-3">💙</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Finding your match…
            </h3>
            <p className="text-base text-gray-600">
              Hang tight while we pair you up.
            </p>
            <div className="mt-6">
              <button
                onClick={handleCancelMatch}
                className="px-5 py-2.5 text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-lg text-base font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PContent;
