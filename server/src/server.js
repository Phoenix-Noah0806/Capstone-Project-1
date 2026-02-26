import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import { initSocket } from "./sockets/index.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Accept the configured origin and any localhost port (Vite may pick a different port)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === clientOrigin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const start = async () => {
  await connectDb();
  initSocket(server, clientOrigin);
  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

start();
