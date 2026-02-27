import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SchulteGrid } from "../../src/shared/ui/SchulteGrid";

describe("SchulteGrid", () => {
  it("renders all cells and handles click", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const values = Array.from({ length: 25 }, (_, index) => index + 1);

    render(<SchulteGrid values={values} onCellClick={handleClick} />);

    expect(screen.getAllByRole("button")).toHaveLength(25);
    await user.click(screen.getByText("7"));
    expect(handleClick).toHaveBeenCalledWith(7, expect.any(Number));
  });

  it("keeps grid semantics and applies explicit grid size", () => {
    const values = Array.from({ length: 9 }, (_, index) => index + 1);
    render(<SchulteGrid values={values} onCellClick={() => undefined} gridSize={6} />);

    const grid = screen.getByRole("grid", { name: "Таблица Шульте" });
    expect(grid).toHaveStyle({ "--grid-size": "6" });
  });
});
