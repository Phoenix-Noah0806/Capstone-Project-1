import { useState, useRef, useEffect } from "react";
import CyberpunkAvatar from "./CyberpunkAvatar";

const ChatPanel = ({ messages, onSend, users, files, onFileUpload }) => {
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <aside className="chat-panel">
      <div className="panel-section">
        <div className="panel-title">Comms Feed</div>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={`${msg.text}-${idx}`} className="chat-message chat-msg-animated">
              <strong>{msg.name}:</strong> {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={submit} className="chat-form">
          <input
            type="text"
            placeholder=">> transmit..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn" type="submit">
            Send
          </button>
        </form>
      </div>

      <div className="panel-section">
        <div className="panel-title">Squad</div>
        <div className="users-list">
          {users.map((u) => (
            <div key={u.id} className="user-chip">
              <CyberpunkAvatar avatar={u.avatar} size={18} showGlow={false} />
              {u.name}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">Data Drops</div>
        <input
          type="file"
          className="file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileUpload(file);
            }
          }}
        />
        <div className="file-list">
          {files.map((file, idx) => (
            <a key={`${file.name}-${idx}`} href={file.dataUrl} download={file.name}>
              {file.name}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default ChatPanel;
