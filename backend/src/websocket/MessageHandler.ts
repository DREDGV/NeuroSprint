import { dataStore } from "../store/dataStore";
import type { WSClient, NeuroSprintWebSocketServer } from "./WebSocketServer";

interface WebSocketMessage {
  type: string;
  competitionId?: string;
  score?: number;
  accuracy?: number;
  reactionTimeMs?: number;
  finalScore?: number;
  [key: string]: unknown;
}

function sendError(client: WSClient, code: string, message: string): void {
  client.ws.send(
    JSON.stringify({
      type: "error",
      code,
      message
    })
  );
}

function buildLeaderboardPayload(
  competitionId: string,
  leaderboard: Awaited<ReturnType<typeof dataStore.getLeaderboard>>,
  userId: string
) {
  return {
    type: "leaderboard:update",
    competitionId,
    leaderboard,
    userRank: leaderboard.findIndex((entry) => entry.participantId === userId) + 1,
    timestamp: Date.now()
  };
}

export async function handleWebSocketMessage(
  message: WebSocketMessage,
  client: WSClient,
  wss: NeuroSprintWebSocketServer
): Promise<void> {
  const { userId } = client;

  switch (message.type) {
    case "ping": {
      client.ws.send(
        JSON.stringify({
          type: "pong",
          serverTime: Date.now()
        })
      );
      return;
    }

    case "competition:join": {
      if (!message.competitionId) {
        sendError(client, "VALIDATION_ERROR", "competitionId is required");
        return;
      }

      const competition = await dataStore.joinCompetition(message.competitionId, client);
      wss.joinCompetition(userId, message.competitionId);

      client.ws.send(
        JSON.stringify({
          type: "competition:joined",
          competitionId: competition.id,
          timestamp: Date.now()
        })
      );

      const leaderboard = await dataStore.getLeaderboard(competition.id);
      client.ws.send(JSON.stringify(buildLeaderboardPayload(competition.id, leaderboard, userId)));
      return;
    }

    case "competition:leave": {
      if (!message.competitionId) {
        sendError(client, "VALIDATION_ERROR", "competitionId is required");
        return;
      }
      wss.leaveCompetition(userId, message.competitionId);
      return;
    }

    case "competition:score_update": {
      if (!message.competitionId || typeof message.score !== "number") {
        sendError(client, "VALIDATION_ERROR", "competitionId and score are required");
        return;
      }

      const competition = await dataStore.updateLiveScore(
        message.competitionId,
        client,
        message.score,
        typeof message.accuracy === "number" ? message.accuracy : undefined,
        typeof message.reactionTimeMs === "number" ? message.reactionTimeMs : undefined
      );

      if (!competition) {
        sendError(client, "NOT_FOUND", "Competition not found");
        return;
      }

      const leaderboard = await dataStore.getLeaderboard(message.competitionId);
      wss.broadcastToCompetition(
        message.competitionId,
        buildLeaderboardPayload(message.competitionId, leaderboard, userId)
      );
      return;
    }

    case "competition:finish": {
      if (!message.competitionId) {
        sendError(client, "VALIDATION_ERROR", "competitionId is required");
        return;
      }

      const finalScore =
        typeof message.finalScore === "number"
          ? message.finalScore
          : typeof message.score === "number"
            ? message.score
            : undefined;

      if (finalScore === undefined) {
        sendError(client, "VALIDATION_ERROR", "finalScore is required");
        return;
      }

      const competition = await dataStore.submitCompetitionResult(
        message.competitionId,
        client,
        finalScore,
        typeof message.accuracy === "number" ? message.accuracy : undefined,
        typeof message.reactionTimeMs === "number" ? message.reactionTimeMs : undefined
      );

      if (!competition) {
        sendError(client, "NOT_FOUND", "Competition not found");
        return;
      }

      const leaderboard = await dataStore.getLeaderboard(message.competitionId);
      wss.broadcastToCompetition(
        message.competitionId,
        buildLeaderboardPayload(message.competitionId, leaderboard, userId)
      );
      wss.broadcastToCompetition(message.competitionId, {
        type: "competition:event",
        competitionId: message.competitionId,
        event: "participant_finished",
        data: {
          userId,
          finalScore
        },
        timestamp: Date.now()
      });
      return;
    }

    case "leaderboard:request": {
      if (!message.competitionId) {
        sendError(client, "VALIDATION_ERROR", "competitionId is required");
        return;
      }

      const leaderboard = await dataStore.getLeaderboard(message.competitionId);
      client.ws.send(JSON.stringify(buildLeaderboardPayload(message.competitionId, leaderboard, userId)));
      return;
    }

    default: {
      sendError(client, "UNKNOWN_MESSAGE_TYPE", `Message type "${message.type}" is not supported`);
    }
  }
}
