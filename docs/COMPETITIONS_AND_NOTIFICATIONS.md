# 🏆 Система соревнований и уведомлений

## Обзор

Этот документ описывает систему соревнований, вызовов (PvP) и уведомлений, реализованную в NeuroSprint.

---

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Компоненты](#компоненты)
3. [Хуки](#хуки)
4. [Repository](#repository)
5. [База данных](#база-данных)
6. [Примеры использования](#примеры-использования)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  Competitions & Notifications System                   │
├─────────────────────────────────────────────────────────┤
│  📦 Entities                                           │
│  ├── competitionRepository.ts  — Соревнования          │
│  ├── challengeRepository.ts    — Вызовы (PvP)          │
│  └── notificationRepository.ts — Уведомления           │
├─────────────────────────────────────────────────────────┤
│  🎣 Hooks                                              │
│  ├── useCompetitions.ts        — Управление соревн.    │
│  ├── useChallenges.ts          — Управление вызовами   │
│  └── useNotifications.ts       — Уведомления           │
├─────────────────────────────────────────────────────────┤
│  🧩 Components                                         │
│  ├── CompetitionModal.tsx      — Создание вызова       │
│  ├── LiveCompetition.tsx       — Live-соревнование     │
│  ├── LiveLeaderboard.tsx       — Live-лидерборд        │
│  ├── LeaderboardWidget.tsx     — Виджет лидерборда     │
│  ├── ClassSkillRadar.tsx       — Радар навыков         │
│  └── NotificationBell.tsx      — Колокольчик           │
├─────────────────────────────────────────────────────────┤
│  📄 Pages                                              │
│  ├── ClassesPage.tsx           — Вкладка Классы        │
│  └── CompetitionsPage.tsx      — Вкладка Соревнования  │
└─────────────────────────────────────────────────────────┘
```

---

## Компоненты

### CompetitionModal

Модальное окно для создания PvP вызова между учениками.

**Props:**
- `isOpen: boolean` — Открыто ли модальное окно
- `onClose: () => void` — Callback закрытия
- `onSubmit: (challenge) => void` — Callback отправки
- `challenger: User` — Кто вызывает
- `students: User[]` — Список учеников для выбора

**Пример:**
```tsx
<ChallengeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSubmit={async (challenge) => {
    await sendChallenge(challenge.challengedId, challenge.modeId, challenge.durationMinutes);
  }}
  challenger={currentUser}
  students={classStudents}
/>
```

### LiveCompetition

Компонент для участия в real-time соревновании.

**Props:**
- `competitionId: string` — ID соревнования
- `userId: string` — ID пользователя
- `onScoreUpdate?: (score) => void` — Callback обновления счёта
- `onFinished?: () => void` — Callback завершения

**Пример:**
```tsx
<LiveCompetition
  competitionId={compId}
  userId={userId}
  onScoreUpdate={(score) => console.log('Score:', score)}
  onFinished={() => console.log('Finished!')}
/>
```

### LiveLeaderboard

Автоматически обновляемый лидерборд (каждые 5 секунд).

**Props:**
- `competitionId: string` — ID соревнования
- `limit?: number` — Количество отображаемых записей
- `showFull?: boolean` — Показать все или топ-10
- `className?: string` — CSS класс

### LeaderboardWidget

Виджет лидерборда с фильтрами по периоду.

**Props:**
- `entries: LeaderboardEntry[]` — Данные для отображения
- `period?: "day" | "week" | "month" | "all"` — Период
- `onPeriodChange?: (period) => void` — Callback изменения периода
- `isLoading?: boolean` — Состояние загрузки

### ClassSkillRadar

Радарная диаграмма навыков класса.

**Props:**
- `students: User[]` — Ученики класса
- `sessions?: Session[]` — Сессии для расчёта статистики

### NotificationBell

Колокольчик уведомлений с выпадающим списком.

**Props:**
- `userId: string | null` — ID пользователя
- `onNotificationClick?: (notification) => void` — Callback клика

**Пример:**
```tsx
<NotificationBell
  userId={activeUserId}
  onNotificationClick={(n) => console.log('Clicked:', n)}
/>
```

---

## Хуки

### useChallenges

Хук для управления PvP вызовами.

**Параметры:**
- `userId: string | null` — ID пользователя

**Возвращает:**
```typescript
{
  challenges: UserChallenge[];     // Все вызовы
  incoming: UserChallenge[];       // Входящие
  outgoing: UserChallenge[];       // Исходящие
  active: UserChallenge[];         // Активные
  loading: boolean;
  error: string | null;
  sendChallenge: (challengedId, modeId, durationMinutes) => Promise<void>;
  respondToChallenge: (challengeId, accept) => Promise<void>;
  completeChallenge: (challengeId, challengerScore, challengedScore) => Promise<void>;
  cancelChallenge: (challengeId) => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Пример:**
```tsx
const { challenges, sendChallenge, respondToChallenge } = useChallenges(userId);

// Отправить вызов
await sendChallenge(opponentId, "pattern_classic", 5);

// Принять вызов
await respondToChallenge(challengeId, true);
```

### useCompetitions

Хук для управления соревнованиями.

**Параметры:**
- `userId: string | null` — ID пользователя

**Возвращает:**
```typescript
{
  competitions: Competition[];
  active: Competition[];
  upcoming: Competition[];
  loading: boolean;
  error: string | null;
  createCompetition: (name, type, mode, modeId, duration, startTime, endTime) => Promise<Competition>;
  joinCompetition: (competitionId, user, classId?) => Promise<void>;
  submitResult: (competitionId, userId, score, accuracy?, reactionTimeMs?) => Promise<void>;
  updateLiveScore: (competitionId, userId, liveScore) => Promise<void>;
  finishCompetition: (competitionId) => Promise<void>;
  cancelCompetition: (competitionId) => Promise<void>;
  refresh: () => Promise<void>;
}
```

### useNotifications

Хук для управления уведомлениями.

**Параметры:**
- `userId: string | null` — ID пользователя

**Возвращает:**
```typescript
{
  notifications: CompetitionNotification[];
  unread: CompetitionNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId) => Promise<void>;
  createNotification: (type, title, message, relatedCompId?, relatedChallengeId?, relatedClassId?) => Promise<void>;
  refresh: () => Promise<void>;
}
```

---

## Repository

### competitionRepository

Методы для работы с соревнованиями:

```typescript
// Создание
await competitionRepository.create(
  name, type, mode, organizerId, modeId, durationMinutes, startTime, endTime
);

// Получение
await competitionRepository.getById(id);
await competitionRepository.listByUser(userId);
await competitionRepository.listActive(userId);
await competitionRepository.listUpcoming(userId);

// Участие
await competitionRepository.joinParticipant(competitionId, user, classId);
await competitionRepository.updateParticipantStatus(competitionId, userId, status);

// Результаты
await competitionRepository.submitResult(competitionId, userId, score, accuracy, reactionTimeMs);
await competitionRepository.updateLiveScore(competitionId, userId, liveScore);

// Завершение
await competitionRepository.finish(competitionId);
await competitionRepository.cancel(competitionId);
await competitionRepository.delete(competitionId);

// Лидерборд
await competitionRepository.getLeaderboard(competitionId);
```

### challengeRepository

Методы для работы с вызовами:

```typescript
// Создание
await challengeRepository.create(challenge);

// Списки
await challengeRepository.listByUser(userId);
await challengeRepository.listIncoming(userId);
await challengeRepository.listOutgoing(userId);
await challengeRepository.listActive(userId);

// Действия
await challengeRepository.respond(challengeId, accept);
await challengeRepository.complete(challengeId, challengerScore, challengedScore);
await challengeRepository.cancel(challengeId);
```

### notificationRepository

Методы для работы с уведомлениями:

```typescript
// Создание
await notificationRepository.create(
  userId, type, title, message, relatedCompetitionId, relatedChallengeId, relatedClassId
);

// Получение
await notificationRepository.listByUser(userId, limit);
await notificationRepository.listUnread(userId);
await notificationRepository.getUnreadCount(userId);

// Действия
await notificationRepository.markAsRead(notificationId);
await notificationRepository.markAllAsRead(userId);
await notificationRepository.delete(notificationId);
await notificationRepository.cleanup(userId);
```

---

## База данных

### Таблица `competitions`

```typescript
interface Competition {
  id: string;
  name: string;
  type: "pvp" | "team" | "tournament" | "challenge";
  mode: "async" | "sync" | "hybrid";
  status: "pending" | "active" | "completed" | "cancelled";
  organizerId: string;
  organizerType: "user" | "class" | "system";
  modeId: TrainingModeId;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  participants: CompetitionParticipant[];
  teams?: CompetitionTeam[];
  leaderboard: CompetitionLeaderboardEntry[];
  winners?: string[];
  settings: CompetitionSettings;
  createdAt: string;
  updatedAt: string;
}
```

### Таблица `notifications`

```typescript
interface CompetitionNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedCompetitionId?: string;
  relatedChallengeId?: string;
  relatedClassId?: string;
  isRead: boolean;
  createdAt: string;
}

type NotificationType =
  | "challenge_received"
  | "challenge_accepted"
  | "competition_starting"
  | "competition_finished"
  | "rank_changed"
  | "achievement_unlocked"
  | "team_invite";
```

### Версии IndexedDB

- **v15:** Добавлена таблица `competitions`
- **v16:** Добавлена таблица `notifications`

---

## Примеры использования

### Создание соревнования

```tsx
const { createCompetition } = useCompetitions(userId);

const now = new Date();
const startTime = new Date(now.getTime() + 60000); // Через 1 минуту
const endTime = new Date(startTime.getTime() + 5 * 60000); // 5 минут

await createCompetition(
  "Математический бой",
  "pvp",
  "async",
  "sprint_add_sub",
  5,
  startTime.toISOString(),
  endTime.toISOString()
);
```

### Отправка вызова

```tsx
const { sendChallenge } = useChallenges(userId);

await sendChallenge(
  opponentId,
  "pattern_classic",
  5 // минут
);
```

### Получение непрочитанных уведомлений

```tsx
const { unread, unreadCount } = useNotifications(userId);

console.log(`У вас ${unreadCount} новых уведомлений`);
unread.forEach(n => {
  console.log(`${n.title}: ${n.message}`);
});
```

### Live-обновление счёта

```tsx
const { updateLiveScore } = useCompetitions(userId);

// В реальном соревновании
useEffect(() => {
  const interval = setInterval(() => {
    updateLiveScore(competitionId, userId, currentScore);
  }, 1000);
  
  return () => clearInterval(interval);
}, [currentScore]);
```

---

## 🚀 Следующие шаги

1. **Backend API** — реализация серверной части для real-time синхронизации
2. **WebSocket** — подключение к серверу для live-обновлений
3. **Тесты** — unit, integration, e2e тесты
4. **Турнирная сетка** — плей-офф система
5. **Сезонный рейтинг** — ELO-подобная система с дивизионами

---

**Последнее обновление:** 2026-03-27
**Статус:** Этап 2 (Соревновательная база) — В работе
