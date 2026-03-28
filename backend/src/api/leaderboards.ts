import { Router } from "express";
import { dataStore } from "../store/dataStore";

export const leaderboardsRouter = Router();

leaderboardsRouter.get("/:competitionId", async (req, res) => {
  const competition = await dataStore.getCompetition(req.params.competitionId);
  if (!competition) {
    res.status(404).json({ error: "Competition not found" });
    return;
  }

  res.json({
    competitionId: competition.id,
    leaderboard: competition.leaderboard,
    status: competition.status,
    updatedAt: competition.updatedAt
  });
});
