import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import http from "http";
import connectDB from "./config/db";
import { setupSocket } from "./socket/chat";
import { startAutoCompleteJob } from "./jobs/autoComplete";
import User from "./models/User";
import HelpRequest from "./models/HelpRequest";

import authRoutes from "./routes/auth";
import requestRoutes from "./routes/requests";
import userRoutes from "./routes/users";
import notificationRoutes from "./routes/notifications";
import chatRoutes from "./routes/chat";

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.ngrok-free\.app$/.test(origin) ||
        /\.ngrok\.io$/.test(origin) ||
        /\.trycloudflare\.com$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Platform stats
app.get("/api/stats", async (_req, res) => {
  try {
    const [userCount, requestCount, completedCount] = await Promise.all([
      User.countDocuments(),
      HelpRequest.countDocuments(),
      HelpRequest.countDocuments({ status: { $in: ["in_progress", "completed"] } }),
    ]);
    res.json({ userCount, requestCount, completedCount });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Socket.io
setupSocket(server);

// Start
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  startAutoCompleteJob();
  server.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════╗
  ║   HelpNearby Server is running! 🚀    ║
  ║   Port: ${PORT}                          ║
  ║   API:  http://localhost:${PORT}/api     ║
  ╚═══════════════════════════════════════╝
    `);
  });
};

start().catch(console.error);
