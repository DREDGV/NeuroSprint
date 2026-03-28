import { getOnlineWebSocketUrl } from "../online/runtimeConfig";

export type CompetitionSocketMessage =
  | { type: "connected"; userId: string; name?: string; serverTime: number }
  | { type: "competition:joined"; competitionId: string; timestamp: number }
  | { type: "leaderboard:update"; competitionId: string; leaderboard: any[]; userRank: number; timestamp: number }
  | { type: "competition:event"; competitionId: string; event: string; data?: unknown; timestamp: number }
  | { type: "error"; code: string; message: string }
  | { type: "ping" }
  | { type: "pong"; serverTime?: number };

export type CompetitionSocketOutgoingMessage =
  | { type: "competition:join"; competitionId: string }
  | { type: "competition:leave"; competitionId: string }
  | { type: "competition:score_update"; competitionId: string; score: number; accuracy?: number; reactionTimeMs?: number }
  | { type: "competition:finish"; competitionId: string; finalScore: number; accuracy?: number; reactionTimeMs?: number }
  | { type: "leaderboard:request"; competitionId: string }
  | { type: "ping" }
  | { type: "pong" };

export type WebSocketMessage = CompetitionSocketMessage;
export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export interface WebSocketClient {
  connect: () => void;
  disconnect: () => void;
  send: (message: CompetitionSocketOutgoingMessage) => void;
  subscribe: (handler: WebSocketEventHandler) => () => void;
  isConnected: () => boolean;
}

interface WebSocketClientOptions {
  url?: string;
  userName?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

function buildWebSocketUrl(baseUrl: string, userId: string, userName?: string): string {
  const normalizedBase = baseUrl.trim();

  try {
    const url = new URL(normalizedBase, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.searchParams.set("userId", userId);
    if (userName) {
      url.searchParams.set("name", userName);
    }
    return url.toString();
  } catch {
    const separator = normalizedBase.includes("?") ? "&" : "?";
    const namePart = userName ? `&name=${encodeURIComponent(userName)}` : "";
    return `${normalizedBase}${separator}userId=${encodeURIComponent(userId)}${namePart}`;
  }
}

export function createWebSocketClient(
  userId: string,
  options: WebSocketClientOptions = {}
): WebSocketClient {
  const {
    url = getOnlineWebSocketUrl(),
    userName,
    reconnectInterval = 3000,
    maxReconnectAttempts = 8
  } = options;

  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let connected = false;
  const eventHandlers = new Set<WebSocketEventHandler>();

  const connect = () => {
    if (typeof WebSocket === "undefined") {
      return;
    }
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsUrl = buildWebSocketUrl(url, userId, userName);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connected = true;
      reconnectAttempts = 0;
      send({ type: "ping" });
    };

    ws.onclose = () => {
      connected = false;
      if (reconnectAttempts >= maxReconnectAttempts) {
        return;
      }
      reconnectAttempts += 1;
      reconnectTimeout = setTimeout(connect, reconnectInterval);
    };

    ws.onerror = (error) => {
      console.error("[competition websocket] error:", error);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        if (message.type === "ping") {
          send({ type: "pong" });
          return;
        }
        eventHandlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error("[competition websocket] failed to parse message:", error);
      }
    };
  };

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    connected = false;
    eventHandlers.clear();
    ws?.close();
    ws = null;
  };

  const send = (message: CompetitionSocketOutgoingMessage) => {
    if (ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify(message));
  };

  const subscribe = (handler: WebSocketEventHandler): (() => void) => {
    eventHandlers.add(handler);
    return () => {
      eventHandlers.delete(handler);
    };
  };

  return {
    connect,
    disconnect,
    send,
    subscribe,
    isConnected: () => connected
  };
}

export function createCompetitionWebSocket(userId: string, userName?: string) {
  const client = createWebSocketClient(userId, { userName });

  return {
    ...client,
    subscribeToCompetition: (competitionId: string, callback: (data: unknown) => void) => {
      return client.subscribe((message) => {
        if (
          (message.type === "competition:joined" || message.type === "leaderboard:update" || message.type === "competition:event") &&
          "competitionId" in message &&
          message.competitionId === competitionId
        ) {
          callback(message);
        }
      });
    },
    requestLeaderboard: (competitionId: string) => {
      client.send({ type: "leaderboard:request", competitionId });
    },
    sendScoreUpdate: (competitionId: string, score: number, accuracy?: number, reactionTimeMs?: number) => {
      client.send({
        type: "competition:score_update",
        competitionId,
        score,
        accuracy,
        reactionTimeMs
      });
    },
    finishCompetition: (competitionId: string, finalScore: number, accuracy?: number, reactionTimeMs?: number) => {
      client.send({
        type: "competition:finish",
        competitionId,
        finalScore,
        accuracy,
        reactionTimeMs
      });
    }
  };
}

export function createOfflineWebSocketClient(): WebSocketClient {
  return {
    connect: () => undefined,
    disconnect: () => undefined,
    send: () => undefined,
    subscribe: () => () => undefined,
    isConnected: () => false
  };
}
