import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import CyberpunkAvatar from "../components/CyberpunkAvatar";
import ParticleField from "../components/ParticleField";

const MISSION_TYPES = [
  {
    id: "free",
    icon: "🎯",
    label: "Free Op",
    desc: "Open-ended tactical collaboration. Draw, plan, and create freely with your squad.",
    color: "#00f0ff"
  },
  {
    id: "blind",
    icon: "🔒",
    label: "Blind Recon",
    desc: "Classified intel mode — only analysts can see the target. Guide through comms only.",
    color: "#bf5af2"
  },
  {
    id: "puzzle",
    icon: "🧩",
    label: "Artifact Rush",
    desc: "Reconstruct fragmented data sectors. Each operative submits their piece.",
    color: "#ff2d7b"
  },
  {
    id: "skribble",
    icon: "🎨",
    label: "Skribble",
    desc: "Draw & guess words! One draws, others guess. Highest score at the end wins!",
    color: "#39ff14"
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [selectedMission, setSelectedMission] = useState("free");

  const createRoom = async () => {
    setError("");
    try {
      const data = await apiRequest("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionType: selectedMission })
      });
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiRequest("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.trim().toUpperCase() })
      });
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard neon-bg">
      <ParticleField />
      <div className="bg-grid" />
      <div className="scanline-overlay" />
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <motion.div
            className="dashboard-avatar"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <CyberpunkAvatar avatar={user?.avatar} size={64} showGlow />
          </motion.div>
          <div>
            <div className="pill">Mission Control</div>
            <h1>Welcome back, <span className="neon">{user?.name}</span></h1>
            <p>Select a mission type and deploy a tactical holo-room, or link up with your squad.</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <button className="btn ghost" onClick={() => navigate("/profile")}>
            Agent Profile
          </button>
          <button className="btn" onClick={logout}>
            Disconnect
          </button>
        </div>
      </header>

      <AnimatePresence>
        {error ? (
          <motion.div className="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mission Selector */}
      <div className="mission-selector-section">
        <div className="section-label">Select Mission Type</div>
        <div className="mission-selector-grid">
          {MISSION_TYPES.map((m, i) => (
            <motion.div
              key={m.id}
              className={`mission-card glass ${selectedMission === m.id ? "selected" : ""}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${m.color}33` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedMission(m.id)}
              style={{ "--card-accent": m.color }}
            >
              <div className="mission-card-icon">{m.icon}</div>
              <div className="mission-card-label">{m.label}</div>
              <div className="mission-card-desc">{m.desc}</div>
              {selectedMission === m.id && (
                <motion.div
                  className="mission-card-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  ✓
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <motion.div
          className="card glass"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 90 }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(0, 240, 255, 0.2)" }}
        >
          <h2>Deploy Mission Room</h2>
          <p>Create a <strong>{MISSION_TYPES.find((m) => m.id === selectedMission)?.label}</strong> room and begin operations.</p>
          <motion.button
            className="btn primary"
            onClick={createRoom}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            🚀 Deploy Room
          </motion.button>
        </motion.div>

        <motion.div
          className="card glass"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 90 }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(255, 45, 123, 0.2)" }}
        >
          <h2>Link to Squad</h2>
          <p>Enter the sector ID shared by your squad commander and synchronize instantly.</p>
          <form onSubmit={joinRoom} className="join-form">
            <input
              type="text"
              placeholder=">> SECTOR ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <motion.button className="btn" type="submit" whileTap={{ scale: 0.95 }}>
              Link Up
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
