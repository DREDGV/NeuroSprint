import { Router } from "express";
import { dataStore } from "../store/dataStore";
import type { AuthenticatedRequest } from "../middleware/auth";
import type { CompetitionMode, CompetitionType, CreateCompetitionInput } from "../types";

function isCompetitionType(value: unknown): value is CompetitionType {
  return value === "pvp" || value === "team" || value === "tournament" || value === "challenge";
}

function isCompetitionMode(value: unknown): value is CompetitionMode {
  return value === "async" || value === "sync" || value === "hybrid";
}

function readAuth(req: AuthenticatedRequest) {
  if (!req.auth) {
    throw new Error("Authentication context is missing");
  }
  return req.auth;
}

export const competitionsRouter = Router();

competitionsRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const auth = readAuth(req);
    const scope = typeof req.query.scope === "string" ? req.query.scope : "all";

    const competitions =
      scope === "active"
        ? await dataStore.listActiveCompetitions(auth.userId)
        : scope === "upcoming"
          ? await dataStore.listUpcomingCompetitions(auth.userId)
          : await dataStore.listCompetitionsByUser(auth.userId);

    res.json({ competitions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list competitions" });
  }
});

competitionsRouter.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const auth = readAuth(req);
    const body = req.body as Partial<CreateCompetitionInput>;

    if (!body.name?.trim()) {
      res.status(400).json({ error: "Competition name is required" });
      return;
    }
    if (!isCompetitionType(body.type)) {
      res.status(400).json({ error: "Invalid competition type" });
      return;
    }
    if (!isCompetitionMode(body.mode)) {
      res.status(400).json({ error: "Invalid competition mode" });
      return;
    }
    if (!body.modeId || !body.startTime || !body.endTime) {
      res.status(400).json({ error: "modeId, startTime and endTime are required" });
      return;
    }

    const competition = await dataStore.createCompetition(
      {
        name: body.name,
        type: body.type,
        mode: body.mode,
        modeId: body.modeId,
        durationMinutes: Number(body.durationMinutes ?? 5),
        startTime: body.startTime,
        endTime: body.endTime
      },
      auth
    );

    res.status(201).json({ competition });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create competition" });
  }
});

competitionsRouter.get("/:id", async (req, res) => {
  const competition = await dataStore.getCompetition(req.params.id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  res.json({ competition });
});

competitionsRouter.post("/:id/join", async (req: AuthenticatedRequest, res) => {
  try {
    const competition = await dataStore.joinCompetition(req.params.id, readAuth(req), req.body?.classId);
    res.json({ competition });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Failed to join competition" });
  }
});

competitionsRouter.post("/:id/status", async (req: AuthenticatedRequest, res) => {
  const status = req.body?.status;
  if (
    status !== "joined" &&
    status !== "ready" &&
    status !== "playing" &&
    status !== "finished" &&
    status !== "abandoned"
  ) {
    res.status(400).json({ error: "Invalid participant status" });
    return;
  }

  const competition = await dataStore.updateParticipantStatus(req.params.id, readAuth(req).userId, status);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  res.json({ competition });
});

competitionsRouter.post("/:id/live-score", async (req: AuthenticatedRequest, res) => {
  const liveScore = Number(req.body?.liveScore);
  if (!Number.isFinite(liveScore)) {
    res.status(400).json({ error: "liveScore must be a number" });
    return;
  }

  const competition = await dataStore.updateLiveScore(
    req.params.id,
    readAuth(req),
    liveScore,
    req.body?.accuracy,
    req.body?.reactionTimeMs
  );

  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  res.json({ competition });
});

competitionsRouter.post("/:id/score", async (req: AuthenticatedRequest, res) => {
  const score = Number(req.body?.score);
  if (!Number.isFinite(score)) {
    res.status(400).json({ error: "score must be a number" });
    return;
  }

  const competition = await dataStore.submitCompetitionResult(
    req.params.id,
    readAuth(req),
    score,
    req.body?.accuracy,
    req.body?.reactionTimeMs
  );

  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  res.json({ competition });
});

competitionsRouter.post("/:id/finish", async (req, res) => {
  const competition = await dataStore.finishCompetition(req.params.id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  res.json({ competition });
});

competitionsRouter.post("/:id/cancel", async (req, res) => {
  const competition = await dataStore.cancelCompetition(req.params.id);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }
  res.json({ competition });
});

competitionsRouter.get("/:id/leaderboard", async (req, res) => {
  const leaderboard = await dataStore.getLeaderboard(req.params.id);
  res.json({ leaderboard });
});
