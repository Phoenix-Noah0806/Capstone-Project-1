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

const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

/* ===========================
   CORS CONFIG (PRODUCTION SAFE)
=========================== */

app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin || // mobile apps / postman
        origin === allowedOrigin || // explicit production origin
        origin.includes("vercel.app") || // allow all Vercel deployments
        /^http:\/\/localhost(:\d+)?$/.test(origin) // local dev
      ) {
        cb(null, true);
      } else {
        cb(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const start = async () => {
  await connectDb();

  // Initialize socket with same allowed origin
  initSocket(server, allowedOrigin);

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

start();