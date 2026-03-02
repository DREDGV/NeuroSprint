import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReactionPage } from "../../src/pages/ReactionPage";

const mocks = vi.hoisted(() => ({
  save: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: {
    save: mocks.save
  }
}));

vi.mock("../../src/app/useActiveUserDisplayName", () => ({
  useActiveUserDisplayName: () => ({
    activeUserId: "u1",
    activeUserName: "Тестовый пользователь"
  })
}));

function renderReactionRoute(modeId: string) {
  render(
    <MemoryRouter initialEntries={[`/training/reaction?mode=${modeId}`]}>
      <Routes>
        <Route path="/training/reaction" element={<ReactionPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function completeReactionChoiceSeries(modeId: string) {
  renderReactionRoute(modeId);

  for (let round = 0; round < 5; round += 1) {
    fireEvent.click(screen.getByTestId("reaction-start-btn"));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId("reaction-challenge")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("reaction-option-0"));
  }
}

describe("Reaction challenge mode persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.save.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("saves finished series as reaction_stroop when opened from challenge route", async () => {
    await completeReactionChoiceSeries("reaction_stroop");

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0].modeId).toBe("reaction_stroop");
  });

  it("saves finished series as reaction_pair when opened from challenge route", async () => {
    await completeReactionChoiceSeries("reaction_pair");

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0].modeId).toBe("reaction_pair");
  });

  it("saves finished series as reaction_number when opened from challenge route", async () => {
    await completeReactionChoiceSeries("reaction_number");

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0].modeId).toBe("reaction_number");
  });
});
