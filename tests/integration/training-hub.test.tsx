import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TrainingHubPage } from "../../src/pages/TrainingHubPage";

describe("TrainingHubPage", () => {
  it("renders active modules and quick actions", () => {
    render(
      <MemoryRouter>
        <TrainingHubPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("training-hub-page")).toBeInTheDocument();
    expect(screen.getByText("Тренировки")).toBeInTheDocument();

    expect(screen.getByText("Таблица Шульте")).toBeInTheDocument();
    expect(screen.getByText("Sprint Math")).toBeInTheDocument();
    expect(screen.getByText("Reaction")).toBeInTheDocument();
    expect(screen.getByText("N-Back Lite")).toBeInTheDocument();
    expect(screen.getByText("Decision Rush")).toBeInTheDocument();

    const schulteCard = screen.getByText("Таблица Шульте").closest(".training-module-card");
    expect(schulteCard?.querySelector(".module-card-link")).toHaveAttribute("href", "/training/schulte");
    expect(schulteCard?.querySelector(".module-presession-link")).toHaveAttribute(
      "href",
      "/training/pre-session?module=schulte"
    );

    expect(screen.getByText("Быстрый доступ")).toBeInTheDocument();
    expect(screen.getAllByText("План дня").length).toBeGreaterThan(0);
    expect(screen.getByText("Статистика")).toBeInTheDocument();
    expect(screen.getByText("Настройки")).toBeInTheDocument();
  });

  it("renders links to alpha trainers", () => {
    render(
      <MemoryRouter>
        <TrainingHubPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("training-alpha-trainers")).toBeInTheDocument();
    expect(screen.getByTestId("training-alpha-memory-match")).toHaveAttribute(
      "href",
      "/training/memory-match"
    );
    expect(screen.getByTestId("training-alpha-spatial-memory")).toHaveAttribute(
      "href",
      "/training/spatial-memory"
    );
    expect(screen.getByTestId("training-alpha-block-pattern")).toHaveAttribute(
      "href",
      "/training/block-pattern"
    );
  });
});
