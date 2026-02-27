import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SessionResultSummary } from "../../src/shared/ui/SessionResultSummary";

describe("SessionResultSummary", () => {
  it("renders common result contract with retry and stats actions", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <MemoryRouter>
        <SessionResultSummary
          testId="session-result"
          title="Результаты"
          metrics={[
            { label: "Точность", value: "95.0%" },
            { label: "Score", value: "12.50" }
          ]}
          previousSummary="С прошлой попыткой: +1.10"
          bestSummary="Лучший результат: 13.00"
          tip="Сохраняйте точность выше 85%."
          saveState={{ testId: "save-state", text: "saved" }}
          saveSummary="Результаты сохранены."
          extraNotes={["Адаптация: уровень 3 -> 4"]}
          onRetry={onRetry}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId("session-result")).toBeInTheDocument();
    expect(screen.getByText("Точность: 95.0%")).toBeInTheDocument();
    expect(screen.getByText("Score: 12.50")).toBeInTheDocument();
    expect(screen.getByText("С прошлой попыткой: +1.10")).toBeInTheDocument();
    expect(screen.getByText("Лучший результат: 13.00")).toBeInTheDocument();
    expect(screen.getByText("Сохраняйте точность выше 85%.")).toBeInTheDocument();
    expect(screen.getByTestId("save-state")).toHaveTextContent("saved");
    expect(screen.getByText("Результаты сохранены.")).toBeInTheDocument();
    expect(screen.getByText("Адаптация: уровень 3 -> 4")).toBeInTheDocument();

    const statsLink = screen.getByTestId("session-result-stats-link");
    expect(statsLink).toHaveAttribute("href", "/stats");

    await user.click(screen.getByTestId("session-result-retry-btn"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
