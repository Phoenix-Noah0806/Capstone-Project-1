import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ReactionsOverlay = ({ reactions }) => {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!reactions.length) return;
    const latest = reactions[reactions.length - 1];
    const entry = {
      ...latest,
      _key: `${latest.ts}-${latest.userId}-${Math.random()}`,
      left: 10 + Math.random() * 75
    };
    setVisible((prev) => [...prev.slice(-15), entry]);

    const timer = setTimeout(() => {
      setVisible((prev) => prev.filter((r) => r._key !== entry._key));
    }, 2200);

    return () => clearTimeout(timer);
  }, [reactions.length]);

  return (
    <div className="reactions-overlay">
      <AnimatePresence>
        {visible.map((r) => (
          <motion.div
            key={r._key}
            className="reaction-float"
            style={{ left: `${r.left}%` }}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.5 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <span className="reaction-emoji">{r.emoji}</span>
            <span className="reaction-name">{r.name}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ReactionsOverlay;
