import { Router } from "express";
import { dataStore } from "../store/dataStore";
import type { AuthenticatedRequest } from "../middleware/auth";
import type { CreateChallengeInput } from "../types";

function readAuth(req: AuthenticatedRequest) {
  if (!req.auth) {
    throw new Error("Authentication context is missing");
  }
  return req.auth;
}

export const challengesRouter = Router();

challengesRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const auth = readAuth(req);
    const scope = typeof req.query.scope === "string" ? req.query.scope : "all";

    const challenges =
      scope === "incoming"
        ? await dataStore.listIncomingChallenges(auth.userId)
        : scope === "outgoing"
          ? await dataStore.listOutgoingChallenges(auth.userId)
          : scope === "active"
            ? await dataStore.listActiveChallenges(auth.userId)
            : await dataStore.listChallengesByUser(auth.userId);

    res.json({ challenges });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list challenges" });
  }
});

challengesRouter.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const auth = readAuth(req);
    const body = req.body as Partial<CreateChallengeInput>;

    if (!body.challengedId || !body.modeId) {
      res.status(400).json({ error: "challengedId and modeId are required" });
      return;
    }

    const challenge = await dataStore.createChallenge(
      {
        challengedId: body.challengedId,
        challengedName: body.challengedName,
        challengedClassId: body.challengedClassId,
        modeId: body.modeId,
        durationMinutes: Number(body.durationMinutes ?? 5),
        expiresAt: body.expiresAt
      },
      auth
    );

    res.status(201).json({ challenge });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create challenge" });
  }
});

challengesRouter.post("/:id/respond", async (req, res) => {
  const accepted = Boolean(req.body?.accept);
  const challenge = await dataStore.respondToChallenge(req.params.id, accepted ? "accepted" : "declined");
  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  res.json({ challenge });
});

challengesRouter.post("/:id/complete", async (req, res) => {
  const challengerScore = Number(req.body?.challengerScore);
  const challengedScore = Number(req.body?.challengedScore);

  if (!Number.isFinite(challengerScore) || !Number.isFinite(challengedScore)) {
    res.status(400).json({ error: "challengerScore and challengedScore must be numbers" });
    return;
  }

  const challenge = await dataStore.completeChallenge(req.params.id, challengerScore, challengedScore);
  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  res.json({ challenge });
});

challengesRouter.delete("/:id", async (req, res) => {
  const deleted = await dataStore.cancelChallenge(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  res.status(204).send();
});
