import { Server } from "socket.io";
import { Room } from "../models/Room.js";
import { verifySocketToken } from "../middleware/auth.js";

const roomUsers = new Map();
const roomScreenSharer = new Map();
const roomVotes = new Map(); // roomId -> Map<optionId, count>
const roomSkribbleTimers = new Map(); // roomId -> timer id

const WORD_BANK = [
  "cat", "dog", "sun", "moon", "tree", "house", "car", "fish", "bird", "star",
  "hat", "book", "rain", "fire", "boat", "cake", "ball", "shoe", "lamp", "bell",
  "apple", "chair", "clock", "cloud", "crown", "dance", "earth", "fairy", "ghost",
  "heart", "juice", "knife", "lemon", "music", "ocean", "paint", "queen", "river",
  "sheep", "tiger", "watch", "angel", "beach", "brush", "candy", "dream", "eagle",
  "flame", "grape", "horse", "igloo", "jelly", "koala", "light", "mango", "nurse",
  "olive", "piano", "robot", "snake", "train", "umbrella", "violin", "whale",
  "airplane", "balloon", "battery", "bicycle", "blanket", "bowling", "bridge",
  "butterfly", "cactus", "camera", "candle", "castle", "cherry", "chicken",
  "compass", "cookie", "diamond", "dolphin", "dragon", "feather", "flower",
  "football", "garden", "giraffe", "glasses", "guitar", "hammer", "helmet",
  "icecream", "island", "jacket", "kangaroo", "kitchen", "ladder", "laptop",
  "library", "lizard", "magnet", "mermaid", "monkey", "mushroom", "necklace",
  "octopus", "pancake", "parrot", "penguin", "pirate", "pizza", "popcorn",
  "pumpkin", "pyramid", "rainbow", "reindeer", "rocket", "sailboat", "sandwich",
  "scarecrow", "skeleton", "snowman", "spider", "suitcase", "sunflower",
  "surfboard", "sword", "telescope", "tornado", "treasure", "unicorn",
  "volcano", "waterfall", "windmill", "wizard", "zombie", "astronaut",
  "backpack", "campfire", "dinosaur", "elevator", "fireworks", "hamburger",
  "headphones", "lighthouse", "microphone", "parachute", "skateboard",
  "snowflake", "submarine", "trampoline", "watermelon"
];

const pickRandomWords = (count = 3) => {
  const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const makeWordHint = (word) => word.replace(/[a-zA-Z]/g, "_ ").trim();
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
        missionType: room.missionType || "free",
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
        missionHistory: room.missionHistory,
        skribble: room.skribble ? {
          status: room.skribble.status,
          wordHint: room.skribble.wordHint,
          drawerId: room.skribble.drawerId,
          drawerName: room.skribble.drawerName,
          round: room.skribble.round,
          totalRounds: room.skribble.totalRounds,
          roundTimeSeconds: room.skribble.roundTimeSeconds,
          roundStartedAt: room.skribble.roundStartedAt,
          guessedBy: room.skribble.guessedBy,
          scores: room.skribble.scores,
          lastWord: room.skribble.lastWord
        } : undefined
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

    /* ========== SKRIBBLE GAME EVENTS ========== */

    const startSkribbleRound = async (roomId, io) => {
      const room = await Room.findOne({ roomId });
      if (!room || !room.skribble || room.skribble.status === "game-end") return;

      const nextRound = (room.skribble.round || 0) + 1;
      if (nextRound > room.skribble.totalRounds) {
        // Game over
        room.skribble.status = "game-end";
        room.skribble.lastWord = room.skribble.currentWord || "";
        room.skribble.currentWord = "";
        room.markModified("skribble");
        await room.save();

        const timer = roomSkribbleTimers.get(roomId);
        if (timer) { clearTimeout(timer); roomSkribbleTimers.delete(roomId); }

        io.to(roomId).emit("skribble:game-end", {
          scores: room.skribble.scores,
          lastWord: room.skribble.lastWord
        });
        return;
      }

      // Pick next drawer from playerOrder
      const drawerIdx = (nextRound - 1) % room.skribble.playerOrder.length;
      const drawerId = room.skribble.playerOrder[drawerIdx];
      const usersMap = getRoomUsers(roomId);
      const drawerUser = usersMap.get(drawerId);
      const drawerName = drawerUser?.name || "Unknown";
      const drawerSocketId = drawerUser?.socketId;

      const wordChoices = pickRandomWords(3);

      room.skribble.round = nextRound;
      room.skribble.drawerId = drawerId;
      room.skribble.drawerName = drawerName;
      room.skribble.status = "picking";
      room.skribble.currentWord = "";
      room.skribble.wordHint = "";
      room.skribble.guessedBy = [];
      room.skribble.lastWord = "";
      room.markModified("skribble");
      await room.save();

      // Notify room of new round (without word)
      io.to(roomId).emit("skribble:new-round", {
        round: nextRound,
        totalRounds: room.skribble.totalRounds,
        drawerId,
        drawerName,
        status: "picking"
      });

      // Send word choices to drawer only
      if (drawerSocketId) {
        io.to(drawerSocketId).emit("skribble:pick-word", { wordChoices });
      }

      // Auto-pick after 15 seconds if drawer doesn't pick
      const autoPickTimer = setTimeout(async () => {
        const r = await Room.findOne({ roomId });
        if (r && r.skribble.status === "picking" && r.skribble.round === nextRound) {
          const autoWord = wordChoices[0];
          r.skribble.currentWord = autoWord;
          r.skribble.wordHint = makeWordHint(autoWord);
          r.skribble.status = "drawing";
          r.skribble.roundStartedAt = new Date();
          r.markModified("skribble");
          await r.save();

          io.to(roomId).emit("skribble:drawing-start", {
            wordHint: r.skribble.wordHint,
            drawerId,
            drawerName,
            roundTimeSeconds: r.skribble.roundTimeSeconds
          });

          if (drawerSocketId) {
            io.to(drawerSocketId).emit("skribble:your-word", { word: autoWord });
          }

          // Clear canvas for new round
          io.to(roomId).emit("board:clear");

          // Set round end timer
          const roundEndTimer = setTimeout(() => {
            endSkribbleRound(roomId, io);
          }, r.skribble.roundTimeSeconds * 1000);
          roomSkribbleTimers.set(roomId, roundEndTimer);
        }
      }, 15000);
      roomSkribbleTimers.set(roomId, autoPickTimer);
    };

    const endSkribbleRound = async (roomId, io) => {
      const timer = roomSkribbleTimers.get(roomId);
      if (timer) { clearTimeout(timer); roomSkribbleTimers.delete(roomId); }

      const room = await Room.findOne({ roomId });
      if (!room || !room.skribble || room.skribble.status !== "drawing") return;

      room.skribble.status = "round-end";
      room.skribble.lastWord = room.skribble.currentWord;
      room.markModified("skribble");
      await room.save();

      io.to(roomId).emit("skribble:round-end", {
        word: room.skribble.currentWord,
        scores: room.skribble.scores,
        guessedBy: room.skribble.guessedBy,
        round: room.skribble.round,
        totalRounds: room.skribble.totalRounds
      });

      // Auto-start next round after 5 seconds
      const nextTimer = setTimeout(() => {
        startSkribbleRound(roomId, io);
      }, 5000);
      roomSkribbleTimers.set(roomId, nextTimer);
    };

    socket.on("skribble:start", async ({ roomId, roundTimeSeconds, roundCount }) => {
      if (!roomId) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (room.host?.toString() !== socket.data.user.id) {
        socket.emit("skribble:error", { message: "Only host can start Skribble" });
        return;
      }

      const usersMap = getRoomUsers(roomId);
      const userIds = Array.from(usersMap.keys());
      if (userIds.length < 2) {
        socket.emit("skribble:error", { message: "Need at least 2 players to start Skribble!" });
        return;
      }

      // Shuffle player order
      const shuffled = [...userIds].sort(() => Math.random() - 0.5);
      // Use selected round count (default 5), drawers cycle through players
      const totalRounds = roundCount || 5;

      room.skribble = {
        status: "idle",
        currentWord: "",
        wordHint: "",
        drawerId: "",
        drawerName: "",
        round: 0,
        totalRounds,
        roundTimeSeconds: roundTimeSeconds || 60,
        roundStartedAt: null,
        guessedBy: [],
        playerOrder: shuffled,
        scores: shuffled.map((uid) => ({ userId: uid, name: usersMap.get(uid)?.name || "?", points: 0 })),
        lastWord: ""
      };

      // Also set mission active
      room.mission.status = "active";
      room.mission.type = "skribble";
      room.mission.name = "Skribble";
      room.mission.description = "Draw & guess words — highest score wins!";
      room.mission.startedAt = new Date();

      // Clear any existing strokes
      room.strokes = [];
      room.redoStack = [];

      room.markModified("skribble");
      await room.save();

      io.to(roomId).emit("skribble:started", {
        totalRounds,
        roundTimeSeconds: room.skribble.roundTimeSeconds,
        scores: room.skribble.scores,
        playerOrder: shuffled
      });

      io.to(roomId).emit("board:clear");

      // Start first round after a short delay
      setTimeout(() => startSkribbleRound(roomId, io), 2000);
    });

    socket.on("skribble:pick-word", async ({ roomId, word }) => {
      if (!roomId || !word) return;
      const room = await Room.findOne({ roomId });
      if (!room || room.skribble.status !== "picking") return;
      if (room.skribble.drawerId !== socket.data.user.id) return;

      // Clear the auto-pick timer
      const timer = roomSkribbleTimers.get(roomId);
      if (timer) { clearTimeout(timer); roomSkribbleTimers.delete(roomId); }

      room.skribble.currentWord = word;
      room.skribble.wordHint = makeWordHint(word);
      room.skribble.status = "drawing";
      room.skribble.roundStartedAt = new Date();
      room.markModified("skribble");
      await room.save();

      // Notify everyone that drawing has started
      io.to(roomId).emit("skribble:drawing-start", {
        wordHint: room.skribble.wordHint,
        drawerId: room.skribble.drawerId,
        drawerName: room.skribble.drawerName,
        roundTimeSeconds: room.skribble.roundTimeSeconds
      });

      // Send the chosen word back to the drawer
      socket.emit("skribble:your-word", { word });

      // Clear canvas for new round
      io.to(roomId).emit("board:clear");

      // Set round end timer
      const roundEndTimer = setTimeout(() => {
        endSkribbleRound(roomId, io);
      }, room.skribble.roundTimeSeconds * 1000);
      roomSkribbleTimers.set(roomId, roundEndTimer);
    });

    socket.on("skribble:guess", async ({ roomId, guess }) => {
      if (!roomId || !guess) return;
      const room = await Room.findOne({ roomId });
      if (!room || room.skribble.status !== "drawing") return;
      if (room.skribble.drawerId === socket.data.user.id) return; // drawer can't guess
      if (room.skribble.guessedBy.includes(socket.data.user.id)) return; // already guessed

      const isCorrect = guess.trim().toLowerCase() === room.skribble.currentWord.toLowerCase();

      if (isCorrect) {
        room.skribble.guessedBy.push(socket.data.user.id);

        // Improved scoring system
        const usersMap = getRoomUsers(roomId);
        const totalGuessers = usersMap.size - 1; // exclude drawer
        const guessOrder = room.skribble.guessedBy.length;
        const roundTime = room.skribble.roundTimeSeconds || 60;
        const elapsed = (Date.now() - new Date(room.skribble.roundStartedAt).getTime()) / 1000;
        const timeRatio = Math.max(1 - elapsed / roundTime, 0); // 1.0 = instant, 0.0 = last second

        // Base points: 150 for first guesser, decreasing by 20 per position (min 30)
        const basePoints = Math.max(150 - (guessOrder - 1) * 20, 30);
        // Time bonus: up to +100 extra for very fast guesses
        const timeBonus = Math.round(timeRatio * 100);
        const guesserPoints = basePoints + timeBonus;

        // Drawer gets scaled reward: more if many guessed, bonus for early guesses
        const drawerPoints = 15 + Math.round(timeRatio * 10);

        // Update scores
        const guesserScore = room.skribble.scores.find((s) => s.userId === socket.data.user.id);
        if (guesserScore) guesserScore.points += guesserPoints;
        const drawerScore = room.skribble.scores.find((s) => s.userId === room.skribble.drawerId);
        if (drawerScore) drawerScore.points += drawerPoints;

        room.markModified("skribble");
        await room.save();

        // Notify the guesser they were correct
        socket.emit("skribble:correct", { points: guesserPoints });

        // Notify room about the correct guess (without revealing the word)
        io.to(roomId).emit("skribble:player-guessed", {
          userId: socket.data.user.id,
          name: socket.data.user.name,
          guessedBy: room.skribble.guessedBy,
          scores: room.skribble.scores
        });

        // Check if everyone has guessed
        if (room.skribble.guessedBy.length >= totalGuessers) {
          endSkribbleRound(roomId, io);
        }
      } else {
        // Broadcast the wrong guess as a chat message (visible to all)
        io.to(roomId).emit("chat:message", {
          userId: socket.data.user.id,
          name: socket.data.user.name,
          text: guess
        });
      }
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
        const timer = roomSkribbleTimers.get(roomId);
        if (timer) { clearTimeout(timer); roomSkribbleTimers.delete(roomId); }
      }
    });
  });

  return io;
};
