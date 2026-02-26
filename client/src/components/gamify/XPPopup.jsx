import { AnimatePresence, motion } from "framer-motion";

const XPPopup = ({ popups = [] }) => {
  return (
    <div className="xp-popup-container">
      <AnimatePresence>
        {popups.map((p) => (
          <motion.div
            key={p.id}
            className="xp-popup"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.9 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            +{p.xp} CREDITS ⚡
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default XPPopup;
