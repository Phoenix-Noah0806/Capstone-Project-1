import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { evaluate, simplify, parse } from "mathjs";

const MathOverlay = ({ active, onSolve, onClose }) => {
  const [equation, setEquation] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSolve = () => {
    if (!equation.trim()) return;
    setError("");
    setResult(null);

    try {
      let answer;
      const trimmed = equation.trim();

      // Try to evaluate directly first (arithmetic, trig, etc.)
      try {
        const evaluated = evaluate(trimmed);
        answer = typeof evaluated === "object" ? evaluated.toString() : String(evaluated);
      } catch {
        // If direct evaluation fails, try to simplify expression
        try {
          const simplified = simplify(trimmed);
          answer = simplified.toString();
        } catch {
          // Try parsing as a general expression
          const parsed = parse(trimmed);
          answer = parsed.toString();
        }
      }

      setResult(answer);
      onSolve(equation, answer);
    } catch (err) {
      setError("Could not solve: " + err.message);
    }
  };

  const exampleEquations = [
    "2 * x + 3",
    "sin(pi / 4)",
    "sqrt(144)",
    "2^10",
    "log(100, 10)",
    "5! / 3!",
    "3x^2 + 2x - 5",
    "det([1, 2; 3, 4])"
  ];

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="math-overlay"
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="math-header">
          <span className="math-title">∑ MATH SOLVER</span>
          <button className="math-close" onClick={onClose}>✕</button>
        </div>

        <div className="math-body">
          <div className="math-input-wrap">
            <input
              type="text"
              className="math-input"
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSolve();
              }}
              placeholder=">> Enter equation..."
              autoFocus
            />
            <motion.button
              className="btn primary math-solve-btn"
              onClick={handleSolve}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              SOLVE
            </motion.button>
          </div>

          {error && <div className="math-error">{error}</div>}

          {result !== null && (
            <motion.div
              className="math-result"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="math-result-label">Result</div>
              <div className="math-result-value">{result}</div>
            </motion.div>
          )}

          <div className="math-examples">
            <div className="math-examples-label">Quick examples:</div>
            <div className="math-examples-grid">
              {exampleEquations.map((eq) => (
                <button
                  key={eq}
                  className="math-example-chip"
                  onClick={() => setEquation(eq)}
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MathOverlay;
