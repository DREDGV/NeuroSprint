import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => {
  type ProfileUser = {
    id: string;
    name: string;
    role: "teacher" | "student" | "home";
    createdAt: string;
  };

  let users: ProfileUser[] = [
    {
      id: "u1",
      name: "Лёва",
      role: "student",
      createdAt: "2026-02-25T12:00:00.000Z"
    }
  ];

  const userRepository = {
    list: vi.fn(async () => users),
    create: vi.fn(async (name: string, role: "teacher" | "student" | "home") => {
      const created = {
        id: `u${users.length + 1}`,
        name,
        role,
        createdAt: "2026-02-25T12:00:00.000Z"
      };
      users = [...users, created];
      return created;
    }),
    rename: vi.fn(async () => {}),
    remove: vi.fn(async (id: string) => {
      users = users.filter((entry) => entry.id !== id);
    }),
    updateRole: vi.fn(async (id: string, role: "teacher" | "student" | "home") => {
      users = users.map((entry) => (entry.id === id ? { ...entry, role } : entry));
    }),
    getById: vi.fn(async (id: string) => users.find((entry) => entry.id === id) ?? null)
  };

  return {
    userRepository,
    reset() {
      users = [
        {
          id: "u1",
          name: "Лёва",
          role: "student",
          createdAt: "2026-02-25T12:00:00.000Z"
        }
      ];
    },
    setUsers(nextUsers: ProfileUser[]) {
      users = [...nextUsers];
    }
  };
});

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

import { ProfilesPage } from "../../src/pages/ProfilesPage";

describe("ProfilesPage roles", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.reset();
    vi.clearAllMocks();
  });

  it("creates profile with selected role and applies it as active role", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.clear(screen.getByTestId("profile-name-input"));
    await user.type(screen.getByTestId("profile-name-input"), "Марина");
    await user.selectOptions(screen.getByTestId("profile-role-select"), "teacher");
    await user.click(screen.getByTestId("create-profile-btn"));

    await waitFor(() => {
      expect(mocks.userRepository.create).toHaveBeenCalledWith("Марина", "teacher");
    });
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBe("u2");
    expect(localStorage.getItem(APP_ROLE_KEY)).toBe("teacher");
    expect(screen.getByTestId("active-profile-status")).toHaveTextContent("Учитель");
  });

  it("updates role for existing active profile", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const select = await screen.findByTestId("profile-role-edit-u1");
    await user.selectOptions(select, "home");
    await user.click(screen.getByTestId("save-profile-role-u1"));

    await waitFor(() => {
      expect(mocks.userRepository.updateRole).toHaveBeenCalledWith("u1", "home");
    });
    expect(localStorage.getItem(APP_ROLE_KEY)).toBe("home");
    expect(screen.getByTestId("active-profile-status")).toHaveTextContent("Домашний");
  });

  it("blocks demotion and delete for last teacher in UI", async () => {
    const user = userEvent.setup();
    mocks.setUsers([
      {
        id: "t1",
        name: "Учитель",
        role: "teacher",
        createdAt: "2026-02-25T12:00:00.000Z"
      }
    ]);
    localStorage.setItem(ACTIVE_USER_KEY, "t1");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const select = await screen.findByTestId("profile-role-edit-t1");
    await user.selectOptions(select, "student");

    expect(screen.getByTestId("save-profile-role-t1")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Удалить" })).toBeDisabled();
    expect(screen.getByText(/последний учитель/i)).toBeInTheDocument();
  });

  it("limits student role: create only student profiles and no role editing", async () => {
    localStorage.setItem(APP_ROLE_KEY, "student");
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("profiles-create-role-note")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-role-select")).not.toBeInTheDocument();

    await user.type(screen.getByTestId("profile-name-input"), "Новый");
    await user.click(screen.getByTestId("create-profile-btn"));

    await waitFor(() => {
      expect(mocks.userRepository.create).toHaveBeenCalledWith("Новый", "student");
    });

    await user.click(screen.getByRole("button", { name: "Сделать активным" }));
    expect(localStorage.getItem(ACTIVE_USER_KEY)).toBe("u1");
    expect(screen.queryByTestId("profile-role-edit-u1")).not.toBeInTheDocument();
  });
});
