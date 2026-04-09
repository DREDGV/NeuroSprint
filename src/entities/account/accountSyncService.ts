import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { db } from "../../db/database";
import {
  trackAnalyticsEvent,
  trackImportCompleted,
  trackImportStarted,
  trackSyncCompleted,
  trackSyncFailed
} from "../../shared/lib/analytics/siteAnalytics";
import { requireSupabaseClient, isSupabaseConfigured } from "../../shared/lib/auth/supabaseClient";
import type {
  DailyChallenge,
  DailyChallengeAttempt,
  DailyTraining,
  DailyTrainingSessionLink,
  Session,
  User,
  UserAchievement,
  UserLevel,
  UserModeProfile,
  UserPreference,
  UserSkillAchievement,
  XPLog
} from "../../shared/types/domain";
import { userRepository } from "../user/userRepository";

type SyncPayload =
  | Session
  | UserModeProfile
  | UserPreference
  | DailyTraining
  | DailyTrainingSessionLink
  | DailyChallenge
  | DailyChallengeAttempt
  | UserLevel
  | UserAchievement
  | UserSkillAchievement
  | XPLog;

type SyncRow<T extends SyncPayload = SyncPayload> = {
  id: string;
  account_id: string;
  training_profile_id: string;
  payload: T;
  created_at: string;
  updated_at: string;
};

type TrainingProfileRow = {
  id: string;
  account_id: string;
  name: string;
  role: User["role"];
  ownership_kind: "linked";
  sync_state: User["syncState"];
  avatar_emoji: string | null;
  payload: User;
  created_at: string;
  last_activity: string | null;
  updated_at: string;
};

const syncTableSpecs = [
  {
    remoteTable: "sessions",
    loadLocal: (userId: string) => db.sessions.where("userId").equals(userId).toArray(),
    saveLocal: (items: Session[]) => db.sessions.bulkPut(items)
  },
  {
    remoteTable: "user_mode_profiles",
    loadLocal: (userId: string) => db.userModeProfiles.where("userId").equals(userId).toArray(),
    saveLocal: (items: UserModeProfile[]) => db.userModeProfiles.bulkPut(items)
  },
  {
    remoteTable: "user_preferences",
    loadLocal: (userId: string) => db.userPreferences.where("userId").equals(userId).toArray(),
    saveLocal: (items: UserPreference[]) => db.userPreferences.bulkPut(items)
  },
  {
    remoteTable: "daily_trainings",
    loadLocal: (userId: string) => db.dailyTrainings.where("userId").equals(userId).toArray(),
    saveLocal: (items: DailyTraining[]) => db.dailyTrainings.bulkPut(items)
  },
  {
    remoteTable: "daily_training_sessions",
    loadLocal: (userId: string) => db.dailyTrainingSessions.where("userId").equals(userId).toArray(),
    saveLocal: (items: DailyTrainingSessionLink[]) => db.dailyTrainingSessions.bulkPut(items)
  },
  {
    remoteTable: "daily_challenges",
    loadLocal: (userId: string) => db.dailyChallenges.where("userId").equals(userId).toArray(),
    saveLocal: (items: DailyChallenge[]) => db.dailyChallenges.bulkPut(items)
  },
  {
    remoteTable: "daily_challenge_attempts",
    loadLocal: (userId: string) => db.dailyChallengeAttempts.where("userId").equals(userId).toArray(),
    saveLocal: (items: DailyChallengeAttempt[]) => db.dailyChallengeAttempts.bulkPut(items)
  },
  {
    remoteTable: "user_levels",
    loadLocal: (userId: string) => db.userLevels.where("userId").equals(userId).toArray(),
    saveLocal: (items: UserLevel[]) => db.userLevels.bulkPut(items)
  },
  {
    remoteTable: "user_achievements",
    loadLocal: (userId: string) => db.userAchievements.where("userId").equals(userId).toArray(),
    saveLocal: (items: UserAchievement[]) => db.userAchievements.bulkPut(items)
  },
  {
    remoteTable: "user_skill_achievements",
    loadLocal: (userId: string) => db.userSkillAchievements.where("userId").equals(userId).toArray(),
    saveLocal: (items: UserSkillAchievement[]) => db.userSkillAchievements.bulkPut(items)
  },
  {
    remoteTable: "xp_logs",
    loadLocal: (userId: string) => db.xpLogs.where("userId").equals(userId).toArray(),
    saveLocal: (items: XPLog[]) => db.xpLogs.bulkPut(items)
  }
] as const;

function toIsoTimestamp(value: string | null | undefined): string {
  return value ?? new Date().toISOString();
}

function toTrainingProfileRow(user: User, accountId: string): TrainingProfileRow {
  const now = new Date().toISOString();
  return {
    id: user.remoteId ?? user.id,
    account_id: accountId,
    name: user.name,
    role: user.role,
    ownership_kind: "linked",
    sync_state: user.syncState ?? "synced",
    avatar_emoji: user.avatarEmoji ?? null,
    payload: {
      ...user,
      accountId,
      remoteId: user.remoteId ?? user.id,
      ownershipKind: "linked"
    },
    created_at: toIsoTimestamp(user.createdAt),
    last_activity: user.lastActivity ?? null,
    updated_at: now
  };
}

function toLocalUser(row: TrainingProfileRow, accountId: string): User {
  const payload = row.payload;
  return {
    ...payload,
    id: row.id,
    accountId,
    remoteId: row.id,
    ownershipKind: "linked",
    syncState: "synced",
    lastSyncedAt: row.updated_at ?? new Date().toISOString(),
    avatarEmoji: payload.avatarEmoji ?? row.avatar_emoji ?? "👤",
    createdAt: payload.createdAt ?? row.created_at,
    lastActivity: payload.lastActivity ?? row.last_activity ?? row.created_at
  };
}

function ensureConfigured(): boolean {
  return isSupabaseConfigured;
}

async function uploadProfileOwnedTable(
  remoteTable: (typeof syncTableSpecs)[number]["remoteTable"],
  accountId: string,
  trainingProfileId: string,
  items: SyncPayload[]
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const client = requireSupabaseClient();
  const now = new Date().toISOString();
  const rows: SyncRow[] = items.map((item) => ({
    id: item.id,
    account_id: accountId,
    training_profile_id: trainingProfileId,
    payload: item,
    created_at: toIsoTimestamp("createdAt" in item ? (item.createdAt as string | undefined) : now),
    updated_at: toIsoTimestamp("updatedAt" in item ? (item.updatedAt as string | undefined) : now)
  }));

  const { error } = await client.from(remoteTable).upsert(rows);
  if (error) {
    throw error;
  }
}

export const accountSyncService = {
  isConfigured(): boolean {
    return ensureConfigured();
  },

  async ensureAccountRecord(authUser: SupabaseAuthUser): Promise<void> {
    if (!ensureConfigured()) {
      return;
    }

    const client = requireSupabaseClient();
    const { error } = await client.from("accounts").upsert({
      id: authUser.id,
      email: authUser.email ?? null,
      display_name:
        typeof authUser.user_metadata?.display_name === "string"
          ? authUser.user_metadata.display_name
          : null
    });

    if (error) {
      throw error;
    }
  },

  async syncLinkedProfile(userId: string, accountId: string): Promise<void> {
    if (!ensureConfigured()) {
      return;
    }

    const client = requireSupabaseClient();
    const user = await userRepository.getById(userId);
    if (!user || user.accountId !== accountId || user.ownershipKind !== "linked") {
      return;
    }

    await userRepository.markSyncState(userId, "pending");

    try {
      const profileRow = toTrainingProfileRow(user, accountId);
      const { error: profileError } = await client.from("training_profiles").upsert(profileRow);
      if (profileError) {
        throw profileError;
      }

      for (const spec of syncTableSpecs) {
        const items = await spec.loadLocal(user.id);
        await uploadProfileOwnedTable(spec.remoteTable, accountId, user.id, items);
      }

      const syncedAt = new Date().toISOString();
      await userRepository.markSyncState(user.id, "synced", syncedAt);
      trackSyncCompleted("training_profile");
    } catch (error) {
      console.error("profile sync failed", error);
      await userRepository.markSyncState(user.id, "error");
      trackSyncFailed("training_profile");
      throw error;
    }
  },

  async syncAllLinkedProfiles(accountId: string): Promise<void> {
    if (!ensureConfigured()) {
      return;
    }

    const profiles = await userRepository.listLinkedProfiles(accountId);
    for (const profile of profiles) {
      await this.syncLinkedProfile(profile.id, accountId);
    }
  },

  async importLocalGuestProfiles(
    accountId: string,
    profileIds?: string[]
  ): Promise<{ imported: User[]; errors: { profileId: string; message: string }[] }> {
    if (!ensureConfigured()) {
      return { imported: [], errors: [] };
    }

    const profiles = await userRepository.listImportableGuestProfiles();
    const selectedProfiles = profileIds?.length
      ? profiles.filter((profile) => profileIds.includes(profile.id))
      : profiles;

    if (selectedProfiles.length === 0) {
      return { imported: [], errors: [] };
    }

    trackImportStarted(selectedProfiles.length);
    const importedProfiles: User[] = [];
    const errors: { profileId: string; message: string }[] = [];

    for (const profile of selectedProfiles) {
      try {
        // Защита от race condition: проверяем что профиль всё ещё guest и без accountId
        const currentProfile = await userRepository.getById(profile.id);
        if (!currentProfile || currentProfile.accountId) {
          continue; // уже привязан — пропускаем без ошибки
        }

        const linked = await userRepository.linkToAccount(profile.id, accountId);
        if (!linked) {
          errors.push({ profileId: profile.id, message: "Профиль не найден" });
          continue;
        }

        try {
          await this.syncLinkedProfile(linked.id, accountId);
        } catch (syncError) {
          // Ошибка синхронизации не блокирует импорт — профиль уже привязан локально
          console.warn(`Profile ${linked.id} linked but sync failed:`, syncError);
        }

        importedProfiles.push(linked);
      } catch (error) {
        console.error(`Failed to import profile ${profile.id}:`, error);
        errors.push({
          profileId: profile.id,
          message: error instanceof Error ? error.message : "Неизвестная ошибка"
        });
      }
    }

    if (importedProfiles.length > 0) {
      trackImportCompleted(importedProfiles.length);
      trackAnalyticsEvent("local_profiles_imported", {
        profiles_count: importedProfiles.length
      });
    }

    return { imported: importedProfiles, errors };
  },

  async pullAccountState(accountId: string): Promise<User[]> {
    if (!ensureConfigured()) {
      return [];
    }

    const client = requireSupabaseClient();
    const { data: profilesData, error: profilesError } = await client
      .from("training_profiles")
      .select("*")
      .eq("account_id", accountId);

    if (profilesError) {
      throw profilesError;
    }

    const pulledProfiles: User[] = [];
    for (const rawProfile of (profilesData ?? []) as TrainingProfileRow[]) {
      const localUser = toLocalUser(rawProfile, accountId);
      await userRepository.upsertFromCloud(localUser);
      pulledProfiles.push(localUser);

      for (const spec of syncTableSpecs) {
        const { data, error } = await client
          .from(spec.remoteTable)
          .select("payload")
          .eq("training_profile_id", rawProfile.id);

        if (error) {
          throw error;
        }

        const payloads = (data ?? []).map((row) => row.payload) as SyncPayload[];
        if (payloads.length > 0) {
          await spec.saveLocal(payloads as never[]);
        }
      }

      await userRepository.markSyncState(localUser.id, "synced", new Date().toISOString());
    }

    return pulledProfiles;
  }
};
