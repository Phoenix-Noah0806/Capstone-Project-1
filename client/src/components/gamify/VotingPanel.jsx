import { useState } from "react";
import { motion } from "framer-motion";

const options = [
  { id: "pass", label: "✅ Mission Clear" },
  { id: "retry", label: "🔄 Retry Op" },
  { id: "fail", label: "❌ Abort" }
];

const VotingPanel = ({ onVote, voteTally = {} }) => {
  const [voted, setVoted] = useState(false);

  const totalVotes = Object.values(voteTally).reduce((a, b) => a + b, 0) || 1;

  const handleVote = (optId) => {
    if (voted) return;
    setVoted(true);
    onVote(optId);
  };

  return (
    <div className={`voting-panel glass ${voted ? "vote-locked" : ""}`}>
      <div className="panel-title">Tactical Vote</div>
      <div className="vote-options">
        {options.map((opt) => {
          const count = voteTally[opt.id] || 0;
          const pct = Math.round((count / totalVotes) * 100);
          return (
            <div key={opt.id} className="vote-option-row">
              <button
                className="btn ghost small"
                onClick={() => handleVote(opt.id)}
                disabled={voted}
                style={{ flex: "0 0 auto", fontSize: "0.68rem" }}
              >
                {opt.label}
              </button>
              <div className="vote-bar-shell">
                <motion.div
                  className="vote-bar-fill"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="vote-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingPanel;
