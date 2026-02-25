import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLE_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => {
  let groups = [{ id: "g1", name: "3А", createdAt: "2026-02-24T10:00:00.000Z" }];
  let users = [{ id: "u1", name: "Анна", createdAt: "2026-02-24T10:00:00.000Z" }];
  let groupUsers: Record<string, string[]> = { g1: ["u1"] };

  const groupRepository = {
    listGroups: vi.fn(async () => groups),
    listStudents: vi.fn(async (groupId: string) =>
      users.filter((user) => (groupUsers[groupId] ?? []).includes(user.id))
    ),
    createGroup: vi.fn(async (name: string) => {
      const group = { id: "g2", name, createdAt: "2026-02-24T10:00:00.000Z" };
      groups = [...groups, group];
      groupUsers[group.id] = [];
      return group;
    }),
    renameGroup: vi.fn(async () => {}),
    removeGroup: vi.fn(async () => {}),
    createStudent: vi.fn(async (groupId: string, name: string) => {
      const id = `u${users.length + 1}`;
      const created = { id, name, createdAt: "2026-02-24T10:00:00.000Z" };
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

  return { groupRepository, userRepository };
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
    localStorage.removeItem(APP_ROLE_KEY);
  });

  it("creates class and adds student", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/classes"]}>
        <Routes>
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/:classId" element={<ClassesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("classes-page")).toBeInTheDocument();

    await user.clear(screen.getByTestId("class-name-input"));
    await user.type(screen.getByTestId("class-name-input"), "4Б");
    await user.click(screen.getByTestId("create-class-btn"));

    await waitFor(() => {
      expect(mocks.groupRepository.createGroup).toHaveBeenCalledWith("4Б");
    });

    await user.type(screen.getByTestId("student-name-input"), "Лёва");
    await user.click(screen.getByTestId("create-student-btn"));

    await waitFor(() => {
      expect(mocks.groupRepository.createStudent).toHaveBeenCalled();
      expect(screen.getByText("Лёва")).toBeInTheDocument();
    });
  });

  it("shows restricted state for non-teacher role", async () => {
    localStorage.setItem(APP_ROLE_KEY, "student");

    render(
      <MemoryRouter initialEntries={["/classes"]}>
        <Routes>
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/:classId" element={<ClassesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("classes-page")).toBeInTheDocument();
    expect(screen.getByText(/учитель|teacher/i)).toBeInTheDocument();
    expect(screen.queryByTestId("class-name-input")).not.toBeInTheDocument();
  });
});
