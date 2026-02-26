import { useState } from "react";
import { motion } from "framer-motion";
import CyberpunkAvatar from "./CyberpunkAvatar";

const VISOR_COLORS = ["#00f0ff", "#ff2d7b", "#39ff14", "#ffb800", "#bf5af2", "#ff6b35", "#00ff88", "#ff0055"];
const ARMOR_COLORS = ["#1a1a2e", "#0a192f", "#1e0533", "#2d1b00", "#0b2e1a", "#2a0a0a", "#1a1a1a", "#0d1b2a"];
const GLOW_COLORS = ["#00f0ff", "#ff2d7b", "#39ff14", "#ffb800", "#bf5af2", "#ff6b35", "#e040fb", "#76ff03"];

const AvatarCustomizer = ({ avatar = {}, onSave, saving = false }) => {
  const [config, setConfig] = useState({
    hairStyle: avatar.hairStyle || 1,
    visorColor: avatar.visorColor || "#00f0ff",
    armorColor: avatar.armorColor || "#1a1a2e",
    emblem: avatar.emblem || 1,
    glowColor: avatar.glowColor || "#00f0ff"
  });

  const update = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="avatar-customizer">
      <motion.div
        className="avatar-preview-wrap"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <CyberpunkAvatar avatar={config} size={160} showGlow />
      </motion.div>

      <div className="customizer-controls">
        {/* Hair Style */}
        <div className="ctrl-group">
          <label className="ctrl-label">Helmet Style</label>
          <div className="ctrl-row">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <button
                key={s}
                className={`ctrl-chip ${config.hairStyle === s ? "active" : ""}`}
                onClick={() => update("hairStyle", s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Visor Color */}
        <div className="ctrl-group">
          <label className="ctrl-label">Visor</label>
          <div className="ctrl-row">
            {VISOR_COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${config.visorColor === c ? "active" : ""}`}
                style={{ background: c, boxShadow: config.visorColor === c ? `0 0 12px ${c}` : "none" }}
                onClick={() => update("visorColor", c)}
              />
            ))}
          </div>
        </div>

        {/* Armor Color */}
        <div className="ctrl-group">
          <label className="ctrl-label">Armor</label>
          <div className="ctrl-row">
            {ARMOR_COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${config.armorColor === c ? "active" : ""}`}
                style={{ background: c, boxShadow: config.armorColor === c ? `0 0 12px ${c}` : "none" }}
                onClick={() => update("armorColor", c)}
              />
            ))}
          </div>
        </div>

        {/* Emblem */}
        <div className="ctrl-group">
          <label className="ctrl-label">Emblem</label>
          <div className="ctrl-row">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((e) => (
              <button
                key={e}
                className={`ctrl-chip ${config.emblem === e ? "active" : ""}`}
                onClick={() => update("emblem", e)}
              >
                {["★", "◆", "⚡", "✚", "▲", "◎", "⬡", "☠"][e - 1]}
              </button>
            ))}
          </div>
        </div>

        {/* Glow Color */}
        <div className="ctrl-group">
          <label className="ctrl-label">Glow</label>
          <div className="ctrl-row">
            {GLOW_COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${config.glowColor === c ? "active" : ""}`}
                style={{ background: c, boxShadow: config.glowColor === c ? `0 0 12px ${c}` : "none" }}
                onClick={() => update("glowColor", c)}
              />
            ))}
          </div>
        </div>

        <motion.button
          className="btn primary save-avatar-btn"
          onClick={() => onSave(config)}
          disabled={saving}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
        >
          {saving ? "Uploading..." : "Save Avatar"}
        </motion.button>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
