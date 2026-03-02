import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { NBackSessionPage } from "../../src/pages/NBackSessionPage";
import { NBackSetupPage } from "../../src/pages/NBackSetupPage";
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

describe("NBack setup/session", () => {
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
      <MemoryRouter initialEntries={["/training/nback"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/nback" element={<NBackSetupPage />} />
            <Route path="/training/nback/session" element={<NBackSessionPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("nback-setup-page")).toBeInTheDocument();
    await user.selectOptions(screen.getByTestId("nback-level-select"), "2");
    await user.click(screen.getByTestId("nback-start-btn"));
    expect(await screen.findByTestId("nback-session-page")).toBeInTheDocument();
  });

  it("saves nback session with required fields", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/training/nback/session",
            state: { setup: { level: 1, durationSec: 60 } }
          }
        ]}
      >
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/nback/session" element={<NBackSessionPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("nback-session-page")).toBeInTheDocument();
    const realNow = Date.now;
    let offsetMs = 0;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => realNow() + offsetMs);

    await user.click(screen.getByTestId("nback-start-session-btn"));
    offsetMs = 61_000;

    await waitFor(() => {
      expect(mocks.sessionRepository.save).toHaveBeenCalledTimes(1);
    }, { timeout: 5_000 });

    dateNowSpy.mockRestore();

    await waitFor(() => {
      expect(screen.getByTestId("nback-result")).toBeInTheDocument();
    });

    const savedSession = mocks.sessionRepository.save.mock.calls[0]?.[0];
    expect(savedSession.taskId).toBe("n_back");
    expect(savedSession.moduleId).toBe("n_back");
    expect(savedSession.mode).toBe("n_back");
    expect(savedSession.modeId).toBe("nback_1");
    expect(savedSession.difficulty.gridSize).toBe(3);
    expect(savedSession.difficulty.mode).toBe("n_back");
  });
});
