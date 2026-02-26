const RoomHeader = ({ roomId, role, usersCount, onLeave }) => {
  return (
    <header className="room-header">
      <div>
        <div className="room-label">Sector</div>
        <div className="room-id">{roomId}</div>
      </div>
      <div className="room-meta">
        <div className="radar-dot" />
        <span className="chip">{role === "host" ? "Commander" : "Operative"}</span>
        <span className="chip">{usersCount} linked</span>
      </div>
      <button className="btn ghost" onClick={onLeave}>
        Disconnect
      </button>
    </header>
  );
};

export default RoomHeader;
