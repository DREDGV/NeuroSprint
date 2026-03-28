import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import { competitionsRouter } from "./api/competitions";
import { challengesRouter } from "./api/challenges";
import { leaderboardsRouter } from "./api/leaderboards";
import { closeRedis } from "./db/redis";
import { authMiddleware } from "./middleware/auth";
import { NeuroSprintWebSocketServer } from "./websocket/WebSocketServer";

dotenv.config();

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCorsOrigins(): string[] | boolean {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw || raw === "*") {
    return true;
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const PORT = parsePort(process.env.PORT, 3211);
const WS_PORT = parsePort(process.env.WS_PORT, 3212);

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", true);
app.use(
  cors({
    origin: parseCorsOrigins()
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "neurosprint-backend",
    transport: "http",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "neurosprint-backend",
    transport: "api",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/competitions", authMiddleware, competitionsRouter);
app.use("/api/challenges", authMiddleware, challengesRouter);
app.use("/api/leaderboards", authMiddleware, leaderboardsRouter);

httpServer.listen(PORT, () => {
  console.log(`[http] NeuroSprint API listening on :${PORT}`);
});

const wss = new NeuroSprintWebSocketServer(WS_PORT);
console.log(`[ws] NeuroSprint WebSocket listening on :${WS_PORT}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`[shutdown] ${signal} received`);
  wss.close();
  await closeRedis();
  httpServer.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

export { app, httpServer, wss };
