import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import CyberpunkAvatar from "../components/CyberpunkAvatar";
import ParticleField from "../components/ParticleField";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  const createRoom = async () => {
    setError("");
    try {
      const data = await apiRequest("/api/rooms", { method: "POST" });
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
            <p>Deploy a tactical holo-room or link up with your squad for mission operations.</p>
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

      {error ? <div className="error">{error}</div> : null}

      <div className="dashboard-grid">
        <motion.div
          className="card glass"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 90 }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(0, 240, 255, 0.2)" }}
        >
          <h2>Deploy Mission Room</h2>
          <p>Auto-generate a sector ID, assign operative roles, and initiate a timed tactical mission.</p>
          <motion.button
            className="btn primary"
            onClick={createRoom}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            Deploy Room
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
