import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SkribbleOverlay = ({
  skribble,
  userId,
  isHost,
  onStart,
  onPickWord,
  onGuess,
  wordChoices,
  secretWord,
  correctFlash,
  users
}) => {
  const [guess, setGuess] = useState("");
  const [roundTimer, setRoundTimer] = useState(0);
  const [roundTimeSetting, setRoundTimeSetting] = useState(60);
  const [roundCountSetting, setRoundCountSetting] = useState(5);

  const status = skribble?.status || "idle";
  const isDrawer = skribble?.drawerId === userId;
  const hasGuessed = skribble?.guessedBy?.includes(userId);

  // Round timer
  useEffect(() => {
    if (status !== "drawing" || !skribble?.roundStartedAt) {
      setRoundTimer(0);
      return;
    }
    const interval = setInterval(() => {
      const started = new Date(skribble.roundStartedAt).getTime();
      const elapsed = (Date.now() - started) / 1000;
      const remaining = Math.max((skribble.roundTimeSeconds || 60) - elapsed, 0);
      setRoundTimer(Math.round(remaining));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, skribble?.roundStartedAt, skribble?.roundTimeSeconds]);

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || isDrawer || hasGuessed) return;
    onGuess(guess.trim());
    setGuess("");
  };

  // --- IDLE / Pre-game ---
  const playerCount = users?.length || 0;
  const needMorePlayers = playerCount < 2;

  if (status === "idle" || !status || status === undefined) {
    return (
      <div className="skribble-bar skribble-idle">
        <div className="skribble-bar-inner">
          <span className="skribble-icon">🎨</span>
          <span className="skribble-title">SKRIBBLE MODE</span>
          {isHost ? (
            <div className="skribble-start-controls">
              <label className="skribble-time-label">
                Rounds:
                <select
                  className="skribble-time-select"
                  value={roundCountSetting}
                  onChange={(e) => setRoundCountSetting(Number(e.target.value))}
                >
                  <option value={2}>2</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </label>
              <label className="skribble-time-label">
                Time:
                <select
                  className="skribble-time-select"
                  value={roundTimeSetting}
                  onChange={(e) => setRoundTimeSetting(Number(e.target.value))}
                >
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                </select>
              </label>
              <motion.button
                className="btn primary skribble-start-btn"
                onClick={() => onStart(roundTimeSetting, roundCountSetting)}
                whileTap={needMorePlayers ? {} : { scale: 0.95 }}
                whileHover={needMorePlayers ? {} : { scale: 1.05, boxShadow: "0 0 20px rgba(57,255,20,0.4)" }}
                style={needMorePlayers ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                disabled={needMorePlayers}
              >
                🚀 Start Skribble
              </motion.button>
              {needMorePlayers && (
                <span className="skribble-player-warning">⚠️ Need 2+ players ({playerCount}/2)</span>
              )}
              {!needMorePlayers && (
                <span className="skribble-player-ready">✅ {playerCount} players ready</span>
              )}
            </div>
          ) : (
            <span className="skribble-wait">Waiting for host to start the game...</span>
          )}
        </div>
      </div>
    );
  }


  // --- Word Picking (drawer only sees word choices) ---
  if (status === "picking") {
    return (
      <div className="skribble-overlay">
        <div className="skribble-overlay-content">
          <div className="skribble-round-badge">
            Round {skribble.round}/{skribble.totalRounds}
          </div>
          {isDrawer && wordChoices?.length ? (
            <div className="skribble-pick-section">
              <div className="skribble-pick-title">🎨 YOUR TURN TO DRAW!</div>
              <div className="skribble-pick-subtitle">Pick a word:</div>
              <div className="skribble-word-choices">
                {wordChoices.map((w) => (
                  <motion.button
                    key={w}
                    className="skribble-word-btn"
                    onClick={() => onPickWord(w)}
                    whileHover={{ scale: 1.08, boxShadow: "0 0 20px rgba(0,240,255,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {w}
                  </motion.button>
                ))}
              </div>
              <div className="skribble-auto-pick-note">Auto-pick in 15s if you don't choose</div>
            </div>
          ) : (
            <div className="skribble-waiting">
              <div className="skribble-pick-title">
                ✏️ {skribble.drawerName || "Someone"} is picking a word...
              </div>
              <div className="live-feed-spinner" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Drawing Phase ---
  if (status === "drawing") {
    const timerPercent = (roundTimer / (skribble.roundTimeSeconds || 60)) * 100;
    const isUrgent = roundTimer <= 10;

    return (
      <>
        {/* Top HUD bar */}
        <div className="skribble-hud">
          <div className="skribble-hud-left">
            <span className="skribble-round-chip">
              Round {skribble.round}/{skribble.totalRounds}
            </span>
            <span className="skribble-drawer-chip">
              ✏️ {isDrawer ? "YOUR TURN" : `${skribble.drawerName} is drawing`}
            </span>
          </div>
          <div className="skribble-hud-center">
            {isDrawer ? (
              <div className="skribble-secret-word">
                <span className="skribble-word-label">YOUR WORD:</span>
                <span className="skribble-word-text">{secretWord || "..."}</span>
              </div>
            ) : (
              <div className="skribble-hint">
                <span className="skribble-word-label">WORD:</span>
                <span className="skribble-hint-text">{skribble.wordHint || "_ _"}</span>
              </div>
            )}
          </div>
          <div className="skribble-hud-right">
            <div className={`skribble-timer ${isUrgent ? "urgent" : ""}`}>
              <span className="skribble-timer-value">{roundTimer}s</span>
              <div className="skribble-timer-bar">
                <motion.div
                  className="skribble-timer-fill"
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Correct guess flash */}
        <AnimatePresence>
          {correctFlash && (
            <motion.div
              className="skribble-correct-flash"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              ✅ +{correctFlash.points} pts!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guessed indicators */}
        {skribble.guessedBy?.length > 0 && (
          <div className="skribble-guessed-list">
            {skribble.guessedBy.map((uid) => {
              const u = users?.find((u) => u.id === uid);
              return (
                <span key={uid} className="skribble-guessed-chip">
                  ✅ {u?.name || "Agent"}
                </span>
              );
            })}
          </div>
        )}

        {/* Guess input for non-drawers */}
        {!isDrawer && !hasGuessed && (
          <form className="skribble-guess-form" onSubmit={handleGuess}>
            <input
              type="text"
              className="skribble-guess-input"
              placeholder="Type your guess..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              autoFocus
            />
            <motion.button
              className="btn primary"
              type="submit"
              whileTap={{ scale: 0.95 }}
            >
              Guess
            </motion.button>
          </form>
        )}

        {/* Already guessed message */}
        {!isDrawer && hasGuessed && (
          <div className="skribble-already-guessed">
            ✅ You guessed correctly! Waiting for others...
          </div>
        )}

        {/* Inline scoreboard */}
        <div className="skribble-scores-mini">
          {[...(skribble.scores || [])].sort((a, b) => b.points - a.points).map((s, i) => (
            <span
              key={s.userId}
              className={`skribble-score-chip ${s.userId === userId ? "you" : ""} ${i === 0 ? "leader" : ""}`}
            >
              {s.name}: {s.points}
            </span>
          ))}
        </div>
      </>
    );
  }

  // --- Round End ---
  if (status === "round-end") {
    return (
      <div className="skribble-overlay">
        <motion.div
          className="skribble-overlay-content"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="skribble-round-badge">
            Round {skribble.round}/{skribble.totalRounds} — Complete!
          </div>
          <div className="skribble-reveal">
            <span>The word was:</span>
            <span className="skribble-reveal-word">{skribble.lastWord}</span>
          </div>
          <div className="skribble-round-scores">
            {[...(skribble.scores || [])].sort((a, b) => b.points - a.points).map((s, i) => (
              <div key={s.userId} className={`skribble-round-score-row ${i === 0 ? "first" : ""}`}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{s.name}</span>
                <span className="pts">{s.points} pts</span>
              </div>
            ))}
          </div>
          <div className="skribble-next-hint">Next round starting soon...</div>
        </motion.div>
      </div>
    );
  }

  // --- Game End ---
  if (status === "game-end") {
    const sorted = [...(skribble.scores || [])].sort((a, b) => b.points - a.points);
    const winner = sorted[0];

    return (
      <div className="skribble-overlay game-end">
        <motion.div
          className="skribble-overlay-content"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <div className="skribble-game-end-title">
            🏆 GAME OVER 🏆
          </div>
          {winner && (
            <div className="skribble-winner">
              <span className="skribble-winner-crown">👑</span>
              <span className="skribble-winner-name">{winner.name}</span>
              <span className="skribble-winner-score">{winner.points} pts</span>
            </div>
          )}
          <div className="skribble-final-scores">
            {sorted.map((s, i) => (
              <motion.div
                key={s.userId}
                className={`skribble-final-row ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="rank">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className="name">{s.name}</span>
                <span className="pts">{s.points} pts</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default SkribbleOverlay;
