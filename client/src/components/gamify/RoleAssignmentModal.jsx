import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const roleOptions = [
  { value: "architect", label: "🏗️ Architect", desc: "Shape tools & guides" },
  { value: "artist", label: "🎨 Artist", desc: "Free drawing" },
  { value: "analyst", label: "🔍 Analyst", desc: "Intel visibility" },
  { value: "participant", label: "👤 Operative", desc: "Default role" }
];

const RoleAssignmentModal = ({ open, onClose, users = [], onAssign }) => {
  const [assignments, setAssignments] = useState({});

  const handleChange = (userId, role) => {
    setAssignments((prev) => ({ ...prev, [userId]: role }));
  };

  const handleConfirm = () => {
    const roleList = users.map((u) => ({
      userId: u.id,
      role: assignments[u.id] || "participant"
    }));
    onAssign(roleList);
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            className="modal-card role-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
          >
            <h3>Assign Operative Roles</h3>
            <div className="role-assign-list">
              {users.map((user) => (
                <div key={user.id} className="role-assign-row">
                  <span className="role-assign-name">{user.name}</span>
                  <select
                    className="role-assign-select"
                    value={assignments[user.id] || "participant"}
                    onChange={(e) => handleChange(user.id, e.target.value)}
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>
                Abort
              </button>
              <button className="btn primary" onClick={handleConfirm}>
                Confirm Roles
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};

export default RoleAssignmentModal;
