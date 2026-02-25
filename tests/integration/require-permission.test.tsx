import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_ROLE_KEY } from "../../src/shared/constants/storage";
import { RequirePermission } from "../../src/app/RequirePermission";

describe("RequirePermission", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children when role has permission", () => {
    localStorage.setItem(APP_ROLE_KEY, "teacher");

    render(
      <MemoryRouter>
        <RequirePermission permission="classes:view" sectionTitle="Классы">
          <div data-testid="allowed-child">ok</div>
        </RequirePermission>
      </MemoryRouter>
    );

    expect(screen.getByTestId("allowed-child")).toBeInTheDocument();
    expect(screen.queryByTestId("permission-denied-panel")).not.toBeInTheDocument();
  });

  it("renders permission hint when role has no access", () => {
    localStorage.setItem(APP_ROLE_KEY, "student");

    render(
      <MemoryRouter>
        <RequirePermission permission="classes:view" sectionTitle="Классы" />
      </MemoryRouter>
    );

    const panel = screen.getByTestId("permission-denied-panel");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent(/текущей роли:.*Ученик/i);
    expect(panel).toHaveTextContent(/выберите роль:.*Учитель/i);
    expect(screen.getByRole("link", { name: "Настройки роли" })).toBeInTheDocument();
  });
});
