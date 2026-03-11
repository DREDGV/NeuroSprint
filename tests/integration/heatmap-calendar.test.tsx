import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeatmapCalendar } from "../../src/shared/ui/HeatmapCalendar";

describe("HeatmapCalendar", () => {
  it("renders stable month markers and legend labels for a multi-week range", () => {
    render(
      <HeatmapCalendar
        cells={[
          { localDate: "2026-01-29", completed: false, sessionsCount: 1, intensity: 1 },
          { localDate: "2026-01-30", completed: true, sessionsCount: 2, intensity: 2 },
          { localDate: "2026-01-31", completed: true, sessionsCount: 3, intensity: 3 },
          { localDate: "2026-02-01", completed: false, sessionsCount: 0, intensity: 0 },
          { localDate: "2026-02-02", completed: true, sessionsCount: 4, intensity: 3 },
          { localDate: "2026-02-03", completed: true, sessionsCount: 5, intensity: 4 },
          { localDate: "2026-02-04", completed: true, sessionsCount: 2, intensity: 2 },
          { localDate: "2026-03-01", completed: false, sessionsCount: 1, intensity: 1 },
          { localDate: "2026-03-02", completed: true, sessionsCount: 2, intensity: 2 },
          { localDate: "2026-03-03", completed: true, sessionsCount: 3, intensity: 3 }
        ]}
      />
    );

    expect(screen.getByTestId("heatmap-calendar")).toBeInTheDocument();
    expect(screen.getByText("Янв")).toBeInTheDocument();
    expect(screen.getByText("Фев")).toBeInTheDocument();
    expect(screen.getByLabelText(/1 мар\./i)).toBeInTheDocument();
    expect(screen.getByText("Меньше")).toBeInTheDocument();
    expect(screen.getByText("Больше")).toBeInTheDocument();
  });
});
