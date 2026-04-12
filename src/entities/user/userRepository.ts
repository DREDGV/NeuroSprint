import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import { isLocalDevProfileAccessBypassEnabled } from "../../shared/lib/auth/localDevAccess";
import type {
  AppRole,
  ProfileOwnershipKind,
  ProfileSyncState,
  TrainingModuleId,
  User
} from "../../shared/types/domain";
import { UserRoleGuardError, isTeacherRole, normalizeUserRole } from "./userRole";

const DEFAULT_SESSIONS_BY_MODULE: Record<TrainingModuleId, number> = {
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

interface CreateUserOptions {
  accountId?: string;
  remoteId?: string;
  ownershipKind?: ProfileOwnershipKind;
  syncState?: ProfileSyncState;
  avatarEmoji?: string;
}

function resolveOwnershipKind(user: Partial<User>): ProfileOwnershipKind {
  if (user.ownershipKind === "guest" || user.ownershipKind === "linked") {
    return user.ownershipKind;
  }
  return user.accountId ? "linked" : "guest";
}

function resolveSyncState(user: Partial<User>): ProfileSyncState {
  if (
    user.syncState === "local" ||
    user.syncState === "pending" ||
    user.syncState === "synced" ||
    user.syncState === "error"
  ) {
    return user.syncState;
  }
  return resolveOwnershipKind(user) === "linked" ? "pending" : "local";
}

function normalizeUser(user: User): User {
  const ownershipKind = resolveOwnershipKind(user);

  return {
    ...user,
    role: normalizeUserRole(user.role),
    ownershipKind,
    syncState: resolveSyncState(user),
    avatarEmoji: user.avatarEmoji ?? "👤",
    remoteId: user.remoteId ?? (ownershipKind === "linked" ? user.id : undefined),
    lastSyncedAt: user.lastSyncedAt ?? null,
    totalSessions: user.totalSessions ?? 0,
    totalTimeSec: user.totalTimeSec ?? 0,
    sessionsByModule: {
      ...DEFAULT_SESSIONS_BY_MODULE,
      ...(user.sessionsByModule ?? {})
    }
  };
}

function buildCreatePayload(
  name: string,
  role: AppRole,
  options: CreateUserOptions = {}
): User {
  const now = new Date().toISOString();
  const ownershipKind = options.ownershipKind ?? (options.accountId ? "linked" : "guest");

  return normalizeUser({
    id: createId(),
    name: name.trim(),
    role,
    accountId: options.accountId,
    remoteId: options.remoteId,
    ownershipKind,
    syncState:
      options.syncState ?? (ownershipKind === "linked" ? "pending" : "local"),
    avatarEmoji: options.avatarEmoji ?? "👤",
    createdAt: now,
    lastActivity: now,
    totalSessions: 0,
    totalTimeSec: 0,
    sessionsByModule: DEFAULT_SESSIONS_BY_MODULE
  });
}

export const userRepository = {
  async create(
    name: string,
    role: AppRole = "student",
    options?: CreateUserOptions
  ): Promise<User> {
    const user = buildCreatePayload(name, normalizeUserRole(role), options);
    await db.users.add(user);
    return user;
  },

  async updateActivity(
    userId: string,
    moduleId: TrainingModuleId,
    durationSec: number
  ): Promise<void> {
    await db.transaction("rw", db.users, async () => {
      const user = await db.users.get(userId);
      if (!user) {
        return;
      }

      const normalized = normalizeUser(user);
      const now = new Date().toISOString();
      const nextSessionsByModule: Record<TrainingModuleId, number> = {
        ...DEFAULT_SESSIONS_BY_MODULE,
        ...normalized.sessionsByModule,
        [moduleId]: (normalized.sessionsByModule?.[moduleId] ?? 0) + 1
      };

      await db.users.update(userId, {
        lastActivity: now,
        totalSessions: (normalized.totalSessions ?? 0) + 1,
        totalTimeSec: (normalized.totalTimeSec ?? 0) + durationSec,
        sessionsByModule: nextSessionsByModule,
        syncState: normalized.ownershipKind === "linked" ? "pending" : normalized.syncState
      });
    });
  },

  async list(): Promise<User[]> {
    const users = await db.users.orderBy("createdAt").toArray();
    return users.map(normalizeUser);
  },

  async listGuestProfiles(): Promise<User[]> {
    const users = await this.list();
    return users.filter((user) => user.ownershipKind === "guest");
  },

  async listLinkedProfiles(accountId?: string): Promise<User[]> {
    const users = await this.list();
    return users.filter(
      (user) =>
        user.ownershipKind === "linked" &&
        (!accountId || user.accountId === accountId)
    );
  },

  async listImportableGuestProfiles(): Promise<User[]> {
    const users = await this.listGuestProfiles();
    return users.filter((user) => !user.accountId);
  },

  async getById(id: string): Promise<User | null> {
    const user = await db.users.get(id);
    return user ? normalizeUser(user) : null;
  },

  async rename(id: string, name: string): Promise<void> {
    const user = await db.users.get(id);
    if (!user) {
      return;
    }

    const normalized = normalizeUser(user);
    await db.users.update(id, {
      name: name.trim(),
      syncState: normalized.ownershipKind === "linked" ? "pending" : normalized.syncState
    });
  },

  async updateAvatar(id: string, avatarEmoji: string): Promise<void> {
    const user = await db.users.get(id);
    if (!user) {
      return;
    }

    const normalized = normalizeUser(user);
    await db.users.update(id, {
      avatarEmoji,
      syncState: normalized.ownershipKind === "linked" ? "pending" : normalized.syncState
    });
  },

  async updateRole(id: string, role: AppRole): Promise<void> {
    await db.transaction("rw", db.users, async () => {
      const current = await db.users.get(id);
      if (!current) {
        return;
      }

      const normalized = normalizeUser(current);
      const currentRole = normalizeUserRole(normalized.role);
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

      await db.users.update(id, {
        role: nextRole,
        syncState: normalized.ownershipKind === "linked" ? "pending" : normalized.syncState
      });
    });
  },

  async linkToAccount(id: string, accountId: string): Promise<User | null> {
    const existing = await db.users.get(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    await db.users.update(id, {
      accountId,
      remoteId: existing.remoteId ?? id,
      ownershipKind: "linked",
      syncState: "pending",
      lastSyncedAt: existing.lastSyncedAt ?? null,
      lastActivity: existing.lastActivity ?? now
    });

    return this.getById(id);
  },

  async markSyncState(
    id: string,
    syncState: ProfileSyncState,
    lastSyncedAt: string | null = null
  ): Promise<void> {
    const existing = await db.users.get(id);
    if (!existing) {
      return;
    }

    await db.users.update(id, {
      syncState,
      lastSyncedAt
    });
  },

  async upsertFromCloud(user: User): Promise<User> {
    const normalized = normalizeUser(user);
    await db.users.put(normalized);
    return normalized;
  },

  isLocked(user: User, currentAccountId: string | null | undefined): boolean {
    if (isLocalDevProfileAccessBypassEnabled()) {
      return false;
    }

    return user.ownershipKind === "linked" && user.accountId !== currentAccountId;
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
        db.dailyChallengeAttempts,
        db.dailyTrainings,
        db.dailyTrainingSessions,
        db.userLevels,
        db.userAchievements,
        db.userSkillAchievements,
        db.xpLogs,
        db.skillComparisons
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
        await db.dailyTrainings.where("userId").equals(id).delete();
        await db.dailyTrainingSessions.where("userId").equals(id).delete();
        await db.userLevels.where("userId").equals(id).delete();
        await db.userAchievements.where("userId").equals(id).delete();
        await db.userSkillAchievements.where("userId").equals(id).delete();
        await db.xpLogs.where("userId").equals(id).delete();
        await db.skillComparisons.where("userId").equals(id).delete();
      }
    );
  }
};
