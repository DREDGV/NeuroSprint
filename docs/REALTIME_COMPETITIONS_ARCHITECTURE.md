# 🏆 Архитектура Real-Time Соревнований

## Обзор

Документ описывает техническую реализацию системы real-time соревнований между учениками.

---

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Backend Server](#backend-server)
3. [WebSocket Протокол](#websocket-протокол)
4. [Механика Соревнований](#механика-соревнований)
5. [Anti-Cheat](#anti-cheat)
6. [Масштабирование](#масштабирование)
7. [План Реализации](#план-реализации)

---

## Архитектура

### Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (NeuroSprint PWA)                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ React Components                                         │  │
│  │ - LiveCompetition                                        │  │
│  │ - LiveLeaderboard                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ WebSocket Client                                         │  │
│  │ - Auto reconnect                                         │  │
│  │ - Message queue                                          │  │
│  │ - Offline buffer                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IndexedDB (кэш)                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │
         │ WebSocket (wss://api.neurosprint.ru/ws)
         │ + JWT Auth
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Server (Node.js + Express + ws)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ WebSocket Server                                         │  │
│  │ - Rooms (competition rooms)                              │  │
│  │ - Message broadcast                                      │  │
│  │ - Heartbeat/ping-pong                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ REST API                                                 │  │
│  │ - /api/competitions                                      │  │
│  │ - /api/challenges                                        │  │
│  │ - /api/leaderboards                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Redis                                                    │  │
│  │ - Pub/Sub для real-time событий                          │  │
│  │ - Кэш лидербордов (sorted sets)                          │  │
│  │ - Session storage                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL                                               │  │
│  │ - users, competitions, results                           │  │
│  │ - История соревнований                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Server

### Структура проекта

```
backend/
├── src/
│   ├── index.ts                 # Точка входа
│   ├── websocket/
│   │   ├── WebSocketServer.ts   # WebSocket сервер
│   │   ├── RoomManager.ts       # Управление комнатами
│   │   ├── MessageHandler.ts    # Обработка сообщений
│   │   └── protocol.ts          # Типы сообщений
│   ├── api/
│   │   ├── competitions.ts      # REST API соревнований
│   │   ├── challenges.ts        # REST API вызовов
│   │   └── leaderboards.ts      # REST API лидербордов
│   ├── services/
│   │   ├── CompetitionService.ts
│   │   ├── LeaderboardService.ts
│   │   └── AntiCheatService.ts
│   ├── db/
│   │   ├── postgres.ts          # PostgreSQL подключение
│   │   └── redis.ts             # Redis подключение
│   └── middleware/
│       ├── auth.ts              # JWT валидация
│       └── rateLimit.ts         # Rate limiting
├── package.json
└── tsconfig.json
```

### WebSocket Server (базовая реализация)

```typescript
// src/websocket/WebSocketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import { handleWebSocketMessage } from './MessageHandler';
import { verifyJWT } from '../middleware/auth';

interface WSClient {
  ws: WebSocket;
  userId: string;
  competitions: Set<string>;
  isAlive: boolean;
}

export class NeuroSprintWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private competitionRooms: Map<string, Set<string>> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setup();
  }

  private setup() {
    this.wss.on('connection', async (ws, req) => {
      // JWT авторизация через query параметр
      const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
      
      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      try {
        const payload = verifyJWT(token);
        const userId = payload.userId;

        const client: WSClient = {
          ws,
          userId,
          competitions: new Set(),
          isAlive: true
        };

        this.clients.set(userId, client);

        ws.on('message', (data) => {
          handleWebSocketMessage(data, client, this);
        });

        ws.on('close', () => {
          this.removeClient(userId);
        });

        // Heartbeat
        ws.on('pong', () => {
          client.isAlive = true;
        });

        // Отправляем подтверждение подключения
        ws.send(JSON.stringify({
          type: 'connected',
          userId
        }));

      } catch (err) {
        ws.close(4001, 'Invalid token');
      }
    });

    // Heartbeat interval
    setInterval(() => {
      this.clients.forEach((client, userId) => {
        if (!client.isAlive) {
          this.removeClient(userId);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);
  }

  // Присоединить к комнате соревнования
  joinCompetition(userId: string, competitionId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    if (!this.competitionRooms.has(competitionId)) {
      this.competitionRooms.set(competitionId, new Set());
    }
    this.competitionRooms.get(competitionId)!.add(userId);
    client.competitions.add(competitionId);
  }

  // Выйти из комнаты
  leaveCompetition(userId: string, competitionId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    const room = this.competitionRooms.get(competitionId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.competitionRooms.delete(competitionId);
      }
    }
    client.competitions.delete(competitionId);
  }

  // Отправить сообщение всем в комнате
  broadcastToCompetition(competitionId: string, message: object, excludeUserId?: string) {
    const room = this.competitionRooms.get(competitionId);
    if (!room) return;

    const data = JSON.stringify(message);
    room.forEach(userId => {
      if (userId === excludeUserId) return;
      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private removeClient(userId: string) {
    const client = this.clients.get(userId);
    if (!client) return;

    // Выход из всех комнат
    client.competitions.forEach(compId => {
      this.leaveCompetition(userId, compId);
    });

    client.ws.terminate();
    this.clients.delete(userId);
  }
}
```

---

## WebSocket Протокол

### Типы сообщений

#### Client → Server

```typescript
// Присоединение к соревнованию
{
  type: "competition:join",
  competitionId: string,
  timestamp: number
}

// Обновление счёта в реальном времени
{
  type: "competition:score_update",
  competitionId: string,
  score: number,
  accuracy: number,
  reactionTimeMs: number,
  timestamp: number
}

// Завершение соревнования
{
  type: "competition:finish",
  competitionId: string,
  finalScore: number,
  accuracy: number,
  timestamp: number
}

// Heartbeat (keep-alive)
{
  type: "ping",
  timestamp: number
}

// Запрос лидерборда
{
  type: "leaderboard:request",
  competitionId: string
}
```

#### Server → Client

```typescript
// Подтверждение подключения
{
  type: "connected",
  userId: string,
  serverTime: number
}

// Обновление лидерборда
{
  type: "leaderboard:update",
  competitionId: string,
  leaderboard: Array<{
    rank: number,
    userId: string,
    name: string,
    score: number,
    accuracy: number,
    trend: "up" | "down" | "steady"
  }>,
  userRank: number,
  timestamp: number
}

// Событие соревнования
{
  type: "competition:event",
  competitionId: string,
  event: "start" | "finish" | "participant_joined" | "participant_left",
  data: any,
  timestamp: number
}

// Уведомление
{
  type: "notification",
  notificationType: "challenge_received" | "competition_starting" | ...,
  title: string,
  message: string,
  data: any
}

// Heartbeat ответ
{
  type: "pong",
  serverTime: number
}

// Ошибка
{
  type: "error",
  code: string,
  message: string
}
```

---

## Механика Соревнований

### Сценарий 1: Асинхронное соревнование (уже работает)

```
1. Учитель создаёт соревнование
2. Ученики проходят тренажёр в течение 24 часов
3. Результаты сохраняются в БД
4. Лидерборд обновляется при загрузке страницы
```

### Сценарий 2: Синхронное (Live) соревнование

```
┌─────────────────────────────────────────────────────────┐
│  Тайминг                                                │
├─────────────────────────────────────────────────────────┤
│  T-5 мин  │ Уведомление о старте                       │
│  T-1 мин  │ Подготовка (подключение к WebSocket)       │
│  T=0      │ СТАРТ (синхронизировано по серверу)        │
│  T+0-5мин │ Прохождение тренажера                      │
│           │ - Счёт отправляется каждые 1-2 сек         │
│           │ - Лидерборд обновляется каждые 5 сек       │
│  T+5мин   │ ФИНИШ                                      │
│  T+5мин+  │ Награждение, сохранение результатов        │
└─────────────────────────────────────────────────────────┘
```

### Код клиента (React хук)

```typescript
// src/features/competitions/hooks/useLiveCompetition.ts
import { useEffect, useState, useCallback, useRef } from 'react';

interface UseLiveCompetitionProps {
  competitionId: string;
  userId: string;
  onScoreUpdate?: (score: number) => void;
}

export function useLiveCompetition({
  competitionId,
  userId,
  onScoreUpdate
}: UseLiveCompetitionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Получаем JWT токен
    const token = localStorage.getItem('authToken');
    const wsUrl = `wss://api.neurosprint.ru/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Присоединяемся к комнате
      ws.send(JSON.stringify({
        type: 'competition:join',
        competitionId,
        timestamp: Date.now()
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'leaderboard:update':
          setLeaderboard(message.leaderboard);
          setUserRank(message.userRank);
          break;

        case 'competition:event':
          if (message.event === 'start') {
            setTimeRemaining(message.duration * 60 * 1000);
          } else if (message.event === 'finish') {
            // Завершение
          }
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect через 5 секунд
      setTimeout(() => {
        // Reconnect logic
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [competitionId, userId]);

  // Отправка счёта
  const submitScore = useCallback((score: number, accuracy: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'competition:score_update',
        competitionId,
        score,
        accuracy,
        timestamp: Date.now()
      }));
      onScoreUpdate?.(score);
    }
  }, [competitionId, onScoreUpdate]);

  return {
    isConnected,
    leaderboard,
    userRank,
    timeRemaining,
    submitScore
  };
}
```

---

## Anti-Cheat

### Защита от читерства

```typescript
// src/services/AntiCheatService.ts

interface ScoreValidation {
  isValid: boolean;
  reason?: string;
  riskScore: number; // 0-100
}

export class AntiCheatService {
  // Проверка аномалий
  validateScore(
    score: number,
    accuracy: number,
    reactionTimeMs: number,
    userHistory: Array<{score, accuracy, reactionTimeMs}>
  ): ScoreValidation {
    const riskScore = 0;
    const reasons: string[] = [];

    // 1. Проверка скорости реакции (невозможные значения)
    if (reactionTimeMs < 100) { // < 100ms = невозможно
      riskScore += 40;
      reasons.push('Слишком быстрая реакция');
    }

    // 2. Проверка точности (100% при высокой скорости)
    if (accuracy === 1.0 && score > averageScore * 2) {
      riskScore += 30;
      reasons.push('Подозрительно высокая точность');
    }

    // 3. Сравнение с историей пользователя
    if (userHistory.length > 0) {
      const avgScore = userHistory.reduce((a, b) => a + b.score, 0) / userHistory.length;
      if (score > avgScore * 3) { // В 3 раза выше среднего
        riskScore += 50;
        reasons.push('Резкий скачок результата');
      }
    }

    // 4. Проверка частоты обновлений
    // (реализуется на уровне WebSocket)

    return {
      isValid: riskScore < 70,
      reason: reasons.join(', '),
      riskScore
    };
  }

  // Валидация на сервере
  async validateOnServer(
    competitionId: string,
    userId: string,
    score: number
  ): Promise<boolean> {
    // Сравнение с другими участниками
    const avgScore = await this.getAverageScore(competitionId);
    const stdDev = await this.getStandardDeviation(competitionId);

    // Если результат > 3 сигм от среднего
    if (score > avgScore + 3 * stdDev) {
      return false; // Подозрительно
    }

    return true;
  }
}
```

### Серверная валидация

```typescript
// При получении счёта
ws.on('competition:score_update', async (data) => {
  const { competitionId, score, accuracy, reactionTimeMs } = data;

  // 1. Получаем историю пользователя
  const userHistory = await db.getUserResults(userId, competitionId);

  // 2. Проверяем на аномалии
  const validation = antiCheat.validateScore(
    score, accuracy, reactionTimeMs, userHistory
  );

  if (!validation.isValid) {
    ws.send(JSON.stringify({
      type: 'error',
      code: 'SUSPICIOUS_SCORE',
      message: `Результат помечен как подозрительный: ${validation.reason}`
    }));

    // Логируем для проверки
    await db.logSuspiciousActivity({
      userId, competitionId, score,
      reason: validation.reason,
      riskScore: validation.riskScore
    });

    return;
  }

  // 3. Обновляем лидерборд
  await updateLeaderboard(competitionId, userId, score);
});
```

---

## Масштабирование

### Архитектура для высоких нагрузок

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (nginx/HAProxy)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│  WebSocket Srv  │ │  WebSocket Srv  │ │  WebSocket Srv  │
│  (Node.js #1)   │ │  (Node.js #2)   │ │  (Node.js #3)   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis       │
                    │  (Pub/Sub +     │
                    │   Cache)        │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│   PostgreSQL    │ │   Minio/S3      │ │   Monitoring    │
│   (Основная БД) │ │   (Файлы)       │ │   (Prometheus)  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Redis Pub/Sub для кросс-серверной коммуникации

```typescript
// Когда пользователь на Server #1, а событие пришло на Server #2

// Server #2 публикует событие
await redis.publish(
  `competition:${competitionId}`,
  JSON.stringify({
    type: 'leaderboard:update',
    competitionId,
    leaderboard: updatedLeaderboard
  })
);

// Все Server #1, #2, #3 подписаны и получают событие
redis.subscribe(`competition:${competitionId}`);
```

---

## План Реализации

### Этап 1: Подготовка (1-2 недели)

- [ ] Настроить PostgreSQL схему
- [ ] Развернуть Redis
- [ ] Создать базовый WebSocket сервер
- [ ] Реализовать JWT авторизацию

### Этап 2: Базовая функциональность (2-3 недели)

- [ ] Присоединение к комнатам
- [ ] Отправка счёта
- [ ] Обновление лидерборда
- [ ] Интеграция с фронтендом

### Этап 3: Надёжность (1-2 недели)

- [ ] Auto-reconnect логика
- [ ] Очередь сообщений
- [ ] Offline buffer
- [ ] Heartbeat система

### Этап 4: Anti-Cheat (1 неделя)

- [ ] Валидация результатов
- [ ] Логирование аномалий
- [ ] Rate limiting

### Этап 5: Масштабирование (1-2 недели)

- [ ] Redis Pub/Sub
- [ ] Load balancing
- [ ] Мониторинг (Prometheus + Grafana)

---

## Альтернатива: Backend-as-a-Service

Если не хочется поддерживать свой backend:

### Firebase Realtime Database

```typescript
import { getDatabase, ref, set, onValue } from 'firebase/database';

const db = getDatabase();

// Присоединение
const userScoreRef = ref(db, `competitions/${competitionId}/scores/${userId}`);
set(userScoreRef, { score, accuracy, timestamp: Date.now() });

// Подписка на лидерборд
const leaderboardRef = ref(db, `competitions/${competitionId}/leaderboard`);
onValue(leaderboardRef, (snapshot) => {
  const data = snapshot.val();
  setLeaderboard(data);
});
```

**Плюсы:**
- ✅ Не нужен свой сервер
- ✅ Real-time из коробки
- ✅ Масштабируется автоматически

**Минусы:**
- ❌ Платно при большой нагрузке
- ❌ Меньше контроля

---

## Рекомендации

### Для начала (MVP):

1. **Firebase Realtime Database** — быстро, просто, работает
2. **Асинхронные соревнования** — уже работают
3. **Polling для лидерборда** (раз в 5 сек) — приемлемо для старта

### Для продакшена:

1. **Свой WebSocket сервер** на Node.js
2. **Redis** для кэша и Pub/Sub
3. **PostgreSQL** для основной БД
4. **nginx** как reverse proxy + SSL

### Бюджетная оценка:

| Ресурс | Firebase | Свой сервер |
|--------|----------|-------------|
| Сервер | $0 | ~$20/мес (VPS) |
| БД | Включено | ~$10/мес |
| Redis | Включено | ~$5/мес |
| Время разработки | 1-2 дня | 2-3 недели |
| Контроль | Ограниченный | Полный |

---

**Вывод:** Для старта рекомендую Firebase, для продакшена — свой WebSocket сервер.
