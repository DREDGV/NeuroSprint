import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TrainingHubPage } from "../../src/pages/TrainingHubPage";

describe("TrainingHubPage", () => {
  it("renders active modules and keeps coming-soon cards", () => {
    render(
      <MemoryRouter>
        <TrainingHubPage />
      </MemoryRouter>
    );

    // Check hero section
    expect(screen.getByTestId("training-hub-page")).toBeInTheDocument();
    expect(screen.getByText("Тренировки")).toBeInTheDocument();
    
    // Check all active modules are rendered
    expect(screen.getByText("Таблица Шульте")).toBeInTheDocument();
    expect(screen.getByText("Sprint Math")).toBeInTheDocument();
    expect(screen.getByText("Reaction")).toBeInTheDocument();
    expect(screen.getByText("N-Back Lite")).toBeInTheDocument();
    expect(screen.getByText("Decision Rush")).toBeInTheDocument();
    
    // Check module cards have correct links
    const schulteCard = screen.getByText("Таблица Шульте").closest(".training-module-card");
    expect(schulteCard?.querySelector(".module-card-link")).toHaveAttribute("href", "/training/schulte");
    expect(schulteCard?.querySelector(".module-presession-link")).toHaveAttribute("href", "/training/pre-session?module=schulte");
    
    const sprintMathCard = screen.getByText("Sprint Math").closest(".training-module-card");
    expect(sprintMathCard?.querySelector(".module-card-link")).toHaveAttribute("href", "/training/sprint-math");
    expect(sprintMathCard?.querySelector(".module-presession-link")).toHaveAttribute("href", "/training/pre-session?module=sprint_math");
    
    // Check quick actions section
    expect(screen.getByText("Быстрый доступ")).toBeInTheDocument();
    expect(screen.getAllByText("План дня").length).toBeGreaterThan(0);
    expect(screen.getByText("Статистика")).toBeInTheDocument();
    expect(screen.getByText("Настройки")).toBeInTheDocument();
  });
});
