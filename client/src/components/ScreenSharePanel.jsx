import { useRef, useEffect } from "react";

const ScreenSharePanel = ({ isSharing, isViewing, onStart, onStop, stream, onClose }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // When actively viewing, render a floating modal window
  if (isViewing) {
    return (
      <div className="live-feed-modal-overlay" onClick={onClose}>
        <div className="live-feed-modal" onClick={(e) => e.stopPropagation()}>
          <div className="live-feed-modal-header">
            <div className="live-feed-modal-badge">
              <span className="live-indicator" />
              LIVE BROADCAST
            </div>
            <button className="live-feed-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
          <div className="live-feed-modal-body">
            {stream ? (
              <video
                ref={videoRef}
                className="live-feed-video"
                autoPlay
                playsInline
                muted={false}
              />
            ) : (
              <div className="live-feed-connecting">
                <div className="live-feed-spinner" />
                <span>Establishing secure uplink...</span>
              </div>
            )}
            {/* Corner brackets */}
            <div className="viewer-bracket tl" />
            <div className="viewer-bracket tr" />
            <div className="viewer-bracket bl" />
            <div className="viewer-bracket br" />
          </div>
        </div>
      </div>
    );
  }

  // Host view: compact controls in footer
  return (
    <div className="screen-share-compact">
      <div className="panel-title">Live Feed</div>
      <div className="screen-actions">
        {!isSharing ? (
          <button className="btn" onClick={onStart}>
            📡 Broadcast
          </button>
        ) : (
          <>
            <button className="btn danger" onClick={onStop}>
              Cut Feed
            </button>
            <span className="live-badge-inline">
              <span className="live-indicator" />
              LIVE
            </span>
          </>
        )}
      </div>
      {isSharing && stream && (
        <video
          ref={videoRef}
          className="screen-share-mini-preview"
          autoPlay
          playsInline
          muted
        />
      )}
    </div>
  );
};

export default ScreenSharePanel;
