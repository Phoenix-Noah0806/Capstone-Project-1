import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const steps = [3, 2, 1, "GO!"];

const MissionStartOverlay = ({ active, onComplete }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }

    if (idx >= steps.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setIdx((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [active, idx, onComplete]);

  if (!active || idx >= steps.length) return null;

  const current = steps[idx];
  const isGo = current === "GO!";

  return (
    <div className="mission-start-overlay">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className={isGo ? "mission-start-go" : "mission-start-number"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {current}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MissionStartOverlay;
