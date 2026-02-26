import { useEffect, useRef } from "react";

const colors = ["#f87171", "#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#fb7185"];

const getColor = (userId) => colors[(userId?.length || 0) % colors.length];

const CursorLayer = ({ cursorMap }) => {
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    Object.values(cursorMap).forEach((c) => {
      const existing = layer.querySelector(`[data-user='${c.userId}']`);
      if (!existing) {
        const dot = document.createElement("div");
        dot.className = "cursor-dot";
        dot.dataset.user = c.userId;
        const col = getColor(c.userId);
        dot.style.background = col;
        dot.style.borderColor = col;
        dot.style.color = col;
        dot.innerHTML = `<span class="cursor-label">${c.name}</span><span class="cursor-laser"></span>`;
        layer.appendChild(dot);
      }
    });

    // Remove stale cursors
    layer.querySelectorAll(".cursor-dot").forEach((el) => {
      if (!cursorMap[el.dataset.user]) {
        el.remove();
      }
    });
  }, [Object.keys(cursorMap).length]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    for (const cursor of Object.values(cursorMap)) {
      const el = layer.querySelector(`[data-user='${cursor.userId}']`);
      if (el) {
        el.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
        const laser = el.querySelector(".cursor-laser");
        if (laser) {
          laser.style.opacity = cursor.laser ? "1" : "0";
          laser.style.transform = cursor.laser ? "scale(2.5)" : "scale(1)";
        }
      }
    }
  }, [cursorMap]);

  return <div className="cursor-layer" ref={layerRef} />;
};

export default CursorLayer;
