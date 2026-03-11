import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLevelUpCelebrationKey } from "../../src/shared/lib/progress/levelCelebration";
import { SessionRewardQueue } from "../../src/widgets/SessionRewardQueue";

describe("SessionRewardQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows level up first, then unlocked achievements, and marks the level celebration", () => {
    render(
      <SessionRewardQueue
        levelUp={{ fromLevel: 4, toLevel: 5 }}
        nextGoalSummary="До уровня 6 осталось 180 XP"
        achievements={[
          { id: "sessions_10", title: "Первые шаги", icon: "🏃" },
          { id: "streak_3", title: "Ритм 3 дня", icon: "🔥" }
        ]}
        userId="u1"
        localDate="2026-03-10"
      />
    );

    expect(screen.getByTestId("level-up-modal")).toHaveTextContent("4");
    expect(screen.getByTestId("level-up-modal")).toHaveTextContent("5");
    expect(screen.getByTestId("level-up-modal")).toHaveTextContent("До уровня 6 осталось 180 XP");
    expect(localStorage.getItem(getLevelUpCelebrationKey("u1", "2026-03-10"))).toBe("1");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId("achievement-toast")).toHaveTextContent("Первые шаги");

    act(() => {
      vi.advanceTimersByTime(4300);
    });

    expect(screen.getByTestId("achievement-toast")).toHaveTextContent("Ритм 3 дня");

    act(() => {
      vi.advanceTimersByTime(4300);
    });

    expect(screen.queryByTestId("achievement-toast")).not.toBeInTheDocument();
  });
});
