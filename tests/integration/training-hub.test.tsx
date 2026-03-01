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

    expect(screen.getByTestId("training-module-schulte")).toBeInTheDocument();
    expect(screen.getByTestId("training-module-sprint_math")).toBeInTheDocument();
    expect(screen.getByTestId("training-module-reaction")).toBeInTheDocument();
    expect(screen.getByTestId("training-open-reaction")).toBeInTheDocument();
    expect(screen.getByTestId("training-open-presession-schulte")).toBeInTheDocument();
    expect(screen.getByTestId("training-open-presession-sprint_math")).toBeInTheDocument();
    expect(screen.getByTestId("training-open-presession-reaction")).toBeInTheDocument();
    expect(screen.getByTestId("training-module-n_back")).toHaveClass("is-disabled");
  });
});
