import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLE_KEY, FEATURE_FLAGS_KEY } from "../../src/shared/constants/storage";
import { MainNav } from "../../src/widgets/MainNav";

vi.mock("../../src/app/useAuth", () => ({
  useAuth: () => ({
    isConfigured: true,
    isAuthenticated: true,
    isLoading: false,
    account: { id: "acc-1", email: "t@t.com", displayName: "T", createdAt: null, lastSignInAt: null },
    siteRole: "user",
    isSiteAdmin: false,
    isModerator: false
  })
}));

describe("MainNav roles", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify({ classes_ui: true }));
  });

  it("shows full teacher navigation", () => {
    localStorage.setItem(APP_ROLE_KEY, "teacher");

    render(
      <MemoryRouter>
        <MainNav />
      </MemoryRouter>
    );

    expect(screen.getByTestId("nav-link-classes")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-profiles")).toBeInTheDocument();
  });

  it("hides teacher sections for student role", () => {
    localStorage.setItem(APP_ROLE_KEY, "student");

    render(
      <MemoryRouter>
        <MainNav />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("nav-link-classes")).not.toBeInTheDocument();
    expect(screen.getByTestId("nav-link-profiles")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-training")).toBeInTheDocument();
  });

  it("shows profiles in home role but hides classes", () => {
    localStorage.setItem(APP_ROLE_KEY, "home");

    render(
      <MemoryRouter>
        <MainNav />
      </MemoryRouter>
    );

    expect(screen.getByTestId("nav-link-profiles")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-link-classes")).not.toBeInTheDocument();
  });
});
