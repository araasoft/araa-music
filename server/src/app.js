import express from "express";
import cors from "cors";
import { verifyToken } from "./middleware/auth.js";
import {
  createRateLimiter,
  requestLogger,
  notFoundHandler,
  errorHandler,
} from "./data/api-middleware.js";

import catalogRoutes from "./routes/catalog.js";
import coverRoutes from "./routes/covers.js";
import authRoutes from "./routes/auth.js";
import likesRoutes from "./routes/likes.js";
import historyRoutes from "./routes/history.js";
import playlistRoutes from "./routes/playlists.js";
import settingsRoutes from "./routes/settings.js";

export function createApp() {
  const app = express();

  // Trust proxy so req.ip is correct behind a load balancer (needed for rate limiting).
  app.set("trust proxy", 1);

  const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: "1mb" })); // cap body size against abuse
  app.use(requestLogger);
  app.use(createRateLimiter(60_000, 300)); // 300 req/min per IP, protects against abuse/DoS

  app.get("/api/health", (req, res) =>
    res.json({ ok: true, name: "AraaMusic API" }),
  );

  app.use("/api/covers", verifyToken, coverRoutes);
  app.use("/api/catalog", verifyToken, catalogRoutes);
  app.use("/api/auth", verifyToken, authRoutes);
  app.use("/api/me/likes", verifyToken, likesRoutes);
  app.use("/api/me/history", verifyToken, historyRoutes);
  app.use("/api/me/playlists", verifyToken, playlistRoutes);
  app.use("/api/me/settings", verifyToken, settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
