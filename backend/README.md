# 🔧 NeuroSprint Backend

Backend сервер для real-time соревнований NeuroSprint.

## 📋 Требования

- Node.js >= 18
- Redis >= 6
- PostgreSQL >= 14

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env`:

```env
# Server
PORT=3001
WS_PORT=3002
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/neurosprint

# Redis
REDIS_URL=redis://localhost:6379
```

### 3. Запуск Redis и PostgreSQL

```bash
# Redis
redis-server

# PostgreSQL (пример для macOS через Homebrew)
brew services start postgresql@14
```

### 4. Запуск сервера

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 📡 API Endpoints

### REST API

- `GET /health` - Health check
- `POST /api/competitions` - Создать соревнование
- `GET /api/competitions/:id` - Получить соревнование
- `POST /api/competitions/:id/join` - Присоединиться
- `GET /api/leaderboards/:competitionId` - Лидерборд

### WebSocket

Подключение: `ws://localhost:3002?token=<JWT_TOKEN>`

**Сообщения клиент → сервер:**
- `competition:join` - Присоединиться к комнате
- `competition:score_update` - Обновить счёт
- `competition:finish` - Завершить соревнование
- `ping` - Heartbeat

**Сообщения сервер → клиент:**
- `connected` - Подтверждение подключения
- `leaderboard:update` - Обновление лидерборда
- `competition:event` - Событие соревнования
- `pong` - Heartbeat ответ

## 🏗️ Архитектура

```
src/
├── index.ts                 # Точка входа
├── websocket/
│   ├── WebSocketServer.ts   # WebSocket сервер
│   └── MessageHandler.ts    # Обработчик сообщений
├── api/
│   ├── competitions.ts      # REST API соревнований
│   ├── challenges.ts        # REST API вызовов
│   └── leaderboards.ts      # REST API лидербордов
├── services/
│   ├── CompetitionService.ts
│   └── AntiCheatService.ts
├── db/
│   ├── postgres.ts          # PostgreSQL
│   └── redis.ts             # Redis
└── middleware/
    └── auth.ts              # JWT авторизация
```

## 🔐 Безопасность

### JWT Авторизация

Все WebSocket подключения и REST запросы требуют JWT токен.

Токен передаётся:
- WebSocket: `ws://server:port?token=<JWT>`
- REST: `Authorization: Bearer <JWT>`

### Anti-Cheat

- Валидация результатов на сервере
- Проверка аномалий (реакция < 100ms)
- Rate limiting (макс. 10 сообщений/сек)
- Сравнение с историей пользователя

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:3001/health
```

Ответ:
```json
{
  "status": "ok",
  "timestamp": "2026-03-27T12:00:00.000Z"
}
```

### Метрики (TODO)

- Количество подключенных клиентов
- Количество комнат
- Средняя задержка сообщений
- Использование памяти

## 🧪 Тестирование

```bash
# Unit тесты
npm test

# Integration тесты
npm run test:integration

# E2E тесты
npm run test:e2e
```

## 📝 Примеры использования

### Подключение через JavaScript

```javascript
const token = localStorage.getItem('authToken');
const ws = new WebSocket(`ws://localhost:3002?token=${token}`);

ws.onopen = () => {
  console.log('Connected!');
  
  // Присоединиться к соревнованию
  ws.send(JSON.stringify({
    type: 'competition:join',
    competitionId: 'comp123'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'leaderboard:update') {
    console.log('Leaderboard:', message.leaderboard);
    console.log('My rank:', message.userRank);
  }
};
```

### Отправка счёта

```javascript
function submitScore(score, accuracy) {
  ws.send(JSON.stringify({
    type: 'competition:score_update',
    competitionId: 'comp123',
    score,
    accuracy,
    timestamp: Date.now()
  }));
}
```

## 🚀 Деплой

### Docker (TODO)

```bash
docker-compose up -d
```

### VPS

1. Установите Node.js, Redis, PostgreSQL
2. Клонируйте репозиторий
3. Настройте `.env`
4. Запустите через PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

## 📊 Масштабирование

Для масштабирования используйте:

1. **Redis Pub/Sub** - для синхронизации между серверами
2. **Load Balancer** (nginx) - для распределения нагрузки
3. **PostgreSQL Connection Pool** - для эффективной работы с БД

## 🐛 Отладка

Включите debug логи:

```bash
NODE_ENV=development npm run dev
```

## 📚 Документация

- [Архитектура real-time соревнований](../../docs/REALTIME_COMPETITIONS_ARCHITECTURE.md)
- [WebSocket протокол](./WEBSOCKET_PROTOCOL.md)

## 🤝 Вклад

1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT
