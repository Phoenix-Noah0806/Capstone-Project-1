import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { apiRequest, apiUrl, getToken } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import RoomHeader from "../components/RoomHeader";
import Toolbar from "../components/Toolbar";
import ChatPanel from "../components/ChatPanel";
import ScreenSharePanel from "../components/ScreenSharePanel";
import MissionPanel from "../components/gamify/MissionPanel";
import ScoreboardModal from "../components/gamify/ScoreboardModal";
import ReactionsOverlay from "../components/gamify/ReactionsOverlay";
import VotingPanel from "../components/gamify/VotingPanel";
import RoleBadges from "../components/gamify/RoleBadges";
import CursorLayer from "../components/gamify/CursorLayer";
import ConfettiOverlay from "../components/gamify/ConfettiOverlay";
import XPPopup from "../components/gamify/XPPopup";
import MissionStartOverlay from "../components/gamify/MissionStartOverlay";
import RoleAssignmentModal from "../components/gamify/RoleAssignmentModal";
import SkribbleOverlay from "../components/gamify/SkribbleOverlay";
import MathOverlay from "../components/MathOverlay";

const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const SHAPE_TOOLS = ["rect", "circle", "line", "arrow", "diamond"];
const NON_DRAW_TOOLS = ["select"];

const WhiteboardRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    state: gameState,
    actions: gameActions
  } = useGame();

  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const inboundStreamRef = useRef(null);

  const [role, setRole] = useState("participant");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [strokes, setStrokes] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#111827");
  const [size, setSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [shapeStart, setShapeStart] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [screenSharerId, setScreenSharerId] = useState(null);
  const [screenSharerSocketId, setScreenSharerSocketId] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [showMissionStart, setShowMissionStart] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [laserMode, setLaserMode] = useState(false);
  const [mathMode, setMathMode] = useState(false);
  const [liveFeedOpen, setLiveFeedOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [missionType, setMissionType] = useState("free");
  const [skribbleState, setSkribbleState] = useState({ status: "idle", scores: [] });
  const [skribbleWordChoices, setSkribbleWordChoices] = useState([]);
  const [skribbleSecretWord, setSkribbleSecretWord] = useState("");
  const [skribbleCorrectFlash, setSkribbleCorrectFlash] = useState(null);

  const token = useMemo(() => getToken(), []);
  const isShape = SHAPE_TOOLS.includes(tool);

  const userRole = useMemo(() => {
    const r = gameState.roles.find((r) => r.userId === user?.id);
    return r?.role || (role === "host" ? "host" : "participant");
  }, [gameState.roles, user, role]);

  useEffect(() => {
    const ensureMembership = async () => {
      try {
        await apiRequest("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: roomId?.trim().toUpperCase() })
        });
      } catch (err) {
        alert(err.message);
        navigate("/dashboard");
      }
    };
    ensureMembership();
  }, [roomId, navigate]);

  useEffect(() => {
    if (!user) return;
    const socket = io(apiUrl, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { roomId });
    });

    socket.on("room:state", (payload) => {
      setRole(payload.role);
      setUsers(payload.users || []);
      setMessages(payload.messages || []);
      setFiles(payload.files || []);
      setStrokes(payload.strokes || []);
      setRedoStack(payload.redoStack || []);
      setScreenSharerId(payload.screenSharerId || null);
      setScreenSharerSocketId(payload.screenSharerSocketId || null);
      // Don't auto-connect here — connection will be initiated when
      // the participant opens the Live Feed modal (see liveFeedOpen effect).
      if (payload.missionType) setMissionType(payload.missionType);
      if (payload.skribble) setSkribbleState(payload.skribble);
      gameActions.setFromSocket({
        mission: payload.mission,
        roles: payload.roles,
        scoreboard: payload.scoreboard,
        missionHistory: payload.missionHistory
      });
      redraw(payload.strokes || []);
    });

    socket.on("room:users", (payload) => {
      setUsers(payload || []);
    });

    socket.on("stroke:draw", (payload) => {
      drawSegment(payload);
    });

    socket.on("stroke:commit", (stroke) => {
      setStrokes((prev) => {
        const next = [...prev, stroke];
        redraw(next); // ensure shapes (and other strokes) render for remote viewers
        return next;
      });
    });

    socket.on("board:state", ({ strokes: nextStrokes, redoStack: nextRedo }) => {
      setStrokes(nextStrokes || []);
      setRedoStack(nextRedo || []);
      setSelectedIdx(null);
      redraw(nextStrokes || []);
    });

    socket.on("stroke:moved", ({ strokes: nextStrokes }) => {
      setStrokes(nextStrokes || []);
      redraw(nextStrokes || []);
    });

    socket.on("board:clear", () => {
      setStrokes([]);
      setRedoStack([]);
      clearCanvas();
    });

    socket.on("chat:message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("file:shared", (file) => {
      setFiles((prev) => [...prev, file]);
    });

    socket.on("mission-start", (mission) => {
      gameActions.setMission(mission);
      gameActions.resetVotes();
      setShowMissionStart(true);
    });

    socket.on("mission-progress", (payload) => {
      gameActions.setMission(payload);
    });

    socket.on("mission-complete", (payload) => {
      gameActions.setMission(payload);
      gameActions.triggerConfetti(true);
      setScoreboardOpen(true);
    });

    socket.on("role-assigned", (roles) => {
      gameActions.setRoles(roles || []);
    });

    socket.on("hint-shared", (payload) => {
      gameActions.setMission({ hintHolders: payload.hintHolders || [] });
    });

    socket.on("reaction-event", (payload) => {
      gameActions.pushReaction(payload);
    });

    socket.on("vote-event", (payload) => {
      gameActions.pushVote(payload);
    });

    socket.on("score-update", (payload) => {
      gameActions.updateScore(payload);
    });

    socket.on("cursor:update", (cursor) => {
      gameActions.updateCursor(cursor);
    });

    socket.on("screen:started", ({ sharerId, sharerSocketId }) => {
      setScreenSharerId(sharerId);
      setScreenSharerSocketId(sharerSocketId);
      // Don't auto-connect here — wait until participant opens the live feed modal.
    });

    socket.on("screen:stopped", () => {
      setScreenSharerId(null);
      setScreenSharerSocketId(null);
      closeAllPeers();
      setRemoteStream(null);
      inboundStreamRef.current = null;
    });

    socket.on("webrtc:offer", async ({ fromSocketId, sdp }) => {
      if (!localStreamRef.current) return;
      // Clean up any existing peer for this socket before creating a new one
      const existingPeer = peersRef.current.get(fromSocketId);
      if (existingPeer) {
        existingPeer.close();
        peersRef.current.delete(fromSocketId);
      }
      const peer = createPeer(fromSocketId, true);
      localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc:answer", { targetSocketId: fromSocketId, sdp: peer.localDescription });
    });

    socket.on("webrtc:answer", async ({ fromSocketId, sdp }) => {
      const peer = peersRef.current.get(fromSocketId);
      if (!peer) return;
      await peer.setRemoteDescription(sdp);
    });

    socket.on("webrtc:ice", async ({ fromSocketId, candidate }) => {
      const peer = peersRef.current.get(fromSocketId);
      if (!peer) return;
      if (candidate) {
        await peer.addIceCandidate(candidate);
      }
    });

    /* --- Skribble events --- */
    socket.on("skribble:error", ({ message }) => {
      alert(message || "Skribble error");
    });

    socket.on("skribble:started", (payload) => {
      setSkribbleState((prev) => ({ ...prev, ...payload, status: "idle" }));
      setSkribbleWordChoices([]);
      setSkribbleSecretWord("");
    });

    socket.on("skribble:new-round", (payload) => {
      setSkribbleState((prev) => ({ ...prev, ...payload }));
      setSkribbleWordChoices([]);
      setSkribbleSecretWord("");
      setSkribbleCorrectFlash(null);
    });

    socket.on("skribble:pick-word", ({ wordChoices }) => {
      setSkribbleWordChoices(wordChoices || []);
    });

    socket.on("skribble:drawing-start", (payload) => {
      setSkribbleState((prev) => ({
        ...prev,
        ...payload,
        status: "drawing",
        guessedBy: [],
        roundStartedAt: new Date().toISOString()
      }));
      setSkribbleWordChoices([]);
    });

    socket.on("skribble:your-word", ({ word }) => {
      setSkribbleSecretWord(word);
    });

    socket.on("skribble:correct", ({ points }) => {
      setSkribbleCorrectFlash({ points });
      setTimeout(() => setSkribbleCorrectFlash(null), 2000);
    });

    socket.on("skribble:player-guessed", (payload) => {
      setSkribbleState((prev) => ({
        ...prev,
        guessedBy: payload.guessedBy,
        scores: payload.scores
      }));
    });

    socket.on("skribble:round-end", (payload) => {
      setSkribbleState((prev) => ({
        ...prev,
        status: "round-end",
        lastWord: payload.word,
        scores: payload.scores,
        guessedBy: payload.guessedBy,
        round: payload.round,
        totalRounds: payload.totalRounds
      }));
      setSkribbleSecretWord("");
    });

    socket.on("skribble:game-end", (payload) => {
      setSkribbleState((prev) => ({
        ...prev,
        status: "game-end",
        scores: payload.scores,
        lastWord: payload.lastWord
      }));
      setSkribbleSecretWord("");
      gameActions.triggerConfetti(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user, token]);

  useEffect(() => {
    if (
      liveFeedOpen &&
      screenSharerId &&
      screenSharerId !== user?.id &&
      screenSharerSocketId
    ) {
      requestScreenConnectionDirect(screenSharerSocketId);
    }
  }, [liveFeedOpen, screenSharerId, screenSharerSocketId, user]);

  // Canvas resize — keep canvas matched to container size
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const preview = previewCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      // Skip if container has zero dimensions (not yet laid out)
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (preview) {
        preview.width = rect.width;
        preview.height = rect.height;
      }
      redraw(strokesRef.current);
    };
    // Run after layout paints — retry to handle late layout settle
    requestAnimationFrame(() => {
      resize();
      // Second attempt after another frame for layout settle
      requestAnimationFrame(resize);
    });

    // Respond to any container size change (including flex/layout shifts)
    let observer;
    const attachObserver = () => {
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        observer = new ResizeObserver(() => resize());
        observer.observe(containerRef.current);
      }
    };
    // Attach immediately if ref is ready, otherwise retry next frame
    if (containerRef.current) {
      attachObserver();
    } else {
      requestAnimationFrame(attachObserver);
    }

    // Fallback: also listen to window resize
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (observer) observer.disconnect();
    };
  }, [missionType]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameState.mission?.timerSeconds || !gameState.mission?.startedAt) return;
      const started = new Date(gameState.mission.startedAt).getTime();
      const elapsed = (Date.now() - started) / 1000;
      const remaining = Math.max(gameState.mission.timerSeconds - elapsed, 0);
      setTimeLeft(Math.round(remaining));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.mission]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearPreview = () => {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    const ctx = preview.getContext("2d");
    ctx.clearRect(0, 0, preview.width, preview.height);
  };

  // --- Shape drawing helpers ---
  const drawShapeOnCtx = (ctx, shapeType, start, end, strokeColor, strokeSize, strokeTool) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeSize;
    ctx.strokeStyle = strokeColor;
    if (strokeTool === "glow") {
      ctx.shadowBlur = strokeSize * 2;
      ctx.shadowColor = strokeColor;
    }

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    ctx.beginPath();
    switch (shapeType) {
      case "rect":
        ctx.rect(x, y, w, h);
        break;
      case "circle": {
        const rx = w / 2;
        const ry = h / 2;
        ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2);
        break;
      }
      case "line":
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        break;
      case "arrow": {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        // Arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(12, strokeSize * 3);
        ctx.lineTo(
          end.x - headLen * Math.cos(angle - Math.PI / 6),
          end.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLen * Math.cos(angle + Math.PI / 6),
          end.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        break;
      }
      case "diamond": {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.moveTo(cx, y);
        ctx.lineTo(x + w, cy);
        ctx.lineTo(cx, y + h);
        ctx.lineTo(x, cy);
        ctx.closePath();
        break;
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawStroke = (ctx, stroke) => {
    // Shape strokes
    if (stroke.type === "shape" && stroke.shapeType && stroke.startPoint && stroke.endPoint) {
      drawShapeOnCtx(ctx, stroke.shapeType, stroke.startPoint, stroke.endPoint, stroke.color, stroke.size, stroke.tool);
      return;
    }

    // Math result strokes
    if (stroke.type === "math" && stroke.equation && stroke.answer) {
      ctx.save();
      ctx.font = `bold ${Math.max(16, stroke.size * 2)}px 'Orbitron', 'Share Tech Mono', monospace`;
      ctx.fillStyle = stroke.color || "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = stroke.color || "#00f0ff";
      const pos = stroke.position || { x: 100, y: 100 };
      ctx.fillText(`${stroke.equation} = ${stroke.answer}`, pos.x, pos.y);
      ctx.restore();
      return;
    }

    // Freehand strokes
    if (!stroke.points?.length) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size;
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (stroke.tool === "glow") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.shadowBlur = stroke.size * 2;
      ctx.shadowColor = stroke.color;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }
    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.restore();
  };

  const redraw = (strokeList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeList.forEach((stroke) => drawStroke(ctx, stroke));
  };

  const drawSegment = ({ from, to, tool: t, color: c, size: s }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s;
    if (t === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (t === "glow") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = c;
      ctx.shadowBlur = s * 2;
      ctx.shadowColor = c;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = c;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Account for scale difference between internal canvas dims and CSS display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  /* --- Hit-test helpers for selecting strokes/shapes --- */
  const distToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  };

  const hitTestStroke = (point, stroke, threshold = 10) => {
    if (stroke.type === "shape" && stroke.startPoint && stroke.endPoint) {
      const { startPoint: s, endPoint: e } = stroke;
      const x1 = Math.min(s.x, e.x) - threshold;
      const y1 = Math.min(s.y, e.y) - threshold;
      const x2 = Math.max(s.x, e.x) + threshold;
      const y2 = Math.max(s.y, e.y) + threshold;
      return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
    }
    if (stroke.type === "math" && stroke.position) {
      const p = stroke.position;
      return point.x >= p.x - 10 && point.x <= p.x + 300 && point.y >= p.y - 30 && point.y <= p.y + 10;
    }
    if (stroke.points?.length) {
      for (let i = 1; i < stroke.points.length; i++) {
        const a = stroke.points[i - 1], b = stroke.points[i];
        if (distToSegment(point.x, point.y, a.x, a.y, b.x, b.y) < threshold) return true;
      }
    }
    return false;
  };

  const offsetStroke = (stroke, dx, dy) => {
    const s = { ...stroke };
    if (s.type === "shape" && s.startPoint && s.endPoint) {
      s.startPoint = { x: s.startPoint.x + dx, y: s.startPoint.y + dy };
      s.endPoint = { x: s.endPoint.x + dx, y: s.endPoint.y + dy };
    } else if (s.type === "math" && s.position) {
      s.position = { x: s.position.x + dx, y: s.position.y + dy };
    } else if (s.points?.length) {
      s.points = s.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
    return s;
  };

  const handlePointerDown = (event) => {
    // Block drawing for non-drawers during Skribble drawing phase
    if (
      missionType === "skribble" &&
      skribbleState.status === "drawing" &&
      skribbleState.drawerId !== user?.id
    ) {
      return;
    }
    const point = getPoint(event);

    // Selection tool: pick topmost stroke/shape and start drag
    if (tool === "select") {
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (hitTestStroke(point, strokes[i])) {
          setSelectedIdx(i);
          setDragStart(point);
          setIsDrawing(true); // reuse isDrawing to track drag state
          setIsDragging(true);
          return;
        }
      }
      setSelectedIdx(null);
      setIsDragging(false);
      return;
    }

    // Drawing a shape
    if (isShape) {
      setShapeStart(point);
      setIsDrawing(true);
      return;
    }

    // Freehand draw start
    setIsDrawing(true);
    const stroke = {
      tool,
      color,
      size,
      points: [point]
    };
    setCurrentStroke(stroke);
  };

  const handlePointerMove = (event) => {
    const point = getPoint(event);
    socketRef.current?.emit("cursor:update", {
      roomId,
      cursor: { x: point.x, y: point.y, userId: user.id, name: user.name, laser: laserMode }
    });

    // Dragging selected stroke/shape (selection tool)
    if (tool === "select" && isDragging && selectedIdx !== null && dragStart && event.buttons === 1) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      setStrokes((prev) => {
        const next = [...prev];
        next[selectedIdx] = offsetStroke(prev[selectedIdx], dx, dy);
        redraw(next);
        return next;
      });
      setDragStart(point);
      return;
    }

    if (!isDrawing) return;

    if (isShape && shapeStart) {
      clearPreview();
      const preview = previewCanvasRef.current;
      if (preview) {
        const ctx = preview.getContext("2d");
        drawShapeOnCtx(ctx, tool, shapeStart, point, color, size, "pencil");
      }
      return;
    }

    if (!currentStroke) return;
    const lastPoint = currentStroke.points[currentStroke.points.length - 1];
    drawSegment({ from: lastPoint, to: point, tool, color, size });
    socketRef.current?.emit("stroke:draw", {
      roomId,
      payload: { from: lastPoint, to: point, tool, color, size }
    });
    setCurrentStroke((prev) => ({
      ...prev,
      points: [...prev.points, point]
    }));
  };

  const finishStroke = (event) => {
    if (!isDrawing) return;

    // Finish drag — sync moved stroke to server
    if (tool === "select" && isDragging && selectedIdx !== null) {
      setIsDragging(false);
      setIsDrawing(false);
      setDragStart(null);
      socketRef.current?.emit("stroke:move", { roomId, strokes });
      redraw(strokes);
      return;
    }

    if (isShape && shapeStart) {
      const point = event ? getPoint(event) : shapeStart;
      clearPreview();
      const shapeStroke = {
        type: "shape",
        shapeType: tool,
        startPoint: shapeStart,
        endPoint: point,
        color,
        size,
        tool: "pencil"
      };
      const canvas = canvasRef.current;
      if (canvas) {
        drawShapeOnCtx(canvas.getContext("2d"), tool, shapeStart, point, color, size, "pencil");
      }
      socketRef.current?.emit("stroke:commit", { roomId, stroke: shapeStroke });
      setStrokes((prev) => [...prev, shapeStroke]);
      setShapeStart(null);
      setIsDrawing(false);
      return;
    }

    if (!currentStroke) return;
    setIsDrawing(false);
    // Ignore tap-only strokes (prevents tiny dots when double-clicking to select)
    if (currentStroke.points.length < 2) {
      setCurrentStroke(null);
      return;
    }
    socketRef.current?.emit("stroke:commit", { roomId, stroke: currentStroke });
    setStrokes((prev) => [...prev, currentStroke]);
    setCurrentStroke(null);
  };

  // (native double-click handled in handlePointerDown via event.detail)

  const handleMathSolve = (equation, answer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Place result at center of visible canvas
    const pos = { x: canvas.width / 2 - 100, y: canvas.height / 2 };
    const mathStroke = {
      type: "math",
      equation,
      answer,
      color,
      size,
      position: pos
    };
    const ctx = canvas.getContext("2d");
    drawStroke(ctx, mathStroke);
    socketRef.current?.emit("stroke:commit", { roomId, stroke: mathStroke });
    setStrokes((prev) => [...prev, mathStroke]);
  };

  const handleUndo = () => {
    socketRef.current?.emit("board:undo", { roomId });
  };

  const handleRedo = () => {
    socketRef.current?.emit("board:redo", { roomId });
  };

  const handleClear = () => {
    if (role !== "host") {
      alert("Only the host can clear the board.");
      return;
    }
    socketRef.current?.emit("board:clear", { roomId });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Re-draw all strokes to ensure canvas is current
    redraw(strokes);
    setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `whiteboard-${roomId}.png`;
      link.click();
      // Also try to save server-side, but don't block download
      apiRequest(`/api/rooms/${roomId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl })
      }).catch(() => {});
    }, 100);
  };

  const handleSendMessage = (text) => {
    // During Skribble drawing phase, intercept messages as guesses
    const isSkribbleDrawing = missionType === "skribble" && skribbleState.status === "drawing";
    const isDrawer = skribbleState.drawerId === user?.id;
    if (isSkribbleDrawing && !isDrawer) {
      socketRef.current?.emit("skribble:guess", { roomId, guess: text });
    } else {
      socketRef.current?.emit("chat:send", { roomId, text });
    }
  };

  /* --- Skribble Handlers --- */
  const handleSkribbleStart = (roundTimeSeconds, roundCount) => {
    socketRef.current?.emit("skribble:start", { roomId, roundTimeSeconds, roundCount });
  };

  const handleSkribblePickWord = (word) => {
    socketRef.current?.emit("skribble:pick-word", { roomId, word });
  };

  const handleSkribbleGuess = (guess) => {
    socketRef.current?.emit("skribble:guess", { roomId, guess });
  };

  const handleReaction = (emoji) => {
    socketRef.current?.emit("reaction:send", { roomId, emoji });
  };

  const handleVote = (vote) => {
    socketRef.current?.emit("vote:submit", { roomId, vote });
  };

  const handleMissionStart = useCallback(
    ({ type, name, description }) => {
      socketRef.current?.emit("mission:start", {
        roomId,
        mission: {
          name: name || "Reconstruct the Artifact",
          description: description || "Work together to complete the challenge before time runs out.",
          timerSeconds: 300,
          type: type || "free",
          hintHolders: type === "blind" ? users.slice(0, 2).map((u) => u.id) : []
        }
      });
    },
    [roomId, users]
  );

  const handleMissionAdvance = () => {
    socketRef.current?.emit("mission:progress", {
      roomId,
      stage: (gameState.mission.stage || 1) + 1,
      progress: Math.min((gameState.mission.progress || 0) + 10, 100)
    });
  };

  const handleMissionComplete = () => {
    socketRef.current?.emit("mission:complete", {
      roomId,
      score: gameState.mission.score + 50
    });
  };

  const handlePuzzleSubmit = () => {
    socketRef.current?.emit("puzzle:submit", { roomId });
  };

  const handleRoleAssign = (roleList) => {
    socketRef.current?.emit("roles:assign", { roomId, roles: roleList });
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      socketRef.current?.emit("file:share", {
        roomId,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const createPeer = (targetSocketId, isSharer) => {
    const peer = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("webrtc:ice", {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    if (!isSharer) {
      peer.ontrack = (event) => {
        const [stream] = event.streams || [];
        if (stream) {
          setRemoteStream(stream);
          inboundStreamRef.current = stream;
        } else {
          // Some browsers fire ontrack without streams; build one manually.
          const inbound = inboundStreamRef.current || new MediaStream();
          inboundStreamRef.current = inbound;
          inbound.addTrack(event.track);
          setRemoteStream(inbound);
        }
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          setRemoteStream(null);
          inboundStreamRef.current = null;
        }
      };
    }

    peersRef.current.set(targetSocketId, peer);
    return peer;
  };

  const requestScreenConnectionDirect = async (targetSocketId) => {
    if (!targetSocketId) return;
    // Close any existing peer for this socket first
    const existingPeer = peersRef.current.get(targetSocketId);
    if (existingPeer) {
      existingPeer.close();
      peersRef.current.delete(targetSocketId);
    }
    // Reset remote stream state so the UI shows the connecting indicator
    setRemoteStream(null);
    inboundStreamRef.current = null;
    const peer = createPeer(targetSocketId, false);
    // Add a recvonly video transceiver so the offer SDP contains m=video lines;
    // without this the host's video track cannot be negotiated.
    peer.addTransceiver("video", { direction: "recvonly" });
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current?.emit("webrtc:offer", {
      targetSocketId,
      sdp: peer.localDescription
    });
  };

  const closeAllPeers = () => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
  };

  const startScreenShare = async () => {
    if (role !== "host") {
      alert("Only the host can start screen sharing.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      localStreamRef.current = stream;
      setIsSharing(true);
      socketRef.current?.emit("screen:start", { roomId });
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (err) {
      console.error(err);
    }
  };

  const stopScreenShare = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setIsSharing(false);
    socketRef.current?.emit("screen:stop", { roomId });
    closeAllPeers();
    setRemoteStream(null);
    setScreenSharerSocketId(null);
    inboundStreamRef.current = null;
  };

  useEffect(() => {
    if (!localStreamRef.current) return;
    peersRef.current.forEach((peer) => {
      peer.getSenders().forEach((sender) => peer.removeTrack(sender));
      localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    });
  }, [isSharing]);

  const handleLeave = () => {
    navigate("/dashboard");
  };

  return (
    <div className={`room ${theme}`}>
      <RoomHeader roomId={roomId} role={role} usersCount={users.length} onLeave={handleLeave} />
      <RoleBadges roles={gameState.roles} users={users} />
      <div className="room-body">
        <Toolbar
          tool={tool}
          color={color}
          size={size}
          setTool={setTool}
          setColor={setColor}
          setSize={setSize}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onSave={handleSave}
          userRole={userRole}
          mathMode={mathMode}
          setMathMode={setMathMode}
        />
        <div className={`canvas-area ${isDrawing ? "drawing-active" : ""}`} ref={containerRef}>
          <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={() => finishStroke(null)}
      />
          {/* Preview canvas for shape drawing */}
          <canvas
            ref={previewCanvasRef}
            className="preview-canvas"
          />
          {showGrid && <div className="grid-overlay" />}
          <CursorLayer cursorMap={gameState.cursorMap} />
          <ReactionsOverlay reactions={gameState.reactions} />

          {/* Math Mode Overlay */}
          <MathOverlay
            active={mathMode}
            onSolve={handleMathSolve}
            onClose={() => setMathMode(false)}
          />

          {/* Live Feed button for participants */}
          {screenSharerId && screenSharerId !== user.id && (
            <button
              className="live-feed-fab"
              onClick={() => setLiveFeedOpen(true)}
              title="View host's live screen"
            >
              <span className="live-indicator" />
              📡 LIVE FEED
            </button>
          )}

          {/* Live Feed Modal */}
          {liveFeedOpen && screenSharerId && screenSharerId !== user.id && (
            <ScreenSharePanel
              isSharing={false}
              isViewing={true}
              onStart={startScreenShare}
              onStop={stopScreenShare}
              stream={remoteStream}
              onClose={() => setLiveFeedOpen(false)}
              onRetry={() => screenSharerSocketId && requestScreenConnectionDirect(screenSharerSocketId)}
            />
          )}
        </div>
        <div className="reaction-bar">
          {["🔥", "💡", "🎯", "🚀", "👏", "❤️", "⭐"].map((emoji) => (
            <button key={emoji} className="reaction-btn" onClick={() => handleReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
        <ChatPanel
          messages={messages}
          onSend={handleSendMessage}
          users={users}
          files={files}
          onFileUpload={handleFileUpload}
        />
      </div>
      <div className="room-footer">
        {/* Hide mission/voting/screen panels in Skribble mode — game mode was chosen on Dashboard */}
        {missionType !== "skribble" && (
          <>
            <MissionPanel
              mission={gameState.mission}
              onStart={handleMissionStart}
              onAdvance={handleMissionAdvance}
              onComplete={handleMissionComplete}
              onPuzzleSubmit={handlePuzzleSubmit}
              isHost={role === "host"}
              timeLeft={timeLeft}
              roomMissionType={missionType}
            />
            {missionType === "free" && (
              <VotingPanel onVote={handleVote} voteTally={gameState.voteTally} />
            )}
            {/* Host screen share controls (compact, in footer) */}
            <ScreenSharePanel
              isSharing={isSharing}
              isViewing={false}
              onStart={startScreenShare}
              onStop={stopScreenShare}
              stream={isSharing ? localStreamRef.current : null}
            />
          </>
        )}
        <div className="theme-toggle">
          <span>{userRole.toUpperCase()}</span>
          {userRole === "architect" && (
            <button className={`btn ghost small ${showGrid ? "active" : ""}`} onClick={() => setShowGrid(!showGrid)}>
              {showGrid ? "🌐 Grid Active" : "🌐 Grid Off"}
            </button>
          )}
          {userRole === "host" && (
            <button className={`btn ghost small ${laserMode ? "active" : ""}`} onClick={() => setLaserMode(!laserMode)}>
              {laserMode ? "🔦 Laser Lock" : "🔦 Laser Off"}
            </button>
          )}
          <button className="btn ghost" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "🌙 Dark Ops" : "☀️ Light Ops"}
          </button>
          {role === "host" && (
            <button className="btn ghost" onClick={() => setRoleModalOpen(true)}>
              🎭 Operatives
            </button>
          )}
          <button className="btn" onClick={() => setScoreboardOpen(true)}>
            🏆 Scoreboard
          </button>
        </div>
      </div>

      {/* Gamification Overlays */}
      <ScoreboardModal
        open={scoreboardOpen}
        onClose={() => setScoreboardOpen(false)}
        scoreboard={gameState.scoreboard}
        missionHistory={gameState.missionHistory}
      />
      <RoleAssignmentModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        users={users}
        onAssign={handleRoleAssign}
      />
      <MissionStartOverlay
        active={showMissionStart}
        onComplete={() => setShowMissionStart(false)}
      />
      <ConfettiOverlay active={gameState.confettiActive} />
      <XPPopup popups={gameState.xpPopups} />

      {/* Skribble Overlay */}
      {missionType === "skribble" && (
        <SkribbleOverlay
          skribble={skribbleState}
          userId={user?.id}
          isHost={role === "host"}
          onStart={handleSkribbleStart}
          onPickWord={handleSkribblePickWord}
          onGuess={handleSkribbleGuess}
          wordChoices={skribbleWordChoices}
          secretWord={skribbleSecretWord}
          correctFlash={skribbleCorrectFlash}
          users={users}
        />
      )}
    </div>
  );
};

export default WhiteboardRoom;
