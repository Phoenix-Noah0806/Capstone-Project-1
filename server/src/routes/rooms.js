import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { Room } from "../models/Room.js";
import { generateRoomId } from "../utils/roomId.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { missionType } = req.body || {};
  let roomId = generateRoomId();
  let exists = await Room.findOne({ roomId });
  while (exists) {
    roomId = generateRoomId();
    exists = await Room.findOne({ roomId });
  }

  const room = await Room.create({
    roomId,
    host: userId,
    participants: [userId],
    missionType: missionType || "free"
  });

  return res.status(201).json({ roomId: room.roomId, role: "host", missionType: room.missionType });
});

router.post("/join", authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  const userId = req.user.id;
  if (!roomId) {
    return res.status(400).json({ message: "Room ID is required" });
  }

  const room = await Room.findOne({ roomId });
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  if (!room.participants.some((id) => id.toString() === userId)) {
    room.participants.push(userId);
    await room.save();
  }

  const role = room.host?.toString() === userId ? "host" : "participant";
  return res.json({ roomId: room.roomId, role });
});

router.get("/:roomId", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const room = await Room.findOne({ roomId }).populate("participants", "name email");
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  return res.json({
    roomId: room.roomId,
    host: room.host,
    participants: room.participants,
    strokes: room.strokes,
    redoStack: room.redoStack,
    messages: room.messages,
    files: room.files,
    snapshotDataUrl: room.snapshotDataUrl
  });
});

router.post("/:roomId/snapshot", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { dataUrl } = req.body;
  const room = await Room.findOne({ roomId });
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.snapshotDataUrl = dataUrl || "";
  await room.save();
  return res.json({ ok: true });
});

router.post("/:roomId/files", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { file } = req.body;
  if (!file || !file.dataUrl) {
    return res.status(400).json({ message: "File payload missing" });
  }

  if (file.size > 2 * 1024 * 1024) {
    return res.status(400).json({ message: "File too large (2MB max)" });
  }

  const room = await Room.findOne({ roomId });
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.files.push({
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl: file.dataUrl,
    uploadedBy: req.user.id
  });
  await room.save();

  return res.json({ ok: true });
});

router.post("/:roomId/mission/start", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { name, description, timerSeconds } = req.body;
  const room = await Room.findOne({ roomId });
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (room.host?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only host can start missions" });
  }
  room.mission = {
    status: "active",
    name,
    description,
    timerSeconds,
    startedAt: new Date(),
    progress: 0,
    stage: 1,
    hintHolders: [],
    puzzle: { parts: [], completed: false },
    score: 0
  };
  await room.save();
  return res.json({ mission: room.mission });
});

router.post("/:roomId/mission/progress", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { progress, stage, status, score } = req.body;
  const room = await Room.findOne({ roomId });
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (room.host?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only host can update missions" });
  }
  room.mission.progress = progress ?? room.mission.progress;
  room.mission.stage = stage ?? room.mission.stage;
  room.mission.status = status ?? room.mission.status;
  if (typeof score === "number") room.mission.score = score;
  if (status === "completed" || status === "failed") {
    room.missionHistory.push({
      name: room.mission.name,
      completedAt: new Date(),
      score: room.mission.score,
      status: room.mission.status
    });
  }
  await room.save();
  return res.json({ mission: room.mission });
});

router.post("/:roomId/roles", authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { assignments } = req.body; // [{userId, role}]
  const room = await Room.findOne({ roomId });
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (room.host?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only host can assign roles" });
  }
  room.roles = assignments || [];
  await room.save();
  return res.json({ roles: room.roles });
});

export default router;
