import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY } from "../../src/shared/constants/storage";

vi.mock("../../src/app/useAuth", () => ({
  useAuth: () => ({
    isConfigured: true,
    isAuthenticated: true,
    isLoading: false,
    syncInProgress: false,
    syncError: null,
    account: { id: "acc-1", email: "t@t.com", displayName: "T", createdAt: null, lastSignInAt: null },
    siteRole: "user",
    isSiteAdmin: false,
    isModerator: false,
    logout: vi.fn().mockResolvedValue(undefined),
    syncAccountData: vi.fn().mockResolvedValue(undefined),
    updateAccountProfile: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock("../../src/shared/lib/auth/profileRolePolicy", () => ({
  allowPrivilegedProfileRoles: () => true,
  isPrivilegedProfileRole: (role: string) => role === "teacher" || role === "admin",
  canSelfAssignProfileRole: () => true,
  getSelfServiceDefaultRole: () => "home" as const,
  getSelfServiceCreateRoles: () => ["home", "student", "teacher"] as const,
  getEditableSelfServiceRoles: () => ["home", "student", "teacher"] as const
}));

vi.mock("../../src/entities/account/accountSyncService", () => ({
  accountSyncService: {
    syncLinkedProfile: vi.fn().mockResolvedValue(undefined),
    importLocalGuestProfiles: vi.fn().mockResolvedValue({ imported: [], errors: [] })
  }
}));

vi.mock("../../src/shared/lib/analytics/siteAnalytics", () => ({
  trackGuestStarted: vi.fn(),
  trackProfileActivated: vi.fn(),
  trackProfileCreated: vi.fn()
}));

const mocks = vi.hoisted(() => {
  type ProfileUser = {
    id: string;
    name: string;
    role: "teacher" | "student" | "home";
    createdAt: string;
    ownershipKind: "guest" | "linked";
    syncState: "local" | "pending" | "synced" | "error";
    avatarEmoji?: string;
    lastActivity?: string;
    totalSessions?: number;
  };

  let users: ProfileUser[] = [
    {
      id: "u1",
      name: "Лёва",
      role: "student",
      createdAt: "2026-02-25T12:00:00.000Z",
      ownershipKind: "guest",
      syncState: "local"
    }
  ];

  const userRepository = {
    list: vi.fn(async () => users),
    create: vi.fn(async (name: string, role: "teacher" | "student" | "home") => {
      const created: ProfileUser = {
        id: `u${users.length + 1}`,
        name,
        role,
        createdAt: "2026-02-25T12:00:00.000Z",
        ownershipKind: "guest",
        syncState: "local"
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
    getUsers: () => users,
    reset() {
      users = [
        {
          id: "u1",
          name: "Лёва",
          role: "student",
          createdAt: "2026-02-25T12:00:00.000Z",
          ownershipKind: "guest",
          syncState: "local"
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
    localStorage.setItem(APP_ROLE_KEY, "teacher");
  });

  it("creates profile with selected role and applies it as active role", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/profiles"]}>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const nameInput = await screen.findByTestId("profile-name-input");
    await user.type(nameInput, "Миша");

    const roleSelect = screen.getByTestId("profile-role-select");
    await user.selectOptions(roleSelect, "teacher");

    const createBtn = screen.getByTestId("create-profile-btn");
    await user.click(createBtn);

    await waitFor(() => {
      expect(mocks.userRepository.create).toHaveBeenCalled();
    });

    const callArgs = mocks.userRepository.create.mock.calls[0];
    expect(callArgs[0]).toBe("Миша");
    expect(callArgs[1]).toBe("teacher");
  });

  it("updates role for existing active profile", async () => {
    mocks.setUsers([
      {
        id: "u1",
        name: "Лёва",
        role: "student",
        createdAt: "2026-02-25T12:00:00.000Z",
        ownershipKind: "guest",
        syncState: "local"
      }
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/profiles"]}>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const roleEdit = await screen.findByTestId("profile-role-edit-u1");
    await user.selectOptions(roleEdit, "teacher");

    const saveBtn = screen.getByTestId("save-profile-role-u1");
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mocks.userRepository.updateRole).toHaveBeenCalledWith("u1", "teacher");
    });
  });

  it("blocks demotion and delete for last teacher in UI", async () => {
    mocks.setUsers([
      {
        id: "t1",
        name: "Анна",
        role: "teacher",
        createdAt: "2026-02-25T12:00:00.000Z",
        ownershipKind: "guest",
        syncState: "local"
      }
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/profiles"]}>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await screen.findByTestId("profile-card-t1");

    expect(screen.getByText(/последний профиль с ролью «Учитель»/i)).toBeInTheDocument();

    const saveBtn = screen.getByTestId("save-profile-role-t1");
    expect(saveBtn).toBeDisabled();

    const deleteBtn = screen.getByTestId("delete-profile-t1");
    expect(deleteBtn).toBeDisabled();
  });

  it("limits student role: create only student profiles and no role editing", async () => {
    localStorage.setItem(APP_ROLE_KEY, "student");
    mocks.setUsers([
      {
        id: "u1",
        name: "Лёва",
        role: "student",
        createdAt: "2026-02-25T12:00:00.000Z",
        ownershipKind: "guest",
        syncState: "local"
      },
      {
        id: "t1",
        name: "Анна",
        role: "teacher",
        createdAt: "2026-02-25T12:00:00.000Z",
        ownershipKind: "guest",
        syncState: "local"
      }
    ]);

    render(
      <MemoryRouter initialEntries={["/profiles"]}>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await screen.findByTestId("profile-name-input");

    expect(screen.getByTestId("profiles-create-role-note")).toBeInTheDocument();
    expect(screen.getByTestId("profile-role-select")).toBeDisabled();

    expect(screen.getByTestId("profile-role-edit-u1")).toBeDisabled();
  });

  it("enables recovery mode when no teacher exists", async () => {
    mocks.setUsers([
      {
        id: "u1",
        name: "Лёва",
        role: "student",
        createdAt: "2026-02-25T12:00:00.000Z",
        ownershipKind: "guest",
        syncState: "local"
      }
    ]);

    render(
      <MemoryRouter initialEntries={["/profiles"]}>
        <ActiveUserProvider>
          <ProfilesPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await screen.findByTestId("profile-role-select");

    expect(screen.getByTestId("profiles-recovery-mode-note")).toBeInTheDocument();
    expect(screen.getByText(/нет активного профиля с ролью «Учитель»/i)).toBeInTheDocument();

    const roleSelect = screen.getByTestId("profile-role-select");
    const options = Array.from(roleSelect.querySelectorAll("option"));
    const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);
    expect(optionValues).toContain("teacher");
  });
});
