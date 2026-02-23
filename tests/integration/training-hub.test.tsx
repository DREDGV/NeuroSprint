import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TrainingHubPage } from "../../src/pages/TrainingHubPage";

describe("TrainingHubPage", () => {
  it("renders modules and coming soon cards", () => {
    render(
      <MemoryRouter>
        <TrainingHubPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Таблица Шульте")).toBeInTheDocument();
    expect(screen.getAllByText("Скоро").length).toBeGreaterThan(0);
  });
});

