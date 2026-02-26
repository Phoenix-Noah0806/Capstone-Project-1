const Toolbar = ({ tool, color, size, setTool, setColor, setSize, onUndo, onRedo, onClear, onSave, userRole, mathMode, setMathMode }) => {
  const isArtist = userRole === "artist";
  const isShape = ["rect", "circle", "line", "arrow", "diamond"].includes(tool);

  return (
    <aside className="toolbar">
      <div className="toolbar-section">
        <label className="label">Weapons</label>
        <button
          className={`tool-btn ${tool === "pencil" ? "active" : ""}`}
          onClick={() => setTool("pencil")}
          title="Pencil"
        >
          ✎ PEN
        </button>
        {isArtist && (
          <button
            className={`tool-btn ${tool === "glow" ? "active" : ""}`}
            onClick={() => setTool("glow")}
            title="Glow Pen"
          >
            ⚡ GLOW
          </button>
        )}
        <button
          className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
          onClick={() => setTool("eraser")}
          title="Eraser"
        >
          ◼ ERASE
        </button>
        <button
          className={`tool-btn ${tool === "select" ? "active" : ""}`}
          onClick={() => setTool("select")}
          title="Select & Move"
        >
          ✥ SEL
        </button>
      </div>

      <div className="toolbar-section">
        <label className="label">Shapes</label>
        <button
          className={`tool-btn ${tool === "rect" ? "active" : ""}`}
          onClick={() => setTool("rect")}
          title="Rectangle"
        >
          ▭ RECT
        </button>
        <button
          className={`tool-btn ${tool === "circle" ? "active" : ""}`}
          onClick={() => setTool("circle")}
          title="Circle"
        >
          ◯ CIRC
        </button>
        <button
          className={`tool-btn ${tool === "line" ? "active" : ""}`}
          onClick={() => setTool("line")}
          title="Line"
        >
          ╱ LINE
        </button>
        <button
          className={`tool-btn ${tool === "arrow" ? "active" : ""}`}
          onClick={() => setTool("arrow")}
          title="Arrow"
        >
          → ARRW
        </button>
        <button
          className={`tool-btn ${tool === "diamond" ? "active" : ""}`}
          onClick={() => setTool("diamond")}
          title="Diamond"
        >
          ◇ DIAM
        </button>
      </div>

      <div className="toolbar-section">
        <label className="label">Chromatic</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        {isArtist && (
          <div className="special-palette">
            {["#ff00ff", "#00ffff", "#ffff00"].map((c) => (
              <div
                key={c}
                className="palette-color"
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-section">
        <label className="label">Caliber</label>
        <input
          type="range"
          min="2"
          max={isArtist ? 48 : 24}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
        <div className="range-value">{size}px</div>
      </div>

      <div className="toolbar-section">
        <label className="label">Intel</label>
        <button
          className={`tool-btn math-btn ${mathMode ? "active" : ""}`}
          onClick={() => setMathMode(!mathMode)}
          title="Math Mode"
        >
          ∑ MATH
        </button>
      </div>

      <div className="toolbar-section">
        <button className="btn" onClick={onUndo}>
          Undo
        </button>
        <button className="btn" onClick={onRedo}>
          Redo
        </button>
        <button className="btn danger" onClick={onClear}>
          Purge
        </button>
      </div>

      <div className="toolbar-section">
        <button className="btn primary" onClick={onSave}>
          Capture
        </button>
      </div>
    </aside>
  );
};

export default Toolbar;
