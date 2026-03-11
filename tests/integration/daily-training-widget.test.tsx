import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";
import { DailyTrainingWidget } from "../../src/widgets/DailyTrainingWidget";
import type { Session, TrainingModeId, TrainingModuleId } from "../../src/shared/types/domain";

const mocks = vi.hoisted(() => ({
  dailyTrainingRepository: {
    getOrCreateForToday: vi.fn(),
    getCompletionSummary: vi.fn(),
    getStreakSummary: vi.fn(),
    getHeatmapData: vi.fn()
  },
  sessionRepository: {
    listByUser: vi.fn()
  },
  userRepository: {
    list: vi.fn()
  }
}));

vi.mock("../../src/entities/training/dailyTrainingRepository", () => ({
  dailyTrainingRepository: mocks.dailyTrainingRepository
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
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

function renderWidget() {
  return render(
    <MemoryRouter>
      <ActiveUserProvider>
        <DailyTrainingWidget showHeatmap={false} showSummary={false} />
      </ActiveUserProvider>
    </MemoryRouter>
  );
}

describe("DailyTrainingWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "Григорий", role: "student", createdAt: "2026-03-01T08:00:00.000Z" }
    ]);

    mocks.dailyTrainingRepository.getOrCreateForToday.mockResolvedValue({
      training: {
        id: "dt-1",
        userId: "u1",
        localDate: "2026-03-09",
        goalSessions: 3,
        completedSessions: 0,
        status: "pending"
      },
      sessions: [],
      completed: false,
      progressPercent: 0,
      remainingSessions: 3,
      launchPath: "/training/pre-session"
    });
    mocks.dailyTrainingRepository.getCompletionSummary.mockResolvedValue({
      totalDays: 3,
      completedDays: 1,
      pendingDays: 2,
      totalSessions: 5,
      avgSessionsPerDay: 1.7,
      completionRatePct: 33
    });
    mocks.dailyTrainingRepository.getStreakSummary.mockResolvedValue({
      currentStreakDays: 2,
      bestStreakDays: 5
    });
    mocks.dailyTrainingRepository.getHeatmapData.mockResolvedValue([]);
    mocks.sessionRepository.listByUser.mockResolvedValue([]);
  });

  it("routes the daily start through growth focus before the first session of the day", async () => {
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

    renderWidget();

    expect(await screen.findByTestId("daily-training-growth-focus")).toHaveTextContent(
      "Фокус роста: Память"
    );
    expect(screen.getByTestId("daily-training-continue")).toHaveAttribute(
      "href",
      "/training/pre-session?module=memory_match"
    );
  });

  it("keeps the current daily route after the user already started today", async () => {
    mocks.dailyTrainingRepository.getOrCreateForToday.mockResolvedValue({
      training: {
        id: "dt-2",
        userId: "u1",
        localDate: "2026-03-09",
        goalSessions: 3,
        completedSessions: 1,
        status: "pending"
      },
      sessions: [{ id: "link-1" }],
      completed: false,
      progressPercent: 33,
      remainingSessions: 2,
      launchPath: "/training/reaction?mode=reaction_signal"
    });
    mocks.sessionRepository.listByUser.mockResolvedValue([
      makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
        score: 164,
        accuracy: 0.93,
        errors: 0
      })
    ]);

    renderWidget();

    expect(await screen.findByTestId("daily-training-widget")).toBeInTheDocument();
    expect(screen.queryByTestId("daily-training-growth-focus")).not.toBeInTheDocument();
    expect(screen.getByTestId("daily-training-continue")).toHaveAttribute(
      "href",
      "/training/reaction?mode=reaction_signal"
    );
  });
});
