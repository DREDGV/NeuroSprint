import { WebSocketServer, WebSocket } from "ws";
import { resolveSocketAuth } from "../middleware/auth";
import { publishToRedis } from "../db/redis";
import { handleWebSocketMessage } from "./MessageHandler";
import type { AuthUser } from "../types";

export interface WSClient extends AuthUser {
  ws: WebSocket;
  competitions: Set<string>;
  isAlive: boolean;
  lastPingTime: number;
}

export class NeuroSprintWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<string, WSClient>();
  private readonly competitionRooms = new Map<string, Set<string>>();
  private readonly heartbeatInterval: NodeJS.Timeout;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setup();
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, userId) => {
        if (!client.isAlive) {
          this.removeClient(userId);
          return;
        }

        if (Date.now() - client.lastPingTime > 30000) {
          client.isAlive = false;
          client.ws.ping();
        }
      });
    }, 30000);
  }

  private setup(): void {
    this.wss.on("connection", (ws, req) => {
      try {
        const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
        const auth = resolveSocketAuth(url);
        const existing = this.clients.get(auth.userId);
        if (existing) {
          existing.ws.close(4000, "Superseded by a newer connection");
          this.removeClient(auth.userId);
        }

        const client: WSClient = {
          ...auth,
          ws,
          competitions: new Set(),
          isAlive: true,
          lastPingTime: Date.now()
        };

        this.clients.set(auth.userId, client);

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString()) as {
              type: string;
              [key: string]: unknown;
            };
            if (typeof message.type !== "string") {
              throw new Error("Message type is required");
            }
            void handleWebSocketMessage(message, client, this);
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "error",
                code: "INVALID_MESSAGE",
                message: error instanceof Error ? error.message : "Failed to parse message"
              })
            );
          }
        });

        ws.on("close", () => {
          this.removeClient(auth.userId);
        });

        ws.on("error", (error) => {
          console.error(`[ws] error for ${auth.userId}:`, error);
        });

        ws.on("pong", () => {
          client.isAlive = true;
          client.lastPingTime = Date.now();
        });

        ws.send(
          JSON.stringify({
            type: "connected",
            userId: auth.userId,
            name: auth.name,
            serverTime: Date.now()
          })
        );
      } catch (error) {
        console.error("[ws] authentication error:", error);
        ws.close(4001, "Unauthorized");
      }
    });
  }

  joinCompetition(userId: string, competitionId: string): void {
    const client = this.clients.get(userId);
    if (!client) {
      return;
    }

    if (!this.competitionRooms.has(competitionId)) {
      this.competitionRooms.set(competitionId, new Set());
    }

    this.competitionRooms.get(competitionId)?.add(userId);
    client.competitions.add(competitionId);

    void publishToRedis(
      `competition:${competitionId}`,
      JSON.stringify({
        type: "participant_joined",
        competitionId,
        userId,
        timestamp: Date.now()
      })
    );
  }

  leaveCompetition(userId: string, competitionId: string): void {
    const room = this.competitionRooms.get(competitionId);
    room?.delete(userId);
    if (room && room.size === 0) {
      this.competitionRooms.delete(competitionId);
    }

    const client = this.clients.get(userId);
    client?.competitions.delete(competitionId);
  }

  broadcastToCompetition(competitionId: string, message: object, excludeUserId?: string): void {
    const room = this.competitionRooms.get(competitionId);
    if (!room) {
      return;
    }

    const payload = JSON.stringify(message);
    room.forEach((userId) => {
      if (userId === excludeUserId) {
        return;
      }

      const client = this.clients.get(userId);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }

  sendToUser(userId: string, message: object): boolean {
    const client = this.clients.get(userId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    client.ws.send(JSON.stringify(message));
    return true;
  }

  getCompetitionParticipants(competitionId: string): string[] {
    return Array.from(this.competitionRooms.get(competitionId) ?? []);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getRoomCount(): number {
    return this.competitionRooms.size;
  }

  removeClient(userId: string): void {
    const client = this.clients.get(userId);
    if (!client) {
      return;
    }

    client.competitions.forEach((competitionId) => {
      this.leaveCompetition(userId, competitionId);
    });

    this.clients.delete(userId);
  }

  close(): void {
    clearInterval(this.heartbeatInterval);
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();
    this.competitionRooms.clear();
    this.wss.close();
  }
}
