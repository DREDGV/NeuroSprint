import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { MemoryGridSessionPage } from "../../src/pages/MemoryGridSessionPage";
import { MemoryGridSetupPage } from "../../src/pages/MemoryGridSetupPage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    save: vi.fn()
  },
  trainingRepository: {
    listRecentSessionsByMode: vi.fn()
  },
  userRepository: {
    list: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/training/trainingRepository", () => ({
  trainingRepository: mocks.trainingRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

vi.mock("../../src/features/memory-grid/engine", async () => {
  const actual = await vi.importActual<typeof import("../../src/features/memory-grid/engine")>(
    "../../src/features/memory-grid/engine"
  );
  return {
    ...actual,
    generateMemoryGridSequence: vi.fn(() => [0])
  };
});

describe("MemoryGrid flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");
    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "Лёва", role: "student", createdAt: "2026-02-25T12:00:00.000Z" }
    ]);
    mocks.trainingRepository.listRecentSessionsByMode.mockResolvedValue([]);
    mocks.sessionRepository.save.mockResolvedValue(undefined);
  });

  it("starts session from setup page", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/training/memory-grid"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/memory-grid" element={<MemoryGridSetupPage />} />
            <Route path="/training/memory-grid/session" element={<MemoryGridSessionPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("memory-grid-setup-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("memory-grid-mode-rush"));
    await user.click(screen.getByTestId("memory-grid-start-btn"));
    expect(await screen.findByTestId("memory-grid-session-page")).toBeInTheDocument();
  });

  it("saves memory-grid session with required fields", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/training/memory-grid/session",
            state: {
              setup: {
                mode: "classic",
                difficulty: "standard",
                gridSize: 3,
                startLevel: 1,
                durationSec: 60
              }
            }
          }
        ]}
      >
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/memory-grid/session" element={<MemoryGridSessionPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("memory-grid-session-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("memory-grid-start-btn"));

    await waitFor(
      () => {
        expect(screen.getByTestId("memory-grid-status").textContent).toContain("Повторите");
      },
      { timeout: 4000 }
    );

    const grid = screen.getByTestId("memory-grid");
    const cells = grid.querySelectorAll("button");
    expect(cells.length).toBeGreaterThan(1);

    await user.click(cells[1] as HTMLButtonElement);

    await waitFor(() => {
      expect(mocks.sessionRepository.save).toHaveBeenCalledTimes(1);
    }, { timeout: 5000 });

    const savedSession = mocks.sessionRepository.save.mock.calls[0]?.[0];
    expect(savedSession.taskId).toBe("memory_grid");
    expect(savedSession.moduleId).toBe("memory_grid");
    expect(savedSession.mode).toBe("memory_grid");
    expect(savedSession.modeId).toBe("memory_grid_classic");
    expect(savedSession.difficulty.gridSize).toBe(3);
    expect(savedSession.difficulty.mode).toBe("memory_grid");
  });
});
