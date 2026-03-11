import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SkillStatsTab } from "../../src/features/skills/components/SkillStatsTab";

const mocks = vi.hoisted(() => ({
  getSkillMapSummary: vi.fn()
}));

vi.mock("../../src/shared/lib/progress/skillPercentileService", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/progress/skillPercentileService")>(
    "../../src/shared/lib/progress/skillPercentileService"
  );

  return {
    ...actual,
    getSkillMapSummary: mocks.getSkillMapSummary
  };
});

describe("SkillStatsTab", () => {
  it("shows a useful starter state when there is no session history", async () => {
    mocks.getSkillMapSummary.mockResolvedValue({
      userId: "u1",
      skills: [],
      avgPercentile: 0,
      bestSkill: null,
      weakestSkill: null
    });

    render(
      <MemoryRouter>
        <SkillStatsTab userId="u1" sessions={[]} />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("skill-stats-empty")).toBeInTheDocument();
    expect(screen.getByText("Карта навыков")).toBeInTheDocument();
    expect(screen.getByText(/Обычно достаточно 3-5 коротких сессий/i)).toBeInTheDocument();
    expect(screen.getByTestId("skill-stats-empty-start-memory_match")).toHaveAttribute(
      "href",
      "/training/memory-match"
    );
    expect(screen.getByTestId("skill-stats-empty-start-schulte")).toHaveAttribute(
      "href",
      "/training/schulte"
    );
    expect(screen.getByTestId("skill-stats-empty-start-reaction")).toHaveAttribute(
      "href",
      "/training/reaction"
    );
  });
});
