import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MainNav } from "../../src/widgets/MainNav";

describe("MainNav roles", () => {
  it("shows full teacher navigation", () => {
    render(
      <MemoryRouter>
        <MainNav role="teacher" />
      </MemoryRouter>
    );

    expect(screen.getByTestId("nav-link-classes")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-profiles")).toBeInTheDocument();
  });

  it("hides teacher sections for student role", () => {
    render(
      <MemoryRouter>
        <MainNav role="student" />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("nav-link-classes")).not.toBeInTheDocument();
    expect(screen.getByTestId("nav-link-profiles")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-training")).toBeInTheDocument();
  });

  it("shows profiles in home role but hides classes", () => {
    render(
      <MemoryRouter>
        <MainNav role="home" />
      </MemoryRouter>
    );

    expect(screen.getByTestId("nav-link-profiles")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-link-classes")).not.toBeInTheDocument();
  });
});
