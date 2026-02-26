import { Server } from "socket.io";
import { Room } from "../models/Room.js";
import { verifySocketToken } from "../middleware/auth.js";

const roomUsers = new Map();
const roomScreenSharer = new Map();
const roomVotes = new Map(); // roomId -> Map<optionId, count>

const getRoomUsers = (roomId) => {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  return roomUsers.get(roomId);
};

export const initSocket = (httpServer, corsOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin || "*",
      methods: ["GET", "POST"],
      credentials: false
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const payload = verifySocketToken(token);
      socket.data.user = { id: payload.id, name: payload.name, email: payload.email };
      return next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });

  // Mission timer checker — runs every 5 seconds
  setInterval(async () => {
    for (const [roomId] of roomUsers) {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.mission.status !== "active" || !room.mission.startedAt || !room.mission.timerSeconds) continue;
        const elapsed = (Date.now() - new Date(room.mission.startedAt).getTime()) / 1000;
        if (elapsed >= room.mission.timerSeconds) {
          room.mission.status = "failed";
          room.missionHistory.push({
            name: room.mission.name,
            completedAt: new Date(),
            score: room.mission.score,
            status: "failed"
          });
          await room.save();
          io.to(roomId).emit("mission-complete", room.mission);
        }
      } catch (e) {
        // ignore timer check errors
      }
    }
  }, 5000);

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId }) => {
      if (!roomId) {
        socket.emit("room:error", { message: "Room ID required" });
        return;
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit("room:error", { message: "Room not found" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;

      const usersMap = getRoomUsers(roomId);
      usersMap.set(socket.data.user.id, {
        id: socket.data.user.id,
        name: socket.data.user.name,
        socketId: socket.id
      });

      const users = Array.from(usersMap.values());
      const role = room.host?.toString() === socket.data.user.id ? "host" : "participant";

      socket.emit("room:state", {
        roomId,
        role,
        hostId: room.host,
        strokes: room.strokes,
        redoStack: room.redoStack,
        messages: room.messages,
        files: room.files,
        snapshotDataUrl: room.snapshotDataUrl,
        users,
        screenSharerId: roomScreenSharer.get(roomId)?.userId || null,
        screenSharerSocketId: roomScreenSharer.get(roomId)?.socketId || null,
        mission: room.mission,
        roles: room.roles,
        scoreboard: room.scoreboard,
        missionHistory: room.missionHistory
      });

      socket.to(roomId).emit("room:users", users);
    });

    socket.on("stroke:draw", ({ roomId, payload }) => {
      if (!roomId) return;
      socket.to(roomId).emit("stroke:draw", payload);
    });

    socket.on("stroke:commit", async ({ roomId, stroke }) => {
      if (!roomId || !stroke) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      room.strokes.push({ ...stroke, author: socket.data.user.id });
      room.redoStack = [];
      room.markModified("strokes");
      room.markModified("redoStack");

      // Auto-score: +5 XP per stroke contribution
      if (room.mission.status === "active") {
        room.mission.score = (room.mission.score || 0) + 5;
        const board = room.scoreboard || [];
        const entry = board.find((e) => e.userId?.toString() === socket.data.user.id);
        if (entry) {
          entry.xp = (entry.xp || 0) + 5;
          entry.contributions = (entry.contributions || 0) + 1;
        } else {
          board.push({ userId: socket.data.user.id, xp: 5, contributions: 1 });
        }
        room.scoreboard = board;
        io.to(roomId).emit("score-update", {
          score: room.mission.score,
          delta: 5,
          scoreboard: room.scoreboard
        });
      }

      await room.save();
      socket.to(roomId).emit("stroke:commit", stroke);
    });

    socket.on("board:undo", async ({ roomId }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room || room.strokes.length === 0) return;
      const stroke = room.strokes.pop();
      room.redoStack.unshift(stroke);
      room.markModified("strokes");
      room.markModified("redoStack");
      await room.save();
      io.to(roomId).emit("board:state", {
        strokes: room.strokes,
        redoStack: room.redoStack
      });
    });

    socket.on("board:redo", async ({ roomId }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room || room.redoStack.length === 0) return;
      const stroke = room.redoStack.shift();
      room.strokes.push(stroke);
      room.markModified("strokes");
      room.markModified("redoStack");
      await room.save();
      io.to(roomId).emit("board:state", {
        strokes: room.strokes,
        redoStack: room.redoStack
      });
    });

    socket.on("stroke:move", async ({ roomId, strokes: newStrokes }) => {
      if (!roomId || !Array.isArray(newStrokes)) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      room.strokes = newStrokes;
      room.markModified("strokes");
      await room.save();
      socket.to(roomId).emit("stroke:moved", { strokes: room.strokes });
    });

    socket.on("board:clear", async ({ roomId }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) {
        socket.emit("board:error", { message: "Only the host can clear the board" });
        return;
      }
      room.strokes = [];
      room.redoStack = [];
      await room.save();
      io.to(roomId).emit("board:clear");
    });

    socket.on("chat:send", async ({ roomId, text }) => {
      if (!roomId || !text) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      const message = {
        userId: socket.data.user.id,
        name: socket.data.user.name,
        text
      };
      room.messages.push(message);
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }
      await room.save();
      io.to(roomId).emit("chat:message", message);
    });

    socket.on("file:share", async ({ roomId, file }) => {
      if (!roomId || !file || !file.dataUrl) return;
      if (file.size > 2 * 1024 * 1024) {
        socket.emit("file:error", { message: "File too large (2MB max)" });
        return;
      }
      const room = await Room.findOne({ roomId });
      if (!room) return;
      const fileDoc = {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: file.dataUrl,
        uploadedBy: socket.data.user.id
      };
      room.files.push(fileDoc);
      await room.save();
      io.to(roomId).emit("file:shared", fileDoc);
    });

    socket.on("mission:start", async ({ roomId, mission }) => {
      if (!roomId || !mission) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) {
        socket.emit("mission:error", { message: "Only host can start missions" });
        return;
      }

      let hintHolders = mission.hintHolders || [];
      let puzzleParts = [];

      if (mission.type === "blind") {
        const analysts = room.roles
          .filter((r) => r.role === "analyst")
          .map((r) => r.userId.toString());
        hintHolders = [...new Set([...hintHolders, ...analysts])];
        if (hintHolders.length === 0) {
          const usersMap = getRoomUsers(roomId);
          const userIds = Array.from(usersMap.keys());
          if (userIds.length > 0) {
            hintHolders.push(userIds[Math.floor(Math.random() * userIds.length)]);
          }
        }
      }

      if (mission.type === "puzzle") {
        const usersMap = getRoomUsers(roomId);
        const userIds = Array.from(usersMap.keys());
        puzzleParts = userIds.map((uid, index) => ({
          userId: uid,
          partIndex: index,
          delivered: false
        }));
      }

      room.mission = {
        status: "active",
        type: mission.type || "free",
        name: mission.name,
        description: mission.description,
        timerSeconds: mission.timerSeconds ?? 300,
        startedAt: new Date(),
        progress: 0,
        stage: 1,
        hintHolders,
        puzzle: { parts: puzzleParts, completed: false },
        score: 0
      };
      // Reset votes on new mission
      roomVotes.delete(roomId);
      await room.save();
      io.to(roomId).emit("mission-start", room.mission);
    });

    socket.on("mission:progress", async ({ roomId, progress, stage, status, score }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) return;
      if (typeof progress === "number") room.mission.progress = progress;
      if (typeof stage === "number") room.mission.stage = stage;
      if (typeof score === "number") room.mission.score = score;
      if (status) room.mission.status = status;
      if (status === "completed" || status === "failed") {
        room.missionHistory.push({
          name: room.mission.name,
          completedAt: new Date(),
          score: room.mission.score,
          status: room.mission.status
        });
      }
      await room.save();
      io.to(roomId).emit("mission-progress", {
        progress: room.mission.progress,
        stage: room.mission.stage,
        status: room.mission.status,
        score: room.mission.score
      });
    });

    socket.on("mission:complete", async ({ roomId, score }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) return;
      room.mission.status = "completed";
      room.mission.score = score ?? room.mission.score;
      room.missionHistory.push({
        name: room.mission.name,
        completedAt: new Date(),
        score: room.mission.score,
        status: "completed"
      });
      await room.save();
      io.to(roomId).emit("mission-complete", room.mission);
    });

    socket.on("roles:assign", async ({ roomId, roles }) => {
      if (!roomId || !Array.isArray(roles)) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) return;
      room.roles = roles;
      await room.save();
      io.to(roomId).emit("role-assigned", roles);
    });

    socket.on("hint:share", ({ roomId, payload }) => {
      if (!roomId || !payload) return;
      io.to(roomId).emit("hint-shared", payload);
    });

    socket.on("reaction:send", ({ roomId, emoji }) => {
      if (!roomId || !emoji) return;
      io.to(roomId).emit("reaction-event", {
        emoji,
        userId: socket.data.user.id,
        name: socket.data.user.name,
        ts: Date.now()
      });
    });

    socket.on("puzzle:submit", async ({ roomId }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room || room.mission.type !== "puzzle" || room.mission.status !== "active") return;
      
      const part = room.mission.puzzle.parts.find(p => p.userId?.toString() === socket.data.user.id);
      if (part && !part.delivered) {
        part.delivered = true;
        room.mission.progress = Math.round((room.mission.puzzle.parts.filter(p => p.delivered).length / room.mission.puzzle.parts.length) * 100);
        
        if (room.mission.progress === 100) {
          room.mission.status = "completed";
          room.mission.puzzle.completed = true;
          room.missionHistory.push({
            name: room.mission.name,
            completedAt: new Date(),
            score: room.mission.score + 100, // Bonus for completion
            status: "completed"
          });
        }
        await room.save();
        io.to(roomId).emit("mission-progress", {
          progress: room.mission.progress,
          status: room.mission.status,
          score: room.mission.score
        });
        if (room.mission.status === "completed") {
          io.to(roomId).emit("mission-complete", room.mission);
        }
      }
    });

    socket.on("vote:submit", ({ roomId, vote }) => {
      if (!roomId) return;
      // Aggregate votes
      if (!roomVotes.has(roomId)) {
        roomVotes.set(roomId, {});
      }
      const tally = roomVotes.get(roomId);
      tally[vote] = (tally[vote] || 0) + 1;

      io.to(roomId).emit("vote-event", {
        vote,
        userId: socket.data.user.id,
        name: socket.data.user.name,
        tally: { ...tally }
      });
    });

    socket.on("score:update", async ({ roomId, delta }) => {
      if (!roomId || typeof delta !== "number") return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      room.mission.score += delta;
      const board = room.scoreboard || [];
      const entry = board.find((e) => e.userId?.toString() === socket.data.user.id);
      if (entry) {
        entry.xp = (entry.xp || 0) + delta;
        entry.contributions = (entry.contributions || 0) + 1;
      } else {
        board.push({
          userId: socket.data.user.id,
          xp: delta,
          contributions: 1
        });
      }
      room.scoreboard = board;
      await room.save();
      io.to(roomId).emit("score-update", {
        score: room.mission.score,
        delta,
        scoreboard: room.scoreboard
      });
    });

    socket.on("cursor:update", ({ roomId, cursor }) => {
      if (!roomId || !cursor) return;
      socket.to(roomId).emit("cursor:update", cursor);
    });

    socket.on("screen:start", async ({ roomId }) => {
      if (!roomId) return;
      if (roomScreenSharer.get(roomId)) {
        socket.emit("screen:error", { message: "Another user is already sharing" });
        return;
      }
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) {
        socket.emit("screen:error", { message: "Only the host can share the screen" });
        return;
      }
      roomScreenSharer.set(roomId, { userId: socket.data.user.id, socketId: socket.id });
      io.to(roomId).emit("screen:started", { sharerId: socket.data.user.id, sharerSocketId: socket.id });
    });

    socket.on("screen:stop", ({ roomId }) => {
      if (!roomId) return;
      const sharer = roomScreenSharer.get(roomId);
      if (sharer && sharer.userId === socket.data.user.id) {
        roomScreenSharer.delete(roomId);
        io.to(roomId).emit("screen:stopped", { sharerId: socket.data.user.id });
      }
    });

    socket.on("webrtc:offer", ({ targetSocketId, sdp }) => {
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("webrtc:offer", {
        fromSocketId: socket.id,
        fromUserId: socket.data.user.id,
        sdp
      });
    });

    socket.on("webrtc:answer", ({ targetSocketId, sdp }) => {
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("webrtc:answer", {
        fromSocketId: socket.id,
        sdp
      });
    });

    socket.on("webrtc:ice", ({ targetSocketId, candidate }) => {
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("webrtc:ice", {
        fromSocketId: socket.id,
        candidate
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const usersMap = getRoomUsers(roomId);
      usersMap.delete(socket.data.user.id);
      const users = Array.from(usersMap.values());
      socket.to(roomId).emit("room:users", users);
      if (users.length === 0) {
        roomUsers.delete(roomId);
        roomScreenSharer.delete(roomId);
        roomVotes.delete(roomId);
      }
    });
  });

  return io;
};
