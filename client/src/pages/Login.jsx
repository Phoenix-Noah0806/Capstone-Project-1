import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ParticleField from "../components/ParticleField";

const FEATURE_POINTS = [
  "Timed tactical missions with live scoring",
  "Blind recon mode and artifact reconstruction",
  "Operative powers: Architect, Artist, Analyst, Commander",
  "Live reactions, tactical votes, and laser targeting",
  "Socket-synced holo-canvas + comms + data drops"
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <ParticleField />
      <div className="scanline-overlay" />
      <motion.div
        className="auth-hero glass"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="pill">Neon Forge</div>
        <h1>
          Neon Forge: <span className="neon">Mission Control</span>
        </h1>
        <p>Tactical collaboration platform — deploy missions, wield operative abilities, and synchronize with your squad.</p>
        <ul className="feature-list">
          {FEATURE_POINTS.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              {item}
            </motion.li>
          ))}
        </ul>
      </motion.div>
      <motion.div
        className="auth-card glass"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2>System Access</h2>
        <p>Authenticate to rejoin your squad.</p>
        {error ? <div className="error">{error}</div> : null}
        <form onSubmit={submit} className="auth-form">
          <motion.input
            type="email"
            placeholder=">> AGENT EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            whileFocus={{ borderColor: "#00f0ff", boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)" }}
          />
          <motion.input
            type="password"
            placeholder=">> ACCESS CODE"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            whileFocus={{ borderColor: "#00f0ff", boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)" }}
          />
          <motion.button
            className="btn primary"
            type="submit"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(0, 240, 255, 0.3)" }}
          >
            Authenticate
          </motion.button>
        </form>
        <div className="auth-footer">
          New operative? <Link to="/register">Initialize Profile</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
