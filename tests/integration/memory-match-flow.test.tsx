import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryMatchPage } from "../../src/pages/MemoryMatchPage";

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

function collectPairs(buttons: HTMLButtonElement[]): Array<[number, number]> {
  const positions = new Map<string, number[]>();

  buttons.forEach((button, index) => {
    const key = button.dataset.cardKey ?? "";
    if (!key) {
      return;
    }

    const bucket = positions.get(key) ?? [];
    bucket.push(index);
    positions.set(key, bucket);
  });

  return [...positions.values()]
    .filter((indexes): indexes is [number, number] => indexes.length === 2)
    .map((indexes) => [indexes[0], indexes[1]]);
}

describe("MemoryMatchPage", () => {
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
        id: "prev-hard",
        userId: "u1",
        taskId: "memory_match",
        mode: "memory_match",
        moduleId: "memory_match",
        modeId: "memory_match_classic",
        level: 8,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-03-01T10:00:00.000Z",
        localDate: "2026-03-01",
        durationMs: 45000,
        score: 210,
        accuracy: 0.88,
        speed: 18,
        errors: 2,
        correctCount: 18,
        effectiveCorrect: 17,
        audioEnabledSnapshot: {},
        difficulty: {
          gridSize: 6,
          numbersCount: 18,
          mode: "memory_match"
        }
      },
      {
        id: "prev-easy",
        userId: "u1",
        taskId: "memory_match",
        mode: "memory_match",
        moduleId: "memory_match",
        modeId: "memory_match_classic",
        level: 1,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-02-28T10:00:00.000Z",
        localDate: "2026-02-28",
        durationMs: 32000,
        score: 120,
        accuracy: 0.82,
        speed: 9,
        errors: 2,
        correctCount: 8,
        effectiveCorrect: 7,
        audioEnabledSnapshot: {},
        difficulty: {
          gridSize: 4,
          numbersCount: 8,
          mode: "memory_match"
        }
      }
    ]);
    mocks.sessionRepository.save.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restarts cleanly during preview and saves a completed easy round", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <MemoryRouter>
        <MemoryMatchPage />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("memory-match-setup-summary")).toBeInTheDocument();
    await user.click(screen.getByTestId("memory-match-start"));

    const grid = await screen.findByTestId("memory-match-grid");
    expect(await screen.findByTestId("memory-match-session-shell")).toBeInTheDocument();
    expect(screen.getByTestId("memory-match-live-summary")).toHaveTextContent("0/8");
    expect(within(grid).getAllByRole("button")[0]).toHaveAttribute("aria-label");

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    await user.click(screen.getByTestId("memory-match-restart"));

    expect(screen.getByTestId("memory-match-live-summary")).toHaveTextContent("6с");

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByTestId("memory-match-live-summary")).toHaveTextContent("Запоминание");

    const previewButtons = within(grid).getAllByRole("button") as HTMLButtonElement[];
    const pairs = collectPairs(previewButtons);
    expect(pairs).toHaveLength(8);

    act(() => {
      vi.advanceTimersByTime(2700);
    });

    await waitFor(() => {
      expect(screen.getByTestId("memory-match-live-summary")).toHaveTextContent("Поиск пар");
    });

    for (const [first, second] of pairs) {
      const currentButtons = within(screen.getByTestId("memory-match-grid")).getAllByRole("button") as HTMLButtonElement[];
      await user.click(currentButtons[first]);
      await user.click(currentButtons[second]);
      act(() => {
        vi.advanceTimersByTime(700);
      });
    }

    expect(await screen.findByTestId("memory-match-result-hero")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.sessionRepository.save).toHaveBeenCalledTimes(1);
    });

    const savedSession = mocks.sessionRepository.save.mock.calls[0]?.[0];
    expect(savedSession.taskId).toBe("memory_match");
    expect(savedSession.moduleId).toBe("memory_match");
    expect(savedSession.modeId).toBe("memory_match_classic");
    expect(savedSession.difficulty.gridSize).toBe(4);
    expect(savedSession.difficulty.numbersCount).toBe(8);

    expect(screen.getByTestId("memory-match-result")).toBeInTheDocument();
    expect(screen.getByTestId("memory-match-save-ok")).toBeInTheDocument();
  });
});
