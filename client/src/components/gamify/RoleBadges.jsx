const rolePalette = {
  host: { color: "#ffb800", label: "Commander", icon: "👑", ability: "Mission control & tactical command" },
  architect: { color: "#39ff14", label: "Architect", icon: "🏗️", ability: "Shape tools & guide overlays" },
  artist: { color: "#bf5af2", label: "Artist", icon: "🎨", ability: "Free drawing & brush mastery" },
  analyst: { color: "#00f0ff", label: "Analyst", icon: "🔍", ability: "Intel visibility & pattern detection" },
  participant: { color: "#5a7a8a", label: "Operative", icon: "👤", ability: "Standard field operative" }
};

const RoleBadges = ({ roles = [], users = [] }) => {
  const getName = (id) => users.find((u) => u.id === id)?.name || "Agent";

  if (!roles.length) return null;

  return (
    <div className="role-badges">
      {roles.map((r) => {
        const palette = rolePalette[r.role] || rolePalette.participant;
        return (
          <div
            className="role-chip"
            key={r.userId}
            style={{ borderColor: palette.color, color: palette.color }}
          >
            <span className="role-icon">{palette.icon}</span>
            <span className="role-dot" style={{ background: palette.color }} />
            <span className="role-name">{getName(r.userId)}</span>
            <span className="role-label">{palette.label}</span>
            <div className="role-tooltip">{palette.ability}</div>
          </div>
        );
      })}
    </div>
  );
};

export default RoleBadges;
