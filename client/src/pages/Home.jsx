import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const cards = [
  {
    title: "Squad Deploy",
    desc: "Initialize a mission sector, assign operative roles, and launch tactical challenges.",
    cta: "Enter Mission Control",
    to: "/login"
  },
  {
    title: "Blind Recon",
    desc: "Share classified intel fragments and guide operatives to mission completion.",
    cta: "Join as Operative",
    to: "/login"
  },
  {
    title: "Artifact Rush",
    desc: "Reconstruct fragmented data artifacts before the countdown reaches zero.",
    cta: "Start Operation",
    to: "/register"
  }
];

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="hero-shell">
      <div className="bg-grid" />
      <div className="scanline-overlay" />
      <div className="hero-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-copy"
        >
          <div className="pill">Tactical Holo-Whiteboard</div>
          <h1>
            Deploy. Synchronize. <span className="neon">Dominate.</span>
          </h1>
          <p>
            Transform collaboration into a tactical operation: timed missions, classified intel, operative abilities, live scoring, and squad-level coordination.
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => navigate("/register")}>Initialize Squad</button>
            <button className="btn ghost" onClick={() => navigate("/login")}>Agent Login</button>
          </div>
        </motion.div>

        <div className="hero-cards">
          {cards.map((card, idx) => (
            <motion.div
              key={card.title}
              className="hero-card glass"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80, damping: 15 }}
            >
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <Link className="btn small" to={card.to}>
                {card.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
