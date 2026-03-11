import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../src/db/database";
import { dailyTrainingRepository, calculateStreak, calculateBestStreak, computeHeatmapIntensity } from "../../src/entities/training/dailyTrainingRepository";
import { toLocalDateKey } from "../../src/shared/lib/date/date";
import type { DailyTraining, Session } from "../../src/shared/types/domain";

describe("dailyTrainingRepository", () => {
  const testUserId = "test-user-daily-training";

  beforeEach(async () => {
    // Очищаем тестовые данные перед каждым тестом
    await db.dailyTrainingSessions.where("userId").equals(testUserId).delete();
    await db.dailyTrainings.where("userId").equals(testUserId).delete();
    await db.sessions.where("userId").equals(testUserId).delete();
  });

  afterEach(async () => {
    // Очищаем после тестов
    await db.dailyTrainingSessions.where("userId").equals(testUserId).delete();
    await db.dailyTrainings.where("userId").equals(testUserId).delete();
    await db.sessions.where("userId").equals(testUserId).delete();
  });

  function createTestSession(
    userId: string,
    localDate: string,
    override: Partial<Session> = {}
  ): Session {
    const timestamp = new Date(localDate).toISOString();
    return {
      id: `session-${Date.now()}-${Math.random()}`,
      userId,
      taskId: "schulte",
      mode: "classic",
      moduleId: "schulte",
      modeId: "classic_plus",
      level: 1,
      presetId: "legacy",
      adaptiveSource: "legacy",
      timestamp,
      localDate,
      durationMs: 60000,
      score: 100,
      accuracy: 0.95,
      speed: 20,
      errors: 1,
      correctCount: 19,
      difficulty: {
        gridSize: 5,
        numbersCount: 25,
        mode: "classic"
      },
      ...override
    };
  }

  describe("getOrCreateForToday", () => {
    it("создаёт daily training при первом вызове", async () => {
      const today = toLocalDateKey(new Date());
      const progress = await dailyTrainingRepository.getOrCreateForToday(testUserId);

      expect(progress.training.userId).toBe(testUserId);
      expect(progress.training.localDate).toBe(today);
      expect(progress.training.status).toBe("pending");
      expect(progress.training.goalSessions).toBeGreaterThanOrEqual(1);
      expect(progress.training.completedSessions).toBe(0);
      expect(progress.progressPercent).toBe(0);
    });

    it("возвращает существующий daily training при повторном вызове", async () => {
      const today = toLocalDateKey(new Date());
      
      const first = await dailyTrainingRepository.getOrCreateForToday(testUserId);
      const second = await dailyTrainingRepository.getOrCreateForToday(testUserId);

      expect(first.training.id).toBe(second.training.id);
      expect(first.training.createdAt).toBe(second.training.createdAt);
    });

    it("возвращает прогресс 100% если цель достигнута", async () => {
      const today = toLocalDateKey(new Date());
      
      // Создаём training с 3 сессиями
      const training: DailyTraining = {
        id: `${testUserId}:${today}`,
        userId: testUserId,
        localDate: today,
        goalSessions: 3,
        completedSessions: 3,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.dailyTrainings.put(training);

      // Добавляем сессии в БД
      for (let i = 0; i < 3; i++) {
        await db.sessions.add({
          id: `session-${i}`,
          userId: testUserId,
          taskId: "schulte",
          mode: "classic",
          moduleId: "schulte",
          modeId: "classic_plus",
          level: 1,
          presetId: "legacy",
          adaptiveSource: "legacy",
          timestamp: new Date().toISOString(),
          localDate: today,
          durationMs: 60000,
          score: 100,
          accuracy: 0.95,
          speed: 20,
          errors: 0,
          difficulty: {
            gridSize: 5,
            numbersCount: 25,
            mode: "classic"
          }
        });
      }

      const progress = await dailyTrainingRepository.getOrCreateForToday(testUserId);

      expect(progress.progressPercent).toBe(100);
      expect(progress.completed).toBe(true);
      expect(progress.remainingSessions).toBe(0);
    });
  });

  describe("registerSession", () => {
    it("создаёт daily training при первой сессии дня", async () => {
      const today = toLocalDateKey(new Date());
      const session = createTestSession(testUserId, today);

      await dailyTrainingRepository.registerSession(session);

      const training = await db.dailyTrainings
        .where("[userId+localDate]")
        .equals([testUserId, today])
        .first();

      expect(training).toBeDefined();
      expect(training?.completedSessions).toBe(1);
    });

    it("не дублирует сессии при повторной регистрации", async () => {
      const today = toLocalDateKey(new Date());
      const session = createTestSession(testUserId, today);

      await dailyTrainingRepository.registerSession(session);
      await dailyTrainingRepository.registerSession(session);

      const links = await db.dailyTrainingSessions
        .where("userId")
        .equals(testUserId)
        .toArray();

      expect(links.length).toBe(1);
    });

    it("помечает день completed при достижении цели", async () => {
      const today = toLocalDateKey(new Date());
      
      // Создаём training с целью 2 сессии
      const training: DailyTraining = {
        id: `${testUserId}:${today}`,
        userId: testUserId,
        localDate: today,
        goalSessions: 2,
        completedSessions: 0,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.dailyTrainings.put(training);

      // Регистрируем 2 сессии
      const session1 = createTestSession(testUserId, today, { id: "session-1" });
      const session2 = createTestSession(testUserId, today, { id: "session-2", score: 150 });

      await dailyTrainingRepository.registerSession(session1);
      await dailyTrainingRepository.registerSession(session2);

      const updatedTraining = await db.dailyTrainings.get(training.id);

      expect(updatedTraining?.status).toBe("completed");
      expect(updatedTraining?.completedSessions).toBe(2);
      expect(updatedTraining?.completedAt).toBeDefined();
    });

    it("агрегирует несколько сессий за день", async () => {
      const today = toLocalDateKey(new Date());
      
      const session1 = createTestSession(testUserId, today, { 
        id: "session-1", 
        score: 100,
        durationMs: 60000
      });
      const session2 = createTestSession(testUserId, today, { 
        id: "session-2", 
        score: 150,
        durationMs: 90000
      });
      const session3 = createTestSession(testUserId, today, { 
        id: "session-3", 
        score: 120,
        durationMs: 75000
      });

      await dailyTrainingRepository.registerSession(session1);
      await dailyTrainingRepository.registerSession(session2);
      await dailyTrainingRepository.registerSession(session3);

      const progress = await dailyTrainingRepository.getOrCreateForToday(testUserId);

      expect(progress.training.completedSessions).toBe(3);
      expect(progress.sessions.length).toBe(3);
    });
  });

  describe("getCompletionSummary", () => {
    it("возвращает правильную сводку за период", async () => {
      const today = toLocalDateKey(new Date());
      const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));

      // Создаём training за сегодня (completed)
      await db.dailyTrainings.put({
        id: `${testUserId}:${today}`,
        userId: testUserId,
        localDate: today,
        goalSessions: 3,
        completedSessions: 3,
        status: "completed",
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Создаём training за вчера (pending)
      await db.dailyTrainings.put({
        id: `${testUserId}:${yesterday}`,
        userId: testUserId,
        localDate: yesterday,
        goalSessions: 3,
        completedSessions: 1,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const summary = await dailyTrainingRepository.getCompletionSummary(testUserId, 7);

      expect(summary.totalDays).toBe(2);
      expect(summary.completedDays).toBe(1);
      expect(summary.pendingDays).toBe(1);
      expect(summary.completionRatePct).toBe(50);
    });
  });

  describe("getStreakSummary", () => {
    it("считает текущую серию подряд идущих дней", async () => {
      const today = toLocalDateKey(new Date());
      const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));
      const twoDaysAgo = toLocalDateKey(new Date(Date.now() - 2 * 86400000));

      // Создаём 3 completed дня подряд
      for (const date of [today, yesterday, twoDaysAgo]) {
        await db.dailyTrainings.put({
          id: `${testUserId}:${date}`,
          userId: testUserId,
          localDate: date,
          goalSessions: 1,
          completedSessions: 1,
          status: "completed",
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const streak = await dailyTrainingRepository.getStreakSummary(testUserId, 30);

      expect(streak.currentStreakDays).toBe(3);
      expect(streak.completedDays).toBe(3);
    });

    it("считает лучшую серию за период", async () => {
      const today = toLocalDateKey(new Date());
      
      // Создаём 5 completed дней подряд
      for (let i = 0; i < 5; i++) {
        const date = toLocalDateKey(new Date(Date.now() - i * 86400000));
        await db.dailyTrainings.put({
          id: `${testUserId}:${date}`,
          userId: testUserId,
          localDate: date,
          goalSessions: 1,
          completedSessions: 1,
          status: "completed",
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Пропускаем 2 дня
      // Создаём ещё 3 completed дня
      for (let i = 7; i < 10; i++) {
        const date = toLocalDateKey(new Date(Date.now() - i * 86400000));
        await db.dailyTrainings.put({
          id: `${testUserId}:${date}`,
          userId: testUserId,
          localDate: date,
          goalSessions: 1,
          completedSessions: 1,
          status: "completed",
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const streak = await dailyTrainingRepository.getStreakSummary(testUserId, 30);

      expect(streak.bestStreakDays).toBe(5);
    });

    it("возвращает 0 если нет completed дней", async () => {
      const streak = await dailyTrainingRepository.getStreakSummary(testUserId, 30);
      expect(streak.currentStreakDays).toBe(0);
      expect(streak.bestStreakDays).toBe(0);
    });
  });

  describe("listHistory", () => {
    it("возвращает историю дней отсортированную по убыванию", async () => {
      const today = toLocalDateKey(new Date());
      const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));

      await db.dailyTrainings.put({
        id: `${testUserId}:${today}`,
        userId: testUserId,
        localDate: today,
        goalSessions: 3,
        completedSessions: 2,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await db.dailyTrainings.put({
        id: `${testUserId}:${yesterday}`,
        userId: testUserId,
        localDate: yesterday,
        goalSessions: 3,
        completedSessions: 3,
        status: "completed",
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const history = await dailyTrainingRepository.listHistory(testUserId, 7);

      expect(history.length).toBe(2);
      expect(history[0].localDate).toBe(today);
      expect(history[1].localDate).toBe(yesterday);
    });

    it("включает детали сессий", async () => {
      const today = toLocalDateKey(new Date());

      await db.dailyTrainings.put({
        id: `${testUserId}:${today}`,
        userId: testUserId,
        localDate: today,
        goalSessions: 3,
        completedSessions: 0,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const session1 = createTestSession(testUserId, today, { score: 100, durationMs: 60000 });
      const session2 = createTestSession(testUserId, today, { score: 150, durationMs: 90000 });

      await dailyTrainingRepository.registerSession(session1);
      await dailyTrainingRepository.registerSession(session2);

      const history = await dailyTrainingRepository.listHistory(testUserId, 7);

      expect(history[0].sessionsCount).toBe(2);
      expect(history[0].bestScore).toBe(150);
      expect(history[0].totalDurationMs).toBe(150000);
    });
  });

  describe("listCompletionTrend", () => {
    it("возвращает тренд completion по дням", async () => {
      const today = toLocalDateKey(new Date());
      const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));

      // Completed день
      await db.dailyTrainings.put({
        id: `${testUserId}:${yesterday}`,
        userId: testUserId,
        localDate: yesterday,
        goalSessions: 2,
        completedSessions: 2,
        status: "completed",
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Pending день
      await db.dailyTrainings.put({
        id: `${testUserId}:${today}`,
        userId: testUserId,
        localDate: today,
        goalSessions: 3,
        completedSessions: 1,
        status: "pending",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const trend = await dailyTrainingRepository.listCompletionTrend(testUserId, 7);

      expect(trend.length).toBe(2);
      expect(trend.find((t) => t.localDate === yesterday)?.completed).toBe(true);
      expect(trend.find((t) => t.localDate === today)?.completed).toBe(false);
      expect(trend.find((t) => t.localDate === today)?.progressPct).toBe(33);
    });
  });

  describe("calculateStreak (unit)", () => {
    it("считает серию от сегодня", () => {
      const today = toLocalDateKey(new Date());
      const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));
      const twoDaysAgo = toLocalDateKey(new Date(Date.now() - 2 * 86400000));

      const dates = [today, yesterday, twoDaysAgo];
      const streak = calculateStreak(dates);

      expect(streak).toBe(3);
    });

    it("возвращает 0 для пустого массива", () => {
      const streak = calculateStreak([]);
      expect(streak).toBe(0);
    });

    it("прерывает серию при пропуске дня", () => {
      const today = toLocalDateKey(new Date());
      const twoDaysAgo = toLocalDateKey(new Date(Date.now() - 2 * 86400000));
      const threeDaysAgo = toLocalDateKey(new Date(Date.now() - 3 * 86400000));

      // Пропускаем вчера
      const dates = [today, twoDaysAgo, threeDaysAgo];
      const streak = calculateStreak(dates);

      expect(streak).toBe(1); // Только сегодня
    });
  });

  describe("calculateBestStreak (unit)", () => {
    it("находит лучшую серию", () => {
      const dates = [
        "2024-01-01",
        "2024-01-02",
        "2024-01-03",
        "2024-01-05",
        "2024-01-06"
      ];

      const bestStreak = calculateBestStreak(dates);

      expect(bestStreak).toBe(3); // 1-3 января
    });

    it("возвращает 0 для пустого массива", () => {
      const bestStreak = calculateBestStreak([]);
      expect(bestStreak).toBe(0);
    });
  });

  describe("computeHeatmapIntensity", () => {
    it("возвращает 0 для незавершённого дня", () => {
      expect(computeHeatmapIntensity(0, false)).toBe(0);
      expect(computeHeatmapIntensity(2, false)).toBe(0);
    });

    it("возвращает 1 для 1 сессии", () => {
      expect(computeHeatmapIntensity(1, true)).toBe(1);
    });

    it("возвращает 2 для 2 сессий", () => {
      expect(computeHeatmapIntensity(2, true)).toBe(2);
    });

    it("возвращает 3 для 3-4 сессий", () => {
      expect(computeHeatmapIntensity(3, true)).toBe(3);
      expect(computeHeatmapIntensity(4, true)).toBe(3);
    });

    it("возвращает 4 для 5+ сессий", () => {
      expect(computeHeatmapIntensity(5, true)).toBe(4);
      expect(computeHeatmapIntensity(10, true)).toBe(4);
    });
  });
});
