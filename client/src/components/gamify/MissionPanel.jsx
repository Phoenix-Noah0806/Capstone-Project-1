import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

const statusColors = {
  idle: "#5a7a8a",
  active: "#39ff14",
  completed: "#bf5af2",
  failed: "#ef4444"
};

const missionTypes = [
  { id: "free", label: "Free Op", desc: "Open-ended tactical collaboration challenge" },
  { id: "blind", label: "Blind Recon", desc: "Classified intel — guide through comms only" },
  { id: "puzzle", label: "Artifact Rush", desc: "Reconstruct fragmented data as a squad" }
];

const sectorLabel = (partIndex, cols = 3) => {
  const row = Math.floor(partIndex / cols);
  const col = partIndex % cols;
  return `${String.fromCharCode(65 + row)}${col + 1}`;
};

const MissionPanel = ({ mission, onStart, onAdvance, onComplete, onPuzzleSubmit, isHost, timeLeft, roomMissionType }) => {
  const { user } = useAuth();
  // Lock to the room's mission type if it's a specific mode (blind/puzzle), otherwise allow free selection
  const isLocked = roomMissionType && roomMissionType !== "free";
  const [selectedType, setSelectedType] = useState(isLocked ? roomMissionType : "free");

  useEffect(() => {
    if (isLocked) setSelectedType(roomMissionType);
  }, [roomMissionType, isLocked]);

  const percent = Math.min(mission?.progress ?? 0, 100);
  const isActive = mission?.status === "active";
  const isUrgent = timeLeft <= 15 && isActive;

  const isHintHolder = mission?.hintHolders?.includes(user?.id) || isHost;
  const puzzlePart = mission?.puzzle?.parts?.find((p) => p.userId === user?.id);

  const handleStart = () => {
    const type = missionTypes.find((t) => t.id === selectedType);
    onStart({
      type: selectedType,
      name: type?.label || "Mission",
      description: type?.desc || ""
    });
  };

  const lockedType = isLocked ? missionTypes.find((t) => t.id === roomMissionType) : null;

  return (
    <div className="mission-panel glass">
      <div className="mission-header">
        <div>
          <div className="label">Mission Briefing ({mission?.type || selectedType})</div>
          <h3>{mission?.name || (lockedType ? lockedType.label : "Awaiting deployment")}</h3>
        </div>
        <span className="status-pill" style={{ background: statusColors[mission?.status || "idle"] }}>
          {mission?.status || "standby"}
        </span>
      </div>

      <p className="mission-desc">{mission?.description || (lockedType ? lockedType.desc : "Deploy a mission to initiate tactical operations.")}</p>

      {isActive && (
        <div className="mission-specific">
          {mission.type === "blind" && (
            <div className={`hint-box ${isHintHolder ? "revealed" : "hidden"}`}>
              <div className="label">Intel</div>
              <div>{isHintHolder ? "Target: Reconstruct the Great Pyramid" : "INTEL LOCKED — Contact Analyst!"}</div>
            </div>
          )}
          {mission.type === "puzzle" && puzzlePart && (
            <div className="sector-box">
              <div className="label">Your Sector</div>
              <div className="sector-id">
                Sector {sectorLabel(puzzlePart.partIndex, mission.puzzle?.target?.cols || 3)}
              </div>
              {mission.puzzle?.target?.imageUrl && (
                <div className="target-preview">
                  <img src={mission.puzzle.target.imageUrl} alt={mission.puzzle.target.name || "Target reference"} />
                  <div className="hint-text">
                    Recreate your slice of the target. Use the grid label to align your drawing.
                  </div>
                </div>
              )}
              {!puzzlePart.delivered && (
                <button className="btn small primary" style={{ marginTop: "0.4rem" }} onClick={onPuzzleSubmit}>
                  🚀 Submit Sector
                </button>
              )}
              {puzzlePart.delivered && <div className="hint-text">Sector delivered. Awaiting squad...</div>}
            </div>
          )}
        </div>
      )}

      <div className="mission-meta">
        <div className={`timer-puck ${isUrgent ? "pulse" : ""}`}>
          <div className="timer-value">{timeLeft}s</div>
          <div className="timer-label">Countdown</div>
        </div>
        <div className="stage-chip">Phase {mission?.stage || 0}</div>
        <div className="score-chip">Score {mission?.score || 0}</div>
      </div>

      <div className="progress-shell">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </div>

      <div className="mission-actions">
        {isHost ? (
          <>
            {/* Only show type selector for "free" rooms — specific modes are locked */}
            {!isActive && !isLocked && (
              <select
                className="mission-type-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {missionTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
            <button className="btn primary" onClick={handleStart} disabled={isActive}>
              {isActive ? "Op Active" : `Deploy ${lockedType ? lockedType.label : "Mission"}`}
            </button>
            {isActive && (
              <>
                <button className="btn ghost" onClick={onAdvance}>
                  Advance Phase
                </button>
                <button className="btn ghost" onClick={onComplete}>
                  🏁 Debrief
                </button>
              </>
            )}
          </>
        ) : (
          <div className="hint-text">
            {isActive ? "Operation in progress — maintain coordination!" : "Commander controls mission flow. Stand by, operative."}
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionPanel;
