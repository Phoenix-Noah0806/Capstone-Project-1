import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CyberpunkAvatar from "../components/CyberpunkAvatar";
import AvatarCustomizer from "../components/AvatarCustomizer";

const Profile = () => {
  const { user, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (avatarData) => {
    setSaving(true);
    setSaved(false);
    try {
      await updateAvatar(avatarData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile neon-bg">
      <div className="bg-grid" />
      <div className="scanline-overlay" />
      <motion.div
        className="profile-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button className="btn ghost" onClick={() => navigate("/dashboard")}>
          ← Return to HQ
        </button>
        <h1>Agent Profile</h1>

        <div className="profile-top">
          <div className="profile-avatar-display">
            <CyberpunkAvatar avatar={user?.avatar} size={120} showGlow />
          </div>
          <div className="card profile-card glass">
            <div className="profile-row">
              <span>Callsign</span>
              <strong>{user?.name}</strong>
            </div>
            <div className="profile-row">
              <span>Comms ID</span>
              <strong>{user?.email}</strong>
            </div>
          </div>
        </div>

        <div className="card glass" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ color: "var(--accent)", textTransform: "uppercase", margin: "0 0 1rem 0" }}>
            Customize Operative
          </h2>
          <AvatarCustomizer avatar={user?.avatar} onSave={handleSave} saving={saving} />
          {saved && (
            <motion.div
              className="save-confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ✓ Avatar saved successfully
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
