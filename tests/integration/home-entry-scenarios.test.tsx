import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    useAuth: vi.fn(),
    useActiveUserDisplayName: vi.fn(),
    sessionRepository: {
      getDailyProgressSummary: vi.fn(async () => null),
      getIndividualInsights: vi.fn(async () => ({ streakDays: 0 })),
      listByUser: vi.fn(async () => [])
    },
    dailyChallengeRepository: {
      getOrCreateForToday: vi.fn(async () => null)
    },
    dailyTrainingRepository: {
      getOrCreateForToday: vi.fn(async () => null)
    },
    levelRepository: {
      getOrCreateUserLevel: vi.fn(async () => null)
    },
    getSettings: vi.fn(() => ({ dailyGoalSessions: 3 }))
  };
});

vi.mock("../../src/app/useAuth", () => ({
  useAuth: () => mocks.useAuth()
}));

vi.mock("../../src/app/useActiveUserDisplayName", () => ({
  useActiveUserDisplayName: () => mocks.useActiveUserDisplayName()
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/challenge/dailyChallengeRepository", () => ({
  dailyChallengeRepository: mocks.dailyChallengeRepository,
  resolveAdaptiveDailyChallengeModeId: () => null
}));

vi.mock("../../src/entities/training/dailyTrainingRepository", () => ({
  dailyTrainingRepository: {
    ...mocks.dailyTrainingRepository,
    getCompletionSummary: vi.fn(async () => null),
    getStreakSummary: vi.fn(async () => null),
    getHeatmapData: vi.fn(async () => [])
  }
}));

vi.mock("../../src/entities/level/levelRepository", () => ({
  levelRepository: {
    ...mocks.levelRepository,
    getRecentXPLogs: vi.fn(async () => [])
  }
}));

vi.mock("../../src/shared/lib/settings/settings", () => ({
  getSettings: () => mocks.getSettings()
}));

vi.mock("../../src/shared/lib/training/skillGuidance", () => ({
  buildSkillGuidance: () => ({
    hasData: false,
    primaryModuleId: "schulte",
    primaryModuleTitle: "Таблица Шульте",
    focusLabel: "Внимание",
    strongestLabel: "Память",
    profile: { axes: [], totalSessions: 0 }
  })
}));

vi.mock("../../src/shared/lib/training/skillRoadmap", () => ({
  buildSkillRoadmap: () => ({
    hasData: false,
    guidance: { focusLabel: "Внимание" },
    weekGoal: "Стартовый профиль",
    summary: "Нужны первые сессии",
    cadence: "3-5 коротких сессий",
    days: []
  })
}));

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn()
}));

import { HomePage } from "../../src/pages/HomePage";

describe("HomePage entry banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useActiveUserDisplayName.mockReturnValue({ activeUserId: null });
  });

  const mockAuth = (overrides: Record<string, unknown> = {}) => {
    mocks.useAuth.mockReturnValue({
      isConfigured: true,
      isAuthenticated: false,
      isLoading: false,
      account: null,
      ...overrides
    });
  };

  it("ведёт неавторизованного пользователя в единый центр профилей и аккаунта", () => {
    mockAuth();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("home-entry-banner")).toBeInTheDocument();
    expect(screen.getByText("Сначала откройте профили и аккаунт")).toBeInTheDocument();
    expect(screen.getByTestId("home-entry-open-profiles")).toHaveAttribute("href", "/profiles");
    expect(screen.queryByText("Создать аккаунт")).not.toBeInTheDocument();
    expect(screen.queryByText("Войти")).not.toBeInTheDocument();
  });

  it("показывает тот же переход для пользователя с аккаунтом, но без активного профиля", () => {
    mockAuth({
      isAuthenticated: true,
      account: {
        id: "acc-1",
        email: "test@example.com",
        displayName: "Test",
        createdAt: null,
        lastSignInAt: null
      }
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Аккаунт подключён, осталось выбрать профиль")).toBeInTheDocument();
    expect(screen.getByTestId("home-entry-open-profiles")).toHaveTextContent("Выбрать профиль");
    expect(screen.getByTestId("home-entry-open-profiles")).toHaveAttribute("href", "/profiles");
  });

  it("не показывает entry banner, когда активный профиль уже выбран", () => {
    mockAuth();
    mocks.useActiveUserDisplayName.mockReturnValue({ activeUserId: "user-1" });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("home-entry-banner")).not.toBeInTheDocument();
  });
});
