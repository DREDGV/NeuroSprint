import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import type { AppRole, User, TrainingModuleId } from "../../shared/types/domain";
import {
  UserRoleGuardError,
  isTeacherRole,
  normalizeUserRole
} from "./userRole";

function normalizeUser(user: User): User {
  return {
    ...user,
    role: normalizeUserRole(user.role)
  };
}

export const userRepository = {
  async create(name: string, role: AppRole = "student"): Promise<User> {
    const user: User = {
      id: createId(),
      name: name.trim(),
      role: normalizeUserRole(role),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      totalSessions: 0,
      totalTimeSec: 0,
      sessionsByModule: {
        schulte: 0,
        sprint_math: 0,
        reaction: 0,
        n_back: 0,
        memory_grid: 0,
        spatial_memory: 0,
        decision_rush: 0,
        memory_match: 0,
        pattern_recognition: 0
      }
    };

    await db.users.add(user);
    return user;
  },

  async updateActivity(userId: string, moduleId: TrainingModuleId, durationSec: number): Promise<void> {
    await db.transaction("rw", db.users, async () => {
      const user = await db.users.get(userId);
      if (!user) return;

      const now = new Date().toISOString();
      const sessionsByModule = user.sessionsByModule || {
        schulte: 0,
        sprint_math: 0,
        reaction: 0,
        n_back: 0,
        memory_grid: 0,
        spatial_memory: 0,
        decision_rush: 0,
        memory_match: 0,
        pattern_recognition: 0
      };

      await db.users.update(userId, {
        lastActivity: now,
        totalSessions: (user.totalSessions || 0) + 1,
        totalTimeSec: (user.totalTimeSec || 0) + durationSec,
        sessionsByModule: {
          ...sessionsByModule,
          [moduleId]: (sessionsByModule[moduleId as TrainingModuleId] || 0) + 1
        }
      });
    });
  },

  async list(): Promise<User[]> {
    const users = await db.users.orderBy("createdAt").toArray();
    return users.map(normalizeUser);
  },

  async getById(id: string): Promise<User | null> {
    const user = await db.users.get(id);
    return user ? normalizeUser(user) : null;
  },

  async rename(id: string, name: string): Promise<void> {
    await db.users.update(id, { name: name.trim() });
  },

  async updateRole(id: string, role: AppRole): Promise<void> {
    await db.transaction("rw", db.users, async () => {
      const current = await db.users.get(id);
      if (!current) {
        return;
      }

      const currentRole = normalizeUserRole(current.role);
      const nextRole = normalizeUserRole(role);
      if (currentRole === nextRole) {
        return;
      }

      if (isTeacherRole(currentRole) && !isTeacherRole(nextRole)) {
        const teacherCount = await db.users
          .filter((entry) => isTeacherRole(normalizeUserRole(entry.role)))
          .count();
        if (teacherCount <= 1) {
          throw new UserRoleGuardError("last_teacher_role_change");
        }
      }

      await db.users.update(id, { role: nextRole });
    });
  },

  async remove(id: string): Promise<void> {
    await db.transaction(
      "rw",
      [
        db.users,
        db.sessions,
        db.userModeProfiles,
        db.userPreferences,
        db.groupMembers,
        db.dailyChallenges,
        db.dailyChallengeAttempts
      ],
      async () => {
        const target = await db.users.get(id);
        if (target && isTeacherRole(normalizeUserRole(target.role))) {
          const teacherCount = await db.users
            .filter((entry) => isTeacherRole(normalizeUserRole(entry.role)))
            .count();
          if (teacherCount <= 1) {
            throw new UserRoleGuardError("last_teacher_delete");
          }
        }

        await db.users.delete(id);
        await db.sessions.where("userId").equals(id).delete();
        await db.userModeProfiles.where("userId").equals(id).delete();
        await db.userPreferences.where("userId").equals(id).delete();
        await db.groupMembers.where("userId").equals(id).delete();
        await db.dailyChallenges.where("userId").equals(id).delete();
        await db.dailyChallengeAttempts.where("userId").equals(id).delete();
      }
    );
  }
};


