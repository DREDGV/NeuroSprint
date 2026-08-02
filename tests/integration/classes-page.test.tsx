import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY, FEATURE_FLAGS_KEY } from "../../src/shared/constants/storage";

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

vi.mock("../../src/features/competitions/hooks/useChallenges", () => ({
  useChallenges: () => ({
    challenges: [],
    incoming: [],
    outgoing: [],
    active: [],
    loading: false,
    error: null,
    sendChallenge: vi.fn().mockResolvedValue(undefined),
    respondToChallenge: vi.fn().mockResolvedValue(undefined),
    completeChallenge: vi.fn().mockResolvedValue(undefined),
    cancelChallenge: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined)
  })
}));

const mocks = vi.hoisted(() => {
  let groups = [{ id: "g1", name: "3А", createdAt: "2026-02-24T10:00:00.000Z" }];
  let users = [{ id: "u1", name: "Анна", role: "teacher", createdAt: "2026-02-24T10:00:00.000Z" }];
  let groupUsers: Record<string, string[]> = { g1: ["u1"] };

  const groupRepository = {
    listGroups: vi.fn(async () => groups),
    listOwnedGroups: vi.fn(async () => groups),
    listStudents: vi.fn(async (groupId: string) =>
      users.filter((user) => (groupUsers[groupId] ?? []).includes(user.id))
    ),
    createGroup: vi.fn(async (name: string) => {
      const group = { id: `g${groups.length + 1}`, name, createdAt: "2026-02-24T10:00:00.000Z" };
      groups = [...groups, group];
      groupUsers[group.id] = [];
      return group;
    }),
    renameGroup: vi.fn(async () => {}),
    removeGroup: vi.fn(async () => {}),
    createStudent: vi.fn(async (groupId: string, name: string) => {
      const id = `u${users.length + 1}`;
      const created = { id, name, role: "student" as const, createdAt: "2026-02-24T10:00:00.000Z" };
      users = [...users, created];
      groupUsers[groupId] = [...(groupUsers[groupId] ?? []), id];
      return created;
    }),
    assignStudent: vi.fn(async (groupId: string, userId: string) => {
      Object.keys(groupUsers).forEach((key) => {
        groupUsers[key] = (groupUsers[key] ?? []).filter((id) => id !== userId);
      });
      groupUsers[groupId] = [...(groupUsers[groupId] ?? []), userId];
      return {
        id: "m1",
        groupId,
        userId,
        joinedAt: "2026-02-24T10:00:00.000Z"
      };
    }),
    removeMember: vi.fn(async (groupId: string, userId: string) => {
      groupUsers[groupId] = (groupUsers[groupId] ?? []).filter((id) => id !== userId);
    }),
    listGroupsForUser: vi.fn(async (userId: string) => {
      const group = groups.find((entry) => (groupUsers[entry.id] ?? []).includes(userId));
      return group ? [group] : [];
    })
  };

  const userRepository = {
    list: vi.fn(async () => users)
  };

  return {
    groupRepository,
    userRepository,
    reset() {
      groups = [{ id: "g1", name: "3А", createdAt: "2026-02-24T10:00:00.000Z" }];
      users = [{ id: "u1", name: "Анна", role: "teacher", createdAt: "2026-02-24T10:00:00.000Z" }];
      groupUsers = { g1: ["u1"] };
    }
  };
});

vi.mock("../../src/entities/group/groupRepository", () => ({
  groupRepository: mocks.groupRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

import { ClassesPage } from "../../src/pages/ClassesPage";

describe("ClassesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.reset();
    localStorage.setItem(APP_ROLE_KEY, "teacher");
    localStorage.setItem(ACTIVE_USER_KEY, "u1");
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify({ classes_ui: true }));
  });

  it("creates class and adds student", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/classes"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/classes/:classId" element={<ClassesPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("classes-page")).toBeInTheDocument();
    expect(screen.getByTestId("class-name-input")).toBeInTheDocument();

    await user.type(screen.getByTestId("class-name-input"), "4Б");
    await user.click(screen.getByTestId("create-class-btn"));

    await waitFor(() => {
      expect(mocks.groupRepository.createGroup).toHaveBeenCalledWith(
        "4Б",
        expect.objectContaining({ profileId: "u1" })
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText("4Б").length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId("student-name-input")).toBeInTheDocument();

    await user.type(screen.getByTestId("student-name-input"), "Миша");
    await user.click(screen.getByTestId("create-student-btn"));

    await waitFor(() => {
      expect(mocks.groupRepository.createStudent).toHaveBeenCalled();
    });

    const createStudentCall = mocks.groupRepository.createStudent.mock.calls[0];
    expect(createStudentCall[1]).toBe("Миша");

    await waitFor(() => {
      expect(screen.getAllByText("Миша").length).toBeGreaterThan(0);
    });
  });

  it("shows restricted state for non-teacher role", async () => {
    localStorage.setItem(APP_ROLE_KEY, "student");

    render(
      <MemoryRouter initialEntries={["/classes"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/classes/:classId" element={<ClassesPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("classes-page")).toBeInTheDocument();
    expect(screen.getByText(/учитель|teacher/i)).toBeInTheDocument();
    expect(screen.queryByTestId("class-name-input")).not.toBeInTheDocument();
  });
});
