import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpatialMemoryPage } from "../../src/pages/SpatialMemoryPage";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    listByUser: vi.fn(),
    save: vi.fn()
  },
  useActiveUserDisplayName: vi.fn()
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/app/useActiveUserDisplayName", () => ({
  useActiveUserDisplayName: mocks.useActiveUserDisplayName
}));

describe("SpatialMemoryPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.useActiveUserDisplayName.mockReturnValue({
      activeUserId: "u1",
      activeUserName: "Test User",
      activeUserRole: "student"
    });
    mocks.sessionRepository.listByUser.mockResolvedValue([
      {
        id: "prev-1",
        userId: "u1",
        taskId: "spatial_memory",
        mode: "spatial_memory",
        moduleId: "spatial_memory",
        modeId: "spatial_memory_classic",
        level: 2,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-03-09T10:00:00.000Z",
        localDate: "2026-03-09",
        durationMs: 9000,
        score: 118,
        accuracy: 0.66,
        speed: 12,
        errors: 1,
        correctCount: 2,
        difficulty: {
          gridSize: 4,
          numbersCount: 16,
          mode: "spatial_memory"
        }
      }
    ]);
    mocks.sessionRepository.save.mockResolvedValue({
      xpGranted: 18,
      unlockedAchievements: [],
      newlyUnlockedAchievements: [],
      levelUp: null,
      nextGoal: null
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a full easy round and saves the session into progress pipeline", async () => {
    render(
      <MemoryRouter>
        <SpatialMemoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Соберите спокойный старт")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Начать раунд" }));

    expect(screen.getByTestId("spatial-grid-memorize")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const recallGrid = screen.getByTestId("spatial-grid-recall");
    const buttons = within(recallGrid).getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    fireEvent.click(screen.getByRole("button", { name: "Проверить ответ" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("spatial-memory-result")).toBeInTheDocument();
    expect(mocks.sessionRepository.save).toHaveBeenCalledTimes(1);

    const savedSession = mocks.sessionRepository.save.mock.calls[0]?.[0];
    expect(savedSession.taskId).toBe("spatial_memory");
    expect(savedSession.moduleId).toBe("spatial_memory");
    expect(savedSession.modeId).toBe("spatial_memory_classic");
    expect(savedSession.difficulty.gridSize).toBe(4);
    expect(savedSession.difficulty.mode).toBe("spatial_memory");
  });

  it("keeps wrong guesses on the board and lets the player continue searching", async () => {
    render(
      <MemoryRouter>
        <SpatialMemoryPage />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Начать раунд" }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const recallGrid = screen.getByTestId("spatial-grid-recall");
    const buttons = within(recallGrid).getAllByRole("button");

    buttons.slice(0, 6).forEach((button) => {
      fireEvent.click(button);
    });

    expect(buttons.filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(6);
  });

  it("auto-finishes the round when all target cells are found", async () => {
    render(
      <MemoryRouter>
        <SpatialMemoryPage />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Начать раунд" }));

    const memorizeGrid = screen.getByTestId("spatial-grid-memorize");
    const memorizeCells = Array.from(memorizeGrid.children);
    const targetIndexes = memorizeCells
      .map((cell, index) => (cell.className.includes("is-target") ? index : -1))
      .filter((index) => index >= 0);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const recallGrid = screen.getByTestId("spatial-grid-recall");
    const buttons = within(recallGrid).getAllByRole("button");

    targetIndexes.forEach((index) => {
      fireEvent.click(buttons[index]);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("spatial-memory-result")).toBeInTheDocument();
  });
});
