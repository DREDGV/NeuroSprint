import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { HomePage } from "../../src/pages/HomePage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";
import { toLocalDateKey } from "../../src/shared/lib/date/date";
import { getLevelUpCelebrationKey } from "../../src/shared/lib/progress/levelCelebration";
import type { Session, TrainingModeId, TrainingModuleId } from "../../src/shared/types/domain";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    getDailyProgressSummary: vi.fn(),
    getIndividualInsights: vi.fn(),
    listByUser: vi.fn()
  },
  dailyChallengeRepository: {
    getOrCreateForToday: vi.fn()
  },
  dailyTrainingRepository: {
    getOrCreateForToday: vi.fn()
  },
  achievementRepository: {
    getUserAchievements: vi.fn()
  },
  levelRepository: {
    getOrCreateUserLevel: vi.fn(),
    getRecentXPLogs: vi.fn()
  },
  resolveAdaptiveDailyChallengeModeId: vi.fn(),
  userRepository: {
    list: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/challenge/dailyChallengeRepository", () => ({
  dailyChallengeRepository: mocks.dailyChallengeRepository,
  resolveAdaptiveDailyChallengeModeId: mocks.resolveAdaptiveDailyChallengeModeId
}));

vi.mock("../../src/entities/training/dailyTrainingRepository", () => ({
  dailyTrainingRepository: mocks.dailyTrainingRepository
}));

vi.mock("../../src/entities/achievement/achievementRepository", () => ({
  achievementRepository: mocks.achievementRepository
}));

vi.mock("../../src/entities/level/levelRepository", () => ({
  levelRepository: mocks.levelRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

vi.mock("../../src/widgets/DailyTrainingWidget", () => ({
  DailyTrainingWidget: () => <div data-testid="daily-training-widget" />
}));

function makeSession(
  id: string,
  moduleId: TrainingModuleId,
  modeId: TrainingModeId,
  timestamp: string,
  overrides: Partial<Session> = {}
): Session {
  const modeByModule: Record<TrainingModuleId, Session["mode"]> = {
    schulte: "classic",
    sprint_math: "sprint_math",
    reaction: "reaction",
    n_back: "n_back",
    memory_grid: "memory_grid",
    spatial_memory: "spatial_memory",
    decision_rush: "decision_rush",
    memory_match: "memory_match",
    pattern_recognition: "pattern_recognition"
  };

  return {
    id,
    userId: "u1",
    taskId: moduleId,
    moduleId,
    modeId,
    mode: modeByModule[moduleId],
    level: 1,
    presetId: "easy",
    adaptiveSource: "auto",
    timestamp,
    localDate: timestamp.slice(0, 10),
    durationMs: 45_000,
    score: 60,
    accuracy: 0.8,
    speed: 1,
    errors: 1,
    difficulty: {
      gridSize: 3,
      numbersCount: 9,
      mode: modeByModule[moduleId]
    },
    ...overrides
  };
}

function SprintSetupMarker() {
  const location = useLocation();
  return <p data-testid="sprint-setup-marker">{location.search}</p>;
}

describe("HomePage daily challenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "Лёва", role: "student", createdAt: "2026-03-01T08:00:00.000Z" }
    ]);

    mocks.sessionRepository.getDailyProgressSummary.mockResolvedValue({
      date: "2026-03-01",
      sessionsTotal: 0,
      classicCount: 0,
      timedCount: 0,
      reverseCount: 0,
      bestClassicDurationMs: null,
      bestTimedScore: null,
      bestReverseDurationMs: null,
      avgAccuracy: null
    });

    mocks.sessionRepository.getIndividualInsights.mockResolvedValue({
      streakDays: 0,
      currentWeekAvgScore: null,
      previousWeekAvgScore: null,
      recommendation: {
        modeId: "classic_plus",
        reason: "Тестовая рекомендация",
        confidence: 0.6
      }
    });
    mocks.sessionRepository.listByUser.mockResolvedValue([]);
    mocks.dailyTrainingRepository.getOrCreateForToday.mockResolvedValue({
      training: { id: "dt-1" },
      sessions: [],
      completed: false,
      progressPercent: 0,
      remainingSessions: 3,
      launchPath: "/training/pre-session"
    });
    mocks.levelRepository.getOrCreateUserLevel.mockResolvedValue({
      id: "u1",
      userId: "u1",
      level: 4,
      currentXP: 80,
      totalXP: 380,
      xpToNextLevel: 200,
      lastLevelUpAt: null,
      updatedAt: "2026-03-10T10:00:00.000Z"
    });
    mocks.levelRepository.getRecentXPLogs.mockResolvedValue([]);
    mocks.achievementRepository.getUserAchievements.mockResolvedValue([]);

    mocks.dailyChallengeRepository.getOrCreateForToday.mockResolvedValue({
      challenge: {
        id: "u1:2026-03-01",
        userId: "u1",
        localDate: "2026-03-01",
        moduleId: "sprint_math",
        modeId: "sprint_add_sub",
        status: "pending",
        requiredAttempts: 1,
        title: "Challenge дня: Sprint Add/Sub",
        description: "Пройдите 1 сессию в режиме «Sprint Add/Sub».",
        createdAt: "2026-03-01T08:00:00.000Z",
        completedAt: null
      },
      attemptsCount: 0,
      remainingAttempts: 1,
      completed: false,
      launchPath: "/training/sprint-math?mode=sprint_add_sub",
      progressLabel: "0 / 1"
    });

    mocks.resolveAdaptiveDailyChallengeModeId.mockReturnValue("sprint_add_sub");
  });

  it("renders a compact daily challenge with clear value and keeps growth focus compact", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/training/sprint-math" element={<SprintSetupMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const challengeWidget = await screen.findByTestId("home-daily-challenge");
    expect(challengeWidget).toBeInTheDocument();
    expect(challengeWidget).toHaveTextContent("Челлендж дня");
    expect(challengeWidget).toHaveTextContent("Sprint Add/Sub");
    expect(challengeWidget).toHaveTextContent("Короткий ориентир на день");
    expect(challengeWidget.querySelector(".challenge-progress-text")?.textContent).toBe("0 / 1");
    expect(screen.getByText("В фокусе")).toBeInTheDocument();
    expect(screen.getByTestId("home-skill-growth")).toHaveTextContent("Стартовый профиль");
    expect(screen.getByTestId("home-weekly-focus")).toHaveTextContent("Memory Match");

    await user.click(screen.getByTestId("home-daily-challenge-start"));
    expect(await screen.findByTestId("sprint-setup-marker")).toHaveTextContent(
      "?mode=sprint_add_sub"
    );
  });

  it("shows the weekly focus teaser instead of a full growth summary", async () => {
    mocks.sessionRepository.listByUser.mockResolvedValue([
      makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
        score: 164,
        accuracy: 0.93,
        errors: 0
      }),
      makeSession("s2", "reaction", "reaction_pair", "2026-03-07T10:00:00.000Z", {
        score: 152,
        accuracy: 0.9,
        errors: 1
      })
    ]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ActiveUserProvider>
          <HomePage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await screen.findByText("Память");
    const growth = screen.getByTestId("home-skill-growth");
    expect(growth).toHaveTextContent("Фокус недели");
    expect(growth).toHaveTextContent("Память");
    expect(growth).toHaveTextContent("Опора: Реакция");
    expect(screen.getByTestId("home-weekly-focus")).toHaveTextContent("Лучший старт сегодня");
    expect(screen.getByTestId("home-weekly-focus")).toHaveTextContent("Memory Match");
    expect(screen.getByTestId("home-skill-growth-start")).toHaveAttribute(
      "href",
      "/training/memory-match"
    );
    expect(screen.getByTestId("home-skill-growth-stats")).toHaveAttribute("href", "/stats");
  });

  it("marks the daily challenge when it is aligned with the growth focus", async () => {
    mocks.sessionRepository.listByUser.mockResolvedValue([
      makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
        score: 164,
        accuracy: 0.93,
        errors: 0
      }),
      makeSession("s2", "reaction", "reaction_pair", "2026-03-07T10:00:00.000Z", {
        score: 152,
        accuracy: 0.9,
        errors: 1
      }),
      makeSession("s3", "reaction", "reaction_number", "2026-03-06T10:00:00.000Z", {
        score: 149,
        accuracy: 0.89,
        errors: 1
      })
    ]);
    mocks.dailyChallengeRepository.getOrCreateForToday.mockResolvedValue({
      challenge: {
        id: "u1:2026-03-01",
        userId: "u1",
        localDate: "2026-03-01",
        moduleId: "memory_match",
        modeId: "memory_match_classic",
        status: "pending",
        requiredAttempts: 1,
        title: "Challenge дня: Memory Match Classic",
        description: "Пройдите 1 сессию в режиме «Memory Match Classic».",
        createdAt: "2026-03-01T08:00:00.000Z",
        completedAt: null
      },
      attemptsCount: 0,
      remainingAttempts: 1,
      completed: false,
      launchPath: "/training/memory-match",
      progressLabel: "0 / 1"
    });
    mocks.resolveAdaptiveDailyChallengeModeId.mockReturnValue("memory_match_classic");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ActiveUserProvider>
          <HomePage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("home-daily-challenge-growth")).toHaveTextContent(
      "Совпадает с системой роста"
    );
    expect(screen.getByTestId("home-daily-challenge-growth")).toHaveTextContent("Memory Match");
    expect(screen.getByTestId("home-daily-challenge-start")).toHaveAttribute(
      "href",
      "/training/memory-match"
    );
  });

  it("does not repeat the level-up modal when the session celebration is already stored", async () => {
    const now = new Date().toISOString();
    const today = toLocalDateKey(new Date());

    mocks.levelRepository.getOrCreateUserLevel.mockResolvedValue({
      id: "u1",
      userId: "u1",
      level: 5,
      currentXP: 20,
      totalXP: 520,
      xpToNextLevel: 300,
      lastLevelUpAt: now,
      updatedAt: now
    });
    localStorage.setItem(getLevelUpCelebrationKey("u1", today), "1");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ActiveUserProvider>
          <HomePage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await screen.findByTestId("home-page");
    expect(screen.queryByText("Новый уровень!")).not.toBeInTheDocument();
  });
});
