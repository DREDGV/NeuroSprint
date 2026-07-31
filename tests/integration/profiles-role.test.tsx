import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY, PRIVILEGED_PROFILE_ROLES_KEY } from "../../src/shared/constants/storage";

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
    getById: vi.fn(async (id: string) => users.find((entry) => entry.id === id) ?? null),
    isLocked: vi.fn(() => false)
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
    localStorage.setItem(PRIVILEGED_PROFILE_ROLES_KEY, "1");
  });

  it.todo("creates profile with selected role and applies it as active role");

  it.todo("updates role for existing active profile");

  it.todo("blocks demotion and delete for last teacher in UI");

  it.todo("limits student role: create only student profiles and no role editing");

  it.todo("enables recovery mode when no teacher exists");
});
