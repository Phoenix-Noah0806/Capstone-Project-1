import { AnimatePresence, motion } from "framer-motion";

const medals = ["🥇", "🥈", "🥉"];

const ScoreboardModal = ({ open, onClose, scoreboard = [], missionHistory = [] }) => {
  const sorted = [...scoreboard].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const maxXP = sorted[0]?.xp || 1;

  return (
    <AnimatePresence>
      {open ? (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
          >
            <h3>⚡ Combat Scoreboard</h3>
            <div className="score-list">
              {sorted.map((entry, idx) => (
                <motion.div
                  key={entry.userId}
                  className={`score-row ${idx === 0 ? "winner-highlight" : ""}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: idx * 0.1,
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                >
                  <span className="score-rank">
                    {idx === 0 ? "👑" : medals[idx] || `#${idx + 1}`}
                  </span>
                  <span className="score-user">{entry.userName || entry.userId}</span>
                  <div className="xp-bar-shell">
                    <motion.div
                      className="xp-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(((entry.xp || 0) / maxXP) * 100)}%` }}
                      transition={{ delay: idx * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className="score-xp">{entry.xp || 0} XP</span>
                  <span className="score-contrib">{entry.contributions || 0} ops</span>
                </motion.div>
              ))}
              {sorted.length === 0 && (
                <div className="hint-text" style={{ textAlign: "center", padding: "1rem" }}>
                  No intel yet — deploy a mission!
                </div>
              )}
            </div>

            {missionHistory.length > 0 && (
              <>
                <div className="panel-title" style={{ marginBottom: "0.4rem" }}>
                  Operation Log
                </div>
                {missionHistory.slice(-3).map((m, i) => (
                  <div key={i} className="score-row" style={{ padding: "0.3rem 0.5rem" }}>
                    <span className="score-user" style={{ fontSize: "0.72rem" }}>
                      {m.name}
                    </span>
                    <span
                      className="status-pill"
                      style={{
                        background: m.status === "completed" ? "#39ff14" : "#ef4444",
                        fontSize: "0.55rem"
                      }}
                    >
                      {m.status}
                    </span>
                    <span className="score-xp" style={{ fontSize: "0.72rem" }}>
                      {m.score || 0}
                    </span>
                  </div>
                ))}
              </>
            )}

            <button className="btn primary" onClick={onClose} style={{ width: "100%", marginTop: "0.5rem" }}>
              Dismiss
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};

export default ScoreboardModal;
