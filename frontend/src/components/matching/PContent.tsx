// PContent.tsx
import React, { useState } from "react";
import { styles } from "../../styles/HomePage.styles";

interface PContentProps {
  isAdmin: boolean;
  handleStartMatch: (difficulty: string, topics: string[]) => Promise<void>;
  handleCancelMatch: () => Promise<void>;
  isQueueing: boolean;
}

const ALL_TOPICS = ["Arrays", "Graphs", "DP", "Strings"];
const difficultySelectStyles: { [key: string]: React.CSSProperties } = {
  Easy: {
    backgroundColor: "#28a745", // Green
    color: "white",
    borderColor: "#28a745",
  },
  Medium: {
    backgroundColor: "#ffc107", // Yellow/Gold
    color: "black", // Black text for yellow bg
    borderColor: "#ffc107",
  },
  Hard: {
    backgroundColor: "#dc3545", // Red
    color: "white",
    borderColor: "#dc3545",
  },
};

// Styles for the <option> elements in the dropdown
// Note: This styling isn't supported by all browsers, but it's good to have
const difficultyOptionStyles: { [key: string]: React.CSSProperties } = {
  Easy: {
    backgroundColor: "#28a745",
    color: "white",
  },
  Medium: {
    backgroundColor: "#ffc107",
    color: "black",
  },
  Hard: {
    backgroundColor: "#dc3545",
    color: "white",
  },
};
// --- END NEW STYLES ---
//
const topicBtnBase: React.CSSProperties = {
  ...styles.input,
  cursor: "pointer",
  textAlign: "center",
  backgroundColor: "#f0f0f0",
  color: "#333",
  padding: "8px 12px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#ccc",
};
const topicBtnSelected: React.CSSProperties = {
  ...topicBtnBase,
  backgroundColor: "#007bff",
  color: "#ffffff",
  borderColor: "#007bff",
  fontWeight: "bold",
};

const PContent: React.FC<PContentProps> = ({
  handleStartMatch,
  handleCancelMatch,
  isQueueing,
}) => {
  const [difficulty, setDifficulty] = useState("Easy");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Arrays"]);

  const handleTopicToggle = (topicToToggle: string) => {
    if (isQueueing) return;

    setSelectedTopics((prevTopics) =>
      prevTopics.includes(topicToToggle)
        ? prevTopics.filter((t) => t !== topicToToggle)
        : [...prevTopics, topicToToggle]
    );
  };

  const isFindMatchDisabled = isQueueing || selectedTopics.length === 0;
  const dynamicDifficultyStyle: React.CSSProperties = {
    ...styles.input,
    ...difficultySelectStyles[difficulty],
    // Ensure proper text color override when selected
    color: difficultySelectStyles[difficulty].color,
  };
  return (
    <section style={styles.pageCard}>
      {/* Spinner CSS */}
      <style>
        {`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.3);
              border-top-color: #fff;
              border-radius: 50%;
              width: 1em;
              height: 1em;
              animation: spin 1s linear infinite;
            }
          `}
      </style>
      <h1 style={styles.h1}>Challenges</h1>
      <p style={styles.muted}>Pick difficulty & topics, then find a partner.</p>

      {/* Difficulty Selector Row */}
      <div
        style={{ ...styles.row, marginBottom: "1rem", alignItems: "center" }}
      >
        <label style={{ marginRight: "10px", fontWeight: "bold" }}>
          Difficulty:
        </label>
        {/* --- UPDATED SELECT --- */}
        <select
          style={dynamicDifficultyStyle}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          disabled={isQueueing}
        >
          <option style={difficultyOptionStyles.Easy} value="Easy">
            Easy
          </option>
          <option style={difficultyOptionStyles.Medium} value="Medium">
            Medium
          </option>
          <option style={difficultyOptionStyles.Hard} value="Hard">
            Hard
          </option>
        </select>
        {/* --- END UPDATED SELECT --- */}
      </div>

      {/* Topic Selector Row */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            fontWeight: "bold",
            display: "block",
            marginBottom: "10px",
          }}
        >
          Topics (select one or more):
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {ALL_TOPICS.map((topic) => (
            <button
              key={topic}
              style={
                selectedTopics.includes(topic) ? topicBtnSelected : topicBtnBase
              }
              onClick={() => handleTopicToggle(topic)}
              disabled={isQueueing}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Action Button Row */}
      <div style={styles.row}>
        {isQueueing ? (
          <>
            <button
              style={{
                ...styles.primaryBtn,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
              disabled
            >
              <div className="spinner" />
              Finding Match...
            </button>
            <button onClick={handleCancelMatch} style={styles.secondaryBtn}>
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => handleStartMatch(difficulty, selectedTopics)}
            style={styles.primaryBtn}
            disabled={isFindMatchDisabled}
            title={
              selectedTopics.length === 0
                ? "Please select at least one topic"
                : "Find a match"
            }
          >
            Find Match
          </button>
        )}
      </div>

      {/* Helper text if button is disabled */}
      {selectedTopics.length === 0 && !isQueueing && (
        <p
          style={{
            ...styles.muted,
            color: "red",
            fontSize: "0.9rem",
            marginTop: "10px",
          }}
        >
          Please select at least one topic to find a match.
        </p>
      )}
    </section>
  );
};

export default PContent;
